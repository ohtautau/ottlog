const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function('exports', source)(exports);
  return exports;
}
const mini = load(path.resolve(__dirname, '../src/lib/pomodoro-data.ts'));
const web = load(path.resolve(__dirname, '../../web/src/app/pomodoro/pomodoro-data.ts'));
const serialized = value => JSON.parse(JSON.stringify(value));
const roundTrip = value => mini.normalizePomodoroState(serialized(web.normalizePomodoroState(serialized(value))));
const at = Date.parse('2026-09-15T01:00:00Z');
const selection = { taskId: 'task-a', title: 'Cross-client focus', context: 'linked task metadata' };

const first = mini.startTimer(mini.normalizePomodoroState({
  ...mini.initialPomodoroState,
  completedFocusCount: 503,
  customRoot: { futureClient: true },
  settings: { ...mini.initialPomodoroState.settings, customRhythm: 'retained' },
  selection,
}), at, 'cross-client-round-504', selection);
first.active.customActive = { retained: true };
const returned = roundTrip(first);
assert.deepEqual(returned, first, 'A running focus survives mini -> web -> mini without losing future fields');
assert.equal(returned.settings.transitionMode, 'autoBreak');
assert.equal(returned.active.rootRunId, first.active.id);
assert.equal(returned.completedFocusCount, 503, 'The lifetime total survives after old history was pruned');

const automaticRest = mini.advanceTimer(returned, first.active.deadline + 10_000);
assert.equal(automaticRest.active.mode, 'longBreak');
assert.equal(automaticRest.active.rootRunId, first.active.id);
assert.equal(automaticRest.active.originFocusId, first.active.id);
assert.equal(automaticRest.completedFocusCount, 504);
automaticRest.sessions[0].customSession = { retained: true };
assert.deepEqual(roundTrip(automaticRest), automaticRest, 'Generated rest, notification lineage and recorded focus metadata survive normalization');

const savedByWeb = web.finishTimer(web.normalizePomodoroState(serialized(first)), first.active.deadline);
assert.equal(savedByWeb.completedFocusCount, 504, 'Completing a mini focus in web increments the lifetime total once');
assert.equal(savedByWeb.mode, 'longBreak');
assert.equal(savedByWeb.sessions[0].rootRunId, first.active.rootRunId);
assert.equal(web.finishTimer(savedByWeb, first.active.deadline + 1000), savedByWeb, 'Repeated completion after clearing active is idempotent');
const staleSnapshot = web.normalizePomodoroState(serialized({ ...savedByWeb, active: first.active }));
assert.equal(staleSnapshot.active, null, 'Normalization rejects an already recorded active focus');
assert.equal(web.finishTimer(staleSnapshot, first.active.deadline + 1000).completedFocusCount, 504);

const webRest = web.startTimer(savedByWeb, first.active.deadline, 'web-started-long-rest', selection);
const afterRest = mini.advanceTimer(roundTrip(webRest), webRest.active.deadline);
assert.equal(afterRest.completedFocusCount, 504, 'Finishing rest never increments completed focus count');
assert.equal(afterRest.mode, 'focus');
const nextFocus = mini.startTimer(afterRest, webRest.active.deadline, 'round-505', selection);
const nextRest = mini.advanceTimer(nextFocus, nextFocus.active.deadline);
assert.equal(nextRest.active.mode, 'shortBreak', 'Returning to mini keeps long-rest cadence after a web completion');
assert.equal(nextRest.completedFocusCount, 505);

const manual = roundTrip({ ...first, settings: { ...first.settings, transitionMode: 'manual' } });
assert.equal(manual.settings.transitionMode, 'manual');
assert.equal(mini.advanceTimer(manual, first.active.deadline).active, null, 'Explicit manual transition preference survives web normalization');

