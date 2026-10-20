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
const { applyHabitOrder, longestUncheckedHabits, groupHabitsByTimePeriod } = load(path.join(__dirname, '../src/lib/habit-order.ts'));
const { habitDayIndex, cleanState } = load(path.join(__dirname, '../src/lib/reminder-data.ts'));
const { sortHabits, habitTimePeriod } = load(path.join(__dirname, '../src/lib/habit-metadata.ts'));
const { alignHabitDomain } = load(path.join(__dirname, '../src/lib/habit-domains.ts'));
const { orderedHabits, saveHabitOrder } = load(path.join(__dirname, '../src/lib/habit-order.ts'));
const { toggleReminderDone, localDate, isReminderState } = load(path.join(__dirname, '../src/lib/reminder-data.ts'));
const { initialDomainState, saveDomainHabit } = load(path.join(__dirname, '../src/lib/domain-data.ts'));
const webHabits = load(path.join(__dirname, '../../web/src/app/daily/reminders.ts'));
const custom = { id: 'custom', title: '一个习惯', note: '', kind: 'plant', group: '自定义领域', domainId: 'custom-domain', minutes: 0, enabled: true, priority: 'medium', createdAt: 12345 };
const roundTrip = cleanState(webHabits.cleanState(cleanState({ version: 1, items: [custom], done: {} })));
assert.deepEqual(roundTrip.items[0], custom, 'Web normalization retains domain names, bindings, priority and creation time');
const periodRoundTrip = cleanState(webHabits.cleanState(cleanState({ version: 1, items: [{ ...custom, timePeriod: 'night' }], done: {} })));
assert.equal(periodRoundTrip.items[0].timePeriod, 'night', 'The optional new field survives the existing web normalizer without a web change');
const priorityItems = [
  { id: 'none-new', priority: 'none', createdAt: 500 },
  { id: 'high-old', priority: 'high', createdAt: 100 },
  { id: 'low', priority: 'low', createdAt: 400 },
  { id: 'medium', priority: 'medium', createdAt: 300 },
  { id: 'high-new', priority: 'high', createdAt: 200 },
  { id: 'legacy' },
];
assert.deepEqual(sortHabits(priorityItems).map(item => item.id), ['high-new', 'high-old', 'medium', 'low', 'none-new', 'legacy']);
assert.equal(priorityItems[0].id, 'none-new', 'Sorting never mutates persisted order');
const renamedDomains = initialDomainState.domains.map(domain => domain.id === 'mind' ? { ...domain, name: '内心' } : domain);
const bound = alignHabitDomain({ id: 'legacy', title: '呼吸', group: '精神', kind: 'breathe' }, initialDomainState.domains);
assert.equal(bound.domainId, 'mind');
assert.equal(alignHabitDomain(bound, renamedDomains).group, '内心');
assert.equal(alignHabitDomain(bound, renamedDomains.filter(domain => domain.id !== 'mind')).group, '未分类');
assert.equal(alignHabitDomain({ ...bound, group: '内心', domainId: undefined }, renamedDomains).domainId, 'mind');
const createdAt = new Date('2026-10-04T01:00:00Z');
const withHabit = saveDomainHabit(initialDomainState, 'work', '优先推进', undefined, { priority: 'high' }, createdAt);
const createdHabit = withHabit.domains.find(domain => domain.id === 'work').habits.at(-1);
assert.equal(createdHabit.priority, 'high');
assert.equal(createdHabit.createdAt, createdAt.getTime());
const edited = saveDomainHabit(withHabit, 'work', '稍后推进', createdHabit.id, { priority: 'low' }, new Date('2026-10-05T01:00:00Z'));
assert.equal(edited.domains.find(domain => domain.id === 'work').habits.at(-1).createdAt, createdAt.getTime(), 'Editing retains original creation time');
assert.throws(() => saveDomainHabit(withHabit, 'work', '无效优先度', undefined, { priority: 'invalid' }), /优先度/);
const item = (id, enabled = true) => ({ id, enabled, title: id, group: '健康', kind: 'walk', note: '', minutes: 0 });
const items = ['a', 'hidden', 'b', 'paused', 'c', 'new'].map(id => item(id, id !== 'paused'));
assert.deepEqual(applyHabitOrder(items, ['c', 'a', 'b']).map(row => row.id), ['c', 'hidden', 'a', 'paused', 'b', 'new']);
assert.deepEqual(applyHabitOrder(items, ['c', 'deleted', 'c', 'a', 'b']).map(row => row.id), ['c', 'hidden', 'a', 'paused', 'b', 'new']);
assert.deepEqual(items.map(row => row.id), ['a', 'hidden', 'b', 'paused', 'c', 'new']);
const now = new Date(2026, 8, 15, 10).getTime();
const state = { version: 1, items: ['old', 'recent', 'never', 'today', 'also-never'].map(id => item(id)).concat(item('paused', false)), done: { '2026-09-15': ['today'], '2026-09-14': ['recent'] }, completionHistory: { old: [[habitDayIndex('2025-01-01'), habitDayIndex('2025-01-01')]] } };
assert.deepEqual(longestUncheckedHabits(state, now).map(row => row.id), ['never', 'also-never']);
assert.deepEqual(longestUncheckedHabits({ ...state, items: state.items.filter(row => !row.id.includes('never')) }, now).map(row => row.id), ['old', 'recent']);
assert.deepEqual(longestUncheckedHabits({ ...state, items: [item('today'), item('paused', false)] }, now), []);
const allHistory = cleanState({ ...state, done: { ...state.done, '2026-09-01': ['never', 'also-never'] } });
assert.deepEqual(longestUncheckedHabits(allHistory, now).map(row => row.id), ['old', 'never']);
assert.deepEqual(longestUncheckedHabits({ ...state, items: [item('old')] }, now).map(row => row.id), ['old']);
assert.deepEqual(longestUncheckedHabits({ ...state, items: [] }, now), []);
console.log('Habit order: filtered moves, stale drafts, durable history, never checked, today and paused exclusions passed');

