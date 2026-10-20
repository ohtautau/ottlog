/* Boundary regressions use a separate document and guest fixtures, so the
   standard task editor and authenticated reminder workflows stay independent. */
const path = require('node:path');
const schedule = require('./todo-schedule-test-helpers.cjs');

module.exports = async function checkTodoScheduleEditor({ page, origin, out, width, expect }) {
  // A separate clock/page proves "next week" keeps the weekday across year/month
  // boundaries without changing time for the existing reminder workflows.
  const quickPage = await page.context().browser().newPage({ viewport: page.viewportSize(), reducedMotion: 'reduce' });
  try {
    for (const [today, nextWeek] of [['2026-12-27', '2027-01-03'], ['2024-02-28', '2024-03-06']]) {
      await quickPage.clock.setFixedTime(new Date(`${today}T12:00:00`));
      await quickPage.goto(`${origin}/?todo-weekday#/pages/posts/index`);
      await quickPage.evaluate(() => { window.__miniFixture.guestToolStates = { todos: { version: 1, tasks: [], categories: [] } }; location.hash = '#/pages/todos/index'; });
      await quickPage.locator('.todo-quadrant-later .todo-quadrant-add').click();
      await schedule.openSchedule(quickPage, expect);
      await schedule.button(quickPage, '选择下周').click();
      await expect(schedule.button(quickPage, `选择日期${nextWeek}`)).toHaveAttribute('aria-pressed', 'true');
      await expect(schedule.button(quickPage, '选择下周')).toHaveAttribute('aria-pressed', 'true');
      await schedule.confirmSchedule(quickPage, expect);
      await schedule.openSchedule(quickPage, expect);
      await expect(schedule.button(quickPage, `选择日期${nextWeek}`)).toHaveAttribute('aria-pressed', 'true');
      await expect(schedule.button(quickPage, '选择下周')).toHaveAttribute('aria-pressed', 'true');
    }
  } finally { await quickPage.close(); }
  await page.goto(`${origin}/?todo-schedule-boundaries#/pages/posts/index`);
  await page.evaluate(() => {
    const stamp = new Date().toISOString();
    const base = { description: '', categoryId: '', important: true, urgent: true, completedAt: null, createdAt: stamp, updatedAt: stamp, tags: [], subtasks: [], nextTasks: [] };
    window.__miniFixture.guestToolStates = { todos: { version: 1, categories: [], tasks: [
      { ...base, id: 'schedule-month-anchor', title: '月末锚点', dueDate: '2099-02-28', recurrence: { unit: 'month', interval: 1, anchorDay: 31 } },
      { ...base, id: 'schedule-year-anchor', title: '年度闰日锚点', dueDate: '2095-02-28', recurrence: { unit: 'year', interval: 1, anchorDay: 29 } },
      { ...base, id: 'schedule-at-reminder', title: '准时提醒保持绝对时间', dueDate: '2099-01-31', dueTime: '10:00' },
      { ...base, id: 'schedule-ten-reminder', title: '提前提醒保持绝对时间', dueDate: '2099-03-01', dueTime: '00:05' },
      { ...base, id: 'schedule-invalid-date', title: '旧无效日期可以编辑', dueDate: 'legacy-date' },
      { ...base, id: 'schedule-clear-repeat', title: '重复清除验证', dueDate: '2099-10-11', dueTime: '16:30', reminderAt: new Date('2099-10-11T15:30:00').toISOString(), recurrence: { unit: 'month', interval: 2, anchorDay: 31 } },
    ] } };
    window.__miniFixture.todoLocalState = structuredClone(window.__miniFixture.guestToolStates.todos);
    location.hash = '#/pages/todos/index';
  });
  await expect(page.locator('.todo-task')).toHaveCount(6);
  const storedTask = id => page.evaluate(taskId => window.__miniFixture.todoLocalState.tasks.find(task => task.id === taskId), id);

  await page.getByRole('button', { name: '编辑任务：重复清除验证', exact: true }).click();
  const originalRepeatTask = await storedTask('schedule-clear-repeat');
  await page.evaluate(() => document.documentElement.style.setProperty('--preview-safe-area-bottom', '34px'));
  await schedule.openSchedule(page, expect);
  const repeatGeometry = () => schedule.sheet(page).locator('.todo-schedule-calendar,.todo-schedule-row,.todo-schedule-setting-clear,.todo-schedule-footer').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return [box.x, box.y, box.width, box.height]; }));
  const beforeClear = await repeatGeometry();
  const clearRepeat = () => schedule.button(page, '清除重复设置');
  await page.screenshot({ path: path.join(out, `todos-schedule-repeat-set-${width}.png`) });
  const repeatTouchLayout = await clearRepeat().evaluate(node => {
    const rect = element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
    const sheet = node.closest('.todo-schedule-sheet'), scroll = sheet.querySelector('.todo-schedule-scroll'), body = sheet.querySelector('.todo-schedule-body');
    return { touch: rect(node), row: rect(node.parentElement), scroll: rect(scroll), body: rect(body), calendar: rect(sheet.querySelector('.todo-schedule-calendar')), footer: rect(sheet.querySelector('.todo-schedule-footer')), paddingBottom: getComputedStyle(body).paddingBottom, overflow: scroll.scrollHeight - scroll.clientHeight };
  });
  await expect(clearRepeat(), JSON.stringify(repeatTouchLayout)).toBeInViewport({ ratio: 1 });
  const clearBox = await clearRepeat().boundingBox(); expect(clearBox.width).toBeGreaterThanOrEqual(40); expect(clearBox.height).toBeGreaterThanOrEqual(40);
  await clearRepeat().click(); await expect(clearRepeat()).toHaveCount(0);
  await expect(schedule.button(page, '设置重复')).toContainText('未设置');
  await expect(schedule.button(page, '设置时间')).toContainText('16:30');
  await expect(schedule.button(page, '设置提醒')).toContainText('10月11日 15:30');
  await expect(schedule.button(page, '选择日期2099-10-11')).toHaveAttribute('aria-pressed', 'true');
  await expect(schedule.button(page, '展开重复设置')).toBeVisible();
  expect(await repeatGeometry(), 'Clearing repeat preserves the whole overview and clear slot').toEqual(beforeClear);
  expect(await storedTask('schedule-clear-repeat'), 'The row clears only the date-sheet draft').toEqual(originalRepeatTask);
  await schedule.openSection(page, '设置重复');
  await expect(schedule.button(page, '不重复')).toHaveCount(0);
  await expect(schedule.sheet(page).locator('.is-repeats button')).toHaveText(['每天', '每周', '每月', '每年', '工作日', '自定义重复']);
  await expect(schedule.sheet(page).locator('.is-repeats [aria-pressed="true"]')).toHaveCount(0);
  await schedule.checkScheduleLayout(page, expect, `${width} repeat clear`);
  await page.screenshot({ path: path.join(out, `todos-schedule-repeat-cleared-${width}.png`) });
  await schedule.closeSchedule(page, expect);
  expect(await storedTask('schedule-clear-repeat')).toEqual(originalRepeatTask);
  await schedule.openSchedule(page, expect); await expect(clearRepeat()).toBeVisible();
  await clearRepeat().click(); await schedule.confirmSchedule(page, expect);
  expect(await storedTask('schedule-clear-repeat')).toEqual(originalRepeatTask);
  await schedule.openSchedule(page, expect); await expect(clearRepeat()).toHaveCount(0);
  await schedule.openSection(page, '设置重复'); await schedule.button(page, '自定义重复').click();
  await expect(schedule.sheet(page).getByLabel('重复间隔', { exact: true })).toHaveValue('1');
  await schedule.closeOptionWindows(page); await clearRepeat().click(); await schedule.confirmSchedule(page, expect);
  await page.locator('.todo-sheet:not(.entry-composer)').getByRole('button', { name: '保存', exact: true }).click();
  await expect.poll(() => storedTask('schedule-clear-repeat').then(task => task.recurrence)).toBe(undefined);
  const savedRepeatTask = await storedTask('schedule-clear-repeat');
  for (const key of ['id', 'title', 'createdAt', 'dueDate', 'dueTime', 'reminderAt']) expect(savedRepeatTask[key]).toEqual(originalRepeatTask[key]);
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await page.getByRole('button', { name: '编辑任务：重复清除验证', exact: true }).click();
  await schedule.openSchedule(page, expect); await expect(clearRepeat()).toHaveCount(0); await schedule.closeSchedule(page, expect);
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await page.getByRole('button', { name: '完成：重复清除验证', exact: true }).click();
  await expect.poll(() => storedTask('schedule-clear-repeat').then(task => !!task.completedAt)).toBe(true);
  expect(await page.evaluate(() => window.__miniFixture.todoLocalState.tasks.filter(task => task.generatedFrom === 'schedule-clear-repeat'))).toEqual([]);
  await page.evaluate(() => document.documentElement.style.removeProperty('--preview-safe-area-bottom'));

  for (const [id, title, choice, anchorDay, nextDate] of [
    ['schedule-month-anchor', '月末锚点', '每月', 31, '2099-03-31'],
    ['schedule-year-anchor', '年度闰日锚点', '每年', 29, '2096-02-29'],
  ]) {
    await page.getByRole('button', { name: `编辑任务：${title}`, exact: true }).click();
    await schedule.openSchedule(page, expect);
    await schedule.openSection(page, '设置重复');
    await expect(schedule.button(page, choice)).toHaveAttribute('aria-pressed', 'true');
    await schedule.button(page, choice).click();
    await schedule.confirmSchedule(page, expect);
    await page.locator('.todo-sheet:not(.entry-composer)').getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.locator('.todo-sheet')).toHaveCount(0);
    expect((await storedTask(id)).recurrence.anchorDay).toBe(anchorDay);
    await page.getByRole('button', { name: `完成：${title}`, exact: true }).click();
    await expect.poll(() => page.evaluate(taskId => window.__miniFixture.todoLocalState.tasks.find(task => task.generatedFrom === taskId)?.dueDate, id)).toBe(nextDate);
    const generated = await page.evaluate(taskId => window.__miniFixture.todoLocalState.tasks.find(task => task.generatedFrom === taskId), id);
    expect(generated.dueDate).toBe(nextDate);
    expect(generated.recurrence.anchorDay).toBe(anchorDay);
  }

  for (const fixture of [
    { id: 'schedule-at-reminder', title: '准时提醒保持绝对时间', choice: '准时', reminderDate: '2099-01-31', reminderHour: 10, reminderMinute: 0, nextDate: '2099-02-01', nextHour: 11, nextMinute: 30, dateFirst: true },
    { id: 'schedule-ten-reminder', title: '提前提醒保持绝对时间', choice: '提前10分钟', reminderDate: '2099-02-28', reminderHour: 23, reminderMinute: 55, nextDate: '2099-03-02', nextHour: 0, nextMinute: 10, dateFirst: false },
  ]) {
    await page.getByRole('button', { name: `编辑任务：${fixture.title}`, exact: true }).click();
    await schedule.openSchedule(page, expect);
    await schedule.openSection(page, '设置提醒');
    await schedule.button(page, fixture.choice).click();
    await schedule.checkReminderValues(page, expect, fixture.reminderDate, fixture.reminderHour, fixture.reminderMinute, fixture.choice);
    if (fixture.dateFirst) await schedule.selectDate(page, fixture.nextDate);
    else await schedule.setTime(page, fixture.nextHour, fixture.nextMinute);
    await schedule.checkReminderValues(page, expect, fixture.reminderDate, fixture.reminderHour, fixture.reminderMinute);
    await expect(schedule.button(page, fixture.choice)).toHaveAttribute('aria-pressed', 'false');
    if (fixture.dateFirst) await schedule.setTime(page, fixture.nextHour, fixture.nextMinute);
    else await schedule.selectDate(page, fixture.nextDate);
    await schedule.checkReminderValues(page, expect, fixture.reminderDate, fixture.reminderHour, fixture.reminderMinute);
    await schedule.confirmSchedule(page, expect);
    await page.locator('.todo-sheet:not(.entry-composer)').getByRole('button', { name: '保存', exact: true }).click();
    await expect.poll(() => storedTask(fixture.id).then(task => task.dueDate)).toBe(fixture.nextDate);
    const saved = await storedTask(fixture.id);
    expect(saved.dueDate).toBe(fixture.nextDate);
    expect(saved.dueTime).toBe(`${String(fixture.nextHour).padStart(2, '0')}:${String(fixture.nextMinute).padStart(2, '0')}`);
    const absoluteReminder = await page.evaluate(({ date, hour, minute }) => new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).toISOString(), { date: fixture.reminderDate, hour: fixture.reminderHour, minute: fixture.reminderMinute });
    expect(saved.reminderAt).toBe(absoluteReminder);
    await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  }

  await page.getByRole('button', { name: '编辑任务：旧无效日期可以编辑', exact: true }).click();
  await schedule.openSchedule(page, expect);
  const today = await page.evaluate(() => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; });
  await expect(schedule.button(page, `选择日期${today}`)).toHaveCount(1);
  await schedule.checkCalendarBounds(page, expect);
  await schedule.checkScheduleLayout(page, expect, `${width} extreme calendar bounds`);
  await page.screenshot({ path: path.join(out, `todos-schedule-boundaries-${width}.png`), fullPage: true });
  await schedule.closeSchedule(page, expect);
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  expect((await storedTask('schedule-invalid-date')).dueDate).toBe('legacy-date');
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path === '/wechat/reminders' && request.method === 'POST'))).toEqual([]);
};
