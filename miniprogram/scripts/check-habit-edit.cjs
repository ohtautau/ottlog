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
const { prepareHabitEdit, saveHabitEdit, removeHabit, patchHabitDetails } = load(path.join(__dirname, '../src/lib/habit-edit.ts'));
const { cleanState, toggleReminderDone, isReminderState, splitDefaultExerciseHabit } = load(path.join(__dirname, '../src/lib/reminder-data.ts'));
const { initialDomainState, isDomainState, saveDomainHabit, toggleDomainHabit } = load(path.join(__dirname, '../src/lib/domain-data.ts'));
const { currentHabitTimePeriod, habitTimePeriod, habitTimePeriods, habitTimePeriodLabels, isHabitTimePeriod } = load(path.join(__dirname, '../src/lib/habit-metadata.ts'));
const domains = initialDomainState.domains;
const original = { id: 'shared', title: 'Original', note: '', group: '工作', domainId: 'work', kind: 'plant', minutes: 0, enabled: true, priority: 'none', createdAt: 123 };
let state = toggleReminderDone({ version: 1, items: [original], done: {} }, original.id, '2026-10-03');
state.reflections = [{ id: 'reflection', habitId: original.id, day: '2026-10-03', text: 'Keep this memory', createdAt: 456 }];
state = cleanState(state);
const edited = prepareHabitEdit({ ...original, title: '  Updated  ', note: '  New note  ', group: '英语', domainId: 'english', priority: 'high', timePeriod: 'afternoon' }, domains);
const latest = { ...state, items: [{ ...state.items[0], minutes: 25, enabled: false, createdAt: 789, timePeriod: 'night', backgroundImage: 'https://example.com/habit.png' }] };
const before = JSON.stringify(latest);
const saved = saveHabitEdit(latest, edited, domains);
assert.equal(saved.items.length, 1, 'Editing never duplicates a shared habit');
assert.equal(saved.items[0].id, original.id);
assert.equal(saved.items[0].title, 'Updated');
assert.equal(saved.items[0].note, 'New note');
assert.equal(saved.items[0].domainId, 'english');
assert.equal(saved.items[0].timePeriod, 'afternoon', 'The selected time period is an editable field');
assert.equal(saved.items[0].minutes, latest.items[0].minutes, 'Editing preserves the retired compatibility field');
assert.equal(saved.items[0].enabled, false, 'A stale editor cannot undo a newer pause');
assert.equal(saved.items[0].createdAt, 789, 'A stale editor keeps the latest creation time');
assert.equal(saved.items[0].backgroundImage, latest.items[0].backgroundImage);
assert.deepEqual(saved.done, latest.done);
assert.deepEqual(saved.completionHistory, latest.completionHistory);
assert.deepEqual(saved.reflections, latest.reflections);
assert.equal(JSON.stringify(latest), before, 'Saving never mutates the previous state');
assert.throws(() => saveHabitEdit({ ...state, items: [] }, edited, domains), /已移除/, 'Saving cannot revive a removed habit');
assert.throws(() => prepareHabitEdit({ ...original, title: ' ' }, domains), /写下/);
const renamed = domains.map(domain => domain.id === 'work' ? { ...domain, name: '事业' } : domain);
assert.equal(prepareHabitEdit(original, renamed).group, '事业', 'Renaming retains the stable domain binding');
assert.throws(() => prepareHabitEdit(original, domains.filter(domain => domain.id !== 'work')), /重新选择/);
const uncategorized = prepareHabitEdit({ ...original, group: '未分类', domainId: undefined }, domains);
assert.equal(uncategorized.domainId, undefined);
assert.equal(saveHabitEdit(state, uncategorized, domains).items[0].group, '未分类');
const added = saveHabitEdit(state, { ...original, id: 'new' }, domains, true);
assert.equal(added.items.length, 2);
assert.throws(() => saveHabitEdit(state, original, domains, true), /已经存在/);
const other = { ...original, id: 'other', title: 'Keep the latest habit', enabled: true };
const withOther = toggleReminderDone({ ...state, items: [...state.items, other] }, other.id, '2026-10-04');
withOther.reflections.push({ id: 'other-reflection', habitId: other.id, day: '2026-10-04', text: 'Keep another memory', createdAt: 987 });
const removalBefore = JSON.stringify(withOther);
const removed = removeHabit(withOther, original.id);
assert.deepEqual(removed.items, [other], 'Deleting one ID retains the latest unrelated habit');
assert.ok(Object.values(removed.done).every(ids => !ids.includes(original.id)), 'Deleted check-ins are cleaned');
assert.equal(removed.completionHistory[original.id], undefined, 'Deleted archived check-ins are cleaned');
assert.deepEqual(removed.completionHistory[other.id], cleanState(withOther).completionHistory[other.id]);
assert.deepEqual(removed.reflections.map(note => note.id), ['other-reflection']);
assert.equal(JSON.stringify(withOther), removalBefore, 'Deleting never mutates the previous state');
assert.deepEqual(removeHabit(removed, original.id), removed, 'Retrying the same deleted ID is safe');
assert.throws(() => removeHabit(withOther, ''), /先保存/, 'A new draft cannot delete a habit');
console.log('PASS shared habit editing: identity, history, current lifecycle, domain reassignment, validation and deleted-habit protection.');

