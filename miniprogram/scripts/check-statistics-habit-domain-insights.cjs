const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const modules = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, relative);
  if (modules.has(filename)) return modules.get(filename);
  const exports = {}; modules.set(filename, exports);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('exports', 'require', code)(exports, name => load(path.join(path.dirname(relative), `${name}.ts`)));
  return exports;
}
const insights = load('../src/lib/statistics-habit-domain-insights.ts');
const reminders = load('../src/lib/reminder-data.ts');
const model = load('../src/lib/statistics-insight-model.ts');
const freeze = value => {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return value;
};
const metric = (insight, label) => insight.metrics.find(item => item.label === label);
const chart = (insight, id) => insight.charts.find(item => item.id === id);
const sum = points => points.reduce((total, point) => total + point.values.reduce((n, value) => n + value, 0), 0);
const habit = (id, extra = {}) => ({ id, title: id, group: '工作', domainId: 'work', kind: 'focus', note: '', minutes: 25, enabled: true, ...extra });
const domain = (id, extra = {}) => ({ id, name: id, longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [], ...extra });
const record = (id, stamp, extra = {}) => ({ id, content: id, createdAt: stamp.toISOString(), ...extra });
const goal = (id, domainId, stamp, extra = {}) => ({ id, content: id, domainId, kind: 'shortTerm', status: 'completed', createdAt: new Date(stamp.getTime() - 60_000).toISOString(), completedAt: stamp.toISOString(), ...extra });

function verifyHabits() {
  const now = new Date(2026, 9, 12, 12), today = reminders.habitDayIndex('2026-10-12');
  const state = freeze({ version: 1,
    items: [habit('old'), habit('archived', { enabled: false }), habit('new', { createdAt: now.getTime() })],
    done: { '2026-10-08': ['archived'], '2026-10-12': ['old', 'old', 'deleted'], '2026-10-14': ['old'] },
    completionHistory: { old: [[today - 1000, today + 2]], archived: [[today - 5, today - 3]], deleted: [[today - 1000, today]] },
  });
  const before = JSON.stringify(state), value = insights.habitStatisticsInsight(state, now, 7);
  assert.equal(metric(value, '打卡次数').value, '9', 'Full retained ranges, archived history and explicit undo are reconciled');
  assert.equal(metric(value, '记录天数').value, '7');
  assert.equal(metric(value, '日均打卡').value, '1.3');
  assert.equal(metric(value, '打卡习惯').value, '2', 'A new habit with no completion is not assigned historical check-ins');
  assert.equal(metric(value, '进行中习惯').value, '2');
  assert.equal(metric(value, '最长当前连续').value, '4', 'Explicit undo splits the original full-history streak');
  assert.deepEqual(chart(value, 'habit-daily').points.map(point => point.values[0]), [1, 2, 1, 2, 1, 1, 1]);
  assert.deepEqual(chart(value, 'habit-ranking').points.map(point => [point.label, point.values[0]]), [['old', 6], ['archived（已归档）', 3], ['new', 0]]);
  assert.ok(value.findings.some(text => text.includes('增加 2 次打卡')));
  assert.equal(JSON.stringify(state), before, 'Neither normalization nor statistics writes to the archive');
  assert.equal(metric(insights.habitStatisticsInsight(state, now, 30), '打卡次数').value, '32');
  const duplicate = { ...state, items: [...state.items, { ...state.items[0], title: 'duplicate' }] };
  assert.equal(metric(insights.habitStatisticsInsight(duplicate, now, 7), '打卡次数').value, '9', 'Repeated entity IDs cannot double count history');
  const staleCalendar = freeze({ version: 1, items: [habit('historical')], done: {}, completionHistory: { historical: [[today - 999, today - 1]] } });
  assert.equal(metric(insights.habitStatisticsInsight(staleCalendar, now, 7), '打卡次数').value, '6', 'A missing 90-day row is not the absence of retained completion history');
  assert.equal(metric(insights.habitStatisticsInsight(staleCalendar, now, 7), '最长当前连续').value, '999');
  const rankedState = freeze({ version: 1, items: Array.from({ length: 8 }, (_, i) => habit(`h${i}`)), done: {},
    completionHistory: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`h${i}`, [[today - i, today]]])) });
  const ranked = insights.habitStatisticsInsight(rankedState, now, 30);
  assert.equal(chart(ranked, 'habit-ranking').points.length, 6);
  assert.deepEqual(chart(ranked, 'habit-ranking').points.map(point => point.values[0]), [8, 7, 6, 5, 4, 6]);
  assert.equal(sum(chart(ranked, 'habit-ranking').points), 36, 'Merged lower ranks keep all check-ins in the chart total');
  const collisionItems = rankedState.items.map((item, index) => ({ ...item, id: index === 7 ? 'remaining' : index === 6 ? '_remaining' : item.id }));
  const collisionState = freeze({ ...rankedState, items: collisionItems,
    completionHistory: Object.fromEntries(collisionItems.map((item, index) => [item.id, rankedState.completionHistory[`h${index}`]])) });
  const collisionRanking = chart(insights.habitStatisticsInsight(collisionState, now, 30), 'habit-ranking').points;
  assert.equal(new Set(collisionRanking.map(point => point.key)).size, collisionRanking.length, 'The aggregate key is unique even when stored IDs use remaining and _remaining');
  assert.equal(collisionRanking.at(-1).key, '__remaining');
  assert.equal(sum(collisionRanking), 36, 'Resolving chart keys cannot change any counts');
  const empty = insights.habitStatisticsInsight(freeze({ version: 1, items: [], done: {} }), now, 7);
  assert.ok(empty.metrics.every(item => item.value === '0'));
  assert.equal(chart(empty, 'habit-daily').points.length, 7);
  assert.equal(chart(empty, 'habit-ranking').points.length, 0);
  assert.ok(empty.findings.some(text => text === '本期没有打卡记录。'));
}

