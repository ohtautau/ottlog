// Run the real hook/store in two independent clients against one disposable API.
// Fake lifecycle/timers make background polling and owner races deterministic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');
const copy = value => value === undefined ? value : JSON.parse(JSON.stringify(value));
const drain = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function client(server) {
  const storage = new Map(), states = [], effects = [], shown = [], hidden = [], timers = new Map(), networks = new Set(), modules = new Map();
  const changes = [], listeners = new Map(), calls = [];
  const state = { owner: 'reader:alice', offline: false, failPut: false, heldGet: null };
  const events = {
    on(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
    off(name, callback) { listeners.get(name)?.delete(callback); },
    trigger(name) { listeners.get(name)?.forEach(callback => callback()); },
  };
  const Taro = {
    getStorageSync(key) { return key === 'ottlog.cookies' ? { auth: 'session=' + state.owner } : copy(storage.get(key)); },
    setStorageSync(key, value) { storage.set(key, copy(value)); },
    eventCenter: events,
    onNetworkStatusChange(callback) { networks.add(callback); },
    offNetworkStatusChange(callback) { networks.delete(callback); },
  };
  async function api(route, method = 'GET', payload, expectedOwner) {
    calls.push({ route, method });
    if (state.offline) throw new Error('offline fixture');
    if (route === '/account/session') { const [role, userName] = state.owner.split(':'); return { authenticated: role !== 'guest', isAdmin: role === 'admin', userName }; }
    const key = `${state.owner}:${route.split('/').at(-1)}`;
    if (method === 'PUT') {
      if (state.owner !== expectedOwner || state.failPut) throw new Error('fixture write refused');
      server.set(key, copy(payload.data)); return {};
    }
    const data = copy(server.get(key)) ?? null;
    const hold = state.heldGet; state.heldGet = null;
    if (hold) await hold.promise;
    return { data };
  }
  const react = {
    useRef: value => ({ current: value }), useCallback: callback => callback,
    useState(value) { const index = states.length; states.push(value); return [value, next => { states[index] = typeof next === 'function' ? next(states[index]) : next; changes.push({ index, value: states[index] }); }]; },
    useEffect(callback) { effects.push(callback()); },
  };
  function load(file) {
    file = path.resolve(file);
    if (modules.has(file)) return modules.get(file);
    const exports = {}; modules.set(file, exports);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(source, {
      exports, require(name) {
        if (name === 'react') return react;
        if (name === '@tarojs/taro') return { __esModule: true, default: Taro, useDidShow: fn => shown.push(fn), useDidHide: fn => hidden.push(fn) };
        const target = path.resolve(path.dirname(file), name + '.ts');
        if (target === path.join(root, 'api.ts')) return { api };
        return load(target);
      },
      Promise, Map, Set, JSON, Date, Error,
      setInterval(callback, delay) { assert.equal(delay, 5000); const id = timers.size + 1; timers.set(id, callback); return id; },
      clearInterval(id) { timers.delete(id); },
    }, { filename: file });
    return exports;
  }
  const exports = load(path.join(root, 'lib/use-personal-tool-state.ts'));
  const editEvents = [];
  effects.push(exports.subscribePersonalToolEdits('todos', 'reader:alice', event => editEvents.push(copy(event))));
  function mount() { const offset = states.length; const hook = exports.usePersonalToolState('todos', { count: 0 }); return { hook, value: () => states[offset], ready: () => states[offset + 1], owner: () => states[offset + 2] }; }
  const main = mount();
  return { ...main, mount, state, calls, changes, storage, editEvents, show: () => shown.forEach(fn => fn()), hide: () => hidden.forEach(fn => fn()), tick: () => timers.forEach(fn => fn()), online: () => networks.forEach(fn => fn({ isConnected: true })), events,
    dispose() { effects.forEach(cleanup => cleanup?.()); assert.equal(timers.size, 0); assert.equal(networks.size, 0); } };
}

(async () => {
  const server = new Map([['reader:alice:todos', { count: 1 }]]);
  const web = client(server), mini = client(server);
  web.show(); mini.show(); await drain();
  assert.equal(web.value().count, 1); assert.equal(mini.value().count, 1);
  const originalMini = mini.value(); const revision = mini.storage.get('ottlog-mini-tool-v1:reader:alice:todos').revision; mini.tick(); await drain();
  assert.equal(mini.value(), originalMini, 'Unchanged polls retain the rendered value/tasks object');
  assert.equal(mini.storage.get('ottlog-mini-tool-v1:reader:alice:todos').revision, revision, 'Unchanged polls do not generate storage events/revision loops across browser tabs');
  const readyEvents = mini.changes.filter(change => change.index === 1).length;
  await web.hook.setValue({ count: 2 }); await drain(); mini.tick(); await drain();
  assert.equal(mini.value().count, 2, 'A web save arrives automatically on the mini foreground poll');
  assert.equal(mini.calls.some(call => call.method === 'PUT'), false, 'A GET refresh never writes its snapshot back to the server');
  assert.equal(mini.editEvents.length, 0, 'Remote reads do not masquerade as local undoable operations');
  assert.equal(mini.ready(), true);
  assert.equal(mini.changes.filter(change => change.index === 1).slice(readyEvents).some(change => change.value === false), false, 'Background refresh never resets ready');
  assert.equal(mini.changes.some(change => typeof change.value === 'string' && change.value.includes('正在刷新账号数据')), false);
  await mini.hook.setValue({ count: 3 }); await drain(); web.tick(); await drain();
  assert.equal(web.value().count, 3, 'A mini save arrives automatically on the web foreground poll');
  assert.equal(web.editEvents.length, 1, 'Only the earlier real web edit produces an operation/undo event');

  mini.hide(); const readsBeforeHide = mini.calls.length;
  await web.hook.setValue({ count: 4 }); await drain(); mini.tick(); await drain();
  assert.equal(mini.calls.length, readsBeforeHide, 'Hidden pages make no polling requests');
  assert.equal(mini.value().count, 3);
  mini.show(); await drain(); assert.equal(mini.value().count, 4, 'Returning to the foreground refreshes immediately');
  server.set('reader:alice:todos', { count: 5 }); mini.online(); await drain();
  assert.equal(mini.value().count, 5, 'Network reconnection refreshes immediately');

  const hold = deferred(); mini.state.heldGet = hold;
  server.set('reader:alice:todos', { count: 6 }); mini.tick(); await drain();
  await mini.hook.setValue({ count: 7 }); await drain();
  hold.resolve(); await drain();
  assert.equal(mini.value().count, 7, 'A late GET cannot overwrite a newer local edit, including its upload acknowledgement');

  mini.state.failPut = true; await mini.hook.setValue({ count: 8 }); await drain();
  server.set('reader:alice:todos', { count: 9 }); mini.tick(); await drain();
  assert.equal(mini.value().count, 8, 'Remote polling preserves pending local edits after failed upload');
  assert.equal(server.get('reader:alice:todos').count, 9, 'A refused retry does not modify the remote archive');
  mini.state.failPut = false; mini.online(); await drain();
  assert.equal(server.get('reader:alice:todos').count, 8, 'Reconnection uses the existing owner-bound upload queue');

  const stale = deferred(); mini.state.heldGet = stale; mini.tick(); await drain();
  mini.state.owner = 'reader:bob'; server.set('reader:bob:todos', { count: 100 }); mini.events.trigger('ottlog-session'); await drain();
  stale.resolve(); await drain();
  assert.equal(mini.owner(), 'reader:bob'); assert.equal(mini.value().count, 100, 'Old-owner refreshes cannot cross an account switch');

  const secondConsumer = web.mount(); web.show(); await drain();
  const getsBefore = web.calls.filter(call => call.route === '/personal-tools/todos').length;
  const sharedHold = deferred(); web.state.heldGet = sharedHold; web.tick(); await drain();
  assert.equal(web.calls.filter(call => call.route === '/personal-tools/todos').length - getsBefore, 1, 'Mounted consumers of one owner/tool share a single in-flight poll');
  sharedHold.resolve(); await drain(); assert.equal(secondConsumer.value().count, web.value().count);
  web.dispose(); mini.dispose();
  console.log('PASS two-client automatic sync: foreground polling, unchanged-reference stability, silent ready state, both directions, hide/show, reconnect, pending upload, late GET, owner switching, shared reads and cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
