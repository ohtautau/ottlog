const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loaded = new Map();
function load(file) {
  file = path.resolve(file);
  if (loaded.has(file)) return loaded.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; loaded.set(file, exports);
  new Function('exports', 'require', source)(exports, name => load(path.resolve(path.dirname(file), name + '.ts')));
  return exports;
}
const model = load(path.join(__dirname, '../src/lib/reminder-data.ts'));
const notes = load(path.join(__dirname, '../src/lib/habit-reflections.ts'));
const web = load(path.join(__dirname, '../../web/src/app/daily/reminders.ts'));
const { createPersonalToolStore, toolCacheKey } = load(path.join(__dirname, '../src/lib/tool-state-store.ts'));
const now = new Date(2026, 8, 15, 10, 30).getTime();
const reflectionHabits = ['exercise', 'unplug'].map(id => model.initialReminders.items.find(item => item.id === id));
assert.deepEqual(reflectionHabits.map(item => item?.id), ['exercise', 'unplug'], 'Cross-habit reflection fixtures use stable IDs rather than default positions');
const blank = { version: 1, items: reflectionHabits, done: {}, customMetadata: { retain: true } };
const done = day => model.toggleReminderDone(blank, 'exercise', day);
const stats = (state, id = 'exercise') => notes.habitCompletionStats(state, id, now);

assert.deepEqual(stats(blank), { days: 0, streak: 0, lastDay: null, daysSinceLast: null });
assert.equal(model.habitDayIndex('2026-02-29'), null);
assert.equal(model.habitDayIndex('2024-02-29') + 1, model.habitDayIndex('2024-03-01'));
assert.equal(model.habitDayIndex('2026-12-31') + 1, model.habitDayIndex('2027-01-01'));
assert.deepEqual(stats(blank, 'constructor'), { days: 0, streak: 0, lastDay: null, daysSinceLast: null });
const oldDays = model.recentDays('2026-09-14', 1000);
let history = model.cleanState({ ...blank, done: Object.fromEntries(oldDays.map(day => [day, ['exercise', 'unplug']])) });
assert.equal(Object.keys(history.done).length, 90);
assert.equal(stats(history).days, 1000, 'Migration captures all available history before pruning');
assert.equal(history.completionHistory.exercise.length, 1, 'A consecutive run is stored as one compact range');
history = model.toggleReminderDone(history, 'exercise', '2026-09-15');
assert.deepEqual(stats(history), { days: 1001, streak: 1001, lastDay: '2026-09-15', daysSinceLast: 0 });
const archivedDay = oldDays[3];
history = model.toggleReminderDone(history, 'exercise', archivedDay);
assert.equal(stats(history).days, 1000, 'Undo works even when the original calendar row was pruned');
assert.equal(stats(history, 'unplug').days, 1000, 'An archived undo cannot erase another habit on that day');
assert.equal(history.completionHistory.exercise.length, 2, 'Undo splits the compressed range');
history = model.toggleReminderDone(history, 'exercise', archivedDay);
assert.equal(stats(history).days, 1001);
assert.equal(history.completionHistory.exercise.length, 1);
history = model.toggleReminderDone(history, 'exercise', '2026-09-15');
assert.deepEqual(stats(history), { days: 1000, streak: 1000, lastDay: '2026-09-14', daysSinceLast: 1 });
assert.equal(stats(model.cleanState(history)).days, 1000, 'Repeated normalization does not double count history');
const future = model.toggleReminderDone(history, 'exercise', '2027-01-01');
assert.equal(stats(future).days, 1000, 'A future imported date does not affect current adherence');
const legacy = model.cleanState({ ...blank, done: { '2026-09-01': ['exercise'], '2026-09-14': ['exercise'] } });
assert.deepEqual(stats(legacy), { days: 2, streak: 1, lastDay: '2026-09-14', daysSinceLast: 1 }, 'Legacy migration only counts known completions');

