const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { fixtures, createToolBackup, parseToolBackup, validateToolData } = require('./tool-backup-fixtures.cjs');
const { origin } = JSON.parse(fs.readFileSync('test-results/productivity-runtime.json', 'utf8'));
if (new URL(origin).port === '3000') throw Error('Use isolated preview');
const old = fixtures().todos;
assert.deepEqual(parseToolBackup(JSON.stringify(createToolBackup('todos', old)), 'todos').data, old);
const next = structuredClone(old); next.tasks[0].description = '长'.repeat(4000); next.tasks[0].subtasks = [{ id: 'step-b', title: '第二步', completed: true }, { id: 'step-a', title: '第一步', completed: false }];
assert.deepEqual(parseToolBackup(JSON.stringify(createToolBackup('todos', next)), 'todos').data, next);
assert.throws(() => validateToolData('todos', { ...next, tasks: [{ ...next.tasks[0], subtasks: [next.tasks[0].subtasks[0], next.tasks[0].subtasks[0]] }] }));
const base = old.tasks[0];
const state = { ...old, tasks: ['alpha', 'beta', 'gamma'].map((id, index) => ({ ...base, id, title: ['设计详情交互', '整理旅行照片', '准备下一次训练'][index], description: '## 下一步\n\n先完成一个 **小步骤**。', important: true, urgent: false })) };
(async () => {
 const browser = await chromium.launch();
 try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  await context.addInitScript(data => { if (!localStorage.getItem('ottlog-tool-v1:guest:todos')) localStorage.setItem('ottlog-tool-v1:guest:todos', JSON.stringify({ data, pending: false })); }, state);
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '/todos'); await expect(page.locator('[data-todo-id]')).toHaveCount(3);
  const card = id => page.locator(`[data-todo-id="${id}"]`);
  await card('alpha').getByRole('button', { name: '设计详情交互', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog.getByRole('heading', { name: '任务详情', exact: true })).toBeVisible();
  await dialog.getByRole('textbox', { name: '任务详情 Markdown' }).fill('## 计划\n\n今天完成 **Markdown 详情**。\n\n- [ ] 复核\n\n$x^2$');
  await expect(dialog.getByLabel('任务详情预览').locator('strong')).toHaveText('Markdown 详情');
  await expect(dialog.getByLabel('任务详情预览').locator('.katex')).toHaveCount(1);
  for (const title of ['收集资料', '写出草稿', '最后复核']) { await dialog.getByRole('textbox', { name: '新子任务' }).fill(title); await dialog.getByRole('button', { name: '添加 ＋', exact: true }).click(); }
  await dialog.getByRole('checkbox', { name: '完成子任务：收集资料' }).check();
  const childHandle = dialog.getByRole('button', { name: '拖动子任务：最后复核' }); await childHandle.scrollIntoViewIfNeeded();
  let a = await childHandle.boundingBox(), b = await dialog.locator('[data-subtask-id]').first().boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + 3, { steps: 8 }); await page.mouse.up();
  await expect(dialog.getByRole('textbox', { name: '子任务 1', exact: true })).toHaveValue('最后复核');
  await dialog.getByRole('button', { name: '下移子任务：最后复核' }).click();
  await expect(dialog.getByRole('textbox', { name: '子任务 1', exact: true })).toHaveValue('收集资料');
  await page.screenshot({ path: 'test-results/todo-detail-desktop.png' });
  await dialog.getByRole('button', { name: '保存修改' }).click(); await expect(dialog).not.toBeVisible(); await expect(card('alpha')).toContainText('1 / 3 步');
  // Pointer drag into an empty quadrant, then reorder within the original quadrant.
  async function mouseDrag(handle, destination, edge = 'middle') { await handle.scrollIntoViewIfNeeded(); const from = await handle.boundingBox(), to = await destination.boundingBox(); await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.mouse.move(to.x + to.width / 2, edge === 'top' ? to.y + 3 : to.y + to.height / 2, { steps: 10 }); await page.mouse.up(); }
  await mouseDrag(card('alpha').getByRole('button', { name: '拖动待办：设计详情交互' }), page.locator('[data-quadrant="do"] header'));
  await expect(page.locator('[data-quadrant="do"] [data-todo-id="alpha"]')).toHaveCount(1);
  const reorderHandle = card('gamma').getByRole('button', { name: '拖动待办：准备下一次训练' }); await reorderHandle.scrollIntoViewIfNeeded(); a = await reorderHandle.boundingBox(); const scroller = page.locator('[data-quadrant="plan"] [data-todo-scroll]'); b = await scroller.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + 10, { steps: 10 }); await expect.poll(() => scroller.evaluate(e => e.scrollTop)).toBe(0); b = await card('beta').boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + 5); await page.mouse.up();
  await expect(page.locator('[data-quadrant="plan"] [data-todo-id]').first()).toHaveAttribute('data-todo-id', 'gamma');
  await page.reload(); await expect(page.locator('[data-quadrant="do"] [data-todo-id="alpha"]')).toHaveCount(1); await expect(page.locator('[data-quadrant="plan"] [data-todo-id]').first()).toHaveAttribute('data-todo-id', 'gamma');
  await card('alpha').getByRole('button', { name: '设计详情交互', exact: true }).click(); await expect(dialog.getByRole('textbox', { name: '任务详情 Markdown' })).toContainText('Markdown 详情'); await expect(dialog.getByRole('textbox', { name: '子任务 2', exact: true })).toHaveValue('最后复核'); await dialog.getByRole('button', { name: '取消', exact: true }).click();
  // Keyboard-accessible quadrant movement and the unchanged calendar/statistics views.
  await card('alpha').getByRole('button', { name: '移动', exact: true }).click(); await card('alpha').getByLabel('移动设计详情交互到象限').selectOption('later'); await expect(page.locator('[data-quadrant="later"] [data-todo-id="alpha"]')).toHaveCount(1);
  await page.getByRole('button', { name: '统计', exact: true }).click(); await expect(page.getByRole('region', { name: '待办统计' })).toBeVisible(); await page.getByRole('button', { name: '日历', exact: true }).click(); await expect(page.getByRole('region', { name: /\d{4}-\d{2} 日历/ })).toBeVisible();
  await page.getByRole('button', { name: '四象限', exact: true }).click(); await page.screenshot({ path: 'test-results/todo-board-desktop.png', animations: 'disabled' });
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await touch.addInitScript(data => localStorage.setItem('ottlog-tool-v1:guest:todos', JSON.stringify({ data, pending: false })), state);
  const mobile = await touch.newPage(); await mobile.goto(origin + '/todos'); await expect(mobile.locator('[data-todo-id]')).toHaveCount(3);
  const handle = mobile.getByRole('button', { name: '拖动待办：设计详情交互' }); await handle.scrollIntoViewIfNeeded();
  a = await handle.boundingBox(); b = await mobile.locator('[data-quadrant="do"] header').boundingBox();
  const client = await touch.newCDPSession(mobile), x = a.x + a.width / 2, y = a.y + a.height / 2;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (b.x + b.width / 2 - x) * i / 8, y: y + (b.y + b.height / 2 - y) * i / 8 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await expect(mobile.locator('[data-quadrant="do"] [data-todo-id="alpha"]')).toHaveCount(1);
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.getByRole('button', { name: '设计详情交互', exact: true }).click(); await expect(mobile.getByRole('dialog')).toBeVisible(); assert(await mobile.getByRole('dialog').evaluate(e => e.scrollWidth <= e.clientWidth)); await mobile.screenshot({ path: 'test-results/todo-detail-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS legacy/new backup round trip, malformed subtask rejection, Markdown/formula preview, subtask drag + keyboard sorting, task mouse/touch quadrant drag, persisted manual ordering, detail reload, calendar/statistics and mobile overflow');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