function verifyDomains() {
  const now = new Date(2026, 9, 12, 12), yesterday = new Date(2026, 9, 11, 22), today = new Date(2026, 9, 12, 11);
  const future = new Date(2026, 9, 12, 13), previous = new Date(2026, 9, 3, 10);
  const state = freeze({ version: 1, domains: [
    domain('work', { name: '同名', positiveRecords: [record('one', yesterday), record('two', today), record('future', future), record('previous', previous)], negativeRecords: [record('three', today)] }),
    domain('life', { name: '同名', positiveRecords: [record('image-only', yesterday, { content: '', images: [{ id: 'image', dataUrl: 'data:image/png;base64,AAAA' }] })] }),
    domain('uncategorized', { name: '未分类', negativeRecords: [record('uncategorized-record', today)] }),
    domain('goals-only'),
  ], completedGoals: [goal('short', 'work', today), goal('long', 'goals-only', today, { kind: 'longTerm' }),
    goal('future-goal', 'work', future), goal('deleted-goal', 'deleted', today), goal('previous-goal', 'work', previous)] });
  const before = JSON.stringify(state), value = insights.domainStatisticsInsight(state, now, 7);
  assert.equal(metric(value, '记录总数').value, '5');
  assert.equal(metric(value, '正向记录').value, '3');
  assert.equal(metric(value, '负向记录').value, '2');
  assert.equal(metric(value, '记录天数').value, '2');
  assert.equal(metric(value, '完成目标').value, '2');
  assert.equal(metric(value, '活跃领域').value, '4', 'Goal-only activity and the real uncategorized domain are included');
  assert.deepEqual(chart(value, 'domain-daily').points.slice(-2).map(point => point.values), [[2, 0], [1, 2]]);
  assert.equal(chart(value, 'domain-ranking').points.filter(point => point.label === '同名').length, 2, 'Same names never merge distinct business IDs');
  assert.equal(sum(chart(value, 'domain-ranking').points), 5);
  assert.ok(value.findings.some(text => text.includes('增加 4 条记录')));
  assert.equal(JSON.stringify(state), before);
  assert.equal(metric(insights.domainStatisticsInsight(state, now, 30), '记录总数').value, '6');
  assert.equal(metric(insights.domainStatisticsInsight(state, now, 30), '完成目标').value, '3');
  const duplicate = { ...state, domains: [...state.domains, state.domains[0]], completedGoals: [...state.completedGoals, state.completedGoals[0]] };
  assert.equal(metric(insights.domainStatisticsInsight(duplicate, now, 7), '记录总数').value, '5');
  assert.equal(metric(insights.domainStatisticsInsight(duplicate, now, 7), '完成目标').value, '2');
  const repeatedRecord = { ...state, domains: state.domains.map(item => item.id === 'life'
    ? { ...item, negativeRecords: [state.domains[0].positiveRecords[0]] } : item) };
  assert.equal(metric(insights.domainStatisticsInsight(repeatedRecord, now, 7), '记录总数').value, '5', 'One record ID cannot count twice across domains or signs');
  const removed = { ...state, domains: state.domains.filter(item => item.id !== 'work') };
  assert.equal(metric(insights.domainStatisticsInsight(removed, now, 7), '记录总数').value, '2');
  assert.equal(metric(insights.domainStatisticsInsight(removed, now, 7), '完成目标').value, '1', 'Removed domain IDs cannot resurrect stale completed goal history');
  const rankedState = freeze({ version: 1, domains: Array.from({ length: 8 }, (_, i) => domain(`d${i}`, {
    positiveRecords: Array.from({ length: i + 1 }, (_, n) => record(`record-${i}-${n}`, today)),
  })), completedGoals: [] });
  const ranking = chart(insights.domainStatisticsInsight(rankedState, now, 7), 'domain-ranking').points;
  assert.equal(ranking.length, 6); assert.equal(sum(ranking), 36);
  const collisionState = freeze({ ...rankedState, domains: rankedState.domains.map((item, index) => ({ ...item, id: index === 7 ? 'remaining' : index === 6 ? '_remaining' : item.id })) });
  const collisionRanking = chart(insights.domainStatisticsInsight(collisionState, now, 7), 'domain-ranking').points;
  assert.equal(new Set(collisionRanking.map(point => point.key)).size, collisionRanking.length);
  assert.equal(collisionRanking.at(-1).key, '__remaining');
  assert.equal(sum(collisionRanking), 36);
  const empty = insights.domainStatisticsInsight(freeze({ version: 1, domains: [], completedGoals: [] }), now, 30);
  assert.ok(empty.metrics.every(item => item.value === '0'));
  assert.equal(chart(empty, 'domain-daily').points.length, 30);
  assert.equal(chart(empty, 'domain-ranking').points.length, 0);
}

