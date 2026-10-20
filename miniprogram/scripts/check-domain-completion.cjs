const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const modules = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, relative);
  if (modules.has(filename)) return modules.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  modules.set(filename, exports);
  new Function('exports', 'require', output)(exports, name => load(path.join(path.dirname(relative), `${name}.ts`)));
  return exports;
}
const { domainCompletionCounts } = load('../src/lib/domain-completion.ts');
const domainData = load('../src/lib/domain-data.ts');
const domainProgress = load('../src/lib/domain-progress.ts');
const habitData = load('../src/lib/reminder-data.ts');
const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return value;
}
const initial = () => clone(domainData.initialDomainState);
const habit = (id, overrides = {}) => ({ id, title: id, group: '工作', domainId: 'work', kind: 'focus', note: '', minutes: 25, enabled: true, ...overrides });
const count = (domains, reminders, date, id = 'work', period) => domainCompletionCounts(domains, reminders, date, period).find(item => item.domainId === id);
const emptyHabits = () => ({ version: 1, items: [], done: {} });
const goalIn = (state, kind, id = 'work') => state.domains.find(domain => domain.id === id)[`${kind}Goal`];

function checkTimezone() {
  const start = new Date(2026, 9, 4, 23, 50), completion = new Date(2026, 9, 5, 0, 1), today = new Date(2026, 9, 5, 0, 10);
  let domains = domainData.saveDomainGoal(initial(), 'work', 'shortTerm', '午夜完成', start);
  domains = domainData.completeDomainGoal(domains, 'work', 'shortTerm', goalIn(domains, 'shortTerm').id, completion);
  const reminders = { version: 1, items: [habit('day-boundary')], done: { '2026-10-04': ['day-boundary'], '2026-10-05': ['day-boundary'] } };
  assert.equal(count(domains, reminders, today, 'work', 'today').shortTermGoals, 1, 'Goal daily counts use the local completion date');
  assert.equal(count(domains, reminders, start, 'work', 'today').shortTermGoals, 0, 'Future completion remains excluded before midnight');
  assert.equal(count(domains, reminders, new Date(2026, 9, 6), 'work', 'today').shortTermGoals, 0, 'Daily goals reset at the local date boundary');
  assert.equal(count(domains, reminders, new Date(2026, 9, 6)).shortTermGoals, 1, 'Cumulative goals remain completed on a new day');
  assert.equal(count(domains, reminders, new Date(2026, 9, 6)).habits, 0, 'Yesterday never marks a habit as complete today');
  assert.equal(count(domains, reminders, today).habits, 1);
  console.log(`Domain completion local dates passed in ${process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone}.`);
}

