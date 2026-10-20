const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loaded = new Map();
let volatile = false;
function load(file) {
  file = path.resolve(file);
  if (loaded.has(file)) return loaded.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; loaded.set(file, exports);
  new Function('exports', 'require', source)(exports, name => {
    if (name === './use-personal-tool-state') return { hasVolatilePersonalTool: (key, owner) => { assert.equal(key, 'reminders'); assert.equal(owner, 'fixture-owner'); return volatile; } };
    return load(path.resolve(path.dirname(file), name + '.ts'));
  });
  return exports;
}
const { confirmHabitDelete } = load(path.join(__dirname, '../src/lib/habit-delete.ts'));
const original = { id: 'delete-me', title: 'Only this habit', note: '', group: '工作', domainId: 'work', kind: 'plant', minutes: 0, enabled: true, priority: 'none' };
async function main() {
  let current = true, writes = 0;
  let state = { version: 1, items: [original], done: {} };
  const run = (item = original, confirmed = true) => confirmHabitDelete({ item, owner: 'fixture-owner', confirmed, isCurrent: () => current, setValue: async transform => { writes++; state = transform(state); } });
  const before = JSON.stringify(state);
  assert.equal(await run(original, false), false); assert.equal(writes, 0); assert.equal(JSON.stringify(state), before);
  current = false;
  assert.equal(await run(), false); assert.equal(writes, 0, 'An obsolete editor cannot delete');
  current = true;
  assert.equal(await run({ ...original, id: '' }), false); assert.equal(writes, 0);
  const other = { ...original, id: 'latest', title: 'Added while the dialog was open' };
  state = { ...state, items: [...state.items, other] };
  assert.equal(await run(), true); assert.deepEqual(state.items, [other], 'Confirmation removes one ID from the latest state');
  state = { version: 1, items: [original, other], done: {} }; volatile = true;
  await assert.rejects(run(), /删除尚未保存/); assert.deepEqual(state.items, [other]);
  volatile = false;
  assert.equal(await run(), true, 'A volatile deletion retries the original ID even after its in-memory removal');
  assert.deepEqual(state.items, [other]);
  console.log('PASS shared habit deletion: explicit confirmation, obsolete contexts, latest records and volatile same-ID retries.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
