const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const file = path.resolve(__dirname, '../src/lib', `${name}.ts`);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'module', 'require', output)(module.exports, module, dependency => load(dependency.replace(/^\.\//, '')));
  modules.set(name, module.exports);
  return module.exports;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}
const { rankedEntryTags, entryTagCatalog } = load('entry-tags');
const { isMemoState, memoPriority } = load('tool-records');
const { DEFAULT_TODO_TAGS, createTodo } = load('todo-data');
const task = (id, tags, categoryId = '') => ({ ...createTodo(), id, title: id, tags, categoryId });
const note = (id, tags = [], extra = {}) => ({ id, title: id, body: '', color: 'sand', tags, pinned: false, createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z', ...extra });
const todos = (tasks = [], categories = []) => ({ version: 1, tasks, categories });
const memos = (...notes) => ({ version: 1, notes });
const source = (value, owner = 'reader:alice', ready = true) => ({ value, owner, ready });

assert.deepEqual(rankedEntryTags(todos(), memos()), DEFAULT_TODO_TAGS);
const combinedTodo = freeze(todos([
  task('a', ['共享', '共享', '工 作'], 'reading'), task('b', ['共享']),
], [{ id: 'reading', name: ' 阅读 ', color: '' }, { id: 'unused', name: '未使用', color: '' }]));
const combinedMemo = freeze(memos(note('a', ['共享', '阅读', '阅读']), note('b', ['阅读', '工 作']), note('c', ['共享'])));
const original = JSON.stringify([combinedTodo, combinedMemo]);
assert.deepEqual(rankedEntryTags(combinedTodo, combinedMemo), ['共享', '阅读', '工作', '学习', '生活', '购物', '未使用']);
assert.equal(JSON.stringify([combinedTodo, combinedMemo]), original, 'catalog generation must not normalize or migrate saved records');
assert.deepEqual(rankedEntryTags(todos([task('legacy', ['阅读', '阅 读'], 'reading')], [{ id: 'reading', name: '阅读', color: '' }]), memos(note('m', ['自定义']))).slice(0, 2), ['阅读', '自定义'], 'legacy category and explicit duplicate tags count once per record');
assert.deepEqual(rankedEntryTags(todos([task('unknown-category', [], '旧分类')]), memos()).slice(0, 1), ['旧分类']);
assert.deepEqual(rankedEntryTags(todos([task('symbols', ['工 作/旅行；购物😀复盘', '#旅行'])]), memos(note('same', ['旅 行']))).slice(0, 4), ['旅行', '工作', '购物', '复盘']);
assert.deepEqual(rankedEntryTags(todos([task('ties', ['乙', '甲'])]), memos(note('memo-tie', ['丙']))).slice(0, 3), ['乙', '甲', '丙'], 'equal counts retain stable first-seen order across both tools');
assert.deepEqual(rankedEntryTags(todos([], [{ id: 'catalog', name: '旅 行/复盘', color: '' }]), memos()).slice(-2), ['旅行', '复盘']);

const complete = entryTagCatalog(source(combinedTodo), source(combinedMemo));
assert.equal(complete.ready, true);
assert.equal(complete.owner, 'reader:alice');
assert.deepEqual(complete.tags, rankedEntryTags(combinedTodo, combinedMemo));
const partialTodo = entryTagCatalog(source(todos([task('todo-only', ['任务标签'])])), source(memos(note('not-ready', ['不得出现'])), 'reader:alice', false));
assert.equal(partialTodo.ready, false);
assert.equal(partialTodo.owner, 'reader:alice');
assert.equal(partialTodo.tags[0], '任务标签');
assert.ok(!partialTodo.tags.includes('不得出现'));
const partialMemo = entryTagCatalog(source(todos([task('unknown', ['未知账号标签'])]), '', false), source(memos(note('memo-only', ['备忘录标签']))));
assert.equal(partialMemo.ready, false);
assert.equal(partialMemo.owner, 'reader:alice');
assert.equal(partialMemo.tags[0], '备忘录标签');
assert.ok(!partialMemo.tags.includes('未知账号标签'));
for (const owners of [['reader:alice', 'reader:bob'], ['guest', 'reader:alice']]) {
  const catalog = entryTagCatalog(source(combinedTodo, owners[0]), source(combinedMemo, owners[1]));
  assert.deepEqual(catalog, { tags: DEFAULT_TODO_TAGS, ready: false, owner: '' }, 'different accounts cannot share either catalog or record frequencies');
}
assert.deepEqual(entryTagCatalog(source(combinedTodo, '', false), source(combinedMemo, '', false)), { tags: DEFAULT_TODO_TAGS, ready: false, owner: '' });
const incompatible = entryTagCatalog(source(todos([task('valid', ['有效来源'])])), source(memos(note('invalid', ['不能泄露'], { priority: null }))));
assert.equal(incompatible.ready, false);
assert.equal(incompatible.tags[0], '有效来源');
assert.ok(!incompatible.tags.includes('不能泄露'));

const old = freeze(note('old', ['原标签'], { images: [{ id: 'image', dataUrl: 'data:image/png;base64,fixture' }], iconId: 'notes' }));
assert.equal(isMemoState(memos(old)), true);
assert.equal(memoPriority(old), 'none');
assert.equal(Object.hasOwn(old, 'priority'), false, 'reading an old priority never inserts a field');
assert.deepEqual(JSON.parse(JSON.stringify(old)), old, 'legacy rich content and tags remain intact');
for (const priority of ['high', 'medium', 'low', 'none']) {
  const state = memos(old, note(`new-${priority}`, [], { priority }));
  assert.equal(isMemoState(state), true);
  const copy = JSON.parse(JSON.stringify(state));
  assert.equal(isMemoState(copy), true);
  assert.equal(memoPriority(copy.notes[1]), priority);
  assert.equal(Object.hasOwn(copy.notes[0], 'priority'), false);
}
for (const priority of [null, '', 'HIGH', 'urgent', 1, false, {}, []]) assert.equal(isMemoState(memos(note('invalid', [], { priority }))), false);
assert.equal(isMemoState(memos(note('undefined', [], { priority: undefined }))), true);
console.log('PASS shared entry tags: combined frequencies, legacy categories, normalization, stable order, partial/invalid sources, account isolation and optional memo priority compatibility');
