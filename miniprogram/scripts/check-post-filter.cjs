const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/lib/post-filter.ts');
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const moduleUnderTest = new Module(filename, module);
moduleUnderTest._compile(code, filename);
const { filterPosts, postGroups, readPostFilterLink, defaultPostFilter } = moduleUnderTest.exports;

const posts = [
  { slug: 'code-a', title: 'A tiny compiler', description: '慢慢研究代码', category: '技术探索', tags: ['代码', '笔记', '代码'], date: '2026-09-10', minutes: 6 },
  { slug: 'life', title: 'C 生活片段', description: '散步和观察', category: '日常生活', tags: ['笔记', '生活'], date: '2026-09-03', minutes: 3 },
  { slug: 'code-b', title: 'B 代码记录', description: 'A TINY project', category: '技术探索', tags: ['代码'], date: '2026-09-06', minutes: 9 },
];
const original = JSON.stringify(posts);
const ids = filter => filterPosts(posts, { ...defaultPostFilter, ...filter }).map(post => post.slug);
assert.deepEqual(ids({}), ['code-a', 'code-b', 'life']);
assert.deepEqual(ids({ direction: 'asc' }), ['life', 'code-b', 'code-a']);
assert.deepEqual(ids({ sort: 'minutes', direction: 'asc' }), ['life', 'code-a', 'code-b']);
assert.deepEqual(ids({ sort: 'minutes', direction: 'desc' }), ['code-b', 'code-a', 'life']);
assert.deepEqual(ids({ sort: 'title', direction: 'asc' }), ['code-a', 'code-b', 'life']);
assert.deepEqual(ids({ sort: 'title', direction: 'desc' }), ['life', 'code-b', 'code-a']);
assert.deepEqual(ids({ q: '  A  tiny  ', category: '技术探索', tag: '笔记' }), ['code-a']);
assert.deepEqual(ids({ q: '生活', category: '技术探索' }), []);
assert.deepEqual(ids({ tag: '记' }), [], 'Tags must match whole labels, not substrings');
assert.deepEqual(ids({ q: '观察' }), ['life']);
assert.equal(JSON.stringify(posts), original, 'Filtering and sorting must not mutate loaded posts');
const groups = postGroups(posts);
assert.equal(groups.categories.find(item => item.name === '技术探索').count, 2);
assert.equal(groups.tags.find(item => item.name === '代码').count, 2, 'A duplicate tag in one article counts only once');
assert.equal(groups.tags.find(item => item.name === '笔记').count, 2);
assert.deepEqual(postGroups([]), { categories: [], tags: [] });
assert.deepEqual(readPostFilterLink({ category: ' 技术探索 ', tag: '代码', sort: 'invalid' }), { category: '技术探索', tag: '代码' });
assert.deepEqual(readPostFilterLink({}), {}, 'Empty filter clears other tab filters');
assert.equal(readPostFilterLink('invalid'), null);
assert.equal(readPostFilterLink([]), null);
assert.deepEqual(readPostFilterLink({ q: 8, category: null }), {});
assert.equal(readPostFilterLink({ q: 'x'.repeat(200) }).q.length, 100);
console.log('Post filters passed: search, exact category/tag, six sorts, counts, immutable data, cross-tab input.');
