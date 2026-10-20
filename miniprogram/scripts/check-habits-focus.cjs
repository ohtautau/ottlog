const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function readModel(name) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib', name), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const model = {}; new Function('exports', 'require', output)(model, dependency => readModel(path.join(path.dirname(name), dependency + '.ts'))); return model;
}
const habits = readModel('reminder-data.ts');
const model = readModel('pomodoro-data.ts');
const { initialPomodoroState, normalizePomodoroState, startTimer, pauseTimer, resumeTimer, finishTimer, advanceTimer, remainingSeconds } = model;
const start = Date.parse('2026-09-09T10:00:00.000Z');
const chosen = { taskId: 'read-book', title: '读两页书' };
assert.equal(model.decodeTimerRouteValue(encodeURIComponent('中文标题 / 100% + & ?')), '中文标题 / 100% + & ?');
assert.equal(model.decodeTimerRouteValue('bad % sequence'), 'bad % sequence');
const fresh = () => normalizePomodoroState(initialPomodoroState);
assert.deepEqual(fresh().settings, { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' });
assert.equal(normalizePomodoroState({ ...initialPomodoroState, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 } }).settings.transitionMode, 'autoBreak', 'Old timer settings acquire the default automatic rest');

const running = startTimer(fresh(), start, 'recover', chosen);
const oneRound = startTimer(fresh(), start, 'one-round', chosen, 7);
assert.equal(oneRound.active.totalSeconds, 420);
assert.equal(oneRound.active.deadline, start + 420000);
assert.deepEqual(oneRound.settings, fresh().settings, 'Quick duration does not change regular rhythm');
assert.equal(normalizePomodoroState(JSON.parse(JSON.stringify(oneRound))).active.totalSeconds, 420, 'Existing active format retains one-round duration');
for (const invalid of [0, -1, 121, 2.5, NaN]) assert.equal(startTimer(fresh(), start, 'invalid', chosen, invalid).active.totalSeconds, 1500);
assert.equal(startTimer({ ...fresh(), mode: 'shortBreak' }, start, 'short', chosen, 60).active.totalSeconds, 3600);
assert.equal(startTimer({ ...fresh(), mode: 'shortBreak' }, start, 'invalid-short', chosen, 61).active.totalSeconds, 300);
assert.equal(startTimer(running, start, 'duplicate-override', chosen, 7), running, 'Quick duration cannot rewrite active timers');
const recovered = normalizePomodoroState(JSON.parse(JSON.stringify(running)));
assert.equal(remainingSeconds(recovered.active, start + 60_000), 1440);
const completed = finishTimer(recovered, start + 86_400_000);
assert.equal(completed.sessions[0].endedAt, new Date(start + 1_500_000).toISOString(), 'Return after background uses the original deadline');
assert.equal(completed.sessions[0].durationSeconds, 1500);
assert.equal(completed.sessions[0].taskId, chosen.taskId);
assert.equal(completed.mode, 'shortBreak');
assert.equal(completed.active, null, 'Explicit finish never starts another timer');
assert.equal(finishTimer(completed, start + 90_000_000).sessions.length, 1);
assert.equal(normalizePomodoroState({ ...completed, active: recovered.active }).active, null, 'A stale active timer cannot duplicate an already recorded round');

const paused = pauseTimer(running, start + 100_000);
assert.equal(remainingSeconds(paused.active, start + 3_600_000), 1400);
const resumed = resumeTimer(normalizePomodoroState(JSON.parse(JSON.stringify(paused))), start + 3_600_000);
const early = finishTimer(resumed, start + 3_700_000, true);
assert.equal(early.sessions[0].durationSeconds, 200, 'Paused time does not increase actual focus time');
assert.equal(early.sessions[0].completed, false);
assert.equal(finishTimer(running, start, true).sessions.length, 0, 'An immediate stop creates no empty record');
assert.equal(startTimer(running, start, 'duplicate', chosen).active.id, 'recover');

const chosenHabit = { taskId: null, habitId: 'exercise', title: 'Move for a while' };
const habitRun = startTimer(fresh(), start, 'habit-focus', chosenHabit);
assert.equal(model.isPomodoroState(habitRun), true);
assert.equal(habitRun.active.selection.habitId, chosenHabit.habitId);
assert.equal(habitRun.active.selection.taskId, null);
const habitReload = normalizePomodoroState(JSON.parse(JSON.stringify(habitRun)));
assert.equal(habitReload.active.selection.habitId, chosenHabit.habitId, 'A selected habit survives refresh');
const habitPaused = pauseTimer(habitReload, start + 60_000);
const habitResumed = resumeTimer(habitPaused, start + 90_000);
const habitEarly = finishTimer(habitResumed, start + 150_000, true);
assert.equal(habitEarly.sessions[0].habitId, chosenHabit.habitId, 'Early finish records the selected habit after pause and resume');
assert.equal(habitEarly.sessions[0].taskId, null);
assert.equal(habitEarly.sessions[0].durationSeconds, 120);
const habitRest = advanceTimer(habitReload, habitRun.active.deadline);
assert.equal(habitRest.sessions[0].habitId, chosenHabit.habitId, 'Automatic completion records the selected habit');
assert.equal(habitRest.selection.habitId, chosenHabit.habitId, 'The next focus retains the selected habit');
assert.equal(habitRest.active.selection.habitId, null, 'Rest is never attributed to the selected habit');
const habitCycle = advanceTimer(habitRest, habitRest.active.deadline);
assert.equal(habitCycle.sessions[0].habitId, null);
assert.equal(startTimer(habitCycle, start + 3_000_000, 'habit-next', habitCycle.selection).active.selection.habitId, chosenHabit.habitId);
assert.equal(startTimer({ ...habitCycle, mode: 'focus' }, start + 3_000_000, 'task-next', chosen).active.selection.habitId, null, 'Choosing a task clears the previous habit');
assert.equal(startTimer({ ...habitCycle, mode: 'focus' }, start + 3_000_000, 'free-next', { taskId: null, title: 'Free focus' }).active.selection.habitId, null, 'Legacy free-focus callers cannot retain an old habit');
const malformedLinks = normalizePomodoroState({ ...habitRun,
  selection: { taskId: ' task-a ', habitId: ' habit-a ', title: ' Both ' },
  active: { ...habitRun.active, selection: { taskId: null, habitId: ' h '.repeat(100), title: 'Habit' } },
  sessions: [{ ...completed.sessions[0], taskId: null, habitId: { invalid: true } }],
});
assert.deepEqual(malformedLinks.selection, { taskId: 'task-a', habitId: null, title: 'Both' }, 'A task link takes precedence over a malformed simultaneous habit link');
assert.equal(malformedLinks.active.selection.habitId.length, 100);
assert.equal(malformedLinks.sessions[0].habitId, null);
assert.equal(model.isPomodoroState({ ...initialPomodoroState, selection: { taskId: null, title: '' } }), true, 'Old states without a habit link stay writable');
assert.equal(model.isPomodoroState({ ...initialPomodoroState, selection: { taskId: null, habitId: 5, title: '' } }), false);

const automaticRest = advanceTimer(running, start + 1_510_000);
assert.equal(automaticRest.mode, 'shortBreak');
assert.equal(automaticRest.active.id, 'break:recover');
assert.equal(automaticRest.active.rootRunId, 'recover');
assert.equal(automaticRest.active.originFocusId, 'recover');
assert.equal(automaticRest.active.startedAt, new Date(start + 1_500_000).toISOString(), 'Automatic rest starts at the original deadline, without tick drift');
assert.equal(automaticRest.active.deadline, start + 1_800_000);
assert.equal(remainingSeconds(automaticRest.active, start + 1_510_000), 290);
assert.equal(automaticRest.selection.taskId, chosen.taskId, 'The next focus keeps its linked task');
assert.equal(automaticRest.active.selection.taskId, null, 'Rest never adds time to the linked task');
assert.equal(automaticRest.sessions[0].rootRunId, 'recover');
assert.equal(automaticRest.completedFocusCount, 1);
assert.equal(advanceTimer(automaticRest, start + 1_520_000), automaticRest, 'A not-yet-expired timer is unchanged');
const recoveredRest = normalizePomodoroState(JSON.parse(JSON.stringify(automaticRest)));
assert.equal(recoveredRest.active.originFocusId, 'recover');
const wholeCycle = advanceTimer(running, start + 86_400_000);
assert.equal(wholeCycle.active, null);
assert.equal(wholeCycle.mode, 'focus');
assert.equal(wholeCycle.sessions.length, 2, 'A day in the background records only the started focus and its rest');
assert.equal(wholeCycle.sessions[0].endedAt, new Date(start + 1_800_000).toISOString());
assert.equal(wholeCycle.sessions[1].endedAt, new Date(start + 1_500_000).toISOString());
assert.deepEqual(advanceTimer(recoveredRest, start + 86_400_000), wholeCycle, 'Recovery midway through rest matches recovery after the complete cycle');
assert.equal(advanceTimer(wholeCycle, start + 2 * 86_400_000), wholeCycle, 'Repeated recovery does not fabricate another focus');
assert.deepEqual(advanceTimer(running, start + 86_400_000), wholeCycle, 'The generated rest id is deterministic');
const explicitEarly = finishTimer(running, start + 1_510_000, true);
assert.equal(explicitEarly.active, null, 'An explicit early-finish action never starts rest, even at a boundary');
assert.equal(explicitEarly.sessions.length, 1);
const pausedRest = pauseTimer(running, start + 1_510_000);
assert.equal(pausedRest.active.mode, 'shortBreak', 'A pause racing with expiry pauses the newly started rest');
assert.equal(pausedRest.active.running, false);
assert.equal(pausedRest.active.remainingSeconds, 290);
assert.equal(advanceTimer(pausedRest, start + 86_400_000), pausedRest, 'Paused rest does not finish in the background');
const resumedRest = resumeTimer(pausedRest, start + 2_000_000);
assert.equal(resumedRest.active.rootRunId, 'recover');
assert.equal(resumedRest.active.deadline, start + 2_290_000);
assert.equal(advanceTimer(resumedRest, start + 2_290_000).sessions[0].durationSeconds, 300);
const manual = advanceTimer({ ...running, settings: { ...running.settings, transitionMode: 'manual' } }, start + 1_500_000);
assert.equal(manual.active, null);
assert.equal(manual.mode, 'shortBreak');
assert.equal(manual.sessions.length, 1);
assert.ok(model.automaticBreakId('a'.repeat(100)).length <= 100);
assert.notEqual(model.automaticBreakId('a'.repeat(100)), model.automaticBreakId('a'.repeat(99) + 'b'));

let rounds = fresh();
for (let index = 0; index < 4; index++) {
  rounds = startTimer({ ...rounds, mode: 'focus' }, start + index * 2_000_000, `round-${index}`, chosen);
  rounds = finishTimer(rounds, start + index * 2_000_000 + 1_500_000);
}
assert.equal(rounds.mode, 'longBreak');
assert.equal(rounds.completedFocusCount, 4);
let automaticRounds = fresh();
for (let index = 0; index < 4; index++) {
  const at = start + index * 3_000_000;
  automaticRounds = startTimer(automaticRounds, at, `automatic-${index}`, chosen);
  automaticRounds = advanceTimer(automaticRounds, at + 1_500_000);
  assert.equal(automaticRounds.active.mode, index === 3 ? 'longBreak' : 'shortBreak');
  assert.equal(automaticRounds.active.totalSeconds, index === 3 ? 900 : 300);
  automaticRounds = advanceTimer(automaticRounds, automaticRounds.active.deadline);
}
assert.equal(automaticRounds.sessions.length, 8);
assert.equal(automaticRounds.mode, 'focus');
assert.equal(automaticRounds.completedFocusCount, 4);
const custom = startTimer({ ...fresh(), settings: { focus: 2, shortBreak: 1, longBreak: 3, longEvery: 2, transitionMode: 'autoBreak' }, completedFocusCount: 1 }, start, 'custom', chosen);
const customRest = advanceTimer(custom, start + 120_000);
assert.equal(customRest.active.mode, 'longBreak');
assert.equal(customRest.active.deadline, start + 300_000);
const manyRounds = startTimer({ ...fresh(), completedFocusCount: 503 }, start, 'history-boundary', chosen);
assert.equal(advanceTimer(manyRounds, start + 1_500_000).active.mode, 'longBreak', 'Long-rest cadence survives pruned historical sessions');
assert.equal(normalizePomodoroState({ ...automaticRounds, completedFocusCount: 0 }).completedFocusCount, 4, 'A stale total cannot undercount the history still available');
const rest = finishTimer(startTimer({ ...fresh(), mode: 'shortBreak' }, start, 'rest', chosen), start + 300_000);
assert.equal(rest.sessions[0].taskId, null);
assert.equal(rest.sessions[0].title, '');
assert.equal(rest.sessions.filter(session => session.mode === 'focus').length, 0);
const malformed = normalizePomodoroState({ settings: { focus: Infinity, shortBreak: -5, longEvery: 99 }, active: { id: 'invalid', startedAt: 'bad' }, sessions: [completed.sessions[0], completed.sessions[0], null] });
assert.equal(malformed.active, null);
assert.equal(malformed.sessions.length, 1);
assert.deepEqual(malformed.settings, { focus: 25, shortBreak: 1, longBreak: 15, longEvery: 12, transitionMode: 'autoBreak' });
assert.equal(normalizePomodoroState({ sessions: Array.from({ length: 1010 }, (_, index) => ({ ...completed.sessions[0], id: `session-${index}` })) }).sessions.length, 1000);

const original = JSON.stringify(habits.initialReminders);
assert.equal(habits.isReminderState(habits.initialReminders), true);
assert.equal(habits.isReminderState({ ...habits.initialReminders, version: 2 }), false, 'Future habit schemas must remain read-only');
assert.equal(habits.isReminderState({ version: 1, items: [null], done: {} }), false);
assert.deepEqual(habits.initialReminders.items.slice(0, 2).map(item => [item.id, item.title]), [['exercise', '力量训练'], ['cardio', '有氧运动']]);
assert.equal(habits.initialReminders.items[1].kind, 'walk');
assert.equal(habits.initialReminders.items[1].iconId, 'run');
assert.equal(habits.initialReminders.items[1].domainId, habits.initialReminders.items[0].domainId);
assert.equal(habits.initialReminders.items[1].priority, 'none');

const legacyExercise = { ...habits.initialReminders.items[0], title: ' 力量训练 / 有氧运动 ', group: '我的训练', domainId: 'custom-training',
  enabled: false, priority: 'high', createdAt: start, minutes: 12, note: '保留自己的计划', iconId: 'basketball',
  backgroundKind: 'plant', backgroundImage: 'https://images.example.com/exercise.png', extension: { keep: 'original' } };
const exerciseDay = habits.habitDayIndex('2026-09-12');
const legacyExerciseState = { version: 1, items: [habits.initialReminders.items[2], legacyExercise, habits.initialReminders.items[3]],
  done: { '2026-09-12': ['exercise', 'unplug'] }, completionHistory: { exercise: [[exerciseDay - 30, exerciseDay]] },
  reflections: [{ id: 'exercise-note', habitId: 'exercise', day: '2026-09-12', text: '旧训练记录', createdAt: start }], extension: { order: 'custom' } };
const beforeExerciseSplit = JSON.stringify(legacyExerciseState);
const splitExercise = habits.splitDefaultExerciseHabit(legacyExerciseState);
assert.equal(JSON.stringify(legacyExerciseState), beforeExerciseSplit, 'Splitting a default must not mutate the source archive');
assert.deepEqual(splitExercise.items.map(item => item.id), ['unplug', 'exercise', 'cardio', 'lunch-supplement'], 'Only the new cardio slot is inserted into saved ordering');
assert.deepEqual(splitExercise.items[1], { ...legacyExercise, title: '力量训练' }, 'The original identity, pause state and every custom field survive');
assert.deepEqual(splitExercise.items[2], { id: 'cardio', title: '有氧运动', kind: 'walk', iconId: 'run', note: '按今天的安排，完成有氧运动。',
  group: legacyExercise.group, domainId: legacyExercise.domainId, enabled: false, priority: 'high', createdAt: start, minutes: 12 });
assert.equal(splitExercise.done, legacyExerciseState.done);
assert.equal(splitExercise.completionHistory, legacyExerciseState.completionHistory);
assert.equal(splitExercise.reflections, legacyExerciseState.reflections);
assert.equal(splitExercise.extension, legacyExerciseState.extension);
assert.equal(habits.cleanState(splitExercise).completionHistory.cardio, undefined, 'Past combined completions are never duplicated onto cardio');
assert.deepEqual(habits.cleanState(splitExercise).reflections.map(note => note.habitId), ['exercise']);
assert.equal(habits.splitDefaultExerciseHabit(splitExercise), splitExercise, 'The migration is idempotent');
assert.equal(habits.splitDefaultExerciseHabit(habits.initialReminders), habits.initialReminders, 'New defaults need no migration');
for (const unchangedExercise of [
  { ...legacyExerciseState, items: legacyExerciseState.items.filter(item => item.id !== 'exercise') },
  { ...legacyExerciseState, items: splitExercise.items.filter(item => item.id !== 'cardio') },
  { ...legacyExerciseState, items: legacyExerciseState.items.map(item => item.id === 'exercise' ? { ...item, title: '自己安排的训练' } : item) },
  { ...legacyExerciseState, items: legacyExerciseState.items.map(item => item.id === 'exercise' ? { ...item, kind: 'walk' } : item) },
  { ...legacyExerciseState, items: legacyExerciseState.items.map(item => item.id === 'exercise' ? { ...item, id: 'user-created' } : item) },
  { ...legacyExerciseState, version: 2 },
]) assert.equal(habits.splitDefaultExerciseHabit(unchangedExercise), unchangedExercise, 'Deleted, customized and unsupported archives are not restored or rewritten');

for (const sameAssociation of [{ group: '别的显示名', domainId: legacyExercise.domainId }, { group: legacyExercise.group, domainId: undefined }]) {
  const existingCardio = { ...legacyExercise, ...sameAssociation, id: 'my-cardio', title: '有氧运动', kind: 'walk', note: '自己的有氧计划' };
  const withCardio = { ...legacyExerciseState, items: [...legacyExerciseState.items, existingCardio] };
  const reusedCardio = habits.splitDefaultExerciseHabit(withCardio);
  assert.equal(reusedCardio.items.length, withCardio.items.length, 'Reuse the same stable domain, or the same legacy group when an ID is absent');
  assert.equal(reusedCardio.items.at(-1), existingCardio, 'Reusing cardio does not change user fields or its position');
  assert.equal(reusedCardio.items[1].title, '力量训练');
}
const unrelatedCardio = { ...legacyExercise, id: 'elsewhere-cardio', title: '有氧运动', group: '别的分组', domainId: 'elsewhere' };
const elsewhere = habits.splitDefaultExerciseHabit({ ...legacyExerciseState, items: [...legacyExerciseState.items, unrelatedCardio] });
assert.equal(elsewhere.items.length, legacyExerciseState.items.length + 2, 'An unrelated domain keeps its own cardio habit');
assert.equal(elsewhere.items.at(-1), unrelatedCardio);
const sameNamedGroup = { ...unrelatedCardio, group: legacyExercise.group };
const differentDomain = habits.splitDefaultExerciseHabit({ ...legacyExerciseState, items: [...legacyExerciseState.items, sameNamedGroup] });
assert.equal(differentDomain.items.length, legacyExerciseState.items.length + 2, 'Different stable domain IDs cannot be merged through a coincident group name');
assert.equal(differentDomain.items.at(-1), sameNamedGroup);
const collidingItems = ['cardio', 'cardio-2'].map(id => ({ ...legacyExercise, id, title: `自定义 ${id}` }));
const collisions = { ...legacyExerciseState, items: [...legacyExerciseState.items, ...collidingItems] };
const collisionSplit = habits.splitDefaultExerciseHabit(collisions);
assert.equal(collisionSplit.items[2].id, 'cardio-3', 'Occupied IDs receive a deterministic free suffix');
assert.deepEqual(collisionSplit.items.slice(-2), collidingItems, 'ID allocation never overwrites custom habits');
assert.deepEqual(habits.splitDefaultExerciseHabit(collisions), collisionSplit, 'The same untouched archive chooses the same ID');
const orphanedCardio = { ...legacyExerciseState, done: { '2026-09-12': ['exercise', 'cardio'] },
  completionHistory: { ...legacyExerciseState.completionHistory, 'cardio-2': [[exerciseDay, exerciseDay]] },
  reflections: [...legacyExerciseState.reflections, { id: 'orphan-note', habitId: 'cardio-3', day: '2026-09-12', text: '已删除习惯的旧记录', createdAt: start }] };
const orphanSafeSplit = habits.splitDefaultExerciseHabit(orphanedCardio);
assert.equal(orphanSafeSplit.items[2].id, 'cardio-4', 'New cardio IDs must not inherit orphan calendar, archive or reflection references');
assert.equal(orphanSafeSplit.done, orphanedCardio.done);
assert.equal(orphanSafeSplit.completionHistory, orphanedCardio.completionHistory);
assert.equal(orphanSafeSplit.reflections, orphanedCardio.reflections);
assert.equal(habits.cleanState(orphanSafeSplit).completionHistory['cardio-4'], undefined);

const fullExercise = { ...legacyExerciseState, items: [legacyExercise, ...Array.from({ length: 79 }, (_, index) => ({ ...legacyExercise, id: `custom-${index}`, title: `习惯 ${index}` }))] };
assert.equal(habits.splitDefaultExerciseHabit(fullExercise), fullExercise, 'At capacity, preserve all 80 habits and the old combined title');
const fullWithCardio = { ...fullExercise, items: fullExercise.items.map((item, index) => index === 79 ? { ...item, title: '有氧运动' } : item) };
const fullReused = habits.splitDefaultExerciseHabit(fullWithCardio);
assert.equal(fullReused.items.length, 80);
assert.equal(fullReused.items[0].title, '力量训练', 'A full archive can split when its existing cardio habit is reused');
assert.equal(fullReused.items[79], fullWithCardio.items[79]);
const maxReminderBytes = 1024 * 1024;
const nearlyFullBytes = { ...legacyExerciseState, capacityNote: '' };
const availablePadding = maxReminderBytes - 20 - Buffer.byteLength(JSON.stringify(nearlyFullBytes), 'utf8');
nearlyFullBytes.capacityNote = '中🙂'.repeat(Math.floor(availablePadding / 7)) + 'x'.repeat(availablePadding % 7);
assert.equal(Buffer.byteLength(JSON.stringify(nearlyFullBytes), 'utf8'), maxReminderBytes - 20);
const bytesBeforeSplit = JSON.stringify(nearlyFullBytes);
assert.equal(habits.splitDefaultExerciseHabit(nearlyFullBytes), nearlyFullBytes, 'A near-limit Chinese/emoji archive cannot be partially rewritten or exceed its UTF-8 budget');
assert.equal(JSON.stringify(nearlyFullBytes), bytesBeforeSplit);
const withByteRoom = { ...nearlyFullBytes, capacityNote: nearlyFullBytes.capacityNote.slice(0, -1024) };
const byteSafeSplit = habits.splitDefaultExerciseHabit(withByteRoom);
assert.equal(byteSafeSplit.items[1].title, '力量训练');
assert.equal(byteSafeSplit.items[2].title, '有氧运动');
assert.ok(Buffer.byteLength(JSON.stringify(byteSafeSplit), 'utf8') <= maxReminderBytes, 'Capacity permits a complete migration once space is available');
const sparseLegacy = { ...legacyExerciseState, items: [{ ...legacyExercise, domainId: undefined, createdAt: undefined, priority: undefined }] };
const sparseCardio = habits.splitDefaultExerciseHabit(sparseLegacy).items[1];
assert.equal(sparseCardio.priority, 'none');
assert.equal(Object.hasOwn(sparseCardio, 'createdAt'), false);
assert.equal(Object.hasOwn(sparseCardio, 'domainId'), false);
const twoEnabled = { ...splitExercise, items: splitExercise.items.map(item => ({ ...item, enabled: true })) };
const cardioChecked = habits.toggleReminderDone(twoEnabled, 'cardio', '2026-09-12');
assert.deepEqual(cardioChecked.done['2026-09-12'], ['exercise', 'unplug', 'cardio']);
assert.deepEqual(habits.toggleReminderDone(cardioChecked, 'exercise', '2026-09-12').done['2026-09-12'], ['unplug', 'cardio'], 'The two check-ins can be completed and undone independently');
assert.equal(model.isPomodoroState(initialPomodoroState), true);
assert.equal(model.isPomodoroState({ ...initialPomodoroState, version: 2 }), false, 'Future timer schemas must remain read-only');
assert.equal(model.isPomodoroState({ ...initialPomodoroState, sessions: [null] }), false);
const extendedHabits = { ...habits.initialReminders, appearance: { density: 'compact' }, items: habits.initialReminders.items.map(item => ({ ...item, customLabel: 'web metadata', backgroundKind: 'plant', backgroundImage: 'https://images.example.com/background.png' })) };
const preservedHabit = habits.toggleReminderDone(extendedHabits, 'exercise', '2026-09-12');
assert.deepEqual(preservedHabit.appearance, extendedHabits.appearance);
assert.equal(preservedHabit.items[0].customLabel, 'web metadata');
assert.equal(preservedHabit.items[0].backgroundKind, 'plant');
assert.equal(preservedHabit.items[0].backgroundImage, extendedHabits.items[0].backgroundImage);
const extendedTimer = normalizePomodoroState({ ...running, customRoot: 'keep', settings: { ...running.settings, accent: 'mint' }, selection: { ...running.selection, context: 'web' }, active: { ...running.active, id: 'with-extra', customActive: 42, selection: { ...running.selection, context: 'active' } }, sessions: [{ ...completed.sessions[0], customSession: 'keep' }] });
assert.equal(extendedTimer.customRoot, 'keep');
assert.equal(extendedTimer.settings.accent, 'mint');
assert.equal(extendedTimer.selection.context, 'web');
assert.equal(extendedTimer.active.customActive, 42);
assert.equal(extendedTimer.active.selection.context, 'active');
assert.equal(extendedTimer.sessions[0].customSession, 'keep');
assert.equal(pauseTimer(extendedTimer, start + 1000).active.customActive, 42);
assert.equal(startTimer({ ...extendedTimer, active: null }, start, 'new-with-extra', chosen).selection.context, 'web');
const checked = habits.toggleReminderDone(habits.initialReminders, 'exercise', '2026-09-12');
assert.deepEqual(checked.done['2026-09-12'], ['exercise']);
assert.deepEqual(habits.toggleReminderDone(checked, 'exercise', '2026-09-12').done['2026-09-12'], []);
assert.equal(JSON.stringify(habits.initialReminders), original, 'A check-in must not mutate defaults');
assert.deepEqual(habits.toggleReminderDone(checked, 'missing-id', '2026-09-12'), checked, 'Unknown habits cannot add invisible check-ins');
const disabled = { ...checked, items: checked.items.map(item => item.id === 'exercise' ? { ...item, enabled: false } : item) };
assert.deepEqual(habits.toggleReminderDone(disabled, 'exercise', '2026-09-12').done, disabled.done);
assert.equal(habits.cleanState({ ...checked, items: checked.items.filter(item => item.id !== 'exercise') }).done['2026-09-12'].length, 0, 'Removing a habit cleans its old check-ins');
const manyDays = Object.fromEntries(habits.recentDays('2026-09-12', 100).map(day => [day, ['exercise']]));
const pruned = habits.toggleReminderDone({ ...checked, done: manyDays }, 'exercise', '2026-09-13');
assert.equal(Object.keys(pruned.done).length, 90);
assert.equal(Object.keys(pruned.done).sort().at(-1), '2026-09-13');
assert.deepEqual(habits.recentDays('2026-03-02', 4), ['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
assert.deepEqual(habits.recentDays('2024-03-01', 3), ['2024-02-28', '2024-02-29', '2024-03-01']);
// Domain attribution is optional in version 1 and independent of the linked task/habit.
assert.equal(fresh().selection.domainId, undefined, 'Reading an old unclassified timer does not invent a stored domain');
const domainFocus = startTimer(fresh(), start, 'domain-focus', { ...chosen, domainId: 'work' });
assert.equal(domainFocus.active.selection.domainId, 'work');
assert.equal(domainFocus.selection.domainId, 'work');
const domainPaused = pauseTimer(domainFocus, start + 60000);
const domainResumed = resumeTimer(normalizePomodoroState(JSON.parse(JSON.stringify(domainPaused))), start + 120000);
assert.equal(domainResumed.active.selection.domainId, 'work');
const domainEarly = finishTimer(domainResumed, start + 180000, true);
assert.equal(domainEarly.sessions[0].domainId, 'work');
assert.equal(domainEarly.sessions[0].durationSeconds, 120, 'Domain attribution cannot count paused time');
const domainRest = advanceTimer({ ...domainFocus, active: { ...domainFocus.active, selection: { ...domainFocus.active.selection, domainId: 'entertainment' } } }, domainFocus.active.deadline);
assert.equal(domainRest.sessions[0].domainId, 'entertainment');
assert.equal(domainRest.active.selection.domainId, 'entertainment', 'Automatic rest follows the current round, including a changed domain');
assert.equal(domainRest.active.selection.taskId, null);
const domainFinished = advanceTimer(domainRest, domainRest.active.deadline);
assert.equal(domainFinished.sessions[0].domainId, 'entertainment');
assert.equal(normalizePomodoroState(JSON.parse(JSON.stringify(domainFinished))).sessions[1].domainId, 'entertainment');
assert.equal(model.isPomodoroState(domainFinished), true);
assert.equal(model.isPomodoroState({ ...domainFocus, selection: { ...domainFocus.selection, domainId: 7 } }), false);
assert.equal(model.isPomodoroState({ ...domainEarly, sessions: [{ ...domainEarly.sessions[0], domainId: {} }] }), false);
assert.equal(normalizePomodoroState({ ...domainFocus, selection: { ...domainFocus.selection, domainId: ' work ' } }).selection.domainId, 'work');
console.log('Habits and focus passed: default/history preservation, check-ins and calendar boundaries, timer recovery, rhythms, bounded rest, original deadlines, duplicate prevention, notification lineage, lifetime cadence and optional domain attribution through pause/resume/early finish/automatic rest.');