for (const offset of [-1000, 0, 10_000, 899_000, 900_000, 86_400_000]) {
  const now = first.active.deadline + offset;
  assert.deepEqual(mini.pauseTimer(returned, now), mini.pauseTimer(mini.advanceTimer(returned, now), now),
    `Pausing at boundary offset ${offset} matches advancing then pausing`);
}
const pausedRest = mini.pauseTimer(returned, first.active.deadline + 10_000);
const resumedByWeb = web.resumeTimer(web.normalizePomodoroState(serialized(pausedRest)), first.active.deadline + 60_000);
assert.equal(resumedByWeb.active.rootRunId, first.active.id);
assert.equal(resumedByWeb.active.originFocusId, first.active.id);
assert.equal(resumedByWeb.active.deadline, first.active.deadline + 950_000);
const finishedRest = mini.advanceTimer(roundTrip(resumedByWeb), resumedByWeb.active.deadline);
assert.equal(finishedRest.completedFocusCount, 504);
assert.equal(finishedRest.sessions[0].mode, 'longBreak');
assert.equal(finishedRest.sessions[0].durationSeconds, 900, 'A cross-client pause contributes no fake rest time');
assert.equal(finishedRest.sessions[0].rootRunId, first.active.id);
assert.equal(finishedRest.sessions[0].originFocusId, first.active.id);
assert.equal(mini.advanceTimer(roundTrip(finishedRest), resumedByWeb.active.deadline + 86_400_000).sessions.length, 2);

// Finish helpers can receive a stale active record during a state merge; that round is already counted.
const mergedCompletion = web.finishTimer({ ...savedByWeb, active: first.active }, first.active.deadline);
assert.equal(mergedCompletion.completedFocusCount, 504, 'A stale merged active record cannot increment a recorded focus twice');

const habitSelection = { taskId: null, habitId: 'habit-read', title: 'Read a little', context: 'habit metadata' };
const habitFocus = mini.startTimer(mini.normalizePomodoroState(mini.initialPomodoroState), at, 'habit-cross-client', habitSelection);
assert.deepEqual(roundTrip(habitFocus), habitFocus, 'A selected habit and its metadata survive mini -> web -> mini');
const habitRest = mini.advanceTimer(roundTrip(habitFocus), habitFocus.active.deadline);
assert.equal(habitRest.sessions[0].habitId, habitSelection.habitId);
assert.equal(habitRest.active.selection.habitId, null);
assert.deepEqual(roundTrip(habitRest), habitRest, 'Recorded habit focus and automatic rest preserve separate attribution');
const habitSavedByWeb = web.finishTimer(web.normalizePomodoroState(serialized(habitFocus)), habitFocus.active.deadline);
assert.equal(habitSavedByWeb.sessions[0].habitId, habitSelection.habitId, 'Completing a mini habit focus in web preserves the habit link');
assert.equal(habitSavedByWeb.sessions[0].taskId, null);
assert.equal(roundTrip(habitSavedByWeb).sessions[0].habitId, habitSelection.habitId);
const habitPausedByWeb = web.pauseTimer(web.normalizePomodoroState(serialized(habitFocus)), at + 60_000);
const habitResumedInMini = mini.resumeTimer(roundTrip(habitPausedByWeb), at + 120_000);
const habitEarlySavedByWeb = web.finishTimer(web.normalizePomodoroState(serialized(habitResumedInMini)), at + 180_000, true);
assert.equal(habitEarlySavedByWeb.sessions[0].habitId, habitSelection.habitId);
assert.equal(habitEarlySavedByWeb.sessions[0].durationSeconds, 120);
assert.equal(web.normalizePomodoroState({ ...habitFocus, selection: { taskId: ' task-a ', habitId: 'habit-a', title: 'Task' } }).selection.habitId, null, 'Both clients resolve conflicting links consistently');

const domainFocus = mini.startTimer(mini.normalizePomodoroState(mini.initialPomodoroState), at, 'domain-cross-client', { ...habitSelection, domainId: 'entertainment' });
assert.deepEqual(roundTrip(domainFocus), domainFocus, 'Web normalization retains the mini-only domain association');
const domainSavedInMini = mini.finishTimer(domainFocus, domainFocus.active.deadline);
assert.equal(roundTrip(domainSavedInMini).sessions[0].domainId, 'entertainment', 'Mini-recorded domain metadata survives web reading');
console.log('PASS mini/web pomodoro habit/domain reading attribution, metadata, notification lineage, transition preferences, lifetime count, long-rest cadence, cross-client pause/resume and boundary consistency.');
