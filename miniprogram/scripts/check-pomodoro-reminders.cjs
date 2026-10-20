const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const filename = path.join(__dirname, '../src/lib/pomodoro-reminders.ts');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const owner = 'reader:alice';
const config = { enabled: true, requiresSubscription: true, templates: ['focus_start', 'break_start', 'break_end'].map(event => ({ event, templateId: `template-${event}` })) };
const plain = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const calls = [], state = { grants: {}, account: 'alice', offline: false, switchRead: false, cancel: null };
  const taro = {
    requestSubscribeMessage: async ({ tmplIds }) => { calls.push({ kind: 'subscribe', tmplIds }); return Object.fromEntries(tmplIds.map(id => [id, state.grants[id] || 'accept'])); },
    login: async () => { calls.push({ kind: 'login' }); return { code: 'preview-code' }; },
  };
  async function api(url, method, data, expectedOwner) {
    calls.push({ kind: 'api', url, method, data, expectedOwner });
    if (method === 'DELETE') { if (state.cancel) await state.cancel; return; }
    if (url === '/account/profile') return { authenticated: true, userName: state.account };
    if (url === '/wechat/pomodoro/config') return config;
    if (url === '/wechat/pomodoro' && method === 'POST') return { reminders: data.events.map(event => ({ runId: data.runId, event, status: 'pending', remindAt: new Date().toISOString(), errorCode: null })) };
    if (url === '/wechat/pomodoro') { if (state.switchRead) state.account = 'bob'; return { reminders: [] }; }
    return {};
  }
  const exports = {};
  vm.runInNewContext(source, { exports, Date, Error, require(name) {
    if (name === '@tarojs/taro') return { default: taro };
    if (name === '../api') return { api };
    if (name === './use-personal-tool-state') return { syncPersonalTool: async (key, currentOwner) => { calls.push({ kind: 'sync', key, owner: currentOwner }); if (state.offline) throw Error('offline'); } };
    throw Error(name);
  } }, { filename });
  return { lib: exports, calls, state };
}
async function main() {
  {
    const f = fixture();
    const result = f.lib.requestPomodoroReminders('run-1', owner, config);
    assert.equal(f.calls[0].kind, 'subscribe', 'Consent stays in the original click');
    assert.equal(f.calls[0].tmplIds.length, 3);
    assert.equal((await result).reminders.length, 3);
    assert.deepEqual(f.calls.map(call => call.kind), ['subscribe', 'sync', 'login', 'api', 'api']);
    assert.equal(f.calls[1].key, 'pomodoro');
    assert.equal(f.calls.at(-1).expectedOwner, owner);
  }
  {
    const f = fixture(); f.state.grants = { 'template-focus_start': 'reject', 'template-break_start': 'filter' };
    const result = await f.lib.requestPomodoroReminders('run-1', owner, config);
    assert.deepEqual(plain(result.acceptedEvents), ['break_end']);
    assert.deepEqual(plain(f.calls.at(-1).data.events), ['break_end'], 'Only accepted event grants are scheduled');
  }
  {
    const f = fixture();
    const result = await f.lib.requestPomodoroReminders('run-1', owner, { ...config, templates: [config.templates[2]] });
    assert.deepEqual(plain(result.acceptedEvents), ['break_end'], 'Supplemental consent requests only the missing event');
    assert.equal(f.calls[0].tmplIds.length, 1);
  }
  {
    const f = fixture();
    await assert.rejects(f.lib.requestPomodoroReminders('x'.repeat(101), owner, config));
    assert.equal(f.calls.length, 0);
    assert.equal((await f.lib.requestPomodoroReminders('legacy:run', owner, config)).reminders[0].runId, 'legacy:run');
  }
  for (const [currentOwner, currentConfig] of [['guest', config], [owner, { enabled: false }], [owner, { ...config, templates: [config.templates[0], config.templates[0], config.templates[2]] }]]) {
    const f = fixture();
    await assert.rejects(f.lib.requestPomodoroReminders('run-1', currentOwner, currentConfig));
    assert.equal(f.calls.length, 0);
  }
  {
    const f = fixture(); f.state.grants = Object.fromEntries(config.templates.map(item => [item.templateId, 'reject']));
    await assert.rejects(f.lib.requestPomodoroReminders('run-1', owner, config));
    assert.deepEqual(f.calls.map(call => call.kind), ['subscribe']);
  }
  {
    const f = fixture(); f.state.offline = true;
    await assert.rejects(f.lib.requestPomodoroReminders('run-1', owner, config), /offline/);
    assert.deepEqual(f.calls.map(call => call.kind), ['subscribe', 'sync']);
  }
  {
    const f = fixture();
    const token = f.lib.preparePomodoroLaunch(owner, config);
    assert.equal(f.calls[0].kind, 'subscribe');
    await Promise.resolve();
    assert.equal(f.calls.length, 1, 'Navigation consent cannot schedule before the timer is saved');
    assert.equal((await f.lib.consumePomodoroLaunch(token, 'run-home', owner)).reminders.length, 3);
    assert.equal(await f.lib.consumePomodoroLaunch(token, 'run-other', owner), null, 'Launch is consumed once');
    assert.equal(f.calls.filter(call => call.kind === 'subscribe').length, 1);
  }
  {
    const f = fixture();
    const token = f.lib.preparePomodoroLaunch(owner, config);
    await assert.rejects(f.lib.consumePomodoroLaunch(token, 'run-home', 'reader:bob'));
    assert.equal(f.calls.length, 1, 'A launch cannot cross accounts');
  }
  {
    const f = fixture();
    const token = f.lib.preparePomodoroLaunch(owner, config);
    const result = await f.lib.consumePomodoroLaunch(token, 'run-home', owner, ['break_end']);
    assert.deepEqual(plain(result.acceptedEvents), ['break_end'], 'A restored break only schedules still-applicable granted events');
    assert.deepEqual(plain(f.calls.at(-1).data.events), ['break_end']);
  }
  {
    const f = fixture();
    const token = f.lib.preparePomodoroLaunch('guest', config);
    assert.equal(await f.lib.consumePomodoroLaunch(token, 'run-home', 'guest'), null);
    assert.equal(f.calls.length, 0);
  }
  {
    const f = fixture(); f.state.switchRead = true;
    await assert.rejects(f.lib.getPomodoroReminders(owner));
  }
  {
    const f = fixture(); let resolve;
    f.state.cancel = new Promise(done => { resolve = done; });
    const cancellation = f.lib.cancelPomodoroReminders('run-1', owner, 123456);
    const request = f.lib.requestPomodoroReminders('run-1', owner, config);
    for (let index = 0; index < 6; index++) await Promise.resolve();
    assert.equal(f.calls[0].url, '/wechat/pomodoro/run-1?expectedDeadline=123456');
    assert.equal(f.calls.some(call => call.kind === 'sync'), false);
    resolve(); await cancellation; await request;
    assert.equal(f.calls.at(-1).url, '/wechat/pomodoro');
  }
  console.log('PASS pomodoro consent timing, partial/rejected grants, offline sync, launch handoff, owner isolation and conditional cancellation. No real WeChat calls.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
