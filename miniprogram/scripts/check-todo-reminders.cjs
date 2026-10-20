const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const filename = path.join(__dirname, '../src/lib/todo-reminders.ts');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const owner = 'reader:alice';
const remindAt = new Date(Date.now() + 86400000).toISOString();
const config = { enabled: true, templateId: 'todo-template' };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
};
const settle = async () => { for (let count = 0; count < 12; count++) await Promise.resolve(); };
function fixture() {
  const events = [], state = { grant: 'accept', syncError: false, session: 'alice', switchOnRead: false, cancellations: [] };
  const taro = {
    requestSubscribeMessage: async args => { events.push({ kind: 'subscribe', args }); return { [args.tmplIds[0]]: state.grant }; },
    login: async () => { events.push({ kind: 'login' }); return { code: 'one-time-login-code' }; },
  };
  async function api(url, method, data, expectedOwner) {
    events.push({ kind: 'api', url, method, data, expectedOwner });
    if (method === 'DELETE') { await state.cancellations.shift(); return {}; }
    if (url === '/account/profile') return { authenticated: true, userName: state.session, isAdmin: false };
    if (url === '/wechat/reminders/config') return config;
    if (url === '/wechat/reminders' && method === 'POST') return { taskId: data.taskId, remindAt: data.remindAt, status: 'pending', errorCode: null };
    if (url === '/wechat/reminders' && !method) { if (state.switchOnRead) state.session = 'bob'; return { reminders: [] }; }
    return {};
  }
  const exports = {};
  vm.runInNewContext(source, { exports, Date, Error, require(name) {
    if (name === '@tarojs/taro') return { default: taro };
    if (name === '../api') return { api };
    if (name === './use-personal-tool-state') return { syncPersonalTool: async (key, currentOwner) => { events.push({ kind: 'sync', key, owner: currentOwner }); if (state.syncError) throw Error('offline'); } };
    throw Error('Unexpected import ' + name);
  } }, { filename });
  return { api: exports, state, events };
}
async function main() {
  {
    const f = fixture();
    const request = f.api.requestTodoReminder('task-1', remindAt, owner, config);
    assert.equal(f.events[0].kind, 'subscribe', 'subscription must begin in the tap before any network or await');
    const result = await request;
    assert.equal(result.status, 'pending');
    assert.deepEqual(f.events.map(event => event.kind), ['subscribe', 'sync', 'login', 'api', 'api']);
    const bind = f.events[3], schedule = f.events[4];
    assert.equal(bind.url, '/wechat/reminders/bind');
    assert.equal(bind.data.code, 'one-time-login-code');
    assert.equal(bind.expectedOwner, owner);
    assert.equal(schedule.data.subscriptionGranted, true);
    assert.equal(schedule.data.remindAt, remindAt);
    assert.equal(schedule.expectedOwner, owner);
  }
  for (const grant of ['reject', 'ban', 'filter']) {
    const f = fixture(); f.state.grant = grant;
    await assert.rejects(f.api.requestTodoReminder('task-1', remindAt, owner, config));
    assert.deepEqual(f.events.map(event => event.kind), ['subscribe'], 'rejected grants must not create backend reminders');
  }
  for (const [currentOwner, currentConfig, date] of [['guest', config, remindAt], [owner, { enabled: false }, remindAt], [owner, config, '2020-01-01T00:00:00Z'], [owner, config, new Date(Date.now() + 367 * 86400000).toISOString()]]) {
    const f = fixture();
    await assert.rejects(f.api.requestTodoReminder('task-1', date, currentOwner, currentConfig));
    assert.equal(f.events.length, 0);
  }
  {
    const f = fixture(); f.state.syncError = true;
    await assert.rejects(f.api.requestTodoReminder('task-1', remindAt, owner, config), /offline/);
    assert.deepEqual(f.events.map(event => event.kind), ['subscribe', 'sync']);
  }
  {
    const f = fixture(); f.state.switchOnRead = true;
    await assert.rejects(f.api.getTodoReminders(owner), /账号已切换/);
  }
  {
    const f = fixture();
    await f.api.cancelTodoReminder('task/1', owner);
    assert.equal(f.events[0].url, '/wechat/reminders/task%2F1');
    assert.equal(f.events[0].expectedOwner, owner);
    await f.api.cancelTodoReminder('task-1', 'guest');
    assert.equal(f.events.length, 1);
  }
  {
    const f = fixture(), held = deferred();
    f.state.cancellations.push(held.promise);
    const oldTime = new Date(Date.parse(remindAt) - 60000).toISOString();
    const cancelling = f.api.cancelTodoReminder('task/1', owner, oldTime);
    assert.equal(f.events[0].url, `/wechat/reminders/task%2F1?expectedRemindAt=${encodeURIComponent(oldTime)}`, 'Cancellation targets the old reminder time');
    assert.equal(f.events[0].expectedOwner, owner);
    const scheduling = f.api.requestTodoReminder('task/1', remindAt, owner, config);
    await settle();
    assert.deepEqual(f.events.map(event => event.kind), ['api', 'subscribe'], 'Consent begins immediately but sync/login/schedule wait for cancellation');
    held.resolve();
    await cancelling;
    assert.equal((await scheduling).status, 'pending');
    assert.deepEqual(f.events.map(event => event.kind), ['api', 'subscribe', 'sync', 'login', 'api', 'api']);
    assert.equal(f.events.at(-1).data.remindAt, remindAt);
  }
  {
    const f = fixture(), earlier = deferred(), later = deferred();
    f.state.cancellations.push(earlier.promise, later.promise);
    const firstCancel = f.api.cancelTodoReminder('task-1', owner, remindAt);
    const secondCancel = f.api.cancelTodoReminder('task-1', owner, remindAt);
    const scheduling = f.api.requestTodoReminder('task-1', remindAt, owner, config);
    later.resolve(); await secondCancel; await settle();
    assert.equal(f.events.some(event => event.kind === 'sync'), false, 'A faster later DELETE cannot hide an earlier request still in flight');
    earlier.resolve(); await firstCancel;
    assert.equal((await scheduling).status, 'pending');
  }
  {
    const f = fixture(), held = deferred();
    f.state.cancellations.push(held.promise);
    const cancelled = assert.rejects(f.api.cancelTodoReminder('task-1', owner, remindAt), /offline/);
    held.reject(Error('offline')); await cancelled; await settle();
    const before = f.events.length;
    assert.equal((await f.api.requestTodoReminder('task-1', remindAt, owner, config)).status, 'pending', 'A past failed cancellation does not poison future subscriptions');
    assert.deepEqual(f.events.slice(before).map(event => event.kind), ['subscribe', 'sync', 'login', 'api', 'api'], 'Recovery still synchronizes current task intent before scheduling');
  }
  {
    const f = fixture(), held = deferred();
    f.state.cancellations.push(held.promise);
    const cancelled = assert.rejects(f.api.cancelTodoReminder('task-1', owner, remindAt), /offline/);
    const scheduling = f.api.requestTodoReminder('task-1', remindAt, owner, config);
    await settle();
    assert.equal(f.events.some(event => event.kind === 'sync'), false);
    held.reject(Error('offline')); await cancelled;
    assert.equal((await scheduling).status, 'pending', 'An already-waiting subscription also recovers when cancellation fails');
  }
  {
    const f = fixture(), held = deferred();
    f.state.cancellations.push(held.promise);
    const cancelled = assert.rejects(f.api.cancelTodoReminder('task-1', owner, remindAt), /offline/);
    f.state.syncError = true;
    const scheduling = assert.rejects(f.api.requestTodoReminder('task-1', remindAt, owner, config), /offline/);
    held.reject(Error('offline')); await cancelled; await scheduling;
    assert.equal(f.events.some(event => event.url === '/wechat/reminders' && event.method === 'POST'), false, 'A failed cancellation cannot bypass the mandatory successful task sync');
  }
  {
    const f = fixture(), held = deferred();
    f.state.cancellations.push(held.promise);
    const cancelling = f.api.cancelTodoReminder('task-1', 'reader:bob', remindAt);
    assert.equal((await f.api.requestTodoReminder('task-1', remindAt, owner, config)).status, 'pending', 'Cancellation barriers are isolated by account');
    held.resolve(); await cancelling;
  }
  console.log('PASS reminder consent timing, time limits, rejection, offline sync, account switching, conditional cancellation, all-request waiting and cancellation failure recovery. No real WeChat requests.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