function verifyLocalDays() {
  // Midnight and the preceding evening cover UTC date differences in both offset directions.
  const now = new Date(2026, 9, 12, 0, 30), completion = new Date(2026, 9, 12, 0, 10), evening = new Date(2026, 9, 11, 23, 50);
  const state = freeze({ version: 1, domains: [domain('work', { positiveRecords: [record('midnight', completion), record('evening', evening)] })], completedGoals: [goal('midnight-goal', 'work', completion)] });
  const value = insights.domainStatisticsInsight(state, now, 7);
  assert.equal(chart(value, 'domain-daily').points.at(-1).key, '2026-10-12');
  assert.deepEqual(chart(value, 'domain-daily').points.at(-1).values, [1, 0]);
  assert.deepEqual(chart(value, 'domain-daily').points.at(-2).values, [1, 0]);
  assert.equal(metric(value, '完成目标').value, '1');
  const dst = model.insightWindow(new Date(2026, 2, 10, 1), 7);
  assert.deepEqual(dst.days, ['2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']);
  const habitState = { version: 1, items: [habit('midnight')], done: { '2026-10-12': ['midnight'] } };
  assert.deepEqual(chart(insights.habitStatisticsInsight(habitState, now, 7), 'habit-daily').points.at(-1).values, [1], 'Habit day strings are calendar ordinals independent of local offset');
}

if (process.argv.includes('--timezone')) {
  verifyLocalDays();
  console.log(`Habit/domain statistics local date checks passed in ${process.env.TZ}.`);
} else {
  verifyHabits(); verifyDomains(); verifyLocalDays();
  for (const zone of ['UTC', 'Asia/Shanghai', 'America/New_York']) {
    process.stdout.write(execFileSync(process.execPath, [__filename, '--timezone'], { env: { ...process.env, TZ: zone }, encoding: 'utf8' }));
  }
  console.log('Habit/domain automatic statistics: full ranges, undo, archived/new/deleted identities, signs, goals, time zones, ranked totals, empty archives and read-only state passed.');
}
