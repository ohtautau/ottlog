const path = require('node:path');

module.exports = async function checkTodoSaveClose({ page, origin, out, width, expect }) {
  await page.addInitScript(() => {
    let fixture;
    Object.defineProperty(window, '__miniFixture', { configurable: true, get: () => fixture, set: value => {
      fixture = value;
      if (location.search.startsWith('?todo-save-close-')) fixture.persistEntryTools = true;
    } });
  });
  await page.goto(`${origin}/?todo-save-close-${width}#/pages/posts/index`);
  const original = await page.evaluate(() => {
    const base = { description: '保留备注与原编号', categoryId: '', important: false, urgent: false, dueDate: '', completedAt: null,
      createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', tags: ['生活'], nextTasks: [] };
    const data = { version: 1, categories: [], tasks: [
      { ...base, id: 'plain-save', title: '普通保存任务' },
      { ...base, id: 'reminder-save', title: '带提醒保存任务', dueDate: '2099-01-02', dueTime: '10:00', reminderAt: '2099-01-02T01:45:00.000Z' },
    ] };
    localStorage.clear();
    window.__miniFixture.guestToolStates = { todos: data };
    location.hash = '#/pages/todos/index';
    return data;
  });
  const editor = () => page.locator('.todo-sheet');
  const title = () => editor().getByPlaceholder('准备做什么？');
  const save = () => editor().getByRole('button', { name: '保存', exact: true }).click();
  const open = label => page.getByRole('button', { name: `编辑任务：${label}`, exact: true }).click();
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:todos')).data);
  for (const task of original.tasks) {
    await open(task.title);
    await save();
    await expect(editor(), 'Saving an unchanged task closes even with a reminder').toHaveCount(0);
    await open(task.title);
    const updatedTitle = `${task.title}已修改`;
    await title().fill(updatedTitle);
    await save();
    await expect(editor(), 'Saving changed text returns to the task list').toHaveCount(0);
    const stored = (await read()).tasks.find(item => item.id === task.id);
    expect(stored).toMatchObject({ ...task, title: updatedTitle, updatedAt: stored.updatedAt });
    await open(updatedTitle);
    await expect(title()).toHaveValue(updatedTitle);
    await editor().getByRole('button', { name: '关闭编辑', exact: true }).click();
    await expect(editor()).toHaveCount(0);
  }
  await open('带提醒保存任务已修改');
  const beforeFailure = await read();
  await title().fill('提醒任务失败后重试');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['todos']; });
  await save();
  await expect(page.locator('.operation-toast')).toContainText('本机存储不可用');
  await expect(editor()).toBeVisible();
  await expect(title()).toHaveValue('提醒任务失败后重试');
  expect(await read(), 'Failed storage must not close or overwrite the persisted record').toEqual(beforeFailure);
  await page.screenshot({ path: path.join(out, `todo-save-failure-${width}.png`) });
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await save();
  await expect(editor()).toHaveCount(0);
  const retried = await read();
  expect(retried.tasks).toHaveLength(2);
  expect(retried.tasks.find(task => task.id === 'reminder-save')).toMatchObject({ title: '提醒任务失败后重试', reminderAt: original.tasks[1].reminderAt });
  expect(retried.tasks.find(task => task.id === 'plain-save')).toEqual(beforeFailure.tasks.find(task => task.id === 'plain-save'));

  await open('提醒任务失败后重试');
  await title().fill('通过未保存提示保存');
  await editor().getByRole('button', { name: '关闭编辑', exact: true }).click();
  await page.getByRole('dialog', { name: '保存修改？', exact: true }).getByRole('button', { name: '保存', exact: true }).click();
  await expect(editor()).toHaveCount(0);
  await page.reload();
  await open('通过未保存提示保存');
  await expect(title()).toHaveValue('通过未保存提示保存');
  expect((await read()).tasks.find(task => task.id === 'reminder-save').reminderAt).toBe(original.tasks[1].reminderAt);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path === '/wechat/reminders' && request.method === 'POST'))).toHaveLength(0);
  await editor().getByRole('button', { name: '关闭编辑', exact: true }).click();
  await page.screenshot({ path: path.join(out, `todo-save-closed-${width}.png`) });
};
