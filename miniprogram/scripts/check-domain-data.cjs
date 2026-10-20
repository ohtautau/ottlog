const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
function load(relative) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, relative), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', 'require', source)(exports, name => load(path.join(path.dirname(relative), name + '.ts')));
  return exports;
}
const data = load('../src/lib/domain-data.ts');
const display = load('../src/lib/domain-display.ts');
const clone = value => JSON.parse(JSON.stringify(value));
assert.ok(data.initialDomainState.domains.every(domain => domain.habits.length === 0), 'Domains do not generate independent habit cards');
// Legacy domain habits remain readable; production now displays the shared reminders store.
const initial = () => ({ ...clone(data.initialDomainState), domains: clone(data.initialDomainState.domains).map(domain => ({ ...domain, habits: [{ id: domain.id + '-legacy-habit', name: '旧习惯', startedDates: [] }] })) });
const domain = (state, id = 'work') => state.domains.find(item => item.id === id);
const now = new Date('2026-10-03T08:00:00.000Z');
{
  const source = clone(data.initialDomainState), before = JSON.stringify(source);
  const projected = display.domainDisplayState(source);
  assert.equal(projected.domains.length, 9);
  assert.equal(display.uncategorizedDomain(projected), projected.domains.at(-1));
  assert.equal(projected.domains.at(-1).name, '未分类');
  assert.ok(projected.domains.at(-1).positiveRecords.length === 0 && projected.domains.at(-1).negativeRecords.length === 0);
  assert.equal(JSON.stringify(source), before, 'The empty system card never mutates or migrates the source archive');
  const legacy = data.saveDomain(source, { name: '未分类', iconId: 'notes' });
  assert.equal(display.domainDisplayState(legacy), legacy);
  assert.equal(display.uncategorizedDomain(legacy).id, legacy.domains.at(-1).id, 'Existing uncategorized IDs are retained');
  const collision = clone(source); collision.domains[0].id = 'uncategorized';
  assert.equal(display.uncategorizedDomain(collision).id, 'uncategorized-1');
  assert.ok(data.isDomainState(display.materializeUncategorizedDomain(collision)));
  const full = clone(source);
  while (full.domains.length < data.MAX_DOMAIN_COUNT) full.domains.push({ ...clone(source.domains[0]), id: 'extra-' + full.domains.length, name: '额外' + full.domains.length });
  assert.equal(display.domainDisplayState(full).domains.length, data.MAX_DOMAIN_COUNT + 1, 'Read-only presentation works at the original capacity');
  assert.throws(() => display.materializeUncategorizedDomain(full), /24/, 'Explicit writes retain the original capacity guard');
}
function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return value;
}
function checkRecordBatches() {
  const record = (id, content = id) => ({ id, content, createdAt: now.toISOString() });
  for (const kinds of [['positive', 'positive'], ['negative', 'negative'], ['negative', 'positive']]) {
    const entries = freeze(kinds.map((kind, index) => ({ kind, record: record(`batch-${index}`) })));
    const source = freeze(initial()), before = JSON.stringify(source);
    const saved = data.saveDomainRecords(source, 'work', entries);
    assert.equal(JSON.stringify(source), before, 'Same-sign batches never mutate the original archive');
    assert.deepEqual(domain(saved).positiveRecords.map(item => item.id), entries.filter(item => item.kind === 'positive').map(item => item.record.id));
    assert.deepEqual(domain(saved).negativeRecords.map(item => item.id), entries.filter(item => item.kind === 'negative').map(item => item.record.id));
    assert.ok(data.isDomainState(clone(saved)));
    assert.equal(data.saveDomainRecords(freeze(saved), 'work', entries, true), saved, 'Retrying either sign pair retains both original IDs');
    assert.throws(() => data.saveDomainRecords(saved, 'work', entries), /已存在/);
    assert.throws(() => data.saveDomainRecords(saved, 'life', entries, true), /发生变化/);
    assert.throws(() => data.saveDomainRecords(saved, 'work', [{ ...entries[0], kind: entries[0].kind === 'positive' ? 'negative' : 'positive' }, entries[1]], true), /发生变化/);
  }
  const entries = [{ kind: 'negative', record: record('atomic-first') }, { kind: 'negative', record: record('atomic-second') }];
  const collision = initial(); domain(collision).negativeRecords = [record('atomic-second', '已保存的不同内容')]; freeze(collision);
  const beforeCollision = JSON.stringify(collision);
  assert.throws(() => data.saveDomainRecords(collision, 'work', entries), /发生变化/);
  assert.throws(() => data.saveDomainRecords(collision, 'work', entries, true), /发生变化/);
  assert.equal(JSON.stringify(collision), beforeCollision, 'A conflicting second row cannot append the first');
  for (const batch of [
    [], [...entries, { kind: 'positive', record: record('third') }],
    [entries[0], { kind: 'negative', record: entries[0].record }],
    [entries[0], { kind: 'unknown', record: record('bad-kind') }],
    [entries[0], { kind: 'negative', record: record('bad-content', '字'.repeat(6001)) }],
  ]) {
    const source = freeze(initial());
    assert.throws(() => data.saveDomainRecords(source, '', batch), /有效/);
    assert.equal(source.domains.length, 8, 'Invalid batches do not create a fallback domain');
    assert.equal(domain(source).negativeRecords.length, 0);
  }
  const image = { id: 'batch-picture', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
  const pictures = freeze([{ kind: 'positive', record: { ...record('picture-first', ''), images: [image] } }, { kind: 'positive', record: record('picture-second') }]);
  const fallback = data.saveDomainRecords(freeze({ version: 1, domains: [], completedGoals: [] }), '', pictures);
  assert.equal(fallback.domains.length, 1); assert.equal(fallback.domains[0].name, '未分类');
  assert.equal(fallback.domains[0].positiveRecords.length, 2);
  assert.equal(fallback.domains[0].positiveRecords[0].images, pictures[0].record.images, 'Batch records retain image references');
  assert.equal(data.saveDomainRecords(freeze(fallback), '', pictures, true), fallback);
  const full = initial(); domain(full).positiveRecords = Array.from({ length: data.MAX_DOMAIN_RECORDS - 1 }, (_, index) => record(`batch-limit-${index}`)); freeze(full);
  assert.throws(() => data.saveDomainRecords(full, 'work', entries), /5000/);
  assert.equal(domain(full).negativeRecords.length, 0, 'The complete same-sign batch is checked against record capacity');
  const firstSaved = data.saveDomainRecords(freeze(initial()), 'work', [entries[0]]);
  const resumed = data.saveDomainRecords(freeze(firstSaved), 'work', entries, true);
  assert.deepEqual(domain(resumed).negativeRecords.map(item => item.id), ['atomic-first', 'atomic-second'], 'Matching old targets can safely finish a retry without duplicating the existing ID');
  const oversized = entries.map((item, index) => ({ ...item, record: { ...item.record, images: Array.from({ length: 3 }, (_, imageIndex) => ({ id: `batch-${index}-picture-${imageIndex}`, dataUrl: 'data:image/png;base64,' + 'A'.repeat(240000) })) } }));
  const empty = freeze({ version: 1, domains: [], completedGoals: [] });
  assert.throws(() => data.saveDomainRecords(empty, '', oversized), /空间已满/);
  assert.equal(empty.domains.length, 0, 'Combined image capacity cannot leave behind a fallback or partial record');
}
function checkCalendar() {
  const habitId = domain(initial()).habits[0].id;
  let state = data.toggleDomainHabit(initial(), 'work', habitId, new Date(2026, 9, 3, 23, 59));
  assert.deepEqual(domain(state).habits[0].startedDates, ['2026-10-03']);
  assert.equal(data.localDateKey(new Date(2026, 9, 4)), '2026-10-04');
  assert.equal(domain(state).habits[0].startedDates.includes(data.localDateKey(new Date(2026, 9, 4))), false, 'Yesterday never marks today as started');
  state = data.toggleDomainHabit(state, 'work', habitId, new Date(2026, 9, 4));
  assert.deepEqual(domain(state).habits[0].startedDates, ['2026-10-03', '2026-10-04'], 'New day preserves prior habit history');
  state = data.toggleDomainHabit(state, 'work', habitId, new Date(2026, 9, 4, 12));
  assert.deepEqual(domain(state).habits[0].startedDates, ['2026-10-03'], 'Undo only clears the current local date');
  for (const date of [new Date(2026, 0, 1), new Date(2024, 1, 29), new Date(2026, 2, 8), new Date(2026, 10, 1)]) {
    const active = data.toggleDomainHabit(initial(), 'work', habitId, date);
    assert.equal(domain(active).habits[0].startedDates[0], `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    assert.ok(data.isDomainState(active));
  }
  console.log(`Domain local dates passed in ${process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone}.`);
}
function checkDomainManagement() {
  const defaults = ['plant', 'work', 'language', 'exercise', 'home', 'breathe', 'camera', 'film'];
  assert.deepEqual(initial().domains.map(item => item.iconId), defaults);
  const legacy = initial();
  legacy.domains.forEach(item => { delete item.iconId; });
  assert.ok(data.isDomainState(legacy), 'Version 1 archives without icons remain readable');
  assert.deepEqual(legacy.domains.map(data.domainIcon), defaults, 'Legacy defaults use stable domain ids');
  assert.ok(legacy.domains.every(item => item.iconId === undefined), 'Reading a fallback icon never mutates saved data');
  assert.equal(data.domainIcon({ id: 'custom' }), 'star');
  assert.equal(data.domainIcon({ id: '__proto__' }), 'star', 'Fallback lookup cannot read inherited object keys');
  assert.equal(data.domainIcon({ id: 'work', iconId: '../../file' }), 'work');
  assert.equal(data.domainIcon({ id: 'custom', iconId: 'code' }), 'code');
  const future = initial(); future.domains[0].iconId = 'future-safe-icon';
  assert.ok(data.isDomainState(future), 'Safe future icon ids remain compatible');

  const source = freeze(legacy);
  let state = data.saveDomain(source, { name: '  财务  ', iconId: 'money' });
  const added = state.domains.at(-1);
  assert.equal(added.name, '财务'); assert.equal(data.domainIcon(added), 'money');
  assert.deepEqual({ long: added.longTermGoal, short: added.shortTermGoal, habits: added.habits, positive: added.positiveRecords, negative: added.negativeRecords },
    { long: null, short: null, habits: [], positive: [], negative: [] }, 'A new domain starts with empty personal data');
  assert.equal(source.domains.length, 8); assert.equal(state.domains.length, 9);
  assert.equal(state.completedGoals, source.completedGoals);
  assert.equal(state.domains[0], source.domains[0], 'Adding retains all existing domain objects');
  state = data.saveDomain(freeze(state), { id: added.id, name: '预算', iconId: 'wallet' });
  assert.equal(state.domains.at(-1).id, added.id); assert.equal(state.domains.at(-1).name, '预算');
  assert.equal(state.domains.at(-1).iconId, 'wallet');
  assert.equal(data.saveDomain(state, { id: added.id, name: '预算', iconId: 'wallet' }), state, 'An unchanged domain edit is a no-op');
  state = data.saveDomain(state, { id: 'growth', name: '成长', iconId: 'goal' });
  assert.equal(state.domains[0].iconId, 'goal', 'Editing writes an explicit icon for a legacy domain');
  assert.throws(() => data.saveDomain(state, { name: '预算', iconId: 'money' }), /同名/);
  assert.throws(() => data.saveDomain(state, { id: added.id, name: '工作', iconId: 'work' }), /同名/);
  const named = data.saveDomain(state, { name: 'Writing', iconId: 'write' });
  assert.throws(() => data.saveDomain(named, { name: ' writing ', iconId: 'write' }), /同名/);
  assert.throws(() => data.saveDomain(state, { name: ' ', iconId: 'star' }), /名称/);
  assert.throws(() => data.saveDomain(state, { name: '长'.repeat(25), iconId: 'star' }), /24/);
  for (const iconId of ['', '../../file', '__proto__', 'star.png', null]) assert.throws(() => data.saveDomain(state, { name: '测试', iconId }), /图标/);
  assert.throws(() => data.saveDomain(state, { id: 'missing', name: '已删领域', iconId: 'star' }), /不存在/);
  assert.throws(() => data.saveDomain(state, { id: '', name: '无效领域', iconId: 'star' }), /不存在/);
  assert.ok(data.isDomainState(clone(state)), 'Customized icons and names survive persistence');

  const orderSource = freeze(state), ids = orderSource.domains.map(item => item.id);
  const sorted = data.reorderDomains(orderSource, ['photo', 'work', 'photo', 'missing']);
  const expected = [...ids]; expected[1] = 'photo'; expected[6] = 'work';
  assert.deepEqual(sorted.domains.map(item => item.id), expected, 'Partial sorting exchanges only listed existing slots and ignores stale/duplicate ids');
  assert.deepEqual(orderSource.domains.map(item => item.id), ids, 'Sorting is immutable');
  assert.ok(sorted.domains.every(item => item === orderSource.domains.find(previous => previous.id === item.id)), 'Sorting preserves complete domain data');
  assert.equal(sorted.completedGoals, orderSource.completedGoals);
  assert.equal(data.reorderDomains(sorted, []), sorted);
  assert.equal(data.reorderDomains(sorted, ['missing', '__proto__']), sorted);
  assert.equal(data.reorderDomains(sorted, sorted.domains.map(item => item.id)), sorted);
  const reverse = data.reorderDomains(orderSource, [...ids.slice(0, 8)].reverse());
  assert.deepEqual(reverse.domains.map(item => item.id), [...ids.slice(0, 8)].reverse().concat(added.id), 'A domain absent from an older sorting draft is retained');

  state = data.saveDomainGoal(state, 'work', 'longTerm', '已完成工作目标', now);
  state = data.completeDomainGoal(state, 'work', 'longTerm', domain(state).longTermGoal.id, now);
  state = data.saveDomainGoal(state, 'growth', 'shortTerm', '回顾成长体系', now);
  state = data.completeDomainGoal(state, 'growth', 'shortTerm', domain(state, 'growth').shortTermGoal.id, now);
  state = data.saveDomainGoal(state, 'work', 'shortTerm', '还有当前目标', now);
  state = data.toggleDomainHabit(state, 'work', domain(state).habits[0].id, now);
  state = data.addDomainRecord(state, 'work', 'positive', '待删除领域的记录', now);
  state = data.addDomainRecord(state, 'growth', 'negative', '其他领域的记录', now);
  const populated = freeze(state), other = domain(populated, 'growth'), otherCompleted = populated.completedGoals.find(goal => goal.domainId === 'growth');
  state = data.deleteDomain(populated, 'work');
  assert.equal(domain(state), undefined);
  assert.equal(data.completedGoalCount(state, 'work'), 0, 'Deleting a domain also removes its completed-goal history');
  assert.equal(domain(state, 'growth'), other); assert.equal(state.completedGoals[0], otherCompleted);
  assert.equal(domain(populated).positiveRecords.length, 1, 'The source domain and its records remain immutable');
  assert.equal(populated.completedGoals.length, 2);
  assert.equal(data.deleteDomain(state, 'work'), state, 'Repeated deletion cannot affect another domain');
  assert.throws(() => data.saveDomain(state, { id: 'work', name: '不能复活旧编辑', iconId: 'work' }), /不存在/);
  assert.throws(() => data.addDomainRecord(state, 'work', 'positive', '不能写入已删除领域', now), /不存在/);
  assert.ok(data.isDomainState(clone(state)));
  for (const id of state.domains.map(item => item.id)) state = data.deleteDomain(state, id);
  assert.deepEqual(state, { version: 1, domains: [], completedGoals: [] });
  assert.ok(data.isDomainState(state), 'Deleting every domain is a valid persisted empty state');
  assert.equal(data.reorderDomains(state, ['work']), state);
  assert.equal(data.saveDomain(state, { name: '重新开始', iconId: 'star' }).domains.length, 1);

  let full = initial();
  while (full.domains.length < data.MAX_DOMAIN_COUNT) full = data.saveDomain(full, { name: `领域 ${full.domains.length}`, iconId: 'star' });
  assert.throws(() => data.saveDomain(full, { name: '第 25 个', iconId: 'star' }), /最多保存 24/);
  assert.equal(data.saveDomain(full, { id: 'work', name: '职业', iconId: 'computer' }).domains.length, 24, 'Existing fields remain editable at the domain limit');
  assert.equal(data.saveDomain(data.deleteDomain(full, 'work'), { name: '新工作', iconId: 'work' }).domains.length, 24);
}
async function main() {
  if (process.argv.includes('--timezone')) { checkCalendar(); return; }
  checkDomainManagement();
  checkRecordBatches();
  const uncategorizedSource = freeze(initial());
  let uncategorized = data.addUncategorizedDomainRecord(uncategorizedSource, 'positive', '  还没想好放哪里  ', now);
  const fallback = uncategorized.domains.find(item => item.name === '未分类');
  assert.equal(uncategorizedSource.domains.length, 8, 'Saving uncategorized leaves the previous archive intact');
  assert.equal(fallback.positiveRecords[0].content, '还没想好放哪里');
  uncategorized = data.addUncategorizedDomainRecord(freeze(uncategorized), 'negative', '暂时遇到的问题', now);
  assert.equal(uncategorized.domains.length, 9, 'Repeated uncategorized records reuse one domain');
  assert.equal(uncategorized.domains.find(item => item.id === fallback.id).negativeRecords.length, 1);
  assert.ok(data.isDomainState(clone(uncategorized)), 'Uncategorized records survive persistence');
  const empty = freeze({ version: 1, domains: [], completedGoals: [] });
  assert.equal(data.addUncategorizedDomainRecord(empty, 'positive', '无领域也可以记录', now).domains[0].name, '未分类');
  const customFallback = data.saveDomain(initial(), { name: '未分类', iconId: 'star' });
  const reused = data.addUncategorizedDomainRecord(freeze(customFallback), 'positive', '复用已有领域', now);
  assert.equal(reused.domains.length, customFallback.domains.length);
  assert.equal(reused.domains.at(-1).id, customFallback.domains.at(-1).id);
  assert.throws(() => data.addUncategorizedDomainRecord(empty, 'positive', ' ', now), /记录需为/);
  assert.equal(empty.domains.length, 0, 'Failed records never leave an empty fallback domain behind');
  assert.ok(data.isDomainState(initial()));
  assert.deepEqual(initial().domains.map(item => item.name), ['成长', '工作', '英语', '健身', '生活', '心理', '摄影', '自媒体']);
  assert.ok(initial().domains.every(item => item.longTermGoal === null && item.shortTermGoal === null && !item.positiveRecords.length && !item.negativeRecords.length));
  assert.equal(initial().completedGoals.length, 0, 'A new personal dashboard contains no invented achievement history');
  const source = freeze(initial());
  let state = data.saveDomainGoal(source, 'work', 'longTerm', '  找到长期发展方向  ', now, null);
  const long = domain(state).longTermGoal;
  assert.equal(long.content, '找到长期发展方向'); assert.equal(long.status, 'active');
  assert.equal(domain(source).longTermGoal, null, 'Saving leaves the source untouched');
  state = data.saveDomainGoal(freeze(state), 'work', 'shortTerm', '完成简历', now, null);
  const short = domain(state).shortTermGoal;
  assert.notEqual(long.id, short.id, 'Goals created in the same millisecond retain distinct ids');
  state = data.saveDomainGoal(freeze(state), 'work', 'longTerm', '确定适合自己的发展方向', now, long.id);
  assert.equal(domain(state).longTermGoal.id, long.id, 'Editing preserves goal identity and creation time');
  assert.equal(domain(state).longTermGoal.createdAt, long.createdAt);
  assert.equal(data.saveDomainGoal(state, 'work', 'shortTerm', '完成简历', now, short.id), state);
  assert.equal(data.completeDomainGoal(state, 'work', 'longTerm', 'stale-goal', now), state);
  assert.throws(() => data.saveDomainGoal(state, 'work', 'longTerm', '过期编辑', now, null), /目标已变化/);
  assert.throws(() => data.completeDomainGoal(state, 'work', 'longTerm', long.id, new Date(now.getTime() - 1)), /早于/);
  state = data.completeDomainGoal(freeze(state), 'work', 'longTerm', long.id, now);
  const completedState = state;
  assert.equal(data.displayedDomainGoal(state, 'work', 'longTerm').id, long.id, 'Completed cards retain their goal');
  state = data.undoDomainGoalCompletion(freeze(state), 'work', 'longTerm', long.id);
  assert.equal(domain(state).longTermGoal.id, long.id);
  assert.equal(domain(state).longTermGoal.createdAt, long.createdAt);
  assert.equal(domain(state).longTermGoal.status, 'active');
  assert.equal(domain(state).longTermGoal.completedAt, undefined);
  assert.equal(data.completedGoalCount(state, 'work'), 0);
  assert.equal(data.undoDomainGoalCompletion(state, 'work', 'longTerm', long.id), state, 'Repeated undo does not duplicate goals');
  assert.equal(completedState.completedGoals.length, 1, 'Undo leaves previous states untouched');
  state = data.completeDomainGoal(freeze(state), 'work', 'longTerm', long.id, now);
  assert.equal(domain(state).longTermGoal, null); assert.equal(domain(state).shortTermGoal.id, short.id);
  assert.equal(data.completedGoalCount(state, 'work'), 1); assert.equal(data.completedGoalCount(state, 'growth'), 0);
  assert.deepEqual(state.completedGoals[0], { ...long, content: '确定适合自己的发展方向', status: 'completed', domainId: 'work', kind: 'longTerm', completedAt: now.toISOString() });
  assert.equal(data.completeDomainGoal(state, 'work', 'longTerm', long.id, now), state, 'Double completion counts once');
  state = data.saveDomainGoal(state, 'work', 'longTerm', '新的长期目标', now, null);
  const replacement = domain(state).longTermGoal;
  assert.notEqual(replacement.id, long.id);
  assert.equal(data.undoDomainGoalCompletion(state, 'work', 'longTerm', long.id), state, 'Undo cannot overwrite a newer goal');
  assert.equal(data.completeDomainGoal(state, 'work', 'longTerm', long.id, now), state, 'A late previous-goal tap leaves its replacement intact');
  assert.throws(() => data.saveDomainGoal(state, 'work', 'longTerm', '旧编辑器内容', now, long.id), /目标已变化/);
  state = data.completeDomainGoal(state, 'work', 'shortTerm', short.id, now);
  assert.equal(data.completedGoalCount(state, 'work'), 2, 'Both goal kinds contribute to historical completion');

  state = data.saveDomainHabit(freeze(state), 'work', '  投递岗位  ');
  const habit = domain(state).habits.at(-1);
  assert.equal(habit.name, '投递岗位');
  state = data.toggleDomainHabit(freeze(state), 'work', habit.id, now);
  state = data.saveDomainHabit(freeze(state), 'work', '投递一个岗位', habit.id);
  assert.deepEqual(domain(state).habits.at(-1).startedDates, [data.localDateKey(now)], 'Renaming keeps the habit history');
  assert.equal(data.completedGoalCount(state, 'work'), 2, 'Starting habits never increments completed goals');
  const active = state;
  state = data.deleteDomainHabit(freeze(state), 'work', habit.id);
  assert.equal(domain(active).habits.at(-1).id, habit.id, 'Deleting does not mutate the previous state');
  assert.equal(data.deleteDomainHabit(state, 'work', habit.id), state);
  assert.throws(() => data.saveDomainHabit(state, 'work', '复活已删除习惯', habit.id), /不存在/);
  assert.throws(() => data.toggleDomainHabit(state, 'work', habit.id, now), /不存在/);
  state = data.addDomainRecord(freeze(state), 'work', 'negative', '  今天有点回避招聘网站  ', now);
  state = data.addDomainRecord(freeze(state), 'work', 'positive', '还是打开了招聘网站', now);
  state = data.addDomainRecord(freeze(state), 'work', 'positive', '整理了一段简历', now);
  const records = domain(state);
  assert.equal(records.negativeRecords[0].content, '今天有点回避招聘网站');
  assert.equal(new Set([...records.positiveRecords, ...records.negativeRecords].map(item => item.id)).size, 3);
  assert.equal(data.completedGoalCount(state, 'work'), 2, 'Records never increment completed goals');
  const removed = records.positiveRecords[0].id;
  assert.equal(data.deleteDomainRecord(state, 'work', 'negative', removed), state, 'Wrong-side deletion cannot remove a positive record');
  state = data.deleteDomainRecord(freeze(state), 'work', 'positive', removed);
  assert.deepEqual(domain(state).positiveRecords.map(item => item.content), ['整理了一段简历']);
  assert.equal(domain(state).negativeRecords.length, 1);
  assert.equal(data.deleteDomainRecord(state, 'work', 'positive', removed), state);
  assert.ok(data.isDomainState(clone(state)), 'All user edits survive JSON persistence without schema loss');

  for (const [operation, pattern] of [
    [() => data.saveDomainGoal(state, 'missing', 'longTerm', '目标', now), /不存在/],
    [() => data.saveDomainGoal(state, 'work', 'unknown', '目标', now), /请选择/],
    [() => data.saveDomainGoal(state, 'work', 'shortTerm', ' ', now), /目标需为/],
    [() => data.saveDomainGoal(state, 'work', 'shortTerm', '长'.repeat(201), now), /200/],
    [() => data.saveDomainHabit(state, 'work', ''), /习惯需为/],
    [() => data.saveDomainHabit(state, 'work', '长'.repeat(25)), /24/],
    [() => data.addDomainRecord(state, 'work', 'unknown', '记录', now), /请选择/],
    [() => data.addDomainRecord(state, 'work', 'positive', ' ', now), /记录需为/],
    [() => data.addDomainRecord(state, 'work', 'positive', '长'.repeat(6001), now), /6000/],
    [() => data.addDomainRecord(state, 'work', 'positive', '记录', new Date('invalid')), /时间/],
    [() => data.localDateKey(new Date('invalid')), /时间/],
  ]) assert.throws(operation, pattern);
  for (const mutate of [
    draft => draft.version = 2,
    draft => draft.domains = new Array(1),
    draft => draft.completedGoals = new Array(1),
    draft => draft.domains[0].habits = new Array(1),
    draft => draft.domains[0].habits[0].startedDates = new Array(1),
    draft => draft.domains[0].positiveRecords = new Array(1),
    draft => draft.domains.push(clone(draft.domains[0])),
    draft => draft.domains[0].id = '__proto__',
    draft => draft.domains[0].iconId = '../../file',
    draft => draft.domains[0].iconId = null,
    draft => draft.domains[0].longTermGoal = { id: 'bad', content: '目标', status: 'completed', createdAt: now.toISOString() },
    draft => draft.domains[0].longTermGoal = { id: 'bad', content: '目标', status: 'active', createdAt: '2026-02-30T00:00:00Z' },
    draft => draft.domains[0].habits[0].startedDates = ['2026-02-30'],
    draft => draft.domains[0].habits[0].startedDates = ['2026-10-03', '2026-10-03'],
    draft => draft.domains[0].habits[0].startedDates = ['2026-10-03T00:00:00Z'],
    draft => draft.domains[0].habits.push(clone(draft.domains[0].habits[0])),
    draft => draft.domains[1].habits.push(clone(draft.domains[0].habits[0])),
    draft => draft.domains[0].positiveRecords.push({ id: 'bad', content: '', createdAt: now.toISOString() }),
    draft => draft.domains[0].negativeRecords.push({ id: 'bad', content: '记录', createdAt: '2026-10-03' }),
    draft => draft.completedGoals.push({ id: 'bad', content: '目标', status: 'completed', createdAt: now.toISOString(), completedAt: now.toISOString(), domainId: 'missing', kind: 'longTerm' }),
    draft => draft.completedGoals.push({ id: 'bad', content: '目标', status: 'completed', createdAt: now.toISOString(), completedAt: '2026-10-02T00:00:00Z', domainId: 'work', kind: 'longTerm' }),
    draft => { const goal = { id: 'same', content: '目标', status: 'active', createdAt: now.toISOString() }; draft.domains[0].longTermGoal = goal; draft.domains[0].shortTermGoal = { ...goal }; },
  ]) { const bad = initial(); mutate(bad); assert.equal(data.isDomainState(bad), false, `Reject invalid persisted data: ${mutate}`); }
  for (const invalid of [undefined, null, [], {}, 1, 'domains']) assert.equal(data.isDomainState(invalid), false);

  const fullHabits = initial();
  domain(fullHabits).habits = Array.from({ length: data.MAX_DOMAIN_HABITS }, (_, index) => ({ id: `limit-habit-${index}`, name: '习惯', startedDates: [] }));
  assert.ok(data.isDomainState(fullHabits));
  assert.throws(() => data.saveDomainHabit(fullHabits, 'work', '更多习惯'), /最多保存/);
  assert.equal(domain(data.saveDomainHabit(fullHabits, 'work', '可以修改', 'limit-habit-0')).habits[0].name, '可以修改');
  const fullGoals = data.saveDomainGoal(initial(), 'work', 'longTerm', '保留这个目标', now);
  fullGoals.completedGoals = Array.from({ length: data.MAX_DOMAIN_COMPLETED_GOALS }, (_, index) => ({ id: `limit-goal-${index}`, content: '目标', status: 'completed', domainId: 'work', kind: 'longTerm', createdAt: now.toISOString(), completedAt: now.toISOString() }));
  assert.ok(data.isDomainState(fullGoals));
  assert.throws(() => data.completeDomainGoal(fullGoals, 'work', 'longTerm', domain(fullGoals).longTermGoal.id, now), /1000/);
  assert.ok(domain(fullGoals).longTermGoal, 'Completion history capacity retains the active goal');
  const fullRecords = initial();
  domain(fullRecords).positiveRecords = Array.from({ length: data.MAX_DOMAIN_RECORDS }, (_, index) => ({ id: `limit-record-${index}`, content: '记录', createdAt: now.toISOString() }));
  assert.ok(data.isDomainState(fullRecords));
  assert.throws(() => data.addDomainRecord(fullRecords, 'work', 'negative', '更多记录', now), /5000/);
  assert.equal(domain(fullRecords).positiveRecords.length, 5000, 'Count limits never trim earlier records');
  assert.ok(data.isDomainState(data.deleteDomainRecord(fullRecords, 'work', 'positive', 'limit-record-0')));

  const fullBytes = initial(), longRecord = '记'.repeat(100) + '🌱'.repeat(50);
  while (Buffer.byteLength(JSON.stringify(fullBytes), 'utf8') < data.MAX_DOMAIN_DATA_BYTES - 800) {
    domain(fullBytes).positiveRecords.push({ id: `bytes-${domain(fullBytes).positiveRecords.length}`, content: longRecord, createdAt: now.toISOString() });
  }
  assert.ok(data.isDomainState(fullBytes));
  let capacityState = fullBytes;
  while (true) {
    try { capacityState = data.addDomainRecord(capacityState, 'work', 'positive', longRecord, now); }
    catch (error) { assert.match(error.message, /存储空间已满/); break; }
  }
  const beforeCapacity = JSON.stringify(capacityState);
  assert.throws(() => data.addDomainRecord(capacityState, 'work', 'positive', longRecord, now), /存储空间已满/);
  assert.equal(JSON.stringify(capacityState), beforeCapacity, 'Chinese and emoji payload limits preserve all earlier records');
  assert.ok(Buffer.byteLength(beforeCapacity, 'utf8') <= data.MAX_DOMAIN_DATA_BYTES);
  const invalidCapacity = clone(capacityState);
  domain(invalidCapacity).negativeRecords.push({ id: 'over-limit', content: longRecord, createdAt: now.toISOString() });
  assert.equal(data.isDomainState(invalidCapacity), false);

  checkCalendar();
  for (const timezone of ['Asia/Singapore', 'America/New_York', 'UTC']) execFileSync(process.execPath, [__filename, '--timezone'], { env: { ...process.env, TZ: timezone }, stdio: 'inherit' });
  const tools = load('../src/lib/tool-state-store.ts'), storage = new Map(), remote = new Map();
  let userName = 'first-reader';
  const adapter = {
    read: key => storage.get(key), write: (key, value) => storage.set(key, clone(value)), fingerprint: () => userName,
    session: async () => ({ authenticated: true, userName }),
    get: async key => ({ data: remote.get(`${userName}:${key}`) || null }),
    put: async (key, value, owner) => { remote.set(`${owner.slice('reader:'.length)}:${key}`, clone(value)); },
  };
  const store = tools.createPersonalToolStore(adapter);
  const first = await store.load('domains', initial());
  store.edit('domains', first, current => data.addDomainRecord(current, 'work', 'positive', '本机和账号记录', now));
  await store.flush('domains', first.owner);
  assert.equal(domain(remote.get('first-reader:domains')).positiveRecords.length, 1, 'Authenticated edits reach the existing account adapter');
  store.edit('domains', first, current => data.saveDomainRecords(current, 'work', ['first', 'second'].map(id => ({ kind: 'negative', record: { id: `account-batch-${id}`, content: id, createdAt: now.toISOString() } }))));
  await store.flush('domains', first.owner);
  assert.equal(domain(remote.get('first-reader:domains')).negativeRecords.length, 2, 'Same-sign batches use the original account save queue');
  const refreshed = await tools.createPersonalToolStore(adapter).load('domains', initial());
  assert.equal(domain(refreshed.value).positiveRecords.length, 1, 'A new store instance restores persisted data after refresh');
  assert.equal(domain(refreshed.value).negativeRecords.length, 2);
  userName = 'second-reader';
  const second = await store.load('domains', initial());
  assert.equal(domain(second.value).positiveRecords.length, 0, 'A different account cannot see another account’s domain cache');
  assert.equal(domain(second.value).negativeRecords.length, 0, 'The paired batch remains isolated to its original account');
  assert.throws(() => store.edit('domains', first, initial()), /账号状态已变化/);
  userName = 'first-reader';
  const restored = await store.load('domains', initial());
  assert.equal(domain(restored.value).positiveRecords.length, 1);
  const growth = await store.load('growth', { independent: true });
  assert.deepEqual(growth.value, { independent: true }, 'The existing growth tool has a separate storage namespace');
  assert.notEqual(tools.toolCacheKey('reader:first-reader', 'domains'), tools.toolCacheKey('reader:first-reader', 'growth'));
  const guestStore = tools.createPersonalToolStore({ ...adapter, fingerprint: () => '', session: async () => ({ authenticated: false }) });
  const guest = await guestStore.load('domains', initial());
  guestStore.edit('domains', guest, current => data.addDomainRecord(current, 'life', 'negative', '访客也能先记下', now));
  const guestRefreshed = await tools.createPersonalToolStore({ ...adapter, fingerprint: () => '', session: async () => ({ authenticated: false }) }).load('domains', initial());
  assert.equal(domain(guestRefreshed.value, 'life').negativeRecords.length, 1, 'Guests persist across page refresh without an account');
  console.log('Domain data passed: domain customization/deletion/sorting, legacy icons, immutable same-sign batches/retries, goal completion identity, habit local dates, record deletion, validation, UTF-8 capacity, persistence, and account isolation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
