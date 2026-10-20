const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

const modules = new Map();
function load(filename) {
  const file = path.resolve(filename);
  if (modules.has(file)) return modules.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  modules.set(file, module.exports);
  new Function('require', 'module', 'exports', source)(name => {
    assert.ok(name.startsWith('.'), `Statistics data unexpectedly imports runtime dependency ${name}`);
    return load(path.resolve(path.dirname(file), `${name}.ts`));
  }, module, module.exports);
  return module.exports;
}
const { dietStatisticsInsight: diet, growthStatisticsInsight: growth } = load(path.join(__dirname, '../src/lib/statistics-food-growth-insights.ts'));
const metric = (insight, label) => insight.metrics.find(item => item.label === label)?.value;
const chart = (insight, id) => insight.charts.find(item => item.id === id);
function deeplyFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') deeplyFreeze(child);
  return value;
}
const local = (year, month, day, hour = 0, minute = 0) => new Date(year, month - 1, day, hour, minute);
const event = (id, date, size = 'small', domainId = 'a') => ({ id, domainId, size, createdAt: date.toISOString() });
const goal = (id, date, domainId = 'a') => ({ id, domainId, title: id, createdAt: null, completedAt: date.toISOString() });
const domain = (id, archived = false, name = id) => ({ id, name, iconId: 'plant', archived });
const nutrition = (id, date, carbs = 0, protein = 0, fat = 0) => ({ id, date, name: id, carbs, protein, fat });