function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return value;
}
assert.deepEqual(habitTimePeriods, ['morning', 'noon', 'afternoon', 'night', 'free']);
assert.deepEqual(habitTimePeriods.map(period => habitTimePeriodLabels[period]), ['上午', '中午', '下午', '夜晚', '自由']);
const legacy = freeze({ version: 1, items: [{ ...original }], done: {} });
assert.ok(isReminderState(legacy), 'Version 1 habits without a time period remain valid');
assert.equal(habitTimePeriod(legacy.items[0]), 'free');
assert.equal(habitTimePeriod(undefined), 'free');
assert.equal(habitTimePeriod(null), 'free');
assert.equal(Object.hasOwn(cleanState(legacy).items[0], 'timePeriod'), false, 'Reading/cleaning an old archive does not materialize the default');
assert.equal(Object.hasOwn(legacy.items[0], 'timePeriod'), false, 'Fallback reads never mutate old records');
assert.equal(prepareHabitEdit(legacy.items[0], domains).timePeriod, 'free');
assert.equal(saveHabitEdit(legacy, { ...original, id: 'new-default' }, domains, true).items.at(-1).timePeriod, 'free', 'Legacy callers creating a new habit save the default time period');
for (const period of habitTimePeriods) {
  const draft = freeze({ ...original, id: `period-${period}`, timePeriod: period });
  const prepared = prepareHabitEdit(draft, domains);
  const added = saveHabitEdit(legacy, prepared, domains, true);
  assert.equal(added.items.at(-1).timePeriod, period);
  assert.ok(isReminderState(added));
  const clock = new Date(2026, 9, 8, 9).getTime();
  const checked = toggleReminderDone(freeze(added), draft.id, '2026-10-08', clock);
  assert.equal(checked.items.at(-1).timePeriod, period, 'Check-in retains the selected period');
  assert.equal(checked.checkInTimes['2026-10-08'][draft.id], clock);
  const undone = toggleReminderDone(freeze(checked), draft.id, '2026-10-08', clock);
  assert.equal(undone.items.at(-1).timePeriod, period, 'Undo retains the selected period');
  assert.deepEqual(undone.checkInTimes, {});
  assert.equal(saveHabitEdit(freeze(checked), { ...prepared, timePeriod: 'free' }, domains).items.at(-1).timePeriod, 'free');
  assert.deepEqual(saveHabitEdit(checked, { ...prepared, timePeriod: 'free' }, domains).completionHistory, checked.completionHistory, 'Changing period preserves check-in history');
}
const invalidPeriods = ['invalid', '上午', 'Morning', '', null, 1, {}, []];
for (const timePeriod of invalidPeriods) {
  assert.equal(isHabitTimePeriod(timePeriod), false);
  assert.equal(habitTimePeriod({ timePeriod }), 'free', 'Defensive display fallback is independent of strict archive validation');
  const invalid = { ...legacy, items: [{ ...original, timePeriod }] };
  assert.equal(isReminderState(invalid), false, 'An explicitly invalid saved period is rejected');
  assert.equal(cleanState(invalid).items[0].timePeriod, 'free', 'Tolerant normalization repairs an explicitly invalid field');
  assert.throws(() => prepareHabitEdit(invalid.items[0], domains), /时段/);
  assert.throws(() => saveHabitEdit(legacy, invalid.items[0], domains), /时段/);
  assert.throws(() => saveHabitEdit(legacy, { ...invalid.items[0], id: 'new-invalid' }, domains, true), /时段/);
}
const split = splitDefaultExerciseHabit(freeze({ version: 1, items: [{ ...original, id: 'exercise', title: '力量训练 / 有氧运动', kind: 'exercise', timePeriod: 'morning' }], done: {} }));
assert.deepEqual(split.items.map(item => item.timePeriod), ['morning', 'morning'], 'Splitting the old combined default preserves its explicit time period');

