const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const filename = path.resolve(__dirname, '../src/lib', `${name}.ts`);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {}; cache.set(name, exports);
  new Function('exports', 'require', code)(exports, dependency => load(dependency.replace(/^\.\//, '')));
  return exports;
}
const { taskStatisticsInsight, focusStatisticsInsight } = load('statistics-task-focus-insights');
const { insightWindow } = load('statistics-insight-model');
const { initialPomodoroState } = load('pomodoro-data');
const metric = (result, label) => result.metrics.find(item => item.label === label);
const points = result => Object.fromEntries(result.charts[0].points.map(point => [point.key, point.values[0]]));
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const item of Object.values(value)) freeze(item); }
  return value;
}
const stamp = (day, hour = 12, minute = 0, month = 9) => new Date(2026, month, day, hour, minute).toISOString();
const now = new Date(2026, 9, 12, 14, 30);
const todo = patch => ({
  id: 'task', title: '保留任务', description: '', categoryId: '', important: false, urgent: false,
  dueDate: '', completedAt: null, createdAt: stamp(6), updatedAt: stamp(6), ...patch,
});

// Five disjoint current-deadline buckets must include every open task once.
const completed = [
  todo({ id: 'same-minute', createdAt: stamp(12, 11), completedAt: stamp(12, 13), dueDate: '2026-10-12', dueTime: '13:00' }),
  todo({ id: 'late-minute', createdAt: stamp(11, 12), completedAt: stamp(12, 13, 1), dueDate: '2026-10-12', dueTime: '13:00' }),
  todo({ id: 'day-only', createdAt: stamp(10), completedAt: stamp(11, 23, 59), dueDate: '2026-10-11' }),
  todo({ id: 'no-schedule', createdAt: stamp(9), completedAt: stamp(10) }),
  todo({ id: 'invalid-due', createdAt: stamp(9), completedAt: stamp(10), dueDate: '2026-02-30' }),
  todo({ id: 'invalid-created', createdAt: 'invalid', completedAt: stamp(10) }),
  todo({ id: 'reverse-created', createdAt: stamp(12), completedAt: stamp(10) }),
];
const open = [
  todo({ id: 'old-date', important: true, dueDate: '2026-10-11' }),
  todo({ id: 'old-time', dueDate: '2026-10-12', dueTime: '14:29' }),
  todo({ id: 'at-time', dueDate: '2026-10-12', dueTime: '14:30' }),
  todo({ id: 'day-today', dueDate: '2026-10-12' }),
  todo({ id: 'tomorrow', dueDate: '2026-10-13' }),
  todo({ id: 'day-seven', dueDate: '2026-10-19' }),
  todo({ id: 'day-eight', dueDate: '2026-10-20' }),
  todo({ id: 'no-date' }),
  todo({ id: 'invalid-date', dueDate: '2026-02-30' }),
];
const state = freeze({ version: 1, categories: [], tasks: [...completed, ...open,
  todo({ id: 'previous', completedAt: stamp(5) }),
  todo({ id: 'too-old', completedAt: stamp(28, 12, 0, 8) }),
  todo({ id: 'tomorrow-completed', completedAt: stamp(13) }),
  todo({ id: 'later-today', completedAt: stamp(12, 14, 31) }),
  todo({ id: 'invalid-completed', completedAt: 'invalid' }),
] });
const before = JSON.stringify(state), clockBefore = now.getTime();
const report = taskStatisticsInsight(state, now, 7);
assert.equal(metric(report, '期间完成').value, '7', 'Only valid completed timestamps at or before now count');
assert.equal(metric(report, '完成活跃天').value, '3');
assert.equal(metric(report, '按时完成率').value, '66.7');
assert.equal(metric(report, '按时完成率').caption, '期间3件有日程的完成任务');
assert.equal(metric(report, '平均完成用时').value, '22.2', 'Five valid elapsed times: 2, 25+1/60, 35+59/60, 24, 24 hours');
assert.equal(metric(report, '平均完成用时').caption, '5件有效创建至完成的经过时间');
assert.equal(metric(report, '当前待办').value, '9');
assert.equal(metric(report, '当前逾期').value, '2');
assert.deepEqual(points(report), { overdue: 2, today: 2, 'next-week': 2, later: 1, unscheduled: 2 });
assert.equal(Object.values(points(report)).reduce((sum, value) => sum + value, 0), open.length);
assert.match(report.findings[0], /增加 6 件完成任务/);
assert.match(report.findings[1], /2026-10-10完成最多，共4件/);
assert.match(report.findings[2], /1件重要待办，其中1件已逾期/);
assert.equal(JSON.stringify(state), before, 'Reading and invalid metadata handling never changes archives');
assert.equal(now.getTime(), clockBefore, 'Period and next-week calculations cannot mutate the provided clock');
const longer = taskStatisticsInsight(state, now, 30);
assert.equal(metric(longer, '期间完成').value, '9', 'A wider period includes retained earlier completions');
assert.deepEqual(points(longer), points(report), 'Current snapshot never follows the selected period');

