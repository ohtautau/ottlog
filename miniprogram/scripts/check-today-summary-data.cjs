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
const { todaySummary } = load(path.join(__dirname, '../src/lib/today-summary.ts'));
const { initialTodoState, initialMemoState } = load(path.join(__dirname, '../src/lib/tool-records.ts'));
const { initialPomodoroState } = load(path.join(__dirname, '../src/lib/pomodoro-data.ts'));
const { initialReminders, habitDayIndex } = load(path.join(__dirname, '../src/lib/reminder-data.ts'));
const now = new Date(2026, 8, 16, 10), today = new Date(2026, 8, 16, 0, 1).toISOString(), yesterday = new Date(2026, 8, 15, 23, 59).toISOString();
const habit = initialReminders.items[0], ordinal = habitDayIndex('2026-09-16');
const todos = { ...initialTodoState, tasks: [{ id: 'done', completedAt: today }, { id: 'yesterday', completedAt: yesterday }, { id: 'open', completedAt: null }, { id: 'invalid', completedAt: 'invalid' }] };
const session = { mode: 'focus', durationSeconds: 1500, completed: true, endedAt: today };
const pomodoro = { ...initialPomodoroState, sessions: [{ ...session, id: 'full' }, { ...session, id: 'early', durationSeconds: 120, completed: false }, { ...session, id: 'rest', mode: 'shortBreak' }, { ...session, id: 'old', endedAt: yesterday }, { ...session, id: 'empty', durationSeconds: 0 }], active: { id: 'running' } };
const habits = { version: 1, items: [habit], done: { '2026-09-16': [habit.id, habit.id, 'deleted'] }, completionHistory: { [habit.id]: [[ordinal, ordinal]] } };
const memos = { ...initialMemoState, notes: [{ id: 'new', createdAt: today }, { id: 'edited-old', createdAt: yesterday, updatedAt: today }] };
const result = todaySummary(now, todos, pomodoro, habits, memos);
assert.deepEqual(result.tasks.map(task => task.id), ['done']);
assert.deepEqual(result.sessions.map(session => session.id), ['full', 'early']);
assert.equal(result.completedFocus, 1);
assert.equal(result.focusSeconds, 1620);
assert.equal(result.habits.length, 1);
assert.deepEqual(result.notes.map(note => note.id), ['new']);
assert.equal(todaySummary(now, todos, pomodoro, { ...habits, done: {} }, memos).habits.length, 1, 'Use durable history when recent calendar is absent');
assert.equal(todaySummary(now, todos, pomodoro, { ...habits, done: { '2026-09-16': [] } }, memos).habits.length, 0, 'An explicit undo overrides archived completion');
assert.equal(todaySummary(new Date(2026, 8, 17), todos, pomodoro, habits, memos).tasks.length, 0, 'Day changes do not retain yesterday');
// Valid offsets can sort differently as text. Construct both instants at local
// midday so this regression also runs in CI time zones outside Asia.
const earlier = new Date(2026, 8, 16, 12).getTime();
const earlierOffset = new Date(earlier + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
const laterUtc = new Date(earlier + 60 * 60 * 1000).toISOString();
const mixedStamps = [{ id: 'earlier-offset', stamp: earlierOffset }, { id: 'later-utc', stamp: laterUtc }];
const mixed = todaySummary(now,
  { ...initialTodoState, tasks: mixedStamps.map(({ id, stamp }) => ({ id, completedAt: stamp })) },
  { ...initialPomodoroState, sessions: mixedStamps.map(({ id, stamp }) => ({ ...session, id, endedAt: stamp })) },
  habits,
  { ...initialMemoState, notes: mixedStamps.map(({ id, stamp }) => ({ id, createdAt: stamp })) });
for (const rows of [mixed.tasks, mixed.sessions, mixed.notes]) assert.deepEqual(rows.map(row => row.id), ['later-utc', 'earlier-offset']);
const deadline = now.getTime();
const timerState = { ...initialPomodoroState, active: {
  id: 'finishing-away', mode: 'focus', totalSeconds: 1500, remainingSeconds: 1500,
  running: true, deadline, startedAt: new Date(deadline - 1500 * 1000).toISOString(),
  selection: { taskId: null, title: '后台完成的一轮' },
} };
const beforeProjection = JSON.stringify(timerState);
const projected = todaySummary(now, initialTodoState, timerState, habits, initialMemoState);
assert.equal(projected.completedFocus, 1, 'Elapsed focus counts without reopening the timer page');
assert.equal(projected.focusSeconds, 1500);
assert.equal(projected.sessions[0].id, 'finishing-away');
assert.equal(JSON.stringify(timerState), beforeProjection, 'Summary projection cannot mutate the live timer');
assert.equal(todaySummary(new Date(deadline - 1), initialTodoState, timerState, habits, initialMemoState).completedFocus, 0, 'An unfinished round does not count');
assert.equal(todaySummary(now, initialTodoState, { ...timerState, active: { ...timerState.active, running: false } }, habits, initialMemoState).completedFocus, 0, 'Paused timers do not finish in the summary');
assert.equal(todaySummary(new Date(2026, 8, 17, 10), initialTodoState, timerState, habits, initialMemoState).completedFocus, 0, 'Projected completion belongs to its deadline day');
console.log('Today summary: local dates, mixed UTC offsets, elapsed timer projection, focus duration, habit history/undo and new memo filtering passed.');
