const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Date, Set, Map, Math, Error, require(name) { return load(path.resolve(path.dirname(file), name + '.ts')); } }, { filename: file });
  return exports;
}
const mini = load(path.resolve(__dirname, '../src/lib/todo-data.ts'));
const web = load(path.resolve(__dirname, '../../web/src/lib/todo-data.ts'));
const stamp = new Date('2026-09-14T01:00:00Z');
const task = { ...mini.createTodo('do', stamp), title: 'A cross-client task', dueDate: '2026-09-15', dueTime: '18:30', tags: ['reading'],
  recurrence: { unit: 'month', interval: 1, anchorDay: 15 }, nextTasks: [{ id: 'next-b', title: 'Follow up' }], reminderAt: '2026-09-15T09:30:00Z',
  extraFromNewerClient: { retained: true } };
const old = { version: 1, categories: [], tasks: [task], extraState: { retained: true } };
const normalized = web.normalizeTodoState(old);
for (const key of ['dueTime', 'tags', 'recurrence', 'nextTasks', 'reminderAt', 'extraFromNewerClient']) {
  assert.equal(JSON.stringify(normalized.tasks[0][key]), JSON.stringify(task[key]), key + ' must survive web normalization');
}
assert.equal(normalized.extraState.retained, true);
for (const sort of ['schedule', 'created', 'custom', 'future-mode']) {
  const ordered = { ...old, sort, tasks: [task, { ...task, id: 'second-sort-record', title: 'Second' }] };
  const roundTrip = web.normalizeTodoState(ordered);
  assert.equal(roundTrip.sort, sort, 'Web normalization preserves known and newer optional sort metadata');
  assert.equal(JSON.stringify(roundTrip.tasks.map(task => task.id)), JSON.stringify(ordered.tasks.map(task => task.id)), 'Normalization retains the persisted task array order');
  assert.equal(mini.getTodoSortMode(roundTrip), sort === 'future-mode' ? 'custom' : sort);
}
const completed = mini.completeTodo(normalized, task.id, stamp);
assert.equal(completed.tasks.length, 3, 'round-trip data must still generate one cycle and one next step');
const again = web.normalizeTodoState(completed);
assert.ok(again.tasks.find(item => item.id === task.id).completionGeneration);
assert.equal(mini.completeTodo(again, task.id, stamp).tasks.length, 3, 'An already completed task remains idempotent after round-trip');
const next = again.tasks.find(item => item.title === 'Follow up');
for (const key of ['dueDate', 'dueTime', 'tags', 'important', 'urgent']) assert.equal(JSON.stringify(next[key]), JSON.stringify(task[key]), key + ' is inherited across clients');
assert.equal(next.reminderAt, undefined);
assert.equal(next.recurrence, undefined);
const reopened = mini.toggleTodo(again, task.id, stamp);
assert.equal(mini.completeTodo(reopened, task.id, stamp).tasks.length, 5, 'Explicitly reopening and completing creates fresh branches after round-trip');
console.log('PASS mini/web task metadata, recurrence, next-step chain and completion receipt round trip.');