let state = legacy;
state = notes.saveHabitReflection(state, { habitId: 'exercise', day: '2026-09-01', text: ' 第一行\n也可以继续 ', id: 'one', now: now - 1000 });
state = notes.saveHabitReflection(state, { habitId: 'exercise', day: '2026-09-14', text: '第二句话', id: 'two', now });
assert.equal(state.reflections[0].text, '第一行 也可以继续');
assert.equal(state.reflections[0].lastShownAt, undefined, 'Writing a note does not pretend it was replayed');
assert.equal(notes.chooseHabitReflection(state, () => 0).id, 'one');
assert.equal(notes.chooseHabitReflection(state, () => 0.99).id, 'two', 'Tied unseen notes are selected randomly');
state = notes.markHabitReflectionShown(state, 'two', now);
assert.equal(notes.chooseHabitReflection(state, () => 0.99).id, 'one', 'Unseen notes are prioritized over displayed notes');
state = notes.markHabitReflectionShown(state, 'one', now + 1);
assert.equal(notes.chooseHabitReflection(state, () => 0).id, 'two', 'Oldest displayed note wins after all have been shown');
assert.equal(notes.chooseHabitReflection(blank), null, 'An owner without saved notes has no invented memory');
const before = JSON.stringify(state);
const chosen = notes.chooseHabitReflection(state, () => 0.5);
assert.equal(JSON.stringify(state), before, 'Selecting alone cannot update the replay clock before persistence succeeds');
assert.equal(chosen.lastShownAt, now);

let crossHabit = model.toggleReminderDone(state, 'unplug', '2026-09-15');
crossHabit = notes.saveHabitReflection(crossHabit, { habitId: 'unplug', day: '2026-09-15', text: 'A thought from another habit', id: 'three', now });
assert.equal(notes.chooseHabitReflection(crossHabit, () => 0).id, 'three', 'An unseen note from another habit is eligible and has first priority');
crossHabit = notes.markHabitReflectionShown(crossHabit, 'three', now + 2);
assert.equal(notes.chooseHabitReflection(crossHabit, () => 0.99).id, 'two', 'Rotation uses the oldest display time across all habits');
crossHabit = notes.markHabitReflectionShown(crossHabit, 'two', now - 1000);
assert.equal(crossHabit.reflections.find(entry => entry.id === 'two').lastShownAt, now + 3, 'Clock rollback cannot keep the replayed note oldest');
assert.equal(notes.chooseHabitReflection(crossHabit, () => 0.99).id, 'one');
crossHabit = notes.markHabitReflectionShown(crossHabit, 'one', now - 1000);
assert.equal(notes.chooseHabitReflection(crossHabit, () => 0).id, 'three', 'Every habit shares one fair replay queue');
const tied = { ...crossHabit, reflections: crossHabit.reflections.map(entry => ({ ...entry, lastShownAt: now })) };
assert.equal(notes.chooseHabitReflection(tied, () => 0).id, 'one');
assert.equal(notes.chooseHabitReflection(tied, () => 0.99).id, 'three', 'Already-shown notes with equal timestamps are also randomized');
const tiedNext = notes.markHabitReflectionShown(tied, 'one', now);
assert.equal(tiedNext.reflections.find(entry => entry.id === 'one').lastShownAt, now + 1, 'A same-millisecond replay moves behind the remaining notes');
assert.equal(notes.chooseHabitReflection(tiedNext, () => 0).id, 'two');
assert.deepEqual(notes.markHabitReflectionShown(tied, 'one', NaN), model.cleanState(tied), 'Invalid clocks cannot poison stored replay times');
assert.deepEqual(notes.markHabitReflectionShown(tied, 'missing', now + 99), model.cleanState(tied), 'Unknown notes cannot change replay order');
assert.equal(notes.chooseHabitReflection(model.cleanState({ ...tied, reflections: [{ ...tied.reflections[2], day: '2026-02-30' }, ...tied.reflections.slice(0, 2)] }), () => 0.99).id, 'two', 'Invalid memories are excluded from global selection');

