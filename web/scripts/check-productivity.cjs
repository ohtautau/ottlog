// Uses the isolated preview from scripts/productivity-preview.py, never the user's account database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, expect } = require('@playwright/test');
const origin = process.env.TEST_ORIGIN || JSON.parse(fs.readFileSync('test-results/productivity-runtime.json', 'utf8')).origin;
const password = 'Productivity-test-only-2026!';
const keyPath = key => `${origin}/api/personal-tools/${key}`;

async function put(context, key, data) {
  const s = await (await context.request.get(`${origin}/api/account/session`)).json();
  const r = await context.request.put(keyPath(key), { data: { data }, headers: { 'X-CSRF-TOKEN': s.csrfToken } });
  assert.equal(r.status(), 200, `PUT ${key}`);
}
async function get(context, key) { return (await (await context.request.get(keyPath(key))).json()).data; }
async function register(context, name) {
  const s = await (await context.request.get(`${origin}/api/account/session`)).json();
  const r = await context.request.post(`${origin}/api/account/register`, { data: { userName: name, password }, headers: { 'X-CSRF-TOKEN': s.csrfToken } });
  assert.equal(r.status(), 200);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Singapore' });
    const userName = `productivity_${Date.now().toString(36)}`;
    await register(context, userName);
    const stamp = '2026-09-09T07:00:00.000Z';
    await put(context, 'todos', { version: 1, categories: [{ id: 'work', name: '工作', color: '#8aafff' }], tasks: [{ id: 'linked-task', title: '写完测试文章', description: '关联专注验证', categoryId: 'work', important: true, urgent: true, dueDate: '2026-09-09', completedAt: null, createdAt: stamp, updatedAt: stamp }] });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-09-09T08:00:00Z') });
    await page.goto(`${origin}/pomodoro?task=linked-task`);
    await expect(page.locator('select').first()).toHaveValue('linked-task');
    await page.getByText('调整我的节奏', { exact: false }).first().click();
    await page.locator('input[name="focus"]').fill('1');
    await page.locator('input[name="shortBreak"]').fill('1');
    await page.getByRole('button', { name: '保存设置', exact: true }).click();
    await expect(page.getByRole('timer')).toHaveText('01:00');
    await page.getByRole('button', { name: '开始专注', exact: true }).click();
    await expect.poll(async () => (await get(context, 'pomodoro'))?.active?.running).toBe(true);
    await page.clock.fastForward(11000);
    await page.getByRole('button', { name: '暂停一下', exact: true }).click();
    const paused = await page.getByRole('timer').innerText();
    await page.clock.fastForward(20000);
    await expect(page.getByRole('timer')).toHaveText(paused);
    await page.reload();
    await expect(page.getByRole('button', { name: '继续专注', exact: true })).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText(paused);
    await page.getByRole('button', { name: '继续专注', exact: true }).click();
    await page.clock.fastForward(65000);
    await expect(page.getByRole('button', { name: '开始短休息', exact: true })).toBeVisible();
    await expect.poll(async () => (await get(context, 'pomodoro'))?.sessions?.length).toBe(1);
    let state = await get(context, 'pomodoro');
    assert.equal(state.sessions[0].durationSeconds, 60);
    assert.equal(state.sessions[0].taskId, 'linked-task');
    assert.equal(state.sessions[0].title, '写完测试文章');
    assert(Date.parse(state.sessions[0].endedAt) - Date.parse(state.sessions[0].startedAt) >= 80000);
    await page.reload();
    await expect(page.getByRole('button', { name: '开始短休息', exact: true })).toBeVisible();
    assert.equal((await get(context, 'pomodoro')).sessions.length, 1);
    await page.getByRole('button', { name: '开始短休息', exact: true }).click();
    await page.clock.fastForward(65000);
    await expect(page.getByRole('button', { name: '开始专注', exact: true })).toBeVisible();
    await expect.poll(async () => (await get(context, 'pomodoro'))?.sessions?.length).toBe(2);
    state = await get(context, 'pomodoro');
    assert.equal(state.sessions.filter(s => s.mode === 'focus').reduce((sum, s) => sum + s.durationSeconds, 0), 60);
    await page.getByRole('button', { name: '开始专注', exact: true }).click();
    await page.clock.fastForward(12000);
    await page.getByRole('button', { name: '提前结束 · 记录', exact: true }).click();
    await expect.poll(async () => (await get(context, 'pomodoro'))?.sessions?.length).toBe(3);
    state = await get(context, 'pomodoro');
    const early = state.sessions.find(s => !s.completed);
    assert(early.durationSeconds >= 12 && early.durationSeconds < 20);
    await page.getByRole('button', { name: '开始专注', exact: true }).click();
    await page.getByRole('button', { name: '重置本轮', exact: true }).click();
    await page.getByRole('button', { name: '确定重置', exact: true }).click();
    await expect.poll(async () => (await get(context, 'pomodoro'))?.active).toBe(null);
    assert.equal((await get(context, 'pomodoro')).sessions.length, 3);
    await page.getByRole('button', { name: /2026-09-09，2 次专注/ }).click();
    await expect(page.locator('ol li')).toHaveCount(2);
    await page.getByRole('button', { name: '上个月', exact: true }).click();
    await expect(page.locator('section[aria-label="2026-08 日历"]')).toBeVisible();
    console.log('PASS linked pomodoro: settings, pause/resume, reload, exact elapsed, once-only finish, breaks, early finish, reset, calendar');

    // Same-account tab synchronization: task changes reach an already-open task picker.
    const todoPage = await context.newPage();
    await todoPage.goto(`${origin}/todos`);
    await expect(todoPage.getByText('写完测试文章', { exact: true }).first()).toBeVisible();
    const oldTodos = await get(context, 'todos');
    const renamed = { ...oldTodos, tasks: oldTodos.tasks.map(t => ({ ...t, title: '跨页更新后的待办' })) };
    await todoPage.evaluate(({ userName, renamed }) => {
      localStorage.setItem(`ottlog-tool-v1:reader:${userName}:todos`, JSON.stringify({ data: renamed, pending: true }));
      window.dispatchEvent(new CustomEvent('ottlog-tool-cache', { detail: `ottlog-tool-v1:reader:${userName}:todos` }));
    }, { userName, renamed });
    await expect(page.locator('select').first()).toContainText('跨页更新后的待办');
    await expect.poll(async () => (await get(context, 'todos'))?.tasks?.[0]?.title).toBe('跨页更新后的待办');
    let captured, release;
    const readCaptured = new Promise(resolve => { captured = resolve; });
    const delayedRead = new Promise(resolve => { release = resolve; });
    const slowPage = await context.newPage();
    await slowPage.route('**/api/personal-tools/todos', async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      const stale = await response.json();
      captured(); await delayedRead;
      await route.fulfill({ json: stale });
    });
    await slowPage.goto(`${origin}/todos`);
    await readCaptured;
    const newer = { ...renamed, tasks: renamed.tasks.map(t => ({ ...t, title: '新修改不能被旧请求覆盖' })) };
    await todoPage.evaluate(({ userName, newer }) => {
      const key = `ottlog-tool-v1:reader:${userName}:todos`;
      localStorage.setItem(key, JSON.stringify({ data: newer, pending: true }));
      window.dispatchEvent(new CustomEvent('ottlog-tool-cache', { detail: key }));
    }, { userName, newer });
    await expect.poll(async () => (await get(context, 'todos'))?.tasks?.[0]?.title).toBe('新修改不能被旧请求覆盖');
    release();
    await expect(slowPage.getByText('新修改不能被旧请求覆盖', { exact: true }).first()).toBeVisible();
    await expect(page.locator('select').first()).toContainText('新修改不能被旧请求覆盖');
    await slowPage.close();
    console.log('PASS delayed GET cannot roll back a newer saved edit');

    const memos = await context.newPage();
    memos.setDefaultTimeout(12000);
    memos.on('pageerror', error => errors.push(error.message));
    await memos.goto(`${origin}/memos`);
    await memos.getByRole('button', { name: '写一条备忘', exact: true }).click();
    await memos.getByRole('textbox', { name: '备忘标题', exact: true }).fill('第一条灵感');
    await memos.getByRole('textbox', { name: '备忘正文', exact: true }).fill('## 计划\n\n**先完成一小步**\n\n$x^2$');
    await memos.reload();
    await expect(memos.getByRole('textbox', { name: '备忘正文', exact: true })).toHaveValue('## 计划\n\n**先完成一小步**\n\n$x^2$');
    await memos.getByRole('textbox', { name: '新标签', exact: true }).fill('灵感');
    await memos.getByRole('textbox', { name: '新标签', exact: true }).press('Enter');
    await memos.getByRole('button', { name: '鼠尾草纸页', exact: true }).click();
    await memos.getByRole('button', { name: '↟ 置顶', exact: true }).click();
    await memos.getByRole('textbox', { name: '备忘正文', exact: true }).press('Control+s');
    await expect.poll(async () => (await get(context, 'memos'))?.notes?.length).toBe(1);
    let memoState = await get(context, 'memos');
    assert.equal(memoState.notes[0].pinned, true);
    assert.deepEqual(memoState.notes[0].tags, ['灵感']);
    assert.equal(memoState.notes[0].color, 'sage');
    await expect(memos.locator('.katex')).toHaveCount(1);
    await memos.reload();
    await expect(memos.getByRole('textbox', { name: '备忘标题', exact: true })).toHaveValue('第一条灵感');
    await memos.getByRole('button', { name: '删除备忘', exact: true }).click();
    await expect.poll(async () => (await get(context, 'memos'))?.notes?.length).toBe(0);
    await memos.getByRole('button', { name: /撤销/ }).click();
    await expect.poll(async () => (await get(context, 'memos'))?.notes?.length).toBe(1);
    // Markdown must not execute HTML scripts.
    await memos.getByRole('button', { name: /第一条灵感/ }).click();
    await memos.getByRole('textbox', { name: '备忘正文', exact: true }).fill('<script>window.memoUnsafe = true</script>\n\n保留文字');
    assert.equal(await memos.evaluate(() => window.memoUnsafe), undefined);
    console.log('PASS memos: local draft recovery, Markdown/math, keyboard save, pin/color/tags, cloud persistence, delete/undo, HTML safety');

    for (const candidate of [page, memos]) for (const width of [320, 390, 768, 1440]) {
      await candidate.setViewportSize({ width, height: 900 });
      assert(!(await candidate.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `Overflow: ${candidate.url()} at ${width}`);
    }
    const other = await browser.newContext();
    await register(other, `other_${Date.now().toString(36)}`);
    for (const key of ['todos', 'pomodoro', 'memos']) assert.equal(await get(other, key), null);
    const guest = await browser.newContext();
    for (const key of ['todos', 'pomodoro', 'memos']) assert.equal((await guest.request.get(keyPath(key))).status(), 401);
    assert.deepEqual(errors, []);
    console.log('PASS storage isolation, cross-tab updates, narrow/mobile/tablet/desktop layouts');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
