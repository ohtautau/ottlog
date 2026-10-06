import { spawn, spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { request, expect } from '@playwright/test';

const directory = mkdtempSync(path.join(tmpdir(), 'ottlog-first-run-'));
const project = path.resolve('../backend/Ottlog.Api');
let child;
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exit = new Promise(resolve => child.once('exit', resolve));
  child.kill(); await exit;
}
async function start() {
  child = spawn('dotnet', [path.join(project, 'bin/Debug/net10.0/Ottlog.Api.dll'), '--urls', 'http://127.0.0.1:5231'], {
    cwd: project, windowsHide: true, stdio: 'ignore',
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', Data__Directory: directory, Admin__Password: '', Admin__PasswordFile: '', ASPNETCORE_HOSTINGSTARTUPASSEMBLIES: '' }
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error('Backend startup failed');
    try { if ((await fetch('http://127.0.0.1:5231/health/ready')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Backend not ready');
}
const client = await request.newContext({ baseURL: 'http://127.0.0.1:5231' });
const session = async () => (await client.get('/api/auth/session')).json();
try {
  // Exercise a real upgrade from the previous schema, not only an empty database.
  const migration = spawnSync('dotnet', ['tool', 'run', 'dotnet-ef', 'database', 'update', 'Comments', '--project', path.join(project, 'Ottlog.Api.csproj'), '--connection', `Data Source=${path.join(directory, 'ottlog.db')}`, '--no-build'], { cwd: path.resolve('..'), windowsHide: true, encoding: 'utf8' });
  if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
  const legacy = new DatabaseSync(path.join(directory, 'ottlog.db'));
  legacy.exec(`INSERT INTO Articles (Id, Slug, Title, Description, Date, Category, TagsJson, Content, CoverUrl, Published, Version) VALUES ('11111111-1111-1111-1111-111111111111', 'legacy-post', 'Legacy', 'Existing summary', '2026-09-01', 'Legacy', '[]', 'Existing content', '/images/quiet-hills.svg', 1, 'legacy-version')`);
  legacy.close();
  await start();
  let state = await session();
  expect(state.needsSetup).toBe(true);
  expect((await client.post('/api/auth/setup', { headers: { 'X-CSRF-TOKEN': state.csrfToken }, data: { userName: 'firstadmin', password: 'Private-test-password!' } })).status()).toBe(200);
  state = await session();
  expect(state.needsSetup).toBe(false);
  const headers = { 'X-CSRF-TOKEN': state.csrfToken };
  const upgraded = (await (await client.get('/api/admin/posts')).json()).find(p => p.slug === 'legacy-post');
  expect(upgraded.content).toBe('Existing content');
  expect(upgraded.published).toBe(true);
  expect(upgraded.publishedMini).toBe(true);
  expect(upgraded.autoCover).toBe(false);
  expect(upgraded.coverUrl).toBe('/images/quiet-hills.svg');
  expect((await client.post('/api/auth/setup', { headers, data: { userName: 'secondadmin', password: 'Private-test-password!' } })).status()).toBe(409);
  const post = await (await client.post('/api/admin/posts', { headers, data: { slug: 'persistent-test', title: 'Persistent', description: 'Test', date: '2026-09-07', category: 'Test', tags: [], content: 'Survives restart', published: false, coverUrl: '' } })).json();
  expect(post.id).toBeTruthy();
  await stop(); await start();
  // Persisted Data Protection keys keep the existing admin cookie valid after restart.
  expect((await session()).authenticated).toBe(true);
  const articles = await (await client.get('/api/admin/posts')).json();
  expect(articles.find(p => p.slug === 'persistent-test').content).toBe('Survives restart');
  expect((await client.get('/api/posts/persistent-test')).status()).toBe(404);
  const old = await request.newContext({ baseURL: 'http://127.0.0.1:5231', storageState: await client.storageState() });
  try {
    const token = (await session()).csrfToken;
    expect((await client.post('/api/auth/password', { headers: { 'X-CSRF-TOKEN': token }, data: { currentPassword: 'Private-test-password!', newPassword: 'New-private-test-password!' } })).status()).toBe(204);
    expect((await old.get('/api/admin/posts')).status()).toBe(401);
    const anonymous = await session();
    expect((await client.post('/api/auth/login', { headers: { 'X-CSRF-TOKEN': anonymous.csrfToken }, data: { userName: 'firstadmin', password: 'New-private-test-password!' } })).status()).toBe(200);
  } finally { await old.dispose(); }
  console.log('PASS: legacy database upgrade preserves articles, cover and both channels; first-account setup, duplicate refusal, SQLite persistence, cookie persistence, password change and session revocation');
} finally {
  await client.dispose(); await stop();
  if (path.basename(directory).startsWith('ottlog-first-run-') && path.dirname(directory) === path.resolve(tmpdir())) rmSync(directory, { recursive: true, force: true });
}
