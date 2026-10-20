const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
function load(relative) {
  const file = path.resolve(__dirname, relative);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', 'require', source)(exports, dependency => load(path.resolve(path.dirname(file), dependency + '.ts')));
  return exports;
}
const growth = load('../src/lib/growth-data.ts');
const clone = value => JSON.parse(JSON.stringify(value));
const initial = () => clone(growth.initialGrowthState);
{
  const source = initial();
  source.domains[1].archived = true;
  const before = clone(source);
  const sorted = growth.reorderGrowthDomains(source, ['mind', 'work', 'mind', 'missing', 'health']);
  assert.deepEqual(sorted.domains.slice(0, 3).map(domain => domain.id), ['mind', 'health', 'work'], 'Sorting only moves requested active domains, retaining archived slots');
  assert.deepEqual(source, before, 'Sorting does not mutate existing state');
  assert.equal(sorted.events, source.events);
  assert.equal(sorted.completedGoals, source.completedGoals);
  assert.equal(growth.reorderGrowthDomains(source, []), source, 'An unchanged order is a no-op');
}
const date = (month, day, hour = 0, minute = 0) => new Date(2026, month - 1, day, hour, minute);
for (const now of [date(9, 16, 12), date(9, 1), date(1, 1), new Date(2024, 1, 29)]) {
  const demo = growth.demoGrowthState(now);
  assert.ok(growth.isGrowthState(demo), 'Starter data satisfies the persisted schema');
  assert.equal(demo.events.length, 144);
  assert.equal(demo.completedGoals.length, 7);
  assert.ok(demo.events.every(event => Date.parse(event.createdAt) <= now.getTime()), 'Starter records never occur in the future');
  for (const domain of demo.domains) {
    assert.ok(domain.currentGoal?.title, 'Every sample domain has a visible goal');
    const stats = growth.growthDomainStats(demo, domain.id, now);
    assert.ok(stats.week > 0 && stats.month > 0 && stats.recentMonths > stats.week, 'Sample periods include current and older progress');
  }
  demo.domains[0].name = 'edited';
  assert.equal(growth.initialGrowthState.domains[0].name, '工作', 'Sample edits never mutate the empty template');
}
const event = (id, when, size = 'small', domainId = 'work', note) => ({ id, domainId, size, createdAt: when.toISOString(), ...(note === undefined ? {} : { note }) });
function deeplyFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') deeplyFreeze(child);
  return value;
}

