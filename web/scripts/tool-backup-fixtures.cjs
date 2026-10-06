const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
const root = path.join(__dirname, '..', 'src');
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved);
  const output = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const model = {}; cache.set(resolved, model);
  const requireModel = name => load((name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(resolved), name)) + '.ts');
  new Function('exports', 'require', output)(model, requireModel);
  return model;
}
const backup = load('lib/tool-backup.ts');
const dates = '2026-09-09T08:00:00.000Z';
function fixtures(suffix = 'one') {
  return {
    meals: { version: 1, meals: [{ id: 'meal-' + suffix, name: '测试餐食 ' + suffix, place: '测试餐厅', note: '', price: 20, minutes: 15, spicy: false, vegetarian: true, occasions: ['lunch'], kind: 'rice' }] },
    reminders: { version: 1, items: [{ id: 'reminder-' + suffix, title: '测试行动 ' + suffix, group: '精神', kind: 'notes', note: '', minutes: 0, enabled: true }], done: { '2026-09-09': ['reminder-' + suffix] } },
    todos: { version: 1, categories: [{ id: 'category-' + suffix, name: '共同分类', color: '#8aafff' }], tasks: [{ id: 'todo-' + suffix, title: '测试待办 ' + suffix, description: '保留分类与日期', categoryId: 'category-' + suffix, important: true, urgent: false, dueDate: '2026-09-10', completedAt: null, createdAt: dates, updatedAt: dates }] },
    pomodoro: { version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 }, mode: 'focus', selection: { taskId: null, title: '' }, active: null, sessions: [{ id: 'focus-' + suffix, mode: 'focus', durationSeconds: 1500, plannedSeconds: 1500, startedAt: '2026-09-09T07:35:00.000Z', endedAt: dates, completed: true, taskId: 'todo-' + suffix, title: '测试待办 ' + suffix }] },
    memos: { version: 1, notes: [{ id: 'memo-' + suffix, title: '测试备忘 ' + suffix, body: '## 备份内容\n\n$x^2$', color: 'sage', tags: ['灵感'], pinned: true, createdAt: dates, updatedAt: dates }] },
  };
}
module.exports = { ...backup, fixtures, load };