function check() {
  const now = local(2026, 10, 12, 12);
  const meals = deeplyFreeze({ version: 1, meals: [], nutrition: [
    nutrition('before', '2026-09-28', 200), nutrition('previous-first', '2026-09-29', 5), nutrition('previous-last', '2026-10-05', 90),
    nutrition('start-a', '2026-10-06', 10, 4, 3), nutrition('start-b', '2026-10-06', 20, 6),
    nutrition('recorded-zero', '2026-10-12'), nutrition('future', '2026-10-13', 500),
  ] });
  const beforeMeals = JSON.stringify(meals), food = diet(meals, now, 7);
  assert.equal(metric(food, '记录天数'), '2');
  assert.equal(metric(food, '记录餐数'), '3');
  assert.equal(metric(food, '日均碳水'), '15', 'Nutrition averages divide by recorded days, including explicitly recorded zeros');
  assert.equal(metric(food, '日均蛋白质'), '5');
  assert.equal(metric(food, '日均脂肪'), '1.5');
  assert.equal(metric(food, '每记录日餐数'), '1.5');
  const nutrients = chart(food, 'diet-daily-nutrients');
  assert.equal(nutrients.points.length, 7);
  assert.deepEqual(nutrients.series.map(item => item.label), ['碳水', '蛋白质', '脂肪']);
  assert.equal(nutrients.points[0].key, '2026-10-06');
  assert.equal(nutrients.points.at(-1).key, '2026-10-12');
  assert.deepEqual(nutrients.points[0].values, [30, 10, 3]);
  assert.equal(nutrients.points[0].missing, false);
  assert.equal(nutrients.points[1].missing, true, 'An unrecorded day must remain unknown, not a real zero intake');
  assert.deepEqual(nutrients.points[1].values, [0, 0, 0]);
  assert.equal(nutrients.points.at(-1).missing, false, 'An explicit 0 g entry is recorded');
  assert.deepEqual(nutrients.points.at(-1).values, [0, 0, 0]);
  assert.ok(food.findings.some(line => line.includes('记录餐数') && line.includes('增加 1 餐')), 'Previous period contains both local-calendar boundaries');
  assert.ok(food.findings.some(line => line.includes('记录天数') && line.includes('相同')));
  assert.equal(JSON.stringify(meals), beforeMeals, 'Nutrition summaries never mutate stored data');
  const emptyFood = diet(deeplyFreeze({ version: 1, meals: [] }), now, 7);
  assert.equal(metric(emptyFood, '记录餐数'), '0', 'Legacy meal libraries without nutrition are supported');
  assert.equal(metric(emptyFood, '日均蛋白质'), '—', 'An absent denominator does not fabricate an average');
  assert.ok(emptyFood.charts[0].points.every(point => point.missing));
  assert.ok(emptyFood.findings.some(line => line.includes('均无记录')));

  const state = deeplyFreeze({ version: 1, domains: [domain('a', false, '同名'), domain('b', true, '同名')], events: [
    event('before-previous', local(2026, 9, 28, 23, 59), 'large'),
    event('previous-start', local(2026, 9, 29), 'medium'), event('previous-end', local(2026, 10, 5, 23, 59), 'large'),
    event('current-start', local(2026, 10, 6)), event('current-last', now, 'medium', 'b'), event('same-day', local(2026, 10, 12, 11)),
    event('future-today', new Date(now.getTime() + 1), 'large'), event('future-day', local(2026, 10, 13), 'large'),
  ], completedGoals: [goal('before', local(2026, 10, 5, 23, 59)), goal('start', local(2026, 10, 6)), goal('end', now), goal('future', new Date(now.getTime() + 1))] });
  const beforeGrowth = JSON.stringify(state), report = growth(state, now, 7);
  assert.equal(metric(report, '期间成长值'), '5', 'Original small/medium/large weights are retained');
  assert.equal(metric(report, '成长记录'), '3');
  assert.equal(metric(report, '有记录天数'), '2');
  assert.equal(metric(report, '有记录领域'), '2', 'Same names are separate original domain IDs');
  assert.equal(metric(report, '已完成目标'), '2', 'Goal completion includes the current instant and rejects future timestamps');
  assert.equal(metric(report, '活跃日日均成长'), '2.5');
  const growthDaily = chart(report, 'growth-daily-points');
  assert.equal(growthDaily.points.length, 7);
  assert.equal(growthDaily.points[0].key, '2026-10-06');
  assert.deepEqual(growthDaily.points[0].values, [1]);
  assert.deepEqual(growthDaily.points.at(-1).values, [4]);
  assert.equal(growthDaily.points.reduce((sum, point) => sum + point.values[0], 0), 5);
  const contributions = chart(report, 'growth-domain-contributions');
  assert.deepEqual(contributions.points.map(point => point.key), ['b', 'a']);
  assert.deepEqual(contributions.points.map(point => point.values), [[3], [2]]);
  assert.match(contributions.points[0].label, /已归档/, 'Archived contributions remain in chart labels');
  assert.ok(report.findings.some(line => line.includes('减少 3 点')));
  assert.ok(report.findings.some(line => line.includes('已归档') && line.includes('3 点')));
  assert.equal(JSON.stringify(state), beforeGrowth, 'Growth summaries never migrate archives, events, goal IDs, or names');
  const rankedState = deeplyFreeze({ version: 1, domains: Array.from({ length: 8 }, (_, index) => domain(`d${index}`)),
    events: Array.from({ length: 8 }, (_, index) => event(`e${index}`, now, 'small', `d${index}`)), completedGoals: [] });
  const ranked = chart(growth(rankedState, now, 7), 'growth-domain-contributions');
  assert.equal(ranked.points.length, 7);
  assert.deepEqual(ranked.points.slice(0, 6).map(point => point.key), ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'], 'Contribution ties preserve the saved domain order');
  assert.deepEqual(ranked.points.at(-1).values, [2]);
  assert.equal(ranked.points.reduce((sum, point) => sum + point.values[0], 0), 8, 'Top-six chart keeps all remaining contributions in one aggregate');
  const collisionState = deeplyFreeze({ ...rankedState,
    domains: rankedState.domains.map((item, index) => index === 0 ? { ...item, id: 'remaining-growth-domains' } : item),
    events: rankedState.events.map((item, index) => index === 0 ? { ...item, domainId: 'remaining-growth-domains' } : item),
  });
  assert.ok(load(path.join(__dirname, '../src/lib/growth-data.ts')).isGrowthState(collisionState), 'Collision coverage uses a valid saved domain ID');
  const collisionChart = chart(growth(collisionState, now, 7), 'growth-domain-contributions');
  assert.equal(collisionChart.points[0].key, 'remaining-growth-domains');
  assert.equal(collisionChart.points.at(-1).key, '_remaining-growth-domains');
  assert.equal(new Set(collisionChart.points.map(point => point.key)).size, collisionChart.points.length, 'The aggregate never shares an entity key or selection');
  const emptyGrowth = growth(deeplyFreeze({ version: 1, domains: [], events: [], completedGoals: [] }), now, 30);
  assert.equal(metric(emptyGrowth, '期间成长值'), '0');
  assert.equal(metric(emptyGrowth, '活跃日日均成长'), '—');
  assert.ok(emptyGrowth.charts[0].points.every(point => point.values[0] === 0));
  assert.deepEqual(emptyGrowth.charts[1].points, []);
  assert.ok(emptyGrowth.findings.every(line => !/NaN|Infinity|%/.test(line)), 'Zero-base comparisons do not invent percentage growth');

  const january = local(2027, 1, 2, 12);
  const januaryMeal = diet({ version: 1, meals: [], nutrition: [nutrition('lower', '2026-12-04', 7), nutrition('before', '2026-12-03', 50), nutrition('upper', '2027-01-02', 3)] }, january, 30);
  assert.equal(januaryMeal.charts[0].points[0].key, '2026-12-04');
  assert.equal(januaryMeal.charts[0].points.at(-1).key, '2027-01-02');
  assert.equal(metric(januaryMeal, '日均碳水'), '5', 'Thirty-day nutrition windows cross year boundaries');

  // Independently chosen dates span each US clock transition; subtracting 24h
  // would shift the boundary and can lose the midnight entry in New York.
  for (const [date, firstDay] of [[local(2026, 3, 10, 12), '2026-03-04'], [local(2026, 11, 3, 12), '2026-10-28'], [local(2024, 3, 2, 12), '2024-02-25']]) {
    const [year, month, day] = firstDay.split('-').map(Number), start = local(year, month, day);
    const boundaryState = deeplyFreeze({ version: 1, domains: [domain('a')],
      events: [event('outside', new Date(start.getTime() - 1), 'large'), event('boundary', start, 'medium'), event('end', date), event('future', new Date(date.getTime() + 1), 'large')], completedGoals: [] });
    const boundaryGrowth = growth(boundaryState, date, 7);
    assert.equal(boundaryGrowth.charts[0].points[0].key, firstDay);
    assert.equal(metric(boundaryGrowth, '期间成长值'), '4', 'Calendar-day start is inclusive across DST/leap boundaries');
    assert.equal(new Set(boundaryGrowth.charts[0].points.map(point => point.key)).size, 7);
    const boundaryMeals = diet({ version: 1, meals: [], nutrition: [nutrition('first', firstDay, 8)] }, date, 7);
    assert.equal(metric(boundaryMeals, '日均碳水'), '8');
    assert.equal(boundaryMeals.charts[0].points[0].missing, false);
  }
  console.log(`Food/growth statistics insights passed in ${process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone}.`);
}
check();
if (!process.argv.includes('--timezone')) {
  for (const timezone of ['Asia/Singapore', 'America/New_York', 'UTC']) {
    execFileSync(process.execPath, [__filename, '--timezone'], { env: { ...process.env, TZ: timezone }, stdio: 'inherit' });
  }
}