function checkCounts() {
  const created = new Date(2026, 9, 1, 9), yesterday = new Date(2026, 9, 4, 10), now = new Date(2026, 9, 5, 12), future = new Date(2026, 9, 5, 13);
  const day = domainData.localDateKey(now), ordinal = habitData.habitDayIndex(day);
  let domains = domainData.saveDomainGoal(initial(), 'work', 'shortTerm', '昨天完成', created);
  domains = domainData.completeDomainGoal(domains, 'work', 'shortTerm', goalIn(domains, 'shortTerm').id, yesterday);
  domains = domainData.saveDomainGoal(domains, 'work', 'shortTerm', '今天完成', created);
  const second = goalIn(domains, 'shortTerm').id;
  domains = domainData.completeDomainGoal(domains, 'work', 'shortTerm', second, now);
  domains = domainData.saveDomainGoal(domains, 'work', 'longTerm', '长期完成', created);
  const long = goalIn(domains, 'longTerm').id;
  domains = domainData.completeDomainGoal(domains, 'work', 'longTerm', long, now);
  domains = domainData.saveDomainGoal(domains, 'work', 'longTerm', '尚未到完成时刻', created);
  domains = domainData.completeDomainGoal(domains, 'work', 'longTerm', goalIn(domains, 'longTerm').id, future);
  domains = domainData.saveDomainGoal(domains, 'life', 'longTerm', '其他领域完成', created);
  domains = domainData.completeDomainGoal(domains, 'life', 'longTerm', goalIn(domains, 'longTerm', 'life').id, now);
  domains = domainData.saveDomainGoal(domains, 'work', 'shortTerm', '仍在进行的目标', now);
  domains.domains.find(domain => domain.id === 'work').habits = [{ id: 'old-domain-habit', name: '旧独立习惯', startedDates: [day] }];
  let reminders = { version: 1, items: [habit('checked'), habit('unchecked'), habit('paused', { enabled: false }), habit('other', { domainId: 'life' })], done: { [day]: ['checked', 'checked', 'paused', 'other', 'deleted-habit'] } };
  const source = freeze(domains), habitSource = freeze(reminders), before = JSON.stringify([source, habitSource]);
  assert.deepEqual(count(source, habitSource, now), { domainId: 'work', shortTermGoals: 2, longTermGoals: 1, habits: 1 });
  assert.deepEqual(count(source, habitSource, now, 'work', 'today'), { domainId: 'work', shortTermGoals: 1, longTermGoals: 1, habits: 1 });
  assert.deepEqual(count(source, habitSource, now, 'life'), { domainId: 'life', shortTermGoals: 0, longTermGoals: 1, habits: 1 });
  assert.deepEqual(domainCompletionCounts(source, habitSource, now).map(item => item.domainId), source.domains.map(domain => domain.id), 'Display order follows the actual domain order');
  assert.equal(JSON.stringify([source, habitSource]), before, 'Reading counts never writes, normalizes in place or drops source records');
  assert.equal(count(source, habitSource, future).longTermGoals, 2, 'A completion starts counting only when its timestamp is reached');

  reminders = habitData.toggleReminderDone(reminders, 'checked', day);
  assert.equal(count(domains, reminders, now).habits, 0, 'Undo updates the same shared habit record');
  reminders = habitData.toggleReminderDone(reminders, 'checked', day);
  assert.equal(count(domains, reminders, now).habits, 1, 'Completing again counts one habit');
  reminders = { ...reminders, items: reminders.items.filter(item => item.id !== 'checked') };
  assert.equal(count(domains, reminders, now).habits, 0, 'A deleted habit cannot be counted from leftover dates');
  const archived = { version: 1, items: [habit('archive')], done: {}, completionHistory: { archive: [[ordinal - 10, ordinal + 1]] } };
  assert.equal(count(domains, archived, now).habits, 1, 'Calendar archives and explicit dates share the existing completion history');
  assert.equal(count(domains, { ...archived, done: { [day]: [] } }, now).habits, 0, 'An explicit undo wins over the archive');
  assert.equal(count(domains, { ...archived, completionHistory: { archive: [[ordinal + 1, ordinal + 2]] } }, now).habits, 0, 'Future habit history cannot mark today complete');

  let undone = domainData.undoDomainGoalCompletion(domains, 'work', 'longTerm', long);
  // A newer long-term goal blocks undo of an older completed goal by the existing edit rule.
  assert.equal(count(undone, emptyHabits(), now).longTermGoals, 1);
  undone = { ...domains, completedGoals: domains.completedGoals.filter(goal => goal.id !== long && goal.completedAt !== future.toISOString()) };
  assert.equal(count(undone, emptyHabits(), now).longTermGoals, 0, 'A removed completion is never cached as an achievement');
  let undoable = domainData.saveDomainGoal(initial(), 'work', 'shortTerm', '可撤销目标', created);
  const undoableId = goalIn(undoable, 'shortTerm').id;
  undoable = domainData.completeDomainGoal(undoable, 'work', 'shortTerm', undoableId, now);
  assert.equal(count(undoable, emptyHabits(), now).shortTermGoals, 1);
  undoable = domainData.undoDomainGoalCompletion(undoable, 'work', 'shortTerm', undoableId);
  assert.equal(count(undoable, emptyHabits(), now).shortTermGoals, 0, 'Undo immediately removes a completed target from the summary');
  const removed = domainData.deleteDomain(domains, 'work');
  assert.equal(count(removed, habitSource, now), undefined, 'A deleted domain is not recreated by summary reads');
  assert.equal(count(removed, habitSource, now, 'life').habits, 1, 'Deletion never affects another domain');
  assert.deepEqual(domainCompletionCounts({ version: 1, domains: [], completedGoals: [] }, habitSource, now), []);
  assert.ok(domainCompletionCounts(initial(), emptyHabits(), now).every(item => !item.shortTermGoals && !item.longTermGoals && !item.habits), 'Valid empty stores display real zero values');
  assert.throws(() => domainCompletionCounts(initial(), emptyHabits(), new Date('invalid')), /时间/);
}

