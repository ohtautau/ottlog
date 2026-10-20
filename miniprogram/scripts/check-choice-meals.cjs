const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const modules = new Map();
function loadModule(filename) {
  const file = path.resolve(filename);
  if (modules.has(file)) return modules.get(file);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  modules.set(file, module.exports);
  new Function('require', 'module', 'exports', output)(name => {
    if (!name.startsWith('.')) throw new Error(`Pure model unexpectedly imports ${name}`);
    return loadModule(path.resolve(path.dirname(file), `${name}.ts`));
  }, module, module.exports);
  return module.exports;
}
const native = name => loadModule(path.join(__dirname, '../src/lib', `${name}.ts`));
const website = name => loadModule(path.join(__dirname, '../../web/src/app', `${name}.ts`));
const choices = native('choice-data'), choiceFlow = native('choice-flow');
const meals = native('meal-data');

// Choice questions and the remaining meal library retain their account schema.
assert.deepEqual(choices.choiceQuestions, website('choose/choice-data').choiceQuestions);
assert.deepEqual(meals.initialMealLibrary, website('eat/meal-data').initialMealLibrary);

let draft = { answers: [], step: 0, customAnswer: '' };
for (const question of choices.choiceQuestions) draft = choiceFlow.answerChoice(draft, question.options[0].id);
assert.equal(draft.step, 9);
const completedAnswers = [...draft.answers];
const reviewed = choiceFlow.answerChoice({ ...draft, step: 2 }, completedAnswers[2]);
assert.deepEqual(reviewed.answers, completedAnswers, 'An unchanged earlier answer retains the reachable future');
const changed = choiceFlow.answerChoice({ ...draft, step: 2 }, choices.choiceQuestions[2].options[1].id);
assert.equal(changed.answers.length, 3, 'A changed answer invalidates dependent future answers');
assert.equal(changed.step, 3);
assert.deepEqual(choiceFlow.normalizeChoiceDraft(JSON.parse(JSON.stringify(draft))), draft, 'A completed route survives device storage round-trips');
assert.equal(choiceFlow.normalizeChoiceDraft({ answers: ['bad'], step: 100 }).step, 0);
assert.equal(choiceFlow.normalizeChoiceDraft({ answers: completedAnswers, step: -1 }).step, 0);
assert.equal(choiceFlow.normalizeChoiceDraft({ answers: completedAnswers, step: Infinity }).step, 9);
assert.equal(choiceFlow.normalizeChoiceDraft({ answers: completedAnswers.slice(0, 8).concat('message-custom'), step: 9 }).answers.length, 8, 'A custom ending cannot be recovered without its text');
const beforeClosing = { answers: completedAnswers.slice(0, 8), step: 8, customAnswer: '' };
const custom = choiceFlow.answerChoice(beforeClosing, 'message-custom', '  给今天  留句话  ');
assert.equal(custom.customAnswer, '给今天 留句话');
assert.equal(custom.step, 9);
assert.strictEqual(choiceFlow.answerChoice(beforeClosing, 'message-custom', '   '), beforeClosing);
assert.strictEqual(choiceFlow.answerChoice(beforeClosing, 'message-custom', '字'.repeat(41)), beforeClosing);
assert.deepEqual(choices.deriveChoiceResult(completedAnswers).scores, choices.deriveChoiceResult(custom.answers).scores, 'Free text never contributes inferred personality scores');
assert.deepEqual(choices.deriveChoiceResult(custom.answers), website('choose/choice-data').deriveChoiceResult(custom.answers));

const { makeChoiceRegions } = native('choice-geometry');
for (let count = 2; count <= 9; count += 1) {
  const regions = makeChoiceRegions(count);
  const area = regions.reduce((sum, region) => sum + Math.abs(region.points.reduce((value, point, index) => {
    const next = region.points[(index + 1) % region.points.length];
    return value + point[0] * next[1] - next[0] * point[1];
  }, 0)) / 2, 0);
  assert.ok(Math.abs(area - 1) < 1e-9, `${count} portrait regions cover the complete viewport`);
  assert.ok(regions.every(region => region.points.every(([x, y]) => x >= -1e-9 && x <= 1 + 1e-9 && y >= -1e-9 && y <= 1 + 1e-9)));
}

assert.ok(meals.isMealLibrary(meals.initialMealLibrary));
const entry = { id: 'nutrition-1', date: '2026-09-12', name: '午餐', carbs: 23.5, protein: 18, fat: 0 };
assert.ok(meals.isNutritionEntries([entry]));
assert.ok(meals.isMealLibrary({ ...meals.initialMealLibrary, nutrition: [entry] }));
assert.ok(!meals.isNutritionEntries([entry, { ...entry }]));
assert.ok(!meals.isNutritionEntries([{ ...entry, date: '2026-02-30' }]));
assert.ok(meals.isNutritionEntries([{ ...entry, date: '2024-02-29' }]));
for (const value of [-1, Infinity, NaN, 2000.1]) assert.ok(!meals.isNutritionEntries([{ ...entry, fat: value }]));
assert.ok(!meals.isNutritionEntries(Array.from({ length: 301 }, (_, index) => ({ ...entry, id: `nutrition-${index}` }))));
assert.ok(!meals.isMealLibrary({ ...meals.initialMealLibrary, nutrition: [{ ...entry, name: '' }] }));
assert.ok(!meals.isMealLibrary({ version: 1, meals: [{ ...meals.initialMealLibrary.meals[0], occasions: [] }] }));

console.log('PASS choice and meals: web data parity, nine-step recovery, custom endings, viewport polygons and nutrition schema.');
