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
const { recentActivity, activitySourcesReady, activityTimeLabel } = load(path.join(__dirname, '../src/lib/recent-activity.ts'));
const { initialTodoState, initialMemoState } = load(path.join(__dirname, '../src/lib/tool-records.ts'));
const { initialReminders, habitDayIndex } = load(path.join(__dirname, '../src/lib/reminder-data.ts'));
const { initialPomodoroState } = load(path.join(__dirname, '../src/lib/pomodoro-data.ts'));
const { initialMealLibrary } = load(path.join(__dirname, '../src/lib/meal-data.ts'));
const { initialDomainState } = load(path.join(__dirname, '../src/lib/domain-data.ts'));
const now = new Date(2026, 9, 3, 12), stamp = (hour, day = 3) => new Date(2026, 9, day, hour).toISOString();
const sources = () => Object.fromEntries(Object.entries({
  todos: { ...initialTodoState, tasks: [] }, memos: { ...initialMemoState, notes: [] },
  reminders: { ...initialReminders, done: {} }, pomodoro: initialPomodoroState,
  meals: initialMealLibrary, domains: initialDomainState,
}).map(([key, value]) => [key, { owner: 'guest', ready: true, value: structuredClone(value) }]));
const data = sources();
assert.equal(activitySourcesReady(data), true);
assert.deepEqual(recentActivity(now, data), [], 'Empty saved histories produce no invented activity');
data.todos.value.tasks = [{ ...initialTodoState.tasks[0], id: 'task', title: '清楚写下方案', createdAt: stamp(8), updatedAt: stamp(10), completedAt: stamp(10) }];
data.memos.value.notes = [{ ...initialMemoState.notes[0], id: 'memo', title: '新的想法', createdAt: stamp(9, 2), updatedAt: stamp(11) }];
data.pomodoro.value.sessions = [{ id: 'focus', mode: 'focus', durationSeconds: 1500, plannedSeconds: 1500, startedAt: stamp(8), endedAt: stamp(9), completed: true, taskId: null, title: '阅读' }];
data.reminders.value.items = [initialReminders.items[0]];
data.reminders.value.done = { '2026-10-03': [initialReminders.items[0].id, initialReminders.items[0].id], '2026-10-04': [initialReminders.items[0].id] };
data.meals.value.nutrition = [{ id: 'lunch', date: '2026-10-03', name: '番茄鸡蛋面', carbs: 60, protein: 20, fat: 10 }];
const work = data.domains.value.domains.find(item => item.id === 'work');
work.positiveRecords = [{ id: 'positive', content: '先打开了文档', createdAt: stamp(11) }];
work.negativeRecords = [{ id: 'negative', content: '有点回避', createdAt: stamp(10) }];
work.habits.push({ id: 'legacy-work-habit', name: '旧习惯', startedDates: ['2026-10-03'] });
data.domains.value.completedGoals = [{ id: 'goal', content: '完成简历', status: 'completed', domainId: 'work', kind: 'shortTerm', createdAt: stamp(8), completedAt: stamp(11) }];
const before = JSON.stringify(data), feed = recentActivity(now, data);
assert.equal(feed.length, 11);
assert.equal(new Set(feed.map(item => item.id)).size, feed.length);
assert.equal(JSON.stringify(data), before, 'Projection cannot mutate any live tool state');
for (const target of ['task', 'memos', 'pomodoro', 'daily', 'meals', 'domain']) assert(feed.some(item => item.target === target), `Include ${target} activity`);
assert(feed.some(item => item.label === '修改便签'));
assert(feed.some(item => item.label === '创建便签'));
assert(feed.every(item => item.day <= '2026-10-03'), 'Exclude future check-ins');
const dayOnly = feed.filter(item => item.occurredAt === null);
assert.equal(dayOnly.length, 3);
assert(dayOnly.every(item => activityTimeLabel(item) === '按日记录'), 'Do not invent a midnight time for date-only records');
assert(feed.findIndex(item => item.id === 'task-created:task') < feed.findIndex(item => item.id.startsWith('habit:')), 'Exact times precede unordered date-only entries within the same day');
assert(feed.slice(0, -1).every((item, index) => item.day >= feed[index + 1].day), 'Group days newest first');

const mixed = structuredClone(data); mixed.domains.owner = 'reader:someone';
assert.deepEqual(recentActivity(now, mixed), [], 'Never combine sources from different accounts');
mixed.domains.owner = 'guest'; mixed.memos.ready = false;
assert.deepEqual(recentActivity(now, mixed), [], 'Hide stale records during identity reload');
mixed.memos.ready = true; mixed.todos.owner = '';
assert.deepEqual(recentActivity(now, mixed), [], 'Unconfirmed identities have no visible activity');

const invalid = sources();
invalid.todos.value.tasks = [
  { ...initialTodoState.tasks[0], id: 'future', createdAt: stamp(13), completedAt: stamp(14) },
  { ...initialTodoState.tasks[0], id: 'bad', createdAt: '2026-02-31T12:00:00Z', completedAt: 'invalid' },
];
assert.deepEqual(recentActivity(now, invalid), [], 'Ignore invalid or future timestamps');
const many = sources();
many.todos.value.tasks = Array.from({ length: 50 }, (_, index) => ({ ...initialTodoState.tasks[0], id: `task-${index}`, createdAt: new Date(now.getTime() - index * 60000).toISOString(), completedAt: null }));
many.todos.value.tasks.push(many.todos.value.tasks[0]);
assert.equal(recentActivity(now, many).length, 30);
assert.equal(recentActivity(now, many)[0].id, 'task-created:task-0');
assert.equal(recentActivity(now, many)[29].id, 'task-created:task-29');

const archive = sources(), habit = initialReminders.items[0], ordinal = habitDayIndex('2026-10-03');
archive.reminders.value = { version: 1, items: [habit], done: { '2026-10-03': [] }, completionHistory: { [habit.id]: [[ordinal - 500, ordinal]] } };
assert.equal(recentActivity(now, archive).length, 30, 'Compact history can supply recent habit activity');
assert(!recentActivity(now, archive).some(item => item.day === '2026-10-03'), 'Explicit undo overrides archived completion');
const timer = sources();
timer.pomodoro.value.active = { id: 'away', mode: 'focus', totalSeconds: 1500, remainingSeconds: 1500, running: true, deadline: now.getTime(), startedAt: new Date(now.getTime() - 1500000).toISOString(), selection: { taskId: null, title: '后台完成' } };
assert.equal(recentActivity(now, timer)[0].id, 'focus:away', 'Expired focus appears without reopening timer page');
assert.equal(recentActivity(new Date(now.getTime() - 1), timer).length, 0);
const pictureOnly = sources();
pictureOnly.domains.value.domains[0].positiveRecords = [{ id: 'picture-progress', content: '', images: [{ id: 'progress-photo', dataUrl: 'data:image/png;base64,aW1hZ2U=' }], createdAt: stamp(11) }];
assert.equal(recentActivity(now, pictureOnly)[0].title, '图片记录', 'Picture-only progress has a readable activity title');
console.log('PASS recent activity: six stores, exact/day-only dates, future/invalid data, dedup, 30-item limit, history projection and identity isolation');
