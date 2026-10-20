const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  file = path.resolve(__dirname, file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', 'require', source)(exports, dependency => load(path.resolve(path.dirname(file), dependency + '.ts')));
  return exports;
}
async function main() {
  const model = { ...load('../src/lib/motto-data.ts'), ...load('../src/lib/motto-settings.ts') };
  const { createPersonalToolStore } = load('../src/lib/tool-state-store.ts');
  const defaults = ['第一句原有格言', '第二句原有格言'];
  assert.equal(model.MOTTO_ROTATION_MS, 15000);
  assert.equal(model.mottoRotationMs(model.initialPersonalMottos), 15000, 'Legacy collections keep the fifteen-second default');
  const configured = model.writeMottoRotation(model.initialPersonalMottos, 7);
  assert.deepEqual(configured, { version: 1, mottos: null, rotationSeconds: 7 }, 'Settings preserve shared defaults without materializing their collection');
  assert.equal(model.mottoRotationMs(configured), 7000);
  assert.ok(model.isPersonalMottos(JSON.parse(JSON.stringify(configured))));
  assert.equal(model.writeMotto(configured, defaults, '设置后创建', null).rotationSeconds, 7);
  assert.equal(model.removeMotto({ ...configured, mottos: defaults }, defaults, defaults[0]).rotationSeconds, 7);
  assert.deepEqual(model.writeMottoRotation({ version: 1, mottos: [] }, 30).mottos, [], 'Settings cannot resurrect deleted mottos');
  assert.equal(model.mottoRotationMs(model.writeMottoRotation(configured, 2147483)), 2147483000, 'The longest interval stays below the native timeout overflow boundary');
  for (const seconds of [0, -1, 1.5, NaN, Infinity, '7', 2147484]) {
    assert.equal(model.isPersonalMottos({ ...configured, rotationSeconds: seconds }), false);
    assert.throws(() => model.writeMottoRotation(configured, seconds), /整数秒数/);
  }
  assert.equal(model.mottoRotationMs(null), 15000);
  assert.deepEqual(model.displayedMottos(model.initialPersonalMottos, defaults), defaults);
  const added = model.writeMotto(model.initialPersonalMottos, defaults, '  留给自己的话  ', null);
  assert.deepEqual(added.mottos, [...defaults, '留给自己的话'], 'First edit keeps all current shared defaults');
  assert.deepEqual(defaults, ['第一句原有格言', '第二句原有格言'], 'Editing personal mottos cannot mutate the shared array');
  const edited = model.writeMotto(added, ['new shared default'], '修改后的第一句', defaults[0]);
  assert.deepEqual(edited.mottos, ['修改后的第一句', defaults[1], '留给自己的话']);
  assert.deepEqual(model.displayedMottos(edited, ['changed global default']), edited.mottos, 'Later global changes cannot overwrite personal edits');
  assert.throws(() => model.writeMotto(added, defaults, defaults[1], null), /已经存在/);
  assert.throws(() => model.writeMotto(added, defaults, defaults[1], defaults[0]), /已经存在/);
  assert.throws(() => model.writeMotto(added, defaults, '  ', null), /1–120/);
  assert.throws(() => model.writeMotto(added, defaults, '字'.repeat(121), null), /1–120/);
  assert.throws(() => model.writeMotto(added, defaults, 'new', 'stale old text'), /已被修改/);
  assert.throws(() => model.removeMotto(added, defaults, 'stale old text'), /已被修改/);
  const full = { version: 1, mottos: Array.from({ length: 50 }, (_, i) => `格言 ${i}`) };
  const beyondFifty = model.writeMotto(full, defaults, '第 51 句', null);
  assert.equal(beyondFifty.mottos.length, 51);
  assert.ok(model.isPersonalMottos(JSON.parse(JSON.stringify(beyondFifty))), 'Collections beyond the old limit remain readable after persistence');
  const large = { version: 1, mottos: Array.from({ length: 500 }, (_, i) => `大量格言 ${i}`) };
  assert.ok(model.isPersonalMottos(large));
  assert.equal(model.writeMotto(large, defaults, '继续添加格言', null).mottos.length, 501, 'Removing 50 does not introduce a replacement quantity limit');
  assert.equal(model.writeMotto(full, defaults, '可以修改已有格言', full.mottos[0]).mottos.length, 50);
  const empty = model.removeMotto({ version: 1, mottos: ['最后一句'] }, defaults, '最后一句');
  assert.deepEqual(model.displayedMottos(empty, defaults), [], 'Deleting the last personal motto does not resurrect removed lines');
  assert.ok(model.isPersonalMottos(JSON.parse(JSON.stringify(edited))));
  for (const invalid of [null, {}, { version: 2, mottos: [] }, { version: 1, mottos: [123] }, { version: 1, mottos: [''] }, { version: 1, mottos: ['a'.repeat(121)] }]) assert.equal(model.isPersonalMottos(invalid), false);

  // Exercise the same owner-separated queue used by the page and home banner.
  const storage = new Map(), remote = new Map(), puts = [];
  let session = { authenticated: false }, fingerprint = '';
  const owner = () => session.authenticated ? `reader:${session.userName}` : 'guest';
  const store = createPersonalToolStore({
    read: key => storage.get(key), write: (key, data) => storage.set(key, structuredClone(data)),
    fingerprint: () => fingerprint, session: async () => session,
    get: async key => ({ data: remote.get(`${owner()}:${key}`) ?? null }),
    put: async (key, data, expectedOwner) => { assert.equal(expectedOwner, owner()); puts.push({ key, owner: expectedOwner }); remote.set(`${owner()}:${key}`, structuredClone(data)); },
  });
  const guest = await store.load('mottos', model.initialPersonalMottos);
  store.edit('mottos', guest, added);
  const guestConfigured = model.writeMottoRotation(added, 7);
  store.edit('mottos', guest, guestConfigured);
  assert.equal((await store.load('mottos', model.initialPersonalMottos)).value.rotationSeconds, 7);
  store.edit('mottos', guest, added);
  assert.deepEqual((await store.load('mottos', model.initialPersonalMottos)).value, added);
  assert.equal(puts.length, 0, 'Guests write only to their local collection');
  session = { authenticated: true, userName: 'alice' }; fingerprint = 'alice-session';
  const alice = await store.load('mottos', model.initialPersonalMottos);
  assert.deepEqual(alice.value, model.initialPersonalMottos, 'Logging in does not import a guest collection');
  assert.throws(() => store.edit('mottos', guest, edited), /账号状态/);
  store.edit('mottos', alice, edited); await store.flush('mottos', alice.owner);
  assert.ok(puts.every(call => call.key === 'mottos' && call.owner === 'reader:alice'));
  session = { authenticated: true, userName: 'bob' }; fingerprint = 'bob-session';
  assert.deepEqual((await store.load('mottos', model.initialPersonalMottos)).value, model.initialPersonalMottos);
  assert.throws(() => store.edit('mottos', alice, added), /账号状态/);
  session = { authenticated: true, userName: 'alice' }; fingerprint = 'alice-new-session';
  assert.deepEqual((await store.load('mottos', model.initialPersonalMottos)).value, edited);
  session = { authenticated: false }; fingerprint = '';
  assert.deepEqual((await store.load('mottos', model.initialPersonalMottos)).value, added, 'The original guest collection remains available after logout');
  console.log('Personal mottos: default preservation, validation, editing/deletion, legacy/configurable rotation and owner isolation passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
