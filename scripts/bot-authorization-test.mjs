// Build: dotnet build backend/Ottlog.Api/Ottlog.Api.csproj -c BotAuthorization
// Run: node scripts/bot-authorization-test.mjs (Node >=22, disposable database only).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, appendFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assembly = join(root, 'backend/Ottlog.Api/bin/BotAuthorization/net10.0/Ottlog.Api.dll');
const folder = await mkdtemp(join(tmpdir(), 'ottlog-bot-auth-'));
const probe = createServer();
await new Promise(r => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port;
await new Promise(r => probe.close(r));
const base = 'http://127.0.0.1:' + port;
class Client {
  constructor(token) { this.token = token; this.cookies = {}; }
  async call(path, method = 'GET', body, csrf = true) {
    const r = await fetch(base + path, { method, headers: {
      'Content-Type': 'application/json', Cookie: Object.entries(this.cookies).map(([k, v]) => k + '=' + v).join('; '),
      ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}), ...(csrf && this.csrf ? { 'X-CSRF-TOKEN': this.csrf } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    for (const e of r.headers.getSetCookie()) { const pair = e.split(';')[0], i = pair.indexOf('='); this.cookies[pair.slice(0, i)] = pair.slice(i + 1); }
    return { status: r.status, data: r.headers.get('content-type')?.startsWith('application/json') ? await r.json() : null };
  }
  async session() { const r = await this.call('/api/account/session'); assert.equal(r.status, 200); this.csrf = r.data.csrfToken; return r.data; }
  async register(name) {
    await this.session();
    assert.equal((await this.call('/api/account/register', 'POST', { userName: name, password: 'disposable-test-password-123' })).status, 200);
    await this.session();
  }
  async grant(name) { const r = await this.call('/api/account/bot-grants', 'POST', { name }); assert.equal(r.status, 201); assert.equal(r.data.token.length, 48); return r.data; }
}
let child, pendingLog = Promise.resolve();
async function start() {
  const env = { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', DOTNET_ENVIRONMENT: 'Development' };
  for (const k of ['ASPNETCORE_HOSTINGSTARTUPASSEMBLIES', 'Admin__Password', 'Admin__PasswordFile']) delete env[k];
  child = spawn('dotnet', [assembly, '--urls=' + base, '--Data:Directory=' + folder, '--SeedExamples=false', '--RateLimits:LoginPerMinute=100'],
    { cwd: dirname(assembly), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { pendingLog = pendingLog.then(() => appendFile(join(folder, 'server.log'), data)); });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) { await pendingLog; throw new Error('Disposable API failed: ' + (await readFile(join(folder, 'server.log'), 'utf8')).slice(-4500)); }
    try { if ((await new Client().call('/health')).status === 200) return; } catch { }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Disposable API readiness timeout');
}
async function stop() { if (child?.exitCode === null) { const done = new Promise(r => child.once('exit', r)); child.kill(); await done; } await pendingLog; }
try {
  await start();
  const a = new Client(), b = new Client();
  await a.register('bot_owner_a'); await b.register('bot_owner_b');
  assert.equal((await a.call('/api/bot/session')).status, 401);
  assert.equal((await a.call('/api/account/bot-grants', 'POST', { name: 'csrf-missing' }, false)).status, 400);
  const grant = await a.grant('primary'), other = await a.grant('independent');
  const bot = new Client(grant.token), otherBot = new Client(other.token);
  assert.equal((await bot.call('/api/bot/session')).data.userName, 'bot_owner_a');
  const mixed = new Client(grant.token); mixed.cookies = { ...b.cookies };
  assert.equal((await mixed.call('/api/bot/session')).data.userName, 'bot_owner_a');
  mixed.token = 'ottb_' + 'x'.repeat(43);
  assert.equal((await mixed.call('/api/bot/session')).status, 401);
  assert.equal((await b.call('/api/account/bot-grants/' + grant.id, 'DELETE')).status, 404);
  assert.deepEqual((await b.call('/api/account/bot-grants')).data.grants, []);
  const listing = (await a.call('/api/account/bot-grants')).data;
  assert.equal(listing.grants.length, 2); assert.ok(!JSON.stringify(listing).toLowerCase().includes('token'));
  assert.equal((await bot.call('/api/account/bot-grants')).status, 401);
  assert.equal((await bot.call('/api/account/bot-grants', 'POST', { name: 'forbidden' })).status, 401);
  assert.equal((await bot.call('/api/account/session')).data.authenticated, false);
  assert.equal((await bot.call('/api/personal-tools/todos')).status, 401);
  assert.equal((await bot.call('/api/bot/personal-tools/domains')).status, 403);
  assert.equal((await bot.call('/api/bot/personal-tools/reminders', 'PUT', { data: {} })).status, 403);
  assert.equal((await new Client('ottb_' + 'x'.repeat(43)).call('/api/bot/session')).status, 401);
  for (const key of ['todos', 'memos']) {
    const payload = { data: { 'test-marker': key } };
    assert.deepEqual(await bot.call('/api/bot/personal-tools/' + key, 'PUT', payload), { status: 200, data: payload });
    assert.deepEqual((await a.call('/api/personal-tools/' + key)).data, payload);
    assert.deepEqual((await b.call('/api/personal-tools/' + key)).data, { data: null });
  }
  assert.equal((await a.call('/api/personal-tools/todos', 'PUT', { data: {} }, false)).status, 400);
  assert.equal((await a.call('/api/account/logout', 'POST')).status, 204); a.cookies = {};
  assert.equal((await bot.call('/api/bot/session')).status, 200);
  let db = new DatabaseSync(join(folder, 'ottlog.db'));
  const saved = db.prepare('SELECT TokenHash FROM BotGrants WHERE Id=?').get(grant.id).TokenHash;
  assert.notEqual(saved, grant.token); assert.equal(saved.length, 64);
  db.exec('UPDATE BotGrants SET CreatedAt=CreatedAt-86400'); db.close();
  await stop(); await start();
  assert.equal((await bot.call('/api/bot/session')).status, 200);
  assert.equal((await bot.call('/api/bot/grant', 'DELETE')).status, 204);
  assert.equal((await bot.call('/api/bot/session')).status, 401);
  assert.equal((await bot.call('/api/bot/personal-tools/memos', 'PUT', { data: {} })).status, 401);
  assert.equal((await otherBot.call('/api/bot/session')).status, 200);
  db = new DatabaseSync(join(folder, 'ottlog.db'));
  db.exec("UPDATE Readers SET SecurityStamp='changed-for-test' WHERE UserName='bot_owner_a'"); db.close();
  assert.equal((await otherBot.call('/api/bot/session')).status, 401);
  await b.session(); const third = await b.grant('account-revocation');
  assert.equal((await b.call('/api/account/bot-grants/' + third.id, 'DELETE')).status, 204);
  assert.equal((await new Client(third.token).call('/api/bot/session')).status, 401);
  assert.equal((await b.session()).authenticated, true);
  console.log('PASS: issue, hash-only storage, scopes, CSRF, account isolation, no Cookie, >8h age, restart, both revocations, independent grants, security-stamp invalidation.');
} finally { await stop(); await rm(folder, { recursive: true, force: true }); }
