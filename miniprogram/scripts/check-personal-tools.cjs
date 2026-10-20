const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(name) {
  const file = path.resolve(__dirname, `../src/lib/${name}.ts`);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { exports: module.exports, require: name => loadModule(name.replace(/^\.\//, '')), Promise, Map, Set, JSON, Date, Error }, { filename: file });
  return module.exports;
}
const { createPersonalToolStore, toolCacheKey } = loadModule('tool-state-store');
const { isTodoState, isMemoState, initialTodoState } = loadModule('tool-records');
const { initialReminders, isReminderState } = loadModule('reminder-data');
const copy = value => value === undefined ? value : JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function fixture() {
  const storage = new Map(), remote = new Map(), puts = [];
  const state = { owner: 'guest', fingerprint: 'guest-cookie', offline: false, full: false, putFail: false, heldGet: null, heldPut: null };
  const adapter = {
    read: key => copy(storage.get(key)),
    write: (key, value) => { if (state.full) throw new Error('disk full'); storage.set(key, copy(value)); },
    fingerprint: () => state.fingerprint,
    session: async () => { if (state.offline) throw new Error('offline'); const [role, userName] = state.owner.split(':'); return { authenticated: role !== 'guest', isAdmin: role === 'admin', userName }; },
    get: async key => { const data = copy(remote.get(`${state.owner}:${key}`)) ?? null; if (state.heldGet) await state.heldGet.promise; if (state.offline) throw new Error('offline'); return { data }; },
    put: async (key, data, owner) => {
      if (state.owner !== owner) throw new Error('account changed');
      puts.push({ owner, key, data: copy(data) });
      if (state.heldPut) await state.heldPut.promise;
      if (state.offline || state.putFail) throw new Error('network interrupted');
      if (state.owner !== owner) throw new Error('account changed');
      remote.set(`${owner}:${key}`, copy(data));
    },
  };
  return { store: createPersonalToolStore(adapter), adapter, storage, remote, puts, state };
}

function legacyExerciseState() {
  return {
    version: 1,
    items: [
      { id: 'exercise', title: '力量训练 / 有氧运动', group: '健康', domainId: 'health', kind: 'exercise', note: '保留旧提醒', minutes: 25, enabled: false, priority: 'high', createdAt: 123, iconId: 'barbell', extension: { retained: true } },
      { id: 'other', title: '其他习惯', group: '学习', kind: 'notes', note: '', minutes: 0, enabled: true },
    ],
    done: { '2026-10-05': ['exercise'], '2026-10-06': ['other'] },
    completionHistory: { exercise: [[20731, 20732]], other: [[20732, 20732]] },
    reflections: [{ id: 'reflection-exercise', habitId: 'exercise', day: '2026-10-05', text: '旧打卡日志', createdAt: 123 }],
    extension: { schema: 2 },
  };
}

function assertExerciseSplit(value, original) {
  assert.ok(isReminderState(value));
  assert.equal(value.items.length, original.items.length + 1);
  assert.deepEqual(copy(value.items.find(item => item.id === 'exercise')), { ...original.items[0], title: '力量训练' }, 'Strength training keeps the original ID, settings and metadata');
  const cardio = value.items.filter(item => item.title === '有氧运动');
  assert.equal(cardio.length, 1, 'Exactly one cardio habit is added');
  assert.equal(cardio[0].id, 'cardio');
  assert.equal(cardio[0].domainId, original.items[0].domainId);
  assert.equal(cardio[0].group, original.items[0].group);
  assert.equal(cardio[0].enabled, original.items[0].enabled);
  assert.deepEqual(copy(value.items.find(item => item.id === 'other')), original.items[1]);
  assert.deepEqual(copy(value.done), original.done, 'Past check-ins remain linked to the original habit');
  assert.deepEqual(copy(value.completionHistory), original.completionHistory, 'Archived completions are not duplicated for cardio');
  assert.deepEqual(copy(value.reflections), original.reflections, 'Existing reflections retain their original habit ID');
  assert.deepEqual(copy(value.extension), original.extension);
}

async function testExerciseSplit() {
  {
    assert.ok(isReminderState(initialReminders));
    const f = fixture();
    const loaded = await f.store.load('reminders', initialReminders);
    assert.equal(loaded.value.items.find(item => item.id === 'exercise').title, '力量训练');
    assert.equal(loaded.value.items.find(item => item.id === 'cardio').title, '有氧运动');
    assert.equal(f.puts.length, 0, 'Fresh guest defaults never trigger account writes');
  }
  {
    const f = fixture(), original = legacyExerciseState(), key = toolCacheKey('guest', 'reminders');
    f.storage.set(key, { data: copy(original), pending: false, revision: 1 });
    const loaded = await f.store.load('reminders', initialReminders);
    assertExerciseSplit(loaded.value, original);
    assertExerciseSplit(f.storage.get(key).data, original);
    assert.equal(f.storage.get(key).pending, false);
    const revision = f.storage.get(key).revision;
    f.state.offline = true;
    const reopened = await createPersonalToolStore(f.adapter).load('reminders', initialReminders);
    assertExerciseSplit(reopened.value, original);
    assert.equal(f.storage.get(key).revision, revision, 'Guest reopening does not repeat the split or its save');
    assert.equal(f.puts.length, 0);
    assert.equal(original.items[0].title, '力量训练 / 有氧运动', 'Reading and migrating never mutate the adapter fixture');
  }
  {
    const f = fixture(), original = legacyExerciseState();
    f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    f.remote.set('reader:alice:reminders', copy(original));
    const alice = await f.store.load('reminders', initialReminders);
    assertExerciseSplit(alice.value, original);
    await f.store.flush('reminders', alice.owner);
    assertExerciseSplit(f.remote.get('reader:alice:reminders'), original);
    assert.equal(f.storage.get(toolCacheKey(alice.owner, 'reminders')).pending, false);
    assert.equal(f.puts.length, 1, 'The account split uses the existing serialized save queue once');
    for (const removed of [false, true]) {
      const bobState = legacyExerciseState();
      if (removed) bobState.items = bobState.items.filter(item => item.id !== 'exercise');
      else bobState.items[0].title = '自定训练';
      f.remote.set('reader:bob:reminders', copy(bobState));
      f.state.owner = 'reader:bob'; f.state.fingerprint = 'bob-cookie';
      const bob = await f.store.load('reminders', initialReminders);
      assert.deepEqual(copy(bob.value), bobState, 'Renamed or removed defaults are not restored for another owner');
      assert.equal(bob.value.items.some(item => item.id === 'cardio'), false);
    }
    assert.throws(() => f.store.edit('reminders', alice, legacyExerciseState()), /账号状态已变化/);
    f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    const resumed = await f.store.load('reminders', initialReminders);
    assertExerciseSplit(resumed.value, original);
    await f.store.flush('reminders', resumed.owner);
    assert.equal(f.puts.length, 1, 'Returning to the already split account does not add or upload another cardio habit');
    assert.equal(f.storage.has(toolCacheKey('guest', 'reminders')), false);
    assert.ok(f.puts.every(put => put.owner === 'reader:alice'));
  }
  {
    const f = fixture(); f.state.offline = true; f.state.fingerprint = 'unconfirmed-account-cookie';
    f.storage.set(toolCacheKey('guest', 'reminders'), { data: legacyExerciseState(), pending: false, revision: 1 });
    const before = copy([...f.storage]);
    await assert.rejects(f.store.load('reminders', initialReminders), /无法确认登录状态/);
    assert.deepEqual(copy([...f.storage]), before, 'Unknown identities cannot migrate another owner’s reminders');
    assert.equal(f.puts.length, 0);
  }
  {
    const f = fixture(), original = legacyExerciseState();
    f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    f.remote.set('reader:alice:reminders', copy(original));
    const loaded = await f.store.load('reminders', initialReminders);
    await f.store.flush('reminders', loaded.owner);
    const held = deferred(); f.state.heldGet = held;
    f.remote.set('reader:alice:reminders', copy(original));
    const pendingLoad = f.store.load('reminders', initialReminders);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    const newest = copy(loaded.value);
    newest.items.find(item => item.id === 'exercise').title = '力量训练更新';
    newest.items.find(item => item.id === 'cardio').note = '最新有氧提醒';
    newest.done['2026-10-06'] = ['other', 'cardio'];
    f.store.edit('reminders', loaded, newest);
    await f.store.flush('reminders', loaded.owner);
    f.state.heldGet = null; held.resolve();
    const result = await pendingLoad;
    assert.deepEqual(copy(result.value), newest, 'A late legacy GET cannot replace newer edits or re-run the split');
    assert.deepEqual(f.storage.get(toolCacheKey(loaded.owner, 'reminders')).data, newest);
    assert.equal(result.value.items.filter(item => item.id === 'cardio').length, 1);
  }
  {
    const f = fixture(); f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    f.remote.set('reader:alice:reminders', legacyExerciseState());
    const held = deferred(); f.state.heldGet = held;
    const loading = f.store.load('reminders', initialReminders);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    f.state.owner = 'reader:bob'; f.state.fingerprint = 'bob-cookie';
    f.state.heldGet = null; held.resolve();
    await assert.rejects(loading, /账号状态已变化/);
    assert.equal(f.storage.has(toolCacheKey('reader:alice', 'reminders')), false, 'An identity change during GET prevents migrating or caching its old payload');
    assert.equal(f.storage.has(toolCacheKey('reader:bob', 'reminders')), false);
    assert.equal(f.puts.length, 0);
  }
  {
    const f = fixture(), original = legacyExerciseState();
    f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    await f.store.load('todos', { count: 0 }); // Confirm this isolated account before its offline load.
    const key = toolCacheKey(f.state.owner, 'reminders');
    f.storage.set(key, { data: copy(original), pending: false, revision: 1 });
    f.state.offline = true;
    const loaded = await f.store.load('reminders', initialReminders);
    assertExerciseSplit(loaded.value, original);
    assert.equal(f.storage.get(key).pending, true, 'Offline account migration remains queued for that account');
    const reopened = createPersonalToolStore(f.adapter);
    const persisted = await reopened.load('reminders', initialReminders);
    assertExerciseSplit(persisted.value, original);
    assert.equal(reopened.cache(key).pending, true);
    f.state.offline = false;
    await reopened.flush('reminders', persisted.owner);
    assertExerciseSplit(f.remote.get('reader:alice:reminders'), original);
    assert.equal(reopened.cache(key).pending, false);
    assert.ok(f.puts.every(put => put.owner === persisted.owner));
  }
  {
    for (const owner of ['guest', 'reader:alice']) {
      const f = fixture(), original = legacyExerciseState();
      f.state.owner = owner; f.state.fingerprint = `${owner}-cookie`;
      await f.store.load('todos', { count: 0 });
      const key = toolCacheKey(owner, 'reminders');
      f.storage.set(key, { data: copy(original), pending: false, revision: 1 });
      f.state.full = true; f.state.putFail = true;
      const loaded = await f.store.load('reminders', initialReminders);
      await f.store.flush('reminders', owner);
      assertExerciseSplit(loaded.value, original);
      assert.equal(f.store.isVolatile(key), true);
      assert.match(loaded.status, /本机存储不可用/, 'A failed split save cannot report durable success');
      assert.deepEqual(f.storage.get(key).data, original, 'A failed local write preserves the existing durable archive');
      const failedRetry = await f.store.load('reminders', initialReminders);
      assertExerciseSplit(failedRetry.value, original);
      assert.equal(f.store.isVolatile(key), true);
      assert.match(failedRetry.status, /本机存储不可用/);
      f.state.full = false; f.state.offline = true;
      const recovered = await f.store.load('reminders', initialReminders);
      assertExerciseSplit(recovered.value, original);
      assert.equal(f.store.isVolatile(key), false, 'Retry makes the same split and IDs durable without adding another habit');
      assert.equal(f.storage.get(key).pending, owner !== 'guest');
      const reopened = createPersonalToolStore(f.adapter);
      const persisted = await reopened.load('reminders', initialReminders);
      assertExerciseSplit(persisted.value, original);
      f.state.offline = false; f.state.putFail = false;
      await reopened.flush('reminders', persisted.owner);
      assert.equal(reopened.cache(key).pending, false);
      if (owner !== 'guest') assertExerciseSplit(f.remote.get(`${owner}:reminders`), original);
      else assert.equal(f.puts.length, 0);
    }
  }
  {
    const f = fixture(), invalid = { ...legacyExerciseState(), version: 2 }, key = toolCacheKey('guest', 'reminders');
    f.storage.set(key, { data: invalid, pending: false, revision: 1 });
    const loaded = await f.store.load('reminders', initialReminders);
    assert.deepEqual(copy(loaded.value), invalid, 'Unrecognized schemas remain untouched for the existing compatibility UI');
    assert.equal(f.storage.get(key).revision, 1);
  }
}

async function test() {
  {
    const f = fixture(); f.state.offline = true; f.state.fingerprint = '';
    const guest = await f.store.load('todos', { count: 0 });
    assert.equal(guest.owner, 'guest', 'a fresh installation without any credentials can use local guest storage');
    f.store.edit('todos', guest, { count: 1 });
    assert.equal(f.storage.get(toolCacheKey('guest', 'todos')).data.count, 1);
    assert.equal(f.puts.length, 0);
  }
  {
    const f = fixture(); f.state.offline = true;
    await assert.rejects(f.store.load('todos', { count: 0 }), /无法确认登录状态/);
    assert.equal(f.storage.size, 0, 'unknown offline users must not silently receive guest or account data');
  }
  {
    const f = fixture();
    const guest = await f.store.load('todos', { count: 0 });
    f.store.edit('todos', guest, old => ({ ...old, count: 1 }));
    f.state.offline = true;
    const reopened = createPersonalToolStore(f.adapter);
    const local = await reopened.load('todos', { count: 0 });
    assert.equal(local.owner, 'guest'); assert.equal(local.value.count, 1); assert.equal(local.cloud, false);
    reopened.edit('todos', local, old => ({ count: old.count + 1 }));
    assert.equal(f.puts.length, 0);
    assert.equal(f.storage.get(toolCacheKey('guest', 'todos')).data.count, 2);
    f.state.fingerprint = 'different-cookie';
    await assert.rejects(reopened.load('todos', { count: 0 }), /无法确认登录状态/);
  }
  {
    const f = fixture(); f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    const alice = await f.store.load('todos', { count: 0, extension: { schema: 2 } });
    f.state.putFail = true;
    f.store.edit('todos', alice, old => ({ ...old, count: 7 }));
    await f.store.flush('todos', alice.owner);
    assert.equal(f.storage.get(toolCacheKey(alice.owner, 'todos')).pending, true);
    f.state.owner = 'reader:bob'; f.state.fingerprint = 'bob-cookie';
    const bob = await f.store.load('todos', { count: 0 });
    assert.equal(bob.value.count, 0, 'pending Alice changes must not migrate to Bob');
    assert.throws(() => f.store.edit('todos', alice, { count: 99 }), /账号状态已变化/);
    f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie'; f.state.putFail = false;
    const resumed = await f.store.load('todos', { count: 0 });
    assert.equal(resumed.value.count, 7);
    await f.store.flush('todos', resumed.owner);
    assert.equal(f.remote.get('reader:alice:todos').count, 7);
    assert.equal(f.remote.get('reader:alice:todos').extension.schema, 2);
    assert.equal(f.storage.get(toolCacheKey(alice.owner, 'todos')).pending, false);
    assert.ok(f.puts.every(put => put.owner === 'reader:alice'));
  }
  {
    const f = fixture(); f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    const loaded = await f.store.load('todos', { count: 0 });
    const held = deferred(); f.state.heldPut = held;
    f.store.edit('todos', loaded, old => ({ count: old.count + 1 }));
    await Promise.resolve(); await Promise.resolve();
    f.store.edit('todos', loaded, old => ({ count: old.count + 1 }));
    f.store.edit('todos', loaded, old => ({ count: old.count + 1 }));
    assert.equal(f.puts.length, 1, 'only one PUT is in flight for the owner and tool');
    f.state.heldPut = null; held.resolve(); await f.store.flush('todos', loaded.owner);
    assert.equal(f.remote.get('reader:alice:todos').count, 3, 'queued writes must use the newest local edit');
    assert.equal(f.storage.get(toolCacheKey(loaded.owner, 'todos')).pending, false);
  }
  {
    const f = fixture(); f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    const loaded = await f.store.load('todos', { count: 0 });
    const held = deferred(); f.state.heldGet = held;
    const pendingLoad = f.store.load('todos', { count: 0 });
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    f.store.edit('todos', loaded, { count: 8 });
    await f.store.flush('todos', loaded.owner);
    f.state.heldGet = null; held.resolve();
    const result = await pendingLoad;
    assert.equal(result.value.count, 8, 'late GET must preserve a newer already-saved local edit');
    assert.equal(f.storage.get(toolCacheKey(loaded.owner, 'todos')).data.count, 8);
  }
  {
    const f = fixture(); f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    const held = deferred(); f.state.heldGet = held;
    f.remote.set('reader:alice:memos', { notes: ['Alice private note'] });
    const loading = f.store.load('memos', { notes: [] });
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    f.state.owner = 'reader:bob'; f.state.fingerprint = 'bob-cookie'; held.resolve();
    await assert.rejects(loading, /账号状态已变化/);
    assert.equal(f.storage.has(toolCacheKey('reader:alice', 'memos')), false, 'a response spanning an identity change is not cached');
  }
  {
    const f = fixture(); f.state.full = true;
    const guest = await f.store.load('todos', { count: 0 });
    const cacheKey = toolCacheKey('guest', 'todos');
    let latestStatus = ''; f.store.subscribe((_key, status) => { latestStatus = status; });
    assert.equal(f.store.isVolatile(cacheKey), false, 'An untouched default is not a volatile edit');
    f.store.edit('todos', guest, { count: 4 });
    assert.match(latestStatus, /存储不可用/);
    assert.equal(f.store.isVolatile(cacheKey), true);
    const failedRetry = await f.store.load('todos', { count: 0 });
    assert.equal(failedRetry.value.count, 4, 'storage failures retain volatile changes across page loads');
    assert.equal(failedRetry.status, '本机存储不可用 · 请保持小程序打开', 'A failed retry cannot claim volatile edits are saved locally');
    assert.equal(f.store.isVolatile(cacheKey), true);
    assert.equal(f.storage.has(cacheKey), false);
    f.state.full = false;
    const recovered = await f.store.load('todos', { count: 0 });
    assert.equal(recovered.value.count, 4);
    assert.equal(f.store.isVolatile(cacheKey), false, 'A retry clears the volatile flag only after durable storage succeeds');
    assert.equal(f.storage.get(cacheKey).data.count, 4);
    assert.equal(f.storage.get(cacheKey).pending, false, 'Guest recovery does not invent an account sync');
    assert.match(recovered.status, /保存在本机/);
    f.state.offline = true;
    const reopened = await createPersonalToolStore(f.adapter).load('todos', { count: 0 });
    assert.equal(reopened.value.count, 4, 'Recovered guest edits survive a fresh store instance');
  }
  {
    const f = fixture(); f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    const loaded = await f.store.load('domains', { records: [] });
    const cacheKey = toolCacheKey(loaded.owner, 'domains');
    f.state.full = true; f.state.putFail = true;
    f.store.edit('domains', loaded, { records: ['kept draft'], extension: { version: 2 } });
    await f.store.flush('domains', loaded.owner);
    assert.equal(f.store.isVolatile(cacheKey), true);
    const failedRetry = await f.store.load('domains', { records: [] });
    assert.equal(failedRetry.value.records[0], 'kept draft');
    assert.equal(failedRetry.status, '本机存储不可用 · 请保持小程序打开', 'Remote loading cannot conceal a still-volatile pending edit');
    assert.equal(f.store.cache(cacheKey).pending, true);
    f.state.full = false; f.state.offline = true;
    const recovered = await f.store.load('domains', { records: [] });
    assert.equal(f.store.isVolatile(cacheKey), false);
    assert.equal(recovered.value.extension.version, 2, 'Storage recovery preserves the entire payload');
    assert.equal(f.storage.get(cacheKey).pending, true, 'Offline durability retry keeps the pending account sync');
    const reopened = createPersonalToolStore(f.adapter);
    const persisted = await reopened.load('domains', { records: [] });
    assert.equal(persisted.value.records[0], 'kept draft');
    assert.equal(reopened.cache(cacheKey).pending, true);
    f.state.offline = false; f.state.putFail = false;
    await reopened.flush('domains', persisted.owner);
    assert.equal(f.remote.get('reader:alice:domains').records[0], 'kept draft');
    assert.equal(reopened.cache(cacheKey).pending, false, 'The unchanged queue can subsequently synchronize recovered edits');
  }
  {
    const f = fixture(); f.state.owner = 'reader:alice'; f.state.fingerprint = 'alice-cookie';
    const loaded = await f.store.load('todos', { count: 0 });
    f.state.owner = 'reader:bob'; // The adapter must also guard owner changes even if cookie text did not change.
    f.store.edit('todos', loaded, { count: 5 }); await f.store.flush('todos', loaded.owner);
    assert.equal(f.puts.length, 0);
    assert.equal(f.storage.get(toolCacheKey('reader:alice', 'todos')).pending, true);
    assert.equal(f.remote.has('reader:bob:todos'), false);
    await f.store.load('todos', { count: 0 });
    assert.throws(() => f.store.edit('todos', loaded, { count: 7 }), /账号状态已变化/, 'confirmed identity changes block stale edits even with the same cookie fingerprint');
  }
  {
    assert.ok(isTodoState(initialTodoState));
    assert.ok(!isTodoState({ version: 2, tasks: [], categories: [] }));
    assert.ok(!isTodoState({ version: 1, tasks: [{ id: 'bad' }], categories: [] }));
    assert.ok(isMemoState({ version: 1, notes: [{ id: 'm', title: '标题', body: '正文', color: 'sand', tags: ['生活'], futureField: true }] }));
    assert.ok(!isMemoState({ version: 1, notes: [{ id: 'bad', color: 'unknown' }] }));
  }
  {
    for (const owner of ['guest', 'reader:alice']) {
      const f = fixture(); f.state.owner = owner;
      const loaded = await f.store.load('domains', { records: [] });
      const key = toolCacheKey(owner, 'domains');
      f.state.full = true; f.state.putFail = true;
      f.store.edit('domains', loaded, { records: ['stable record'] });
      await f.store.flush('domains', owner);
      const pending = f.store.cache(key).pending;
      assert.equal(f.store.isVolatile(key), true);
      f.state.full = false;
      f.store.edit('domains', loaded, previous => previous);
      assert.equal(f.store.isVolatile(key), false, 'Identical-content saves retry memory-only writes');
      assert.equal(f.storage.get(key).data.records.length, 1, 'Same-ID retries never add another record');
      assert.equal(f.storage.get(key).pending, pending, 'Durability-only retry preserves the pending sync flag');
      await f.store.flush('domains', owner);
      const revision = f.storage.get(key).revision;
      f.store.edit('domains', loaded, previous => previous);
      assert.equal(f.storage.get(key).revision, revision, 'Durable no-op edits still avoid redundant writes');
    }
  }
  await testExerciseSplit();
  console.log('PASS personal tools: unknown/offline identity, guest persistence, owner isolation, pending recovery, serialized saves, late GETs, account switches, storage failures, compatible schemas and durable exercise/cardio splitting.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
