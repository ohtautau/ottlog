// Synthetic users and data on the separately configured localhost test API only.
import { chromium, expect, request } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const origin = process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3100';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Use isolated local API.');
const out = path.resolve('test-results/web-parity'); await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(); page.setDefaultTimeout(10000);
let app;
const button = (name, root = app) => root.getByRole('button', { name, exact: true });
async function go(route) { await page.goto(`${origin}${route}`); await page.locator('.shared-app-content').waitFor(); app = page; }
const session = async client => (await (await client.get('/api/account/session')).json());
const credential = { userName: `parity-${Date.now()}`, password: 'Synthetic-only-browser-check-2026!' };
let mini;
try {
  // Existing browser guest cache is read as-is, including unknown forward fields.
  const stamp = new Date().toISOString();
  const original = { version: 1, categories: [], tasks: [{ id: 'legacy browser-task+100%', title: '保留原网页任务', description: '**原备注**', categoryId: '', important: true, urgent: false, dueDate: '', completedAt: null, createdAt: stamp, updatedAt: stamp, tags: ['原标签'], nextTasks: [], futureField: { preserved: true } }] };
  await context.addInitScript(data => { if (!localStorage.getItem('ottlog-tool-v1:guest:todos')) localStorage.setItem('ottlog-tool-v1:guest:todos', JSON.stringify({ data, pending: false })); }, original);
  await go(`/todos?task=${encodeURIComponent(original.tasks[0].id)}`);
  await expect(app.getByLabel('任务名称')).toHaveValue('保留原网页任务');
  await button('关闭编辑').click();
  await button('编辑任务：保留原网页任务').click();
  await app.getByLabel('任务名称').fill('本机失败重试同一任务');
  await app.evaluate(() => { window.savedSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'ottlog-tool-v1:guest:todos') throw new Error('test storage quota'); return window.savedSetItem.call(this, key, value); }; });
  await button('保存', app.locator('.todo-sheet')).click();
  await expect(app.locator('.operation-toast')).toContainText('本机存储不可用'); await expect(app.locator('.todo-sheet')).toBeVisible();
  await expect(app.getByLabel('任务名称')).toHaveValue('本机失败重试同一任务');
  await app.evaluate(() => { Storage.prototype.setItem = window.savedSetItem; });
  await button('保存', app.locator('.todo-sheet')).click(); await expect(app.locator('.todo-sheet')).toHaveCount(0);
  const cached = await app.evaluate(() => JSON.parse(localStorage.getItem('ottlog-tool-v1:guest:todos')).data);
  expect(cached.tasks).toHaveLength(1); expect(cached.tasks[0]).toMatchObject({ id: original.tasks[0].id, futureField: { preserved: true } });
  const source = await button('编辑任务：本机失败重试同一任务').boundingBox(), target = await app.locator('#todo-zone-later').boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2); await page.mouse.down();
  // The product's intentional long-press threshold is 400ms; the browser adapter captures at 500ms.
  await page.waitForTimeout(550);
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 20 }); await page.mouse.up();
  await expect(app.locator('#todo-zone-later')).toContainText('本机失败重试同一任务');
  expect(await app.evaluate(() => JSON.parse(localStorage.getItem('ottlog-tool-v1:guest:todos')).data.tasks[0].important)).toBe(false);

  // Mouse drag and wheel are real scroll-snap controls; selection and fade remain aligned.
  await go('/mottos'); await button('格言轮播设置').click();
  const seconds = app.getByRole('listbox', { name: '格言轮播间隔秒', exact: true });
  const box = await seconds.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + 80); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, box.y + 48, { steps: 12 }); await page.mouse.up();
  await expect(seconds.locator('[aria-selected=true]')).toHaveText('16'); await expect(seconds).toHaveAttribute('data-moving', 'false');
  await page.mouse.move(box.x + box.width / 2, box.y + 80); await page.mouse.wheel(0, 32);
  await expect(seconds.locator('[aria-selected=true]')).toHaveText('17'); await expect(seconds).toHaveAttribute('data-moving', 'false');
  const fade = await app.locator('.time-wheel-fade').evaluate(node => ({ css: getComputedStyle(node).backgroundImage, pointer: getComputedStyle(node).pointerEvents, height: node.getBoundingClientRect().height }));
  expect(fade).toMatchObject({ pointer: 'none', height: 160 }); expect(fade.css).toContain('40%'); expect(fade.css).toContain('60%');
  await page.screenshot({ path: path.join(out, 'browser-wheel-drag.png') });
  await button('关闭轮播设置').click(); await button('不保存', app.getByRole('dialog', { name: '保存修改？', exact: true })).click();

  // Browser file picker, canvas compression, durable bytes, and separate image preview.
  await go('/memos'); await button('创建便签').click(); await app.getByLabel('便签标题').fill('浏览器图片保存');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
  const choose = page.waitForEvent('filechooser'); await button('插入图片').click(); await (await choose).setFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: png });
  await expect(app.locator('.memo-images img')).toHaveCount(1); await button('创建便签', app.locator('.entry-composer')).click();
  await expect(app.locator('.entry-composer')).toHaveCount(0); await button('查看便签：浏览器图片保存').click();
  await app.locator('.memo-reader .domain-record-images img').click(); await expect(app.getByRole('dialog', { name: '查看图片' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(app.getByRole('dialog', { name: '查看图片' })).toHaveCount(0); await expect(app.getByRole('dialog', { name: '便签内容', exact: true })).toBeVisible();
  await button('完成', app.getByRole('dialog', { name: '便签内容', exact: true })).click();

  const current = await session(context.request);
  expect((await context.request.post(`${origin}/api/account/register`, { headers: { 'X-CSRF-TOKEN': current.csrfToken }, data: credential })).status()).toBe(200);
  await session(context.request); const owner = `reader:${credential.userName}`;
  mini = await request.newContext({ baseURL: origin }); const miniBefore = await session(mini);
  expect((await mini.post('/api/account/login', { headers: { 'X-CSRF-TOKEN': miniBefore.csrfToken }, data: credential })).status()).toBe(200);
  const miniSession = await session(mini);
  for (const key of ['todos', 'memos', 'reminders', 'pomodoro', 'meals', 'mottos', 'growth', 'domains', 'dining']) {
    const data = key === 'todos' ? original : key === 'dining' ? { customFoods: [] } : { stableId: `cross-client-${key}`, version: 1, untouched: true };
    expect((await mini.put(`/api/personal-tools/${key}`, { headers: { 'X-CSRF-TOKEN': miniSession.csrfToken }, data: { data } })).status()).toBe(200);
    expect((await (await context.request.get(`${origin}/api/personal-tools/${key}`)).json()).data).toEqual(data);
  }
  await go('/todos'); await button('编辑任务：保留原网页任务').click(); await app.getByLabel('任务名称').fill('真实账号网页更新');
  await button('保存', app.locator('.todo-sheet')).click(); await expect(app.locator('.todo-sheet')).toHaveCount(0);
  const remote = async () => (await (await mini.get('/api/personal-tools/todos')).json()).data;
  await expect.poll(async () => (await remote()).tasks[0].title).toBe('真实账号网页更新');
  expect((await remote()).tasks[0]).toMatchObject({ id: original.tasks[0].id, futureField: { preserved: true } });
  await page.route('**/api/personal-tools/todos', route => route.abort('failed'));
  await button('编辑任务：真实账号网页更新').click(); await app.getByLabel('任务名称').fill('断网暂存后重试'); await button('保存', app.locator('.todo-sheet')).click();
  await expect.poll(() => app.evaluate(owner => JSON.parse(localStorage.getItem(`ottlog-tool-v1:${owner}:todos`)).pending, owner)).toBe(true);
  await expect(app.locator('.todo-sync-error')).toBeVisible();
  await page.unroute('**/api/personal-tools/todos'); await button('重试同步').click();
  await expect.poll(async () => (await remote()).tasks[0].title).toBe('断网暂存后重试');
  const fromMini = await remote(); fromMini.tasks[0].title = '小程序接口写入后网页重读';
  expect((await mini.put('/api/personal-tools/todos', { headers: { 'X-CSRF-TOKEN': miniSession.csrfToken }, data: { data: fromMini } })).status()).toBe(200);
  await page.reload(); app = page; await expect(button('编辑任务：小程序接口写入后网页重读')).toBeVisible();
  await button('编辑任务：小程序接口写入后网页重读').click(); await app.getByLabel('任务名称').fill('账号切换不得保存');
  const beforeLogout = await session(context.request); expect((await context.request.post(`${origin}/api/account/logout`, { headers: { 'X-CSRF-TOKEN': beforeLogout.csrfToken } })).status()).toBe(204);
  await button('保存', app.locator('.todo-sheet')).click();
  await expect.poll(async () => (await remote()).tasks[0].title).toBe('小程序接口写入后网页重读');
  expect(await app.evaluate(() => JSON.parse(localStorage.getItem('ottlog-tool-v1:guest:todos')).data.tasks[0].title)).toBe('本机失败重试同一任务');
  console.log('PASS existing guest cache, same-ID quota retry, real mouse drag/wheel/fade, browser image compression/preview, nine shared API keys, live account save, offline retry, mini-to-web reread, account isolation.');
} catch (error) { await page.screenshot({ path: path.join(out, 'data-failure.png') }); await fs.writeFile(path.join(out, 'data-failure.txt'), await page.locator('.tool-app-root').innerText().catch(() => 'No frame')); throw error; }
finally { await mini?.dispose(); await browser.close(); }
