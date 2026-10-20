const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const filename = path.join(__dirname, '../src/lib/statistics-data.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleValue = { exports: {} };
new Function('exports', 'module', output)(moduleValue.exports, moduleValue);
const { statisticsPanels, statisticsPanel, statisticsOwner } = moduleValue.exports;
assert.deepEqual(statisticsPanels.map(panel => panel.id), ['todos', 'focus', 'habits', 'meals', 'domains', 'growth']);
for (const { id } of statisticsPanels) assert.equal(statisticsPanel(id), id);
for (const value of [undefined, null, '', 'daily', 'other', { id: 'growth' }, ['todos']]) assert.equal(statisticsPanel(value), 'todos');
const cohort = owner => Array.from({ length: 6 }, () => Object.freeze({ owner, ready: true }));
assert.equal(statisticsOwner(cohort('guest')), 'guest');
assert.equal(statisticsOwner(cohort('reader:alice')), 'reader:alice');
assert.equal(statisticsOwner([]), '');
assert.equal(statisticsOwner(cohort('')), '', 'An unconfirmed identity never shows default data as statistics');
const switching = cohort('reader:alice');
switching[3] = { ready: true, owner: 'reader:bob' };
assert.equal(statisticsOwner(switching), '', 'A late old-account read cannot be combined with a new account');
switching[3] = { ready: true, owner: 'guest' };
assert.equal(statisticsOwner(switching), '', 'Guest data cannot be mixed with authenticated sources');
for (let index = 0; index < 6; index++) {
  const loading = cohort('reader:alice');
  loading[index] = { ready: false, owner: 'reader:alice' };
  assert.equal(statisticsOwner(loading), '', 'Every required source must finish reading before statistics are shown');
  loading[index] = { ready: true, owner: '' };
  assert.equal(statisticsOwner(loading), '');
}
assert.equal(statisticsOwner(cohort('reader:bob')), 'reader:bob');
console.log('Statistics routes and account-cohort visibility checks passed.');
require('./check-statistics-task-focus-insights.cjs');
require('./check-statistics-habit-domain-insights.cjs');
require('./check-statistics-food-growth-insights.cjs');