const clock = new Date(2026, 9, 6, 18).getTime(), day = localDate(new Date(clock));
const rows = ['a', 'b', 'c', 'legacy'].map((id, index) => ({ ...custom, id, createdAt: index === 3 ? undefined : index + 1, priority: index === 0 ? 'high' : 'none' }));
let sorting = { version: 1, items: rows, done: { '2026-10-04': ['a'], '2026-10-05': ['a', 'b'], [day]: ['a', 'b', 'c'] }, checkInTimes: {
  '2026-10-05': { a: new Date(2026, 9, 5, 8).getTime(), b: new Date(2026, 9, 5, 11).getTime() },
  [day]: { a: new Date(2026, 9, 6, 12).getTime(), b: new Date(2026, 9, 6, 9).getTime(), c: new Date(2026, 9, 6, 6).getTime() },
} };
const idsFor = (field, direction = 'desc') => orderedHabits({ ...sorting, sort: { field, direction } }, clock).map(row => row.id);
assert.deepEqual(idsFor('days'), ['a', 'b', 'c', 'legacy']);
assert.deepEqual(idsFor('streak'), ['a', 'b', 'c', 'legacy']);
assert.deepEqual(idsFor('created'), ['c', 'b', 'a', 'legacy']);
assert.deepEqual(idsFor('created', 'asc'), ['a', 'b', 'c', 'legacy']);
assert.deepEqual(idsFor('averageTime', 'asc'), ['c', 'a', 'b', 'legacy'], 'Equal average times keep saved order; missing times last');
assert.deepEqual(idsFor('averageTime', 'desc'), ['a', 'b', 'c', 'legacy']);
const moved = saveHabitOrder({ ...sorting, sort: { field: 'created', direction: 'desc' } }, ['a', 'c'], clock);
assert.deepEqual(moved.items.map(row => row.id), ['a', 'b', 'c', 'legacy'], 'Filtered reorder freezes the full automatic order and keeps hidden slots');
assert.equal(moved.sort.field, 'custom');
assert.deepEqual(saveHabitOrder(moved, ['a', 'c'], clock), moved, 'Retry does not move again');
assert.deepEqual(orderedHabits(JSON.parse(JSON.stringify(moved)), clock).map(row => row.id), ['a', 'b', 'c', 'legacy']);
assert.deepEqual(moved.done, sorting.done);
assert.deepEqual(moved.checkInTimes, sorting.checkInTimes);
assert.equal(isReminderState({ ...sorting, sort: { field: 'bad', direction: 'asc' } }), false);
const round = cleanState(webHabits.cleanState(moved));
assert.deepEqual(round.sort, moved.sort); assert.deepEqual(round.checkInTimes, moved.checkInTimes);
let stamped = toggleReminderDone({ version: 1, items: rows, done: {} }, 'a', day, clock);
assert.equal(stamped.checkInTimes[day].a, clock);
stamped = toggleReminderDone(stamped, 'a', day, clock);
assert.deepEqual(stamped.checkInTimes, {}, 'Undo removes its time');
stamped = toggleReminderDone(stamped, 'a', '2026-10-05', clock);
assert.deepEqual(stamped.checkInTimes, {}, 'Backfill does not fabricate a time');
const legacyState = { ...sorting, checkInTimes: undefined, reflections: [{ id: 'note', habitId: 'a', day, text: '记录', createdAt: clock }] };
assert.deepEqual(orderedHabits({ ...legacyState, sort: { field: 'averageTime', direction: 'asc' } }, clock).map(row => row.id), rows.map(row => row.id), 'Reflection time is not check-in time');
console.log('Habit sort modes: totals, streaks, averages, stable ties, missing times, custom persistence, filtered retries, undo/backfill and old web round-trip passed');

