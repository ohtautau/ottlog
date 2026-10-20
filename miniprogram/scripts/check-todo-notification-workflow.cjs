/* Exercise real task UI against the browser's isolated WeChat/API mocks only. */
const path = require('node:path');
const schedule = require('./todo-schedule-test-helpers.cjs');

module.exports = async function checkTodoNotificationWorkflow({ page, origin, out, width, expect }) {
  // A query change makes a new document, resetting module storage and login state.
  await page.goto(`${origin}/?reminder-workflow#/pages/favorites/index`);
  await page.getByPlaceholder('输入博客账号').fill('preview-reader');
  await page.getByPlaceholder('输入密码', { exact: true }).fill('fixture-only-password');
  await page.getByRole('button', { name: '登录并同步', exact: true }).click();
  await expect(page.locator('.account-user-name')).toHaveText('preview-reader');
  const tomorrow = await page.evaluate(() => {
    const date = new Date(); date.setDate(date.getDate() + 1);
    window.__miniFixture.reminderConfig = { enabled: true, templateId: 'preview-template', requiresSubscription: true };
    location.hash = '#/pages/todos/index';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const scheduledPosts = () => page.evaluate(() => window.__miniRequests.filter(request => request.path === '/wechat/reminders' && request.method === 'POST'));
  const cancellations = () => page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/wechat/reminders/') && request.method === 'DELETE'));
  const authorize = () => schedule.sheet(page).getByRole('button', { name: /^(开启微信提醒|微信提醒已开启)$/, exact: true });
  const title = `明天的微信提醒 ${width}`;
  await expect(page.locator('.todo-task')).toHaveCount(6);
  await page.locator('.todo-quadrant-later .todo-quadrant-add').click();
  await page.getByPlaceholder('准备做什么？').fill(title);
  await schedule.openSchedule(page, expect);
  await schedule.selectDate(page, tomorrow);
  await schedule.setTime(page, 10, 0);
  await schedule.setCustomReminder(page, tomorrow, 9, 45);
  await expect(authorize()).toBeDisabled();
  await expect(authorize()).toHaveText('保存后开启');
  await schedule.checkScheduleLayout(page, expect, `${width} notification controls`);
  await schedule.confirmSchedule(page, expect);
  expect(await scheduledPosts()).toHaveLength(0);
  await expect(page.locator('.todo-task')).toHaveCount(6);
  await page.locator('.entry-composer').getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page).toHaveURL(/#\/pages\/todos\/index$/);
  await expect(page.locator('.todo-sheet')).toHaveCount(0);
  await page.getByRole('button', { name: `编辑任务：${title}`, exact: true }).click();
  await expect(page.locator('.todo-sheet-title')).toHaveText('编辑任务');
  await schedule.openSchedule(page, expect);
  await schedule.openSection(page, '设置提醒');
  await expect(authorize()).toBeEnabled();
  await expect(authorize()).toHaveText('开启');
  expect(await scheduledPosts()).toHaveLength(0);

  // Saving a date is intent only. The explicit button owns the subscription request.
  await authorize().click();
  await expect(authorize()).toHaveText('已开启');
  await expect(authorize()).toBeDisabled();
  await expect(schedule.sheet(page)).toContainText('已开启');
  const posts = await scheduledPosts();
  expect(posts).toHaveLength(1);
  expect(posts[0].data.subscriptionGranted).toBe(true);
  const { taskId, remindAt } = posts[0].data;
  const bindingCalls = await page.evaluate(() => window.__miniRequests.filter(request => request.path === '/wechat/reminders/bind' && request.method === 'POST'));
  expect(bindingCalls).toHaveLength(1);
  expect(bindingCalls[0].data).toEqual({ code: 'preview-wechat-code' });
  const pendingReminder = [{ taskId, remindAt, status: 'pending', errorCode: null }];
  expect(await page.evaluate(() => window.__miniFixture.scheduledReminders)).toEqual(pendingReminder);
  const saved = await page.evaluate(id => window.__miniFixture.todoLocalState.tasks.find(task => task.id === id), taskId);
  expect(saved.dueDate).toBe(tomorrow);
  expect(saved.dueTime).toBe('10:00');
  expect(saved.reminderAt).toBe(remindAt);
  await page.screenshot({ path: path.join(out, `todos-reminder-pending-${width}.png`), fullPage: true });

  // Clearing/changing the nested editor and closing it is not a task save and
  // must leave the server's already authorised reminder intact.
  await schedule.closeSchedule(page, expect);
  const savedSummary = await page.locator('.todo-schedule-trigger').textContent();
  await schedule.openSchedule(page, expect);
  await schedule.button(page, '清除日期设置').click();
  await expect(schedule.sheet(page)).toBeVisible();
  expect(await cancellations()).toHaveLength(0);
  await schedule.closeSchedule(page, expect);
  await expect(page.locator('.todo-schedule-trigger')).toHaveText(savedSummary);
  expect(await page.evaluate(() => window.__miniFixture.scheduledReminders)).toEqual(pendingReminder);
  await schedule.openSchedule(page, expect);
  await schedule.openSection(page, '设置提醒');
  await expect(authorize()).toHaveText('已开启');
  await schedule.button(page, '提前1小时').click();
  await expect(authorize()).toBeDisabled();
  expect(await scheduledPosts()).toHaveLength(1);
  expect(await cancellations()).toHaveLength(0);
  await schedule.closeSchedule(page, expect);
  await expect(page.locator('.todo-schedule-trigger')).toHaveText(savedSummary);
  expect(await page.evaluate(() => window.__miniFixture.scheduledReminders)).toEqual(pendingReminder);

  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await expect(page.locator('.todo-sheet')).toHaveCount(0);
  await page.getByRole('button', { name: `完成：${title}`, exact: true }).click();
  await expect.poll(() => page.evaluate(id => window.__miniRequests.some(request => request.path === `/wechat/reminders/${id}` && request.method === 'DELETE'), taskId)).toBe(true);
  const cancellation = await page.evaluate(id => window.__miniRequests.find(request => request.path === `/wechat/reminders/${id}` && request.method === 'DELETE'), taskId);
  expect(new URLSearchParams(cancellation.query).get('expectedRemindAt')).toBe(remindAt);
  await expect.poll(() => page.evaluate(() => window.__miniFixture.scheduledReminders)).toEqual([]);
  await expect.poll(() => page.evaluate(id => {
    const saves = window.__miniRequests.filter(request => request.path === '/personal-tools/todos' && request.method === 'PUT');
    return !!saves.at(-1)?.data?.data?.tasks?.find(task => task.id === id)?.completedAt;
  }, taskId)).toBe(true);
  await expect(page.locator('.todo-task:not(.is-done)')).toHaveCount(6);

  // Refusing a second reminder must preserve the task without calling bind or POST.
  await page.evaluate(() => { window.__miniFixture.subscriptionResult = 'reject'; });
  await page.locator('.todo-quadrant-later .todo-quadrant-add').click();
  await page.getByPlaceholder('准备做什么？').fill('拒绝订阅也能保留任务');
  await schedule.openSchedule(page, expect);
  await schedule.selectDate(page, tomorrow);
  await schedule.setCustomReminder(page, tomorrow);
  await schedule.confirmSchedule(page, expect);
  await page.locator('.entry-composer').getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page.locator('.todo-sheet')).toHaveCount(0);
  await page.getByRole('button', { name: '编辑任务：拒绝订阅也能保留任务', exact: true }).click();
  await schedule.openSchedule(page, expect);
  await schedule.openSection(page, '设置提醒');
  await expect(authorize()).toBeEnabled();
  await authorize().click();
  await expect(page.locator('.app-message')).toContainText(/未同意|未开启|没有同意|取消|拒绝/);
  await expect(authorize()).toBeEnabled();
  await expect(authorize()).toHaveText('开启');
  expect(await scheduledPosts()).toHaveLength(1);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path === '/wechat/reminders/bind' && request.method === 'POST'))).toHaveLength(1);
  await schedule.closeSchedule(page, expect);
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await expect(page.locator('.todo-task:not(.is-done) .todo-task-title').filter({ hasText: '拒绝订阅也能保留任务' })).toHaveText('拒绝订阅也能保留任务');
  await page.screenshot({ path: path.join(out, `todos-reminder-cancelled-${width}.png`), fullPage: true });
};