function checkLocalBoundaries() {
  const state = initial(), now = date(10, 1, 12);
  state.events = [event('older', date(9, 1), 'large'), event('sun', date(9, 27, 23, 59), 'large'),
    event('mon', date(9, 28), 'medium'), event('prev-month', date(9, 30, 23, 59)), event('current', now, 'medium'),
    event('future-today', date(10, 1, 12, 1), 'large'), event('future-month', date(11, 1), 'large')];
  const stats = growth.growthDomainStats(state, 'work', now);
  assert.equal(stats.total, 17, 'Total includes old records and excludes every future event');
  assert.equal(stats.month, 3, 'Monthly total starts at local midnight on day 1');
  assert.equal(stats.week, 7, 'Week starts Monday and can cross the month boundary');
  assert.equal(stats.recordCount, 5); assert.equal(stats.monthCount, 1); assert.equal(stats.weekCount, 3);
  assert.equal(stats.lastEvent.id, 'current');
  state.events.reverse();
  assert.equal(growth.growthDomainStats(state, 'work', now).lastEvent.id, 'current', 'Latest event uses its time, not array order');
  assert.equal(growth.growthDomainStats(state, 'health', now).total, 0);
  assert.deepEqual(growth.growthDomainStats(initial(), 'work', now), { total: 0, recentMonths: 0, month: 0, week: 0, recordCount: 0, recentMonthsCount: 0, monthCount: 0, weekCount: 0, completedGoalCount: 0, lastEvent: null });
  const year = initial(); year.events = [event('december', new Date(2025, 11, 31, 23, 59), 'large'), event('january', new Date(2026, 0, 1), 'medium')];
  const yearStats = growth.growthDomainStats(year, 'work', new Date(2026, 0, 1, 12));
  assert.equal(yearStats.total, 8); assert.equal(yearStats.month, 3); assert.equal(yearStats.week, 8, 'Weeks can cross year boundaries');

  for (const [label, current, windowStart] of [
    ['ordinary date', date(9, 16, 12), date(6, 16)],
    ['short-month clamp', date(5, 31, 12), date(2, 28)],
    ['leap-year clamp', new Date(2024, 4, 31, 12), new Date(2024, 1, 29)],
    ['year boundary', date(1, 31, 12), new Date(2025, 9, 31)],
    ['spring DST', date(5, 9, 12), date(2, 9)],
    ['autumn DST', date(11, 2, 12), date(8, 2)],
  ]) {
    const recent = initial();
    recent.events = [
      event('before-window', new Date(windowStart.getTime() - 1), 'large'),
      event('window-start', windowStart, 'medium'),
      event('window-end', current, 'small'),
      event('future', new Date(current.getTime() + 1), 'large'),
      event('other-domain', current, 'large', 'health'),
    ];
    const domain = growth.growthDomainStats(recent, 'work', current);
    assert.equal(domain.recentMonths, 4, `${label}: recent months include both boundaries and exclude future points`);
    assert.equal(domain.recentMonthsCount, 2, `${label}: recent-month record count uses the same calendar window`);
    assert.equal(domain.total, 9, `${label}: earlier points remain in lifetime totals`);
    assert.equal(domain.recordCount, 3);
    assert.equal(growth.growthOverview(recent, current).recentMonths, 9, `${label}: overview covers every domain`);
    assert.equal(growth.growthOverview(recent, current).recentMonthsCount, 3);
  }

  if (process.env.TZ === 'America/New_York') {
    const dst = initial();
    dst.events = [event('before-week', date(3, 1, 23, 59), 'large'), event('week-start', date(3, 2), 'medium'), event('after-clock-change', date(3, 8, 3)), event('next-week', date(3, 9), 'large')];
    const current = growth.growthDomainStats(dst, 'work', date(3, 8, 12));
    assert.equal(current.week, 4, 'Spring DST keeps local Monday as the week boundary');
    assert.equal(current.total, 9); assert.equal(current.month, 9);
    const fall = initial();
    fall.events = [event('sunday-before-fall-week', date(10, 25, 23, 59), 'large'), event('fall-week', date(10, 26), 'medium'), event('fall-month', date(11, 1, 3))];
    const fallback = growth.growthDomainStats(fall, 'work', date(11, 1, 12));
    assert.equal(fallback.week, 4, 'Autumn DST also keeps the local Monday boundary'); assert.equal(fallback.month, 1);
  }
  console.log(`Growth calendar boundaries passed in ${process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone}.`);
}