function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return value;
}
const periodItems = [
  { ...item('night-new'), timePeriod: 'night', priority: 'none', createdAt: 90 },
  { ...item('morning-old'), timePeriod: 'morning', priority: 'high', createdAt: 10 },
  { ...item('legacy-free'), priority: 'none' },
  { ...item('noon-high'), timePeriod: 'noon', priority: 'high', createdAt: 30 },
  { ...item('afternoon-medium'), timePeriod: 'afternoon', priority: 'medium', createdAt: 40 },
  { ...item('morning-new'), timePeriod: 'morning', priority: 'high', createdAt: 70 },
  { ...item('noon-none'), timePeriod: 'noon', priority: 'none', createdAt: 50 },
  { ...item('explicit-free'), timePeriod: 'free', priority: 'none', createdAt: 100 },
];
const periodState = freeze({ version: 1, items: periodItems, done: {} });
const periodBefore = JSON.stringify(periodState);
const groupIds = rows => groupHabitsByTimePeriod(rows).map(group => [group.timePeriod, group.items.map(row => row.id)]);
assert.deepEqual(groupIds(orderedHabits(periodState, clock)), [
  ['morning', ['morning-new', 'morning-old']],
  ['noon', ['noon-high', 'noon-none']],
  ['afternoon', ['afternoon-medium']],
  ['night', ['night-new']],
  ['free', ['explicit-free', 'legacy-free']],
], 'Default priority order survives inside fixed time-period groups');
assert.deepEqual(groupIds(orderedHabits({ ...periodState, sort: { field: 'created', direction: 'desc' } }, clock)), [
  ['morning', ['morning-new', 'morning-old']],
  ['noon', ['noon-none', 'noon-high']],
  ['afternoon', ['afternoon-medium']],
  ['night', ['night-new']],
  ['free', ['explicit-free', 'legacy-free']],
], 'Created-date sorting changes only the existing order inside each group');
assert.deepEqual(groupIds(orderedHabits({ ...periodState, sort: { field: 'created', direction: 'asc' } }, clock))[1], ['noon', ['noon-high', 'noon-none']]);
const customPeriodRows = orderedHabits({ ...periodState, sort: { field: 'custom', direction: 'asc' } }, clock);
assert.deepEqual(groupIds(customPeriodRows)[0], ['morning', ['morning-old', 'morning-new']], 'Custom slots retain their within-period order');
assert.deepEqual(groupIds([...customPeriodRows].reverse())[0], ['morning', ['morning-new', 'morning-old']], 'Grouping follows its input rather than reapplying a hidden sort');
const filteredPeriodRows = freeze([periodItems[6], periodItems[3], periodItems[2]]);
const subsetGroups = groupHabitsByTimePeriod(filteredPeriodRows);
assert.deepEqual(groupIds(filteredPeriodRows), [['noon', ['noon-none', 'noon-high']], ['free', ['legacy-free']]], 'Grouping only the filtered view omits empty periods and adds no hidden habits');
assert.equal(subsetGroups[0].items[0], filteredPeriodRows[0], 'Grouping retains each original item reference');
assert.equal(subsetGroups[0].items[1], filteredPeriodRows[1]);
assert.notEqual(subsetGroups[0].items, filteredPeriodRows, 'Each group has a new array');
subsetGroups[0].items.pop();
assert.equal(filteredPeriodRows.length, 3, 'Changing a returned group cannot change the input array');
assert.deepEqual(groupHabitsByTimePeriod([]), []);
const inferredCases = [
  [{ title: '早上刷牙' }, 'morning'], [{ title: '记录晨脉' }, 'morning'],
  [{ title: '午饭后吃补剂' }, 'noon'], [{ title: '晚餐后吃补剂' }, 'night'],
  [{ title: '午后散步' }, 'afternoon'], [{ title: '睡前放音乐' }, 'night'],
  [{ title: '整理今日计划' }, 'morning'], [{ title: '摄影练习' }, 'afternoon'],
  [{ title: '力量训练' }, 'afternoon'], [{ title: '每日阅读' }, 'night'],
  [{ title: '一个习惯', note: '中午留出一点时间' }, 'noon'],
  [{ title: '上午练习', note: '晚上记录感受' }, 'morning'],
  [{ title: '上午或晚上练习' }, 'free'], [{ title: '早晚刷牙' }, 'free'],
  [{ title: '力量训练', note: '随时都可以' }, 'free'],
  [{ title: '上午练习', timePeriod: 'free' }, 'free'],
  [{ title: '上午练习', timePeriod: 'night' }, 'night'],
  [{ title: '一个习惯' }, 'free'], [{ title: 'morning stretch' }, 'morning'],
  [{ title: '上午练习', timePeriod: 'invalid' }, 'free'],
];
for (const [input, expected] of inferredCases) {
  const before = JSON.stringify(input);
  assert.equal(habitTimePeriod(Object.freeze(input)), expected);
  assert.equal(JSON.stringify(input), before, 'Inference never changes stored fields');
}
assert.equal(habitTimePeriod(null), 'free');
assert.equal(habitTimePeriod(undefined), 'free');
assert.deepEqual(groupIds([{ id: 'malformed', timePeriod: 'invalid' }, { id: 'missing' }]), [['free', ['malformed', 'missing']]], 'Defensive grouping uses the same free fallback as cards');
const reorderedPeriods = saveHabitOrder({ ...periodState, sort: { field: 'created', direction: 'desc' } }, ['morning-old', 'morning-new'], clock);
assert.deepEqual(groupIds(orderedHabits(reorderedPeriods, clock))[0], ['morning', ['morning-old', 'morning-new']]);
for (const row of periodItems) assert.equal(reorderedPeriods.items.find(saved => saved.id === row.id).timePeriod, row.timePeriod, 'Custom ordering never changes the assigned period');
assert.equal(Object.hasOwn(orderedHabits(periodState, clock).find(row => row.id === 'legacy-free'), 'timePeriod'), false, 'Sorting never materializes a missing legacy period');
assert.equal(JSON.stringify(periodState), periodBefore, 'Sorting and grouping frozen archives leave all source fields/order intact');
console.log('Habit time-period grouping: fixed five-period order, priority/date/custom and reversed input preservation, filtered subsets, legacy fallback, stable original references and immutable source archives passed');