function checkMapping() {
  const now = new Date(2026, 9, 5, 12), day = domainData.localDateKey(now);
  let domains = domainData.saveDomain(initial(), { id: 'work', name: '职业', iconId: 'work' });
  domains = domainData.saveDomain(domains, { name: '自定分类', iconId: 'star' });
  const customId = domains.domains.at(-1).id;
  domains = domainData.saveDomain(domains, { name: '未分类', iconId: 'notes' });
  const uncategorizedId = domains.domains.at(-1).id;
  const items = [
    habit('stable', { group: '旧名称' }),
    habit('current-name', { domainId: undefined, group: '职业', kind: 'walk' }),
    habit('legacy-work', { domainId: undefined, group: '学习', kind: 'focus' }),
    habit('legacy-life', { domainId: undefined, group: '健康', kind: 'exercise' }),
    habit('legacy-mind', { domainId: undefined, group: '精神', kind: 'breathe' }),
    habit('legacy-english', { domainId: undefined, group: '学习', kind: 'language' }),
    habit('legacy-photo', { domainId: undefined, group: '学习', kind: 'camera' }),
    habit('legacy-media', { domainId: undefined, group: '学习', kind: 'film' }),
    habit('legacy-growth', { domainId: undefined, group: '学习', kind: 'explore' }),
    habit('custom', { domainId: undefined, group: '自定分类', kind: 'walk' }),
    habit('uncategorized', { domainId: undefined, group: '未分类', kind: 'walk' }),
    habit('orphan', { domainId: 'removed', group: '职业' }),
    habit('unmapped', { domainId: undefined, group: '旧自定分类', kind: 'walk' }),
  ];
  const reminders = { version: 1, items, done: { [day]: items.map(item => item.id) } };
  assert.equal(count(domains, reminders, now).habits, 3, 'Stable IDs, current names and legacy groups share the same existing domain mapping');
  for (const id of ['life', 'mind', 'english', 'photo', 'media', 'growth', customId]) assert.equal(count(domains, reminders, now, id).habits, 1, `Map ${id} through the existing shared habit mapping`);
  assert.equal(count(domains, reminders, now, uncategorizedId).habits, 3, 'The system display includes unset and orphaned associations without changing stored IDs');
  assert.equal(domainCompletionCounts(domains, reminders, now).reduce((sum, entry) => sum + entry.habits, 0), 13);
  const stable = { version: 1, items: [habit('stable')], done: { [day]: ['stable'] } };
  domains = domainData.saveDomain(domains, { id: 'work', name: '事业', iconId: 'work' });
  assert.equal(count(domains, stable, now).habits, 1, 'Renaming retains stable-ID habit completion');
  assert.equal(count(domains, { ...stable, items: [habit('stable', { domainId: 'life' })] }, now).habits, 0, 'Moving a shared habit updates its current domain without copying its completion');
  assert.equal(count(domains, { ...stable, items: [habit('stable', { domainId: 'life' })] }, now, 'life').habits, 1);
}