async function main() {
  if (process.argv.includes('--timezone')) { checkLocalBoundaries(); return; }
  assert.ok(growth.isGrowthState(initial()));
  assert.deepEqual(initial().domains.map(domain => domain.name), ['工作', '健康', '精神', '健身', '摄影', '英语', '自媒体']);
  assert.equal(new Set(initial().domains.map(domain => domain.id)).size, 7);
  const source = deeplyFreeze(initial()), now = new Date('2026-09-16T08:00:00.000Z');
  let state = growth.recordGrowth(source, 'work', 'small', now, '  改好了一处细节  ');
  state = growth.recordGrowth(deeplyFreeze(state), 'work', 'medium', now);
  state = growth.recordGrowth(deeplyFreeze(state), 'health', 'large', now);
  assert.equal(source.events.length, 0, 'Every mutation leaves its input intact');
  assert.equal(state.events[0].note, '改好了一处细节');
  assert.equal(new Set(state.events.map(item => item.id)).size, 3, 'Events in the same millisecond keep different ids');
  assert.equal(growth.growthOverview(state, now).total, 9);
  assert.equal(growth.growthDomainStats(state, 'work', now).total, 4);
  const removedId = state.events[0].id, remainingIds = state.events.slice(1).map(item => item.id);
  state = growth.undoGrowth(state, removedId);
  assert.deepEqual(state.events.map(item => item.id), remainingIds, 'Undo removes the specified event and leaves the newer event untouched');
  assert.equal(growth.growthOverview(state, now).total, 8);
  assert.equal(growth.undoGrowth(state, removedId), state, 'Repeated undo is harmless');
  assert.throws(() => growth.undoGrowth(state, '../bad'), /无法找到/);
  assert.throws(() => growth.recordGrowth(state, 'missing', 'small', now), /不存在/);
  assert.throws(() => growth.recordGrowth(state, 'work', 'huge', now), /请选择/);
  assert.throws(() => growth.recordGrowth(state, 'work', 'small', new Date('invalid')), /时间/);
  assert.throws(() => growth.recordGrowth(state, 'work', 'small', now, '长'.repeat(121)), /备注/);

  state = growth.setGrowthGoal(deeplyFreeze(state), 'work', '  完成作品集首页  ', now);
  const goal = state.domains.find(item => item.id === 'work').currentGoal;
  assert.equal(goal.title, '完成作品集首页'); assert.equal(goal.createdAt, now.toISOString());
  state = growth.setGrowthGoal(state, 'work', '完成作品集', now);
  assert.equal(state.domains.find(item => item.id === 'work').currentGoal.id, goal.id, 'Editing a target keeps its identity');
  assert.equal(growth.completeGrowthGoal(state, 'work', now, 'wrong-id'), state, 'An outdated completion action never completes a different target');
  assert.throws(() => growth.completeGrowthGoal(state, 'work', new Date(now.getTime() - 1)), /早于/);
  const pointsBeforeGoal = growth.growthOverview(state, now).total;
  state = growth.completeGrowthGoal(deeplyFreeze(state), 'work', now, goal.id);
  assert.equal(state.completedGoals.length, 1); assert.equal(state.completedGoals[0].id, goal.id);
  assert.equal(state.domains.find(item => item.id === 'work').currentGoal, null);
  assert.equal(growth.growthOverview(state, now).total, pointsBeforeGoal, 'Goals never silently add points on top of progress records');
  assert.equal(growth.growthDomainStats(state, 'work', now).completedGoalCount, 1);
  assert.equal(growth.completeGrowthGoal(state, 'work', now, goal.id), state, 'Double completion is idempotent');
  state = growth.setGrowthGoal(state, 'work', '发布作品集', now);
  const nextGoal = state.domains.find(item => item.id === 'work').currentGoal;
  assert.notEqual(nextGoal.id, goal.id);
  assert.equal(growth.completeGrowthGoal(state, 'work', now, goal.id), state, 'Late previous-goal click leaves the next goal intact');

  const eventsBeforeArchive = state.events, goalsBeforeArchive = state.completedGoals;
  state = growth.setGrowthDomainArchived(deeplyFreeze(state), 'work', true);
  assert.equal(state.events, eventsBeforeArchive); assert.equal(state.completedGoals, goalsBeforeArchive);
  assert.equal(growth.growthOverview(state, now).total, pointsBeforeGoal, 'Archived domains retain lifetime totals');
  assert.equal(growth.growthOverview(state, now).activeDomainCount, 6);
  assert.throws(() => growth.recordGrowth(state, 'work', 'small', now), /先恢复/);
  assert.throws(() => growth.setGrowthGoal(state, 'work', '归档后不能误改目标', now), /先恢复/);
  state = growth.saveGrowthDomain(state, { id: 'work', name: '职业发展', iconId: 'computer' });
  assert.equal(state.domains[0].archived, true); assert.equal(state.domains[0].currentGoal.id, nextGoal.id);
  state = growth.setGrowthDomainArchived(state, 'work', false);
  assert.equal(state.domains[0].currentGoal.id, nextGoal.id);
  state = growth.saveGrowthDomain(state, { name: '  财务  ', iconId: 'money' });
  assert.equal(state.domains.at(-1).name, '财务'); assert.equal(state.domains.at(-1).archived, false);
  assert.throws(() => growth.saveGrowthDomain(state, { name: '财务', iconId: 'money' }), /同名/);
  assert.throws(() => growth.saveGrowthDomain(state, { name: '', iconId: 'money' }), /名称/);
  assert.throws(() => growth.saveGrowthDomain(state, { name: 'a'.repeat(21), iconId: 'money' }), /名称/);
  assert.throws(() => growth.saveGrowthDomain(state, { name: '测试', iconId: '../../file' }), /图标/);
  assert.throws(() => growth.saveGrowthDomain(state, { id: 'unknown', name: '测试', iconId: 'money' }), /不存在/);
  assert.ok(growth.isGrowthState(JSON.parse(JSON.stringify(state))), 'Every supported edit round-trips through persistence');
  const compatible = initial(); compatible.domains[0].iconId = 'future-new-icon'; compatible.domains[0].currentGoal = { id: 'migrated-goal', title: '历史目标', createdAt: null };
  assert.ok(growth.isGrowthState(compatible), 'Future safe icon ids and a nullable legacy goal creation date are preserved');
  assert.ok(growth.isGrowthState(growth.completeGrowthGoal(compatible, 'work', now)));

  for (const mutate of [
    draft => draft.version = 2,
    draft => draft.domains.push(clone(draft.domains[0])),
    draft => draft.domains[0].archived = 'false',
    draft => draft.domains[0].id = '__proto__',
    draft => draft.events.push(event('bad', now, 'medium', 'unknown')),
    draft => draft.events.push({ ...event('bad', now), createdAt: '2026-02-30T00:00:00Z' }),
    draft => draft.events.push({ ...event('bad', now), createdAt: '2026-09-16' }),
    draft => draft.events.push({ ...event('bad', now), size: '__proto__' }),
    draft => draft.events.push(event('duplicate', now), event('duplicate', now)),
    draft => draft.domains[0].currentGoal = { id: 'goal', title: '', createdAt: null },
    draft => { draft.domains[0].currentGoal = { id: 'goal', title: '目标', createdAt: null }; draft.completedGoals.push({ id: 'goal', title: '重复目标', domainId: 'work', createdAt: null, completedAt: now.toISOString() }); },
  ]) { const bad = initial(); mutate(bad); assert.equal(growth.isGrowthState(bad), false, `Reject malformed state: ${mutate}`); }
  for (const invalid of [null, undefined, [], 1, {}, 'growth']) assert.equal(growth.isGrowthState(invalid), false);
  const fullDomains = initial();
  while (fullDomains.domains.length < growth.MAX_GROWTH_DOMAINS) fullDomains.domains.push({ id: `domain-${fullDomains.domains.length}`, name: `领域${fullDomains.domains.length}`, iconId: 'star', archived: true });
  assert.throws(() => growth.saveGrowthDomain(fullDomains, { name: '第25个', iconId: 'star' }), /最多保存 24/);
  assert.equal(growth.setGrowthDomainArchived(fullDomains, 'domain-23', false).domains.length, 24, 'Restoring remains possible at the domain limit');
  const fullEvents = initial(); fullEvents.events = Array.from({ length: growth.MAX_GROWTH_EVENTS }, (_, index) => event(`event-${index}`, now));
  assert.ok(growth.isGrowthState(fullEvents));
  assert.throws(() => growth.recordGrowth(fullEvents, 'work', 'small', now), /5000 条/);
  assert.equal(fullEvents.events.length, 5000, 'Capacity rejection never trims earlier events');
  const fullGoals = growth.setGrowthGoal(initial(), 'work', '当前目标', now);
  fullGoals.completedGoals = Array.from({ length: growth.MAX_GROWTH_COMPLETED_GOALS }, (_, index) => ({ id: `done-${index}`, domainId: 'work', title: `目标${index}`, createdAt: null, completedAt: now.toISOString() }));
  assert.ok(growth.isGrowthState(fullGoals));
  assert.throws(() => growth.completeGrowthGoal(fullGoals, 'work', now), /1000 个/);
  assert.ok(fullGoals.domains[0].currentGoal, 'History limit leaves the current goal available');

  const fullBytes = initial(), longNote = '记'.repeat(120);
  while (Buffer.byteLength(JSON.stringify(fullBytes), 'utf8') < growth.MAX_GROWTH_DATA_BYTES - 600) fullBytes.events.push(event(`note-${fullBytes.events.length}`, now, 'small', 'work', longNote));
  while (growth.isGrowthState(fullBytes)) {
    try { const next = growth.recordGrowth(fullBytes, 'work', 'small', now, longNote); fullBytes.events = next.events; }
    catch (error) { assert.match(error.message, /存储空间已满/); break; }
  }
  assert.ok(growth.isGrowthState(fullBytes));
  const beforeBytes = JSON.stringify(fullBytes);
  assert.throws(() => growth.recordGrowth(fullBytes, 'work', 'large', now, longNote), /存储空间已满/);
  assert.equal(JSON.stringify(fullBytes), beforeBytes, 'UTF-8 payload limits also preserve existing data');

  checkLocalBoundaries();
  for (const timezone of ['Asia/Singapore', 'America/New_York', 'UTC']) execFileSync(process.execPath, [__filename, '--timezone'], { env: { ...process.env, TZ: timezone }, stdio: 'inherit' });
  const tools = load('../src/lib/tool-state-store.ts'), storage = new Map();
  let userName = 'first-reader';
  const store = tools.createPersonalToolStore({ read: key => storage.get(key), write: (key, value) => storage.set(key, value), fingerprint: () => userName,
    session: async () => ({ authenticated: true, userName }), get: async () => ({ data: null }), put: async () => ({}) });
  const first = await store.load('growth', initial());
  store.edit('growth', first, current => growth.recordGrowth(current, 'work', 'large', now));
  userName = 'second-reader';
  const second = await store.load('growth', initial());
  assert.equal(second.value.events.length, 0, 'Different accounts cannot see another account\'s growth cache');
  assert.throws(() => store.edit('growth', first, initial()), /账号状态已变化/);
  userName = 'first-reader';
  const restored = await store.load('growth', initial());
  assert.equal(restored.value.events.length, 1, 'Returning to an account restores its records');
  console.log('Growth data passed: immutable progress, specific undo, goals, archive/restore, validation, capacity, calendar boundaries, and account isolation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
