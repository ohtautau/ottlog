const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const { fixtures, createToolBackup, parseToolBackup } = require('./tool-backup-fixtures.cjs');
const origin = process.env.TEST_ORIGIN || JSON.parse(fs.readFileSync('test-results/productivity-runtime.json', 'utf8')).origin;
if (!origin || new URL(origin).port === '3000') throw new Error('Use an isolated preview.');
const routes = { meals: '/eat', reminders: '/daily', todos: '/todos', pomodoro: '/pomodoro', memos: '/memos' };
const lists = { meals: 'meals', reminders: 'items', todos: 'tasks', pomodoro: 'sessions', memos: 'notes' };
const a = fixtures('one'), b = fixtures('two');
async function cache(page, key) { return page.evaluate(key => JSON.parse(localStorage.getItem(`ottlog-tool-v1:guest:${key}`))?.data, key); }
async function seed(page, key, data) {
  await page.evaluate(({ key, data }) => { const k = `ottlog-tool-v1:guest:${key}`; localStorage.setItem(k, JSON.stringify({ data, pending: false })); dispatchEvent(new CustomEvent('ottlog-tool-cache', { detail: k })); }, { key, data });
}
async function upload(page, key, data) {
  await page.getByLabel('选择备份文件', { exact: true }).setInputFiles({ name: `backup-${key}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(createToolBackup(key, data))) });
  await expect(page.getByRole('button', { name: '取消导入', exact: true })).toBeVisible();
}
async function open(page) { await page.getByRole('button', { name: '数据导入 / 导出', exact: true }).click(); }
async function confirm(page) {
  await page.getByRole('button', { name: '确认导入', exact: true }).click();
  await expect(page.getByText('导入已应用，保存与账号同步状态见下方。', { exact: true })).toBeVisible();
}
async function download(page, key) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON', exact: true }).click();
  const file = await pending;
  assert.match(file.suggestedFilename(), new RegExp(`^ottlog-${key}-.*\\.json$`));
  const raw = JSON.parse(fs.readFileSync(await file.path(), 'utf8'));
  assert.deepEqual(Object.keys(raw).sort(), ['data', 'exportedAt', 'format', 'tool', 'version']);
  return parseToolBackup(JSON.stringify(raw), key).data;
}
async function register(context, name) {
  const session = await (await context.request.get(origin + '/api/account/session')).json();
  const response = await context.request.post(origin + '/api/account/register', { data: { userName: name, password: 'Backup-fixture-only-2026!' }, headers: { 'X-CSRF-TOKEN': session.csrfToken } });
  assert.equal(response.status(), 200);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/todos');
    for (const key of Object.keys(a)) await seed(page, key, a[key]);
    for (const key of Object.keys(routes)) {
      await page.goto(origin + routes[key], { waitUntil: 'networkidle' });
      await open(page);
      assert.deepEqual(await download(page, key), a[key]);
      await upload(page, key, b[key]);
      await confirm(page);
      await expect.poll(async () => (await cache(page, key))[lists[key]].length).toBe(2);
      await upload(page, key, b[key]); await confirm(page);
      assert.equal((await cache(page, key))[lists[key]].length, 2);
      await upload(page, key, a[key]);
      await page.getByRole('radio', { name: /替换当前数据/ }).check();
      await expect(page.getByRole('button', { name: '确认导入', exact: true })).toBeDisabled();
      await page.getByRole('checkbox', { name: /我确认覆盖/ }).check();
      await confirm(page);
      assert.deepEqual(await cache(page, key), a[key]);
      await page.getByLabel('选择备份文件', { exact: true }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
      await expect(page.getByRole('dialog').getByRole('alert')).toContainText('JSON');
      assert.deepEqual(await cache(page, key), a[key]);
      await page.getByLabel('选择备份文件', { exact: true }).setInputFiles({ name: 'wrong-tool.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(createToolBackup(key === 'memos' ? 'todos' : 'memos', key === 'memos' ? a.todos : a.memos))) });
      await expect(page.getByRole('dialog').getByRole('alert')).toContainText('其他工具');
      assert.deepEqual(await cache(page, key), a[key]);
      await page.getByRole('button', { name: '关闭数据备份', exact: true }).click();
      await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual(await cache(page, key), a[key]);
      console.log(`PASS ${key}: real JSON download, merge, repeated merge, guarded replace, bad/wrong-tool file rejection, reload`);
    }

    // Native dialog stays usable on narrow screens and protects unsaved memo edits.
    await page.getByRole('button', { name: /测试备忘 one/ }).click();
    await page.getByRole('textbox', { name: '备忘正文', exact: true }).fill('必须保留的未保存内容');
    await open(page);
    await page.getByRole('button', { name: '导出 JSON', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('请先保存或移除');
    await page.getByLabel('选择备份文件', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(createToolBackup('memos', b.memos))) });
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('请先保存或移除');
    assert.deepEqual(await cache(page, 'memos'), a.memos);
    await page.getByRole('button', { name: '关闭数据备份', exact: true }).click();
    await expect(page.getByRole('textbox', { name: '备忘正文', exact: true })).toHaveValue('必须保留的未保存内容');
    await page.getByRole('textbox', { name: '备忘正文', exact: true }).press('Control+s');
    await expect(page.getByText(/已提交保存。同步进度见页面上方。/)).toBeVisible();
    await open(page); await upload(page, 'memos', b.memos);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const box = await page.getByRole('dialog').boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width);
      assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollWidth > el.clientWidth), false);
      await page.screenshot({ path: `test-results/tool-backup-${width}.png` });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    console.log('PASS memo draft protection; narrow dialog and keyboard dismissal');

    await page.goto(origin + '/pomodoro', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '开始专注', exact: true }).click();
    await expect(page.getByRole('button', { name: '暂停一下', exact: true })).toBeVisible();
    await open(page);
    const timerBackup = await download(page, 'pomodoro');
    assert.equal(timerBackup.active.running, false);
    assert.equal(timerBackup.active.deadline, null);
    assert.equal((await cache(page, 'pomodoro')).active.running, true);
    await upload(page, 'pomodoro', b.pomodoro);
    await page.getByRole('radio', { name: /替换当前数据/ }).check();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('结束或重置');
    await expect(page.getByRole('button', { name: '确认导入', exact: true })).toBeDisabled();
    await page.getByRole('radio', { name: /合并记录/ }).check(); await confirm(page);
    assert.equal((await cache(page, 'pomodoro')).active.running, true);
    const restored = await browser.newContext();
    const restorePage = await restored.newPage();
    await restorePage.goto(origin + '/pomodoro', { waitUntil: 'networkidle' });
    await open(restorePage); await upload(restorePage, 'pomodoro', timerBackup);
    await restorePage.getByRole('radio', { name: /替换当前数据/ }).check();
    await restorePage.getByRole('checkbox', { name: /我确认覆盖/ }).check(); await confirm(restorePage);
    await restorePage.getByRole('button', { name: '关闭数据备份', exact: true }).click();
    await expect(restorePage.getByRole('button', { name: '继续专注', exact: true })).toBeVisible();
    console.log('PASS timer: export does not pause live timer; backup resumes paused; active timer replacement blocked; merge preserves timer');

    // A stale replacement must fail without a partial write, including the LAN fallback.
    for (const fallback of [false, true]) {
      const c = await browser.newContext();
      if (fallback) await c.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined }));
      const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
      await p.goto(origin + '/todos', { waitUntil: 'networkidle' });
      await seed(p, 'todos', a.todos);
      await open(p); await upload(p, 'todos', b.todos);
      await p.getByRole('radio', { name: /替换当前数据/ }).check();
      await p.getByRole('checkbox', { name: /我确认覆盖/ }).check();
      const newer = { ...a.todos, tasks: [{ ...a.todos.tasks[0], title: '其他页面刚更新' }] };
      await seed(p, 'todos', newer);
      await p.getByRole('button', { name: '确认导入', exact: true }).click();
      await expect(p.getByRole('dialog').getByRole('alert')).toContainText('刚有更新');
      await expect(p.getByRole('button', { name: '关闭数据备份', exact: true })).toBeEnabled();
      assert.deepEqual(await cache(p, 'todos'), newer);
      await p.getByRole('button', { name: '重新核对当前数据', exact: true }).click();
      await p.getByRole('checkbox', { name: /我确认覆盖/ }).check(); await confirm(p);
      assert.deepEqual(await cache(p, 'todos'), b.todos);
      await c.close();
    }
    console.log('PASS stale replacement rejection and retry, with and without Web Locks');

    const account = await browser.newContext();
    await register(account, `backup_${Date.now().toString(36)}`);
    const signed = await account.newPage();
    await signed.goto(origin + '/todos', { waitUntil: 'networkidle' });
    await open(signed); await upload(signed, 'todos', b.todos);
    await signed.getByRole('radio', { name: /替换当前数据/ }).check();
    await signed.getByRole('checkbox', { name: /我确认覆盖/ }).check(); await confirm(signed);
    await expect.poll(async () => (await (await account.request.get(origin + '/api/personal-tools/todos')).json()).data).toEqual(b.todos);
    const other = await browser.newContext();
    await register(other, `backup_other_${Date.now().toString(36)}`);
    assert.equal((await (await other.request.get(origin + '/api/personal-tools/todos')).json()).data, null);
    assert.deepEqual(errors, []);
    console.log('PASS imported records persist to the logged-in account, other accounts remain isolated; no browser errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