function checkProgress() {
  const low = freeze({ domainId: 'low', longTermGoals: 1, shortTermGoals: 1, habits: 1 });
  const high = freeze({ domainId: 'high', longTermGoals: 2, shortTermGoals: 1, habits: 3 });
  const before = JSON.stringify([low, high]);
  const scale = domainProgress.domainProgressScale([low, high]);
  assert.equal(scale, 18, 'The global visual scale is the largest combined weighted count, not a category maximum');
  const first = domainProgress.domainProgressSegments(low, scale), second = domainProgress.domainProgressSegments(high, scale);
  assert.deepEqual(first.map(item => item.kind), ['longTermGoals', 'shortTermGoals', 'habits']);
  assert.deepEqual(first.map(item => item.count), [1, 1, 1], 'Visual weighting preserves the underlying completed counts');
  assert.ok(Math.abs(first[0].width / first[1].width - 2) < 1e-10, 'A long target occupies twice the short-target length');
  assert.ok(Math.abs(first[1].width / first[2].width - 3) < 1e-10, 'A short target occupies three habit units');
  for (const [index, count] of [2, 1, 3].entries()) assert.ok(Math.abs(first[index].width - second[index].width / count) < 1e-10, 'Equal units share one cross-domain scale');
  assert.ok(Math.abs(second.reduce((total, item) => total + item.width, 0) - 100) < 1e-10, 'The maximum combined line fits exactly in one track');
  assert.ok(Math.abs(first.reduce((total, item) => total + item.width, 0) - 100 * 10 / 18) < 1e-10, 'A smaller combined line retains its relative visual length');
  const empty = { domainId: 'empty', longTermGoals: 0, shortTermGoals: 0, habits: 0 };
  assert.equal(domainProgress.domainProgressScale([]), 1);
  assert.equal(domainProgress.domainProgressScale([empty]), 1);
  assert.ok(domainProgress.domainProgressSegments(empty, 1).every(item => Number.isFinite(item.width) && item.width === 0), 'Empty progress does not fabricate completion or invalid percentages');
  assert.equal(JSON.stringify([low, high]), before, 'Visual progress only reads the original counts');

  const created = new Date(2026, 9, 1, 9), completed = new Date(2026, 9, 2, 12);
  let state = domainData.saveDomainGoal(initial(), 'work', 'longTerm', '第一条已完成目标', created);
  state = domainData.completeDomainGoal(state, 'work', 'longTerm', goalIn(state, 'longTerm').id, completed);
  state = domainData.saveDomainGoal(state, 'work', 'longTerm', '最新已完成目标', created);
  const latestId = goalIn(state, 'longTerm').id;
  state = domainData.completeDomainGoal(state, 'work', 'longTerm', latestId, completed);
  assert.equal(domainData.displayedDomainGoal(state, 'work', 'longTerm').content, '最新已完成目标', 'Summary falls back to the latest archived completed goal');
  assert.equal(domainData.displayedDomainGoal(state, 'work', 'longTerm').status, 'completed');
  state = domainData.undoDomainGoalCompletion(state, 'work', 'longTerm', latestId);
  assert.equal(domainData.displayedDomainGoal(state, 'work', 'longTerm').id, latestId);
  assert.equal(domainData.displayedDomainGoal(state, 'work', 'longTerm').status, 'active', 'Undo updates the visible goal without replacing its ID');
  assert.equal(domainData.displayedDomainGoal(state, 'life', 'shortTerm'), null, 'Unset goals have an explicit empty state');
}

if (process.argv.includes('--timezone')) checkTimezone();
else {
  checkCounts();
  checkMapping();
  checkProgress();
  checkTimezone();
  for (const timezone of ['Asia/Singapore', 'America/New_York', 'UTC']) execFileSync(process.execPath, [__filename, '--timezone'], { env: { ...process.env, TZ: timezone }, stdio: 'inherit' });
  console.log('Domain completion counts passed: goal kinds, complete/undo, local days, future filtering, shared habit mapping, pause/deletion, archives, weighted cross-domain progress and immutable reads.');
}
