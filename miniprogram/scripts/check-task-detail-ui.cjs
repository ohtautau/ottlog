const path = require('node:path');

// Shared production pages with a disposable account and local API/storage.
// Browser rendering is not certification of the native WeChat runtime.
module.exports = async function checkTaskDetail({ page, origin, out, width, expect }) {
  const owner = 'task-detail-fixture', stamp = '2026-11-03T00:00:00.000Z';
  const original = { id: 'task-detail-original', title: '原任务', description: '', categoryId: '', important: true, urgent: true, dueDate: '', completedAt: null, createdAt: stamp, updatedAt: stamp, tags: [], subtasks: [], nextTasks: [] };
  const state = { version: 1, tasks: [original], categories: [] };
  await page.goto(`${origin}/?task-detail-${width}#/pages/posts/index`);
  await page.evaluate(({ state, owner }) => {
    localStorage.clear();
    localStorage.setItem(`ottlog-mini-tool-v1:reader:${owner}:todos`, JSON.stringify({ data: state, pending: false, revision: 0 }));
  }, { state, owner });
  await page.reload();
  await page.evaluate(({ state, owner }) => {
    window.__miniFixture.sessionProfile = { authenticated: true, userName: owner, isAdmin: false };
    window.__miniFixture.accountToolStates = { [owner]: { todos: state } };
    location.hash = '#/pages/todos/index';
  }, { state, owner });
  const data = () => page.evaluate(owner => window.__miniPreviewControl.readStorage(`ottlog-mini-tool-v1:reader:${owner}:todos`)?.data, owner);
  const panel = () => page.locator('.task-detail-panel');
  const title = () => panel().getByRole('textbox', { name: '任务名称', exact: true });
  const button = name => page.getByRole('button', { name, exact: true });
  const close = async () => { await page.locator('.task-detail-overlay > .sheet-backdrop').click({ position: { x: 4, y: 4 } }); await expect(panel()).toHaveCount(0); };
  const open = async text => { await page.locator('.todo-task').filter({ hasText: text }).first().locator('.todo-task-content').click(); await expect(title()).toBeEnabled(); };
  await expect(button('编辑任务：原任务')).toBeVisible();
  await page.locator('.floating-create-button').click(); await expect(title()).toBeEnabled();
  await expect(panel().getByRole('button', { name: /^(保存|创建任务|关闭编辑|关闭任务)$/ })).toHaveCount(0);
  await expect(panel().getByText('暂无内容', { exact: true })).toHaveCount(0);
  await expect(panel().getByText('备注', { exact: true })).toBeVisible();
  await expect(panel().locator('.memo-editor-toolbar')).toBeHidden();
  await expect(button('更多任务操作')).toBeVisible();
  await expect(panel().getByRole('button', { name: '任务标签', exact: true })).toBeVisible();
  await expect(panel().getByRole('button', { name: '任务附件', exact: true })).toBeVisible();
  await title().fill('自动保存的新任务');
  await expect.poll(async () => (await data()).tasks.some(task => task.title === '自动保存的新任务')).toBe(true);
  const createdId = (await data()).tasks.find(task => task.title === '自动保存的新任务').id;
  await close();

  await open('自动保存的新任务');
  await title().fill('关闭前最后输入'); await close();
  expect((await data()).tasks.find(task => task.id === createdId).title).toBe('关闭前最后输入');
  await open('关闭前最后输入');
  await panel().getByText('备注', { exact: true }).click();
  await panel().getByRole('textbox', { name: '任务备注', exact: true }).fill('自动保存的完整备注');
  await expect.poll(async () => (await data()).tasks.find(task => task.id === createdId).description).toBe('自动保存的完整备注');
  await panel().getByRole('button', { name: '添加子任务', exact: true }).click();
  const child = () => panel().getByRole('textbox', { name: '子任务 1', exact: true });
  await expect(child()).toBeEnabled(); await child().fill('第一项检查'); await child().focus();
  const childStyle = await child().evaluate(node => { const s = getComputedStyle(node); return { outline: s.outlineStyle, shadow: s.boxShadow, border: s.borderTopWidth, background: s.backgroundColor }; });
  expect(childStyle).toMatchObject({ outline: 'none', shadow: 'none', border: '0px', background: 'rgba(0, 0, 0, 0)' });
  await expect.poll(async () => (await data()).tasks.find(task => task.id === createdId).subtasks?.[0]?.title).toBe('第一项检查');
  await panel().getByRole('button', { name: '完成子任务 1', exact: true }).click();
  await expect.poll(async () => (await data()).tasks.find(task => task.id === createdId).subtasks?.[0]?.completed).toBe(true);
  await page.screenshot({ path: path.join(out, `task-detail-checklist-${width}.png`) });

  await button('主要标签').click(); await button('新建任务标签').click();
  await page.getByRole('textbox', { name: '任务标签名称', exact: true }).fill('娱乐');
  await button('选择任务标签图标').click(); await button('选择图标：游戏').click();
  await button('完成标签编辑').click();
  await expect(page.getByRole('dialog', { name: '新建任务标签', exact: true })).toHaveCount(0);
  await expect.poll(async () => (await data()).tagStyles?.娱乐?.iconId).toBe('game');
  await expect.poll(async () => (await data()).tasks.find(task => task.id === createdId).primaryTag).toBe('娱乐');
  await button('主要标签').click(); await button('编辑标签：娱乐').click();
  await page.getByRole('textbox', { name: '任务标签名称', exact: true }).fill('娱乐活动');
  await button('完成标签编辑').click();
  await expect.poll(async () => (await data()).tasks.find(item => item.id === createdId)?.primaryTag).toBe('娱乐活动');
  await close();
  await button('更换无优先级区域显示').click(); await button('显示标签：娱乐活动').click();
  await expect.poll(async () => (await data()).panelSources?.later).toEqual({ kind: 'tag', tag: '娱乐活动' });
  await expect(page.locator('#todo-zone-later .todo-quadrant-title')).toHaveText('娱乐活动');
  await expect(page.locator('#todo-zone-later .todo-task').filter({ hasText: '关闭前最后输入' })).toHaveCount(1);

  await open('关闭前最后输入');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['todos']; });
  await title().fill('失败后保留输入');
  await expect(panel().locator('.task-detail-save-state.is-error')).toBeVisible();
  await page.locator('.task-detail-overlay > .sheet-backdrop').click({ position: { x: 4, y: 4 } });
  await expect(panel()).toBeVisible(); await expect(title()).toHaveValue('失败后保留输入');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await panel().getByRole('button', { name: '重试', exact: true }).click();
  await expect.poll(async () => (await data()).tasks.find(task => task.id === createdId).title).toBe('失败后保留输入');
  await close();
  expect((await data()).tasks.filter(task => task.id === createdId)).toHaveLength(1);
  expect((await data()).tasks.find(task => task.id === original.id)).toEqual(original);
  await button('完成：原任务').click(); await expect(page.locator('.operation-toast')).toContainText('已完成：原任务');
  await button('撤销最近一次操作').click(); await expect(button('完成：原任务')).toBeVisible();
  await page.locator('.floating-create-button').click(); await expect(title()).toBeEnabled(); await close();
  expect((await data()).tasks).toHaveLength(2);
  const geometry = await page.locator('.todo-page').evaluate(node => ({ overflow: node.scrollWidth - node.clientWidth }));
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: path.join(out, `task-detail-panels-${width}.png`) });
  console.log(`PASS task detail ${width}: autosave/close, checklist, primary tags/icons/panel source, retry same ID and original data retained.`);
};