const session = (id, day, endedHour, minutes, patch = {}) => ({
  id, mode: 'focus', durationSeconds: minutes * 60, plannedSeconds: 1500,
  startedAt: stamp(day, endedHour - 1), endedAt: stamp(day, endedHour),
  completed: true, taskId: null, habitId: null, title: '专注事项', ...patch,
});
const focusState = freeze({ ...initialPomodoroState, completedFocusCount: 987, sessions: [
  session('morning', 12, 10, 25),
  session('noon-boundary', 12, 11, 10, { completed: false }),
  session('afternoon-boundary', 12, 13, 20),
  session('night-boundary', 11, 18, 5, { completed: false }),
  session('midnight', 11, 0, 1),
  session('previous', 5, 10, 40),
  session('too-old', 28, 10, 20, { startedAt: stamp(28, 9, 0, 8), endedAt: stamp(28, 10, 0, 8) }),
  session('future', 13, 10, 60),
  session('later-today', 12, 15, 60),
  session('short-rest', 12, 10, 10, { mode: 'shortBreak' }),
  session('long-rest', 12, 10, 20, { mode: 'longBreak' }),
  session('zero', 12, 10, 0),
  session('negative', 12, 10, -10),
  session('invalid-ended', 12, 10, 20, { endedAt: 'invalid' }),
  session('invalid-started', 12, 10, 20, { startedAt: 'invalid' }),
  session('reversed', 12, 10, 20, { startedAt: stamp(12, 11) }),
], active: { ...initialPomodoroState.selection, id: 'unfinished', mode: 'focus', totalSeconds: 1500,
  remainingSeconds: 60, running: true, deadline: now.getTime() + 60000, startedAt: stamp(12, 14), selection: initialPomodoroState.selection } });
const beforeFocus = JSON.stringify(focusState);
const focusReport = focusStatisticsInsight(focusState, now, 7);
assert.equal(metric(focusReport, '专注分钟').value, '61');
assert.equal(metric(focusReport, '投入天数').value, '2');
assert.equal(metric(focusReport, '完整结束率').value, '60');
assert.equal(metric(focusReport, '平均每轮').value, '12.2');
assert.equal(metric(focusReport, '完整番茄').value, '3', 'Lifetime rhythm counter is not a selected-period metric');
assert.equal(metric(focusReport, '提前结束').value, '2');
assert.deepEqual(points(focusReport), { morning: 26, noon: 10, afternoon: 20, night: 5 });
assert.equal(Object.values(points(focusReport)).reduce((sum, value) => sum + value, 0), 61, 'Every selected round is assigned whole to exactly one ending period');
assert.match(focusReport.findings[0], /增加 21 分钟专注/);
assert.match(focusReport.findings[1], /2026-10-12投入最多，共55分钟/);
assert.match(focusReport.findings[3], /提前结束的15分钟实际投入已计入/);
assert.equal(JSON.stringify(focusState), beforeFocus, 'Sessions, live timer and independent cumulative count remain untouched');

// Empty, zero-baseline and sub-minute early rounds remain finite and explicit.
for (const period of [7, 30]) {
  const emptyTask = taskStatisticsInsight(freeze({ version: 1, tasks: [], categories: [] }), now, period);
  const emptyFocus = focusStatisticsInsight(freeze({ ...initialPomodoroState, sessions: [] }), now, period);
  for (const result of [emptyTask, emptyFocus]) {
    assert.equal(result.charts.length, 1);
    assert.equal(Object.values(points(result)).every(value => value === 0), true);
    assert.match(result.findings[0], /均无记录/);
    for (const item of result.metrics) assert.doesNotMatch(item.value, /NaN|Infinity/);
  }
  assert.equal(metric(emptyTask, '按时完成率').value, '—', 'No denominator does not mean a 0% success rate');
  assert.equal(metric(emptyTask, '平均完成用时').value, '—');
  assert.equal(metric(emptyFocus, '完整结束率').value, '—');
  const tiny = focusStatisticsInsight({ ...initialPomodoroState, sessions: [session('tiny', 12, 10, 0.5, { completed: false })] }, now, period);
  assert.equal(metric(tiny, '专注分钟').value, '0.5');
  assert.match(tiny.findings[0], /前一等长期间无记录，本期 0.5 分钟专注/);
  assert.equal(points(tiny).morning, 0.5);
}

// Calendar days use device local dates, including DST changes and midnight offsets.
const originalZone = process.env.TZ;
try {
  process.env.TZ = 'America/New_York';
  for (const boundary of [new Date(2026, 2, 9, 12), new Date(2026, 10, 2, 12)]) {
    const window = insightWindow(boundary, 7);
    assert.equal(new Set([...window.previousDays, ...window.days]).size, 14);
    const oldest = new Date(boundary.getFullYear(), boundary.getMonth(), boundary.getDate() - 6, 12);
    const oldestStamp = oldest.toISOString();
    const current = taskStatisticsInsight({ version: 1, categories: [], tasks: [todo({ id: 'oldest', completedAt: oldestStamp })] }, boundary, 7);
    assert.equal(metric(current, '期间完成').value, '1', 'Both DST boundary weeks include the earliest local calendar day');
    assert.equal(window.days[0], `${oldest.getFullYear()}-${String(oldest.getMonth() + 1).padStart(2, '0')}-${String(oldest.getDate()).padStart(2, '0')}`);
  }
  const localNow = new Date(2026, 9, 12, 1);
  const localPrevious = '2026-10-12T03:59:00.000Z'; // 11 Oct 23:59 EDT.
  const localCurrent = '2026-10-12T04:01:00.000Z'; // 12 Oct 00:01 EDT.
  const localReport = taskStatisticsInsight({ version: 1, categories: [], tasks: [
    todo({ id: 'local-previous', completedAt: localPrevious }),
    todo({ id: 'local-current', completedAt: localCurrent }),
  ] }, localNow, 7);
  assert.equal(metric(localReport, '完成活跃天').value, '2', 'UTC midnight is not the device-local day boundary');
} finally {
  if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone;
}

console.log('PASS task/focus automatic statistics: period comparisons, five current-deadline buckets, on-time denominator, elapsed validity, local/DST dates, ending-period attribution, early/rest/live exclusions, empty rates and unchanged retained archives.');