const domainLegacy = freeze({ ...initialDomainState, domains: initialDomainState.domains.map(domain => ({ ...domain, habits: domain.id === 'work' ? [{ id: 'old-domain-habit', name: '旧习惯', startedDates: ['2026-10-07'] }] : [] })) });
assert.ok(isDomainState(domainLegacy), 'Old embedded domain habits remain readable');
assert.equal(habitTimePeriod(domainLegacy.domains.find(domain => domain.id === 'work').habits[0]), 'free');
let domainSaved = saveDomainHabit(domainLegacy, 'work', '早晨习惯', 'old-domain-habit', { timePeriod: 'morning' });
const embedded = state => state.domains.find(domain => domain.id === 'work').habits.find(habit => habit.id === 'old-domain-habit');
assert.equal(embedded(domainSaved).timePeriod, 'morning');
assert.deepEqual(embedded(domainSaved).startedDates, ['2026-10-07']);
domainSaved = saveDomainHabit(freeze(domainSaved), 'work', '改名但保留时段', 'old-domain-habit', { priority: 'high' });
assert.equal(embedded(domainSaved).timePeriod, 'morning', 'Legacy domain editing that omits the field preserves the current period');
const domainChecked = toggleDomainHabit(freeze(domainSaved), 'work', 'old-domain-habit', new Date(2026, 9, 8));
assert.equal(embedded(domainChecked).timePeriod, 'morning');
assert.deepEqual(embedded(domainChecked).startedDates, ['2026-10-07', '2026-10-08']);
assert.equal(isDomainState(domainChecked), true);
const domainCreated = saveDomainHabit(domainLegacy, 'work', '新习惯');
assert.equal(domainCreated.domains.find(domain => domain.id === 'work').habits.at(-1).timePeriod, 'free');
for (const timePeriod of invalidPeriods) {
  const invalidDomain = { ...domainLegacy, domains: domainLegacy.domains.map(domain => domain.id === 'work' ? { ...domain, habits: [{ ...domain.habits[0], timePeriod }] } : domain) };
  assert.equal(isDomainState(invalidDomain), false);
  assert.throws(() => saveDomainHabit(domainLegacy, 'work', '无效时段', undefined, { timePeriod }), /时段/);
}
assert.equal(Object.hasOwn(embedded(domainLegacy), 'timePeriod'), false);
assert.deepEqual(embedded(domainLegacy).startedDates, ['2026-10-07'], 'Domain compatibility operations never mutate the old input');
console.log('PASS habit time periods: legacy read-only defaults, all five create/edit values, history/lifecycle/check-in retention, strict invalid values, immutable normalization and embedded domain compatibility.');

const inlineSource = { ...state, items: [{ ...original, title: ' A '.repeat(30), note: '完整备注\n'.repeat(80), enabled: false, backgroundImage: 'keep-image', backgroundKind: 'sun' }, { ...original, id: 'orphan', domainId: 'deleted', group: '原分组' }] };
const inlineSnapshot = JSON.parse(JSON.stringify(inlineSource));
let inline = patchHabitDetails(inlineSource, original.id, { field: 'priority', value: 'high' }, domains);
inline = patchHabitDetails(inline, original.id, { field: 'icon', value: 'camera' }, domains);
inline = patchHabitDetails(inline, original.id, { field: 'domain', value: 'life' }, domains);
assert.deepEqual(inline.items[0], { ...inlineSource.items[0], priority: 'high', iconId: 'camera', kind: 'camera', backgroundKind: undefined, domainId: 'life', group: '生活' });
assert.deepEqual(inline.items[1], inlineSource.items[1], 'Inline edits never realign other orphaned habits');
for (const field of Object.keys(inlineSource).filter(key => key !== 'items')) assert.deepEqual(inline[field], inlineSource[field], `Inline edits preserve ${field}`);
assert.equal(Object.hasOwn(inline.items[0], 'timePeriod'), false, 'Inline edits do not materialize inferred time periods');
assert.equal(patchHabitDetails(inline, original.id, { field: 'priority', value: 'high' }, domains), inline, 'Selecting the saved priority is a no-op');
assert.deepEqual(patchHabitDetails(inline, original.id, { field: 'domain', value: '' }, domains).items[0], { ...inline.items[0], domainId: undefined, group: '未分类' });
assert.throws(() => patchHabitDetails(inline, original.id, { field: 'domain', value: 'deleted' }, domains), /领域/);
assert.throws(() => patchHabitDetails(inline, 'deleted', { field: 'priority', value: 'high' }, domains), /移除/);
assert.deepEqual(JSON.parse(JSON.stringify(inlineSource)), inlineSnapshot, 'Inline changes never mutate input');
console.log('PASS inline habit choices: latest-record merge, complete text/background/lifecycle/history retention, orphan isolation, no inferred writes, uncategorized and deleted-target validation.');

for (const [hour, minute, second, expected] of [[0, 0, 0, 'morning'], [10, 59, 59, 'morning'], [11, 0, 0, 'noon'], [12, 59, 59, 'noon'], [13, 0, 0, 'afternoon'], [17, 59, 59, 'afternoon'], [18, 0, 0, 'night'], [23, 59, 59, 'night']]) {
  assert.equal(currentHabitTimePeriod(new Date(2026, 9, 11, hour, minute, second).getTime()), expected, `Local ${hour}:${minute}:${second} default`);
}
console.log('PASS current habit browsing period: device-local midnight and exact 11/13/18 boundaries.');
