const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const output = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib', `${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} }; cache.set(name, module.exports);
  new Function('exports', 'module', 'require', output)(module.exports, module, dependency => load(dependency.replace(/^\.\//, '')));
  return module.exports;
}
function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
const { autoSaveTodo, todoEditSnapshot } = load('todo-autosave');
const { createTodo } = load('todo-data');
const now = new Date('2026-11-03T03:00:00.000Z');
const baseline = freeze({ ...createTodo('later', now), id: 'auto-task', title: '原任务', description: '旧备注', categoryId: 'fun', tags: ['原标签'] });
const unrelated = freeze({ ...createTodo('do', now), id: 'other-task', title: '其它任务' });
const state = (task = baseline, patch = {}) => ({ version: 1, tasks: [task, unrelated], categories: [{ id: 'fun', name: '娱乐', color: '#abcdef' }], panelSources: { later: { kind: 'category', categoryId: 'fun' } }, futureState: { keep: true }, ...patch });
const source = freeze(state({ ...baseline, description: '其它端刚修改的备注', important: true, urgent: true, tags: ['远端标签'], dueDate: '2026-12-01', completedAt: now.toISOString(), futureTask: { keep: true }, updatedAt: '2026-11-03T03:01:00.000Z' }));
const encoded = JSON.stringify(source);
const changedTitle = { ...baseline, title: '窗口中新标题' };
const saved = autoSaveTodo(source, baseline, changedTitle, '原标签');
const task = saved.tasks[0];
assert.equal(task.title, '窗口中新标题');
assert.equal(task.description, source.tasks[0].description, 'A title edit merges into the latest archive instead of restoring a stale note');
assert.equal(task.important, true); assert.equal(task.urgent, true);
assert.equal(task.dueDate, '2026-12-01');
assert.equal(task.completedAt, source.tasks[0].completedAt, 'Autosave never reopens a remotely completed task');
assert.deepEqual(task.tags, ['远端标签'], 'Unchanged tag text does not undo independent remote tags');
assert.equal(task.futureTask, source.tasks[0].futureTask);
assert.equal(saved.tasks[1], unrelated); assert.equal(saved.categories, source.categories);
assert.equal(saved.panelSources, source.panelSources); assert.equal(saved.futureState, source.futureState);
assert.equal(JSON.stringify(source), encoded, 'Autosave cannot mutate its frozen source archive');

const tagged = autoSaveTodo(source, baseline, { ...baseline, title: '标签变更', tags: ['过期输入'] }, '旅 行、工作，工作');
assert.deepEqual(tagged.tasks[0].tags, ['旅行', '工作'], 'Capture the current tag input instead of a stale task.tags field');
assert.equal(tagged.tasks[0].description, source.tasks[0].description);
const oldReminder = { ...baseline, reminderAt: '2099-12-01T10:00:00.000Z', dueDate: '2099-12-01', dueTime: '10:30' };
const cleared = { ...oldReminder }; delete cleared.reminderAt; delete cleared.dueTime; cleared.dueDate = '';
const removed = autoSaveTodo(state(oldReminder), oldReminder, cleared, '原标签');
assert.equal(removed.tasks[0].reminderAt, undefined); assert.equal(removed.tasks[0].dueTime, undefined); assert.equal(removed.tasks[0].dueDate, '');

assert.throws(() => autoSaveTodo(state(unrelated, { tasks: [unrelated] }), baseline, changedTitle, '原标签'), /已删除/, 'A late autosave never recreates a task deleted on another client');
assert.throws(() => autoSaveTodo(source, { ...baseline, id: 'wrong-task' }, changedTitle, '原标签'), /编号已变化/, 'A baseline for another task cannot be applied to this record');
const inbox = autoSaveTodo(state(baseline, { categories: [] }), baseline, changedTitle, '原标签');
assert.equal(inbox.tasks[0].categoryId, '', 'A removed category safely falls back to the implicit inbox without recreating the category');
assert.equal(inbox.categories.length, 0);
const blankRows = { ...baseline, subtasks: [{ id: 'kept-subtask', title: '待检查', completed: true }, { id: 'empty-subtask', title: ' ', completed: false }], nextTasks: [{ id: 'next-step', title: '下一步' }, { id: 'empty-next', title: '' }] };
const cleaned = autoSaveTodo(state(), baseline, blankRows, '原标签');
assert.deepEqual(cleaned.tasks[0].subtasks, [{ id: 'kept-subtask', title: '待检查', completed: true }]);
assert.deepEqual(cleaned.tasks[0].nextTasks, [{ id: 'next-step', title: '下一步' }]);
const withoutBlanks = { ...blankRows, subtasks: blankRows.subtasks.slice(0, 1), nextTasks: blankRows.nextTasks.slice(0, 1) };
assert.equal(todoEditSnapshot(blankRows), todoEditSnapshot(withoutBlanks), 'Trailing draft-only blank rows cannot trigger save loops');
assert.equal(todoEditSnapshot(baseline), todoEditSnapshot({ ...baseline, updatedAt: now.toISOString(), title: ' 原任务 ' }), 'Acknowledgement timestamps and trimmed title whitespace are not new edits');
assert.notEqual(todoEditSnapshot(baseline), todoEditSnapshot({ ...baseline, categoryId: '' }));
assert.notEqual(todoEditSnapshot(withoutBlanks), todoEditSnapshot({ ...withoutBlanks, subtasks: [{ ...withoutBlanks.subtasks[0], completed: false }] }));

const noteImage = { id: 'existing-photo', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
const oldClient = { ...baseline }; delete oldClient.images;
const illustratedLatest = { ...baseline, images: [noteImage] };
const preservedImages = autoSaveTodo(state(illustratedLatest), oldClient, { ...oldClient, title: '旧编辑器新标题' }, '原标签');
assert.deepEqual(preservedImages.tasks[0].images, [noteImage], 'An older editor missing an optional image field cannot erase newer attachments');
const newTask = { ...createTodo('plan', now), id: 'new-auto-task', title: '新任务' };
const newlySaved = autoSaveTodo(state(), null, newTask, '新标签');
assert.equal(newlySaved.tasks[0].id, newTask.id); assert.deepEqual(newlySaved.tasks[0].tags, ['新标签']);
assert.equal(newlySaved.tasks.length, 3);
assert.throws(() => autoSaveTodo(state(), null, { ...newTask, title: ' ' }, ''), /任务名称/, 'Invalid new drafts remain drafts instead of creating empty records');
console.log('PASS task autosave: touched-field merge, deleted/foreign record guards, captured tags, removed optionals/category fallback, draft-only row normalization, timestamp stability, legacy images and immutable unrelated data.');