const updated = notes.saveHabitReflection(state, { habitId: 'exercise', day: '2026-09-14', text: '改写一句话', now: now + 2 });
assert.equal(updated.reflections.length, 2, 'Repeated saves for one completion update its single note');
assert.equal(updated.reflections[1].id, 'two');
assert.equal(JSON.stringify(state), before, 'Saving is immutable');
assert.equal(notes.saveHabitReflection(state, { habitId: 'exercise', day: '2026-09-14', text: '  ', now }).reflections.length, 2, 'Skipping cannot clear prior data');
assert.throws(() => notes.saveHabitReflection(state, { habitId: 'unplug', day: '2026-09-14', text: 'No completion', now }), /已撤销/);
const undone = model.toggleReminderDone(state, 'exercise', '2026-09-14');
assert.deepEqual(undone.reflections.map(entry => entry.id), ['one'], 'Undo removes only the note attached to the withdrawn completion');
assert.throws(() => notes.saveHabitReflection(undone, { habitId: 'exercise', day: '2026-09-14', text: 'late pending save', now }), /已撤销/);
const deleted = model.cleanState({ ...state, items: state.items.filter(item => item.id !== 'exercise') });
assert.equal(deleted.reflections.length, 0);
assert.equal(deleted.completionHistory.exercise, undefined);
const long = notes.saveHabitReflection(done('2026-09-15'), { habitId: 'exercise', day: '2026-09-15', text: '🌿'.repeat(130), now });
assert.equal(Array.from(long.reflections[0].text).length, 120, 'Trimming never splits a Unicode character');
const archived = notes.saveHabitReflection(history, { habitId: 'exercise', day: archivedDay, text: 'A remembered old day', now });
assert.equal(model.cleanState(archived).reflections.length, 1, 'Calendar pruning does not remove memories of real archived completions');
const fullMemory = {
  ...history,
  reflections: oldDays.slice(0, notes.MAX_HABIT_REFLECTIONS).map((day, index) => ({
    id: index === 0 ? 'tie-z' : index === 1 ? 'tie-a' : 'memory-' + index,
    habitId: 'exercise', day, text: 'An older memory ' + index, createdAt: index < 2 ? now - 1000 : now - 1000 + index,
  })),
};
const editedFull = notes.saveHabitReflection(fullMemory, { habitId: 'exercise', day: oldDays[0], text: 'Edited in place', now: now + 1 });
assert.equal(editedFull.reflections.length, notes.MAX_HABIT_REFLECTIONS);
assert.ok(editedFull.reflections.some(entry => entry.id === 'tie-a'), 'Editing at capacity does not evict a different note');
assert.equal(editedFull.reflections.find(entry => entry.id === 'tie-z').createdAt, now - 1000);
const retained = notes.saveHabitReflection(fullMemory, { habitId: 'exercise', day: oldDays[700], text: 'A new thought', id: 'new-thought', now: now - 2000 });
assert.equal(retained.reflections.length, notes.MAX_HABIT_REFLECTIONS, 'New notes use bounded retention instead of blocking future check-ins');
assert.ok(retained.reflections.some(entry => entry.id === 'new-thought'), 'The newly submitted note is retained even if its clock is earlier');
assert.ok(!retained.reflections.some(entry => entry.id === 'tie-a'), 'Oldest creation time, then stable ID, selects the evicted prior note');
assert.ok(retained.reflections.some(entry => entry.id === 'tie-z'));
assert.equal(fullMemory.reflections.length, notes.MAX_HABIT_REFLECTIONS, 'Retention cannot mutate the prior snapshot');

const roundTrip = model.cleanState(web.cleanState(JSON.parse(JSON.stringify(state))));
assert.deepEqual(roundTrip.reflections, state.reflections, 'Web normalization preserves notes and replay order');
assert.deepEqual(roundTrip.completionHistory, state.completionHistory, 'Web normalization preserves archived totals');
assert.deepEqual(roundTrip.customMetadata, { retain: true });
const webUndo = web.cleanState({ ...state, done: { ...state.done, '2026-09-14': [] } });
assert.equal(stats(model.cleanState(webUndo)).days, 1, 'An explicit undo from the web overrides the mini archive');
assert.deepEqual(model.cleanState(webUndo).reflections.map(entry => entry.id), ['one']);

async function accountIsolation() {
  const storage = new Map(), remote = new Map();
  let account = 'alice';
  const store = createPersonalToolStore({
    read: key => storage.get(key), write: (key, value) => storage.set(key, JSON.parse(JSON.stringify(value))),
    fingerprint: () => account,
    session: async () => ({ authenticated: true, userName: account }),
    get: async key => ({ data: remote.get(account + ':' + key) ?? null }),
    put: async (key, data, owner) => { assert.equal(owner, 'reader:' + account); remote.set(account + ':' + key, JSON.parse(JSON.stringify(data))); },
  });
  const alice = await store.load('reminders', blank);
  store.edit('reminders', alice, state);
  await store.flush('reminders', alice.owner);
  account = 'bob';
  const bob = await store.load('reminders', blank);
  assert.equal(bob.value.reflections, undefined, 'Another account cannot see old habit sentences');
  assert.equal(notes.chooseHabitReflection(bob.value), null, 'Global habit selection still stays inside the current account');
  assert.throws(() => store.edit('reminders', alice, previous => notes.markHabitReflectionShown(previous, 'one', now + 5)), /账号状态已变化/);
  assert.deepEqual(storage.get(toolCacheKey('reader:alice', 'reminders')).data.reflections, state.reflections);
  account = 'alice';
  const restored = await store.load('reminders', blank);
  assert.deepEqual(restored.value.reflections, state.reflections, 'Sentences and replay order survive an account round trip');
}
accountIsolation().then(() => console.log('PASS habit notes: optional save, fair replay rotation, undo safety, compact all-known-day totals, pruning, calendar boundaries, cross-client metadata and owner isolation.')).catch(error => { console.error(error); process.exitCode = 1; });
