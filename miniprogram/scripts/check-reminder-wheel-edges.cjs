const schedule = require('./todo-schedule-test-helpers.cjs');
module.exports = async function checkReminderWheelEdges({ page, origin, expect }) {
  const edge = await page.context().browser().newPage({ viewport: page.viewportSize(), timezoneId: 'America/New_York', reducedMotion: 'reduce' });
  const button = name => edge.getByRole('button', { name, exact: true });
  const select = name => edge.getByLabel(name, { exact: true });
  const lead = () => edge.locator('.todo-schedule-reminder-lead');
  try {
    await edge.clock.setFixedTime(new Date('2026-10-22T12:00:00Z'));
    await edge.goto(`${origin}/?reminder-wheel-edges#/pages/posts/index`);
    await edge.evaluate(() => {
      const stamp = new Date().toISOString(), base = { description: '', categoryId: '', important: true, urgent: true, completedAt: null, createdAt: stamp, updatedAt: stamp, tags: [], subtasks: [], nextTasks: [] };
      window.__miniFixture.guestToolStates = { todos: { version: 1, categories: [], tasks: [
        { ...base, id: 'dst-repeat', title: '重复小时', dueDate: '2028-11-05', dueTime: '02:30', reminderAt: '2028-11-05T06:30:00.000Z' },
        { ...base, id: 'dst-gap', title: '不存在的时间', dueDate: '2028-03-12', dueTime: '03:30', reminderAt: '2028-03-12T06:30:00.000Z' },
        { ...base, id: 'no-due', title: '缺少任务时间', dueDate: '' },
      ] } };
      location.hash = '#/pages/todos/index';
    });
    await button('编辑任务：重复小时').click(); await schedule.openSchedule(edge, expect); await schedule.openSection(edge, '设置提醒');
    await expect(lead()).toHaveText('提前1小时提醒');
    await select('提醒分钟').selectOption('31'); await expect(lead()).toHaveText('提前1小时59分钟提醒');
    await select('提醒分钟').selectOption('30'); await expect(lead()).toHaveText('提前1小时提醒');
    await schedule.confirmSchedule(edge, expect);
    await edge.getByPlaceholder('准备做什么？').fill('重复小时已核对');
    await edge.locator('.todo-sheet:not(.entry-composer)').getByRole('button', { name: '保存', exact: true }).click();
    await expect.poll(() => edge.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:todos')).data.tasks.find(task => task.id === 'dst-repeat').reminderAt)).toBe('2028-11-05T06:30:00.000Z');
    await button('编辑任务：不存在的时间').click(); await schedule.openSchedule(edge, expect); await schedule.openSection(edge, '设置提醒');
    await select('提醒小时').selectOption('02');
    await expect(edge.locator('.todo-schedule-reminder-popover [role="alert"]')).toBeVisible();
    await expect(select('提醒小时')).toHaveValue('01'); await expect(lead()).toHaveText('提前1小时提醒');
    await button('关闭提醒设置').click(); await button('关闭日期设置').click(); await button('关闭编辑').click();
    await button('编辑任务：缺少任务时间').click(); await schedule.openSchedule(edge, expect); await schedule.openSection(edge, '设置提醒');
    await expect(lead()).toContainText('请先设置任务日期和时间'); await expect(button('设置任务时间')).toBeVisible();
    await button('提醒下一年').click(); await button('完成提醒设置').click(); await schedule.confirmSchedule(edge, expect);
    await edge.locator('.todo-sheet:not(.entry-composer)').getByRole('button', { name: '保存', exact: true }).click();
    const saved = await edge.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:todos')).data.tasks.find(task => task.id === 'no-due'));
    expect(saved.dueDate).toBe(''); expect(saved.dueTime).toBeUndefined(); expect(saved.reminderAt).toBeTruthy();
  } finally { await edge.close(); }
};
