const path = require('node:path');
const schedule = require('./todo-schedule-test-helpers.cjs');

module.exports = async function checkUnifiedWheels({ page, origin, out, width, expect, reminderOnly = false }) {
  const button = (name, root = page) => root.getByRole('button', { name, exact: true });
  const select = (name, root = page) => root.getByLabel(name, { exact: true });
  const stored = key => page.evaluate(key => JSON.parse(localStorage.getItem(`ottlog-mini-tool-v1:guest:${key}`) || '{"data":{}}').data, key);
  const prompt = () => page.getByRole('dialog', { name: '保存修改？', exact: true });
  async function geometry(root, columns) {
    await expect(root.locator('select')).toHaveCount(columns);
    for (const wheel of await root.locator('.time-wheel-stage').all()) {
      await wheel.scrollIntoViewIfNeeded();
      const layout = await wheel.evaluate(node => {
        const r = node.getBoundingClientRect(), fade = getComputedStyle(node.querySelector('.time-wheel-fade'));
        return { x: r.x, right: r.right, height: r.height, overflow: node.scrollWidth - node.clientWidth, pointer: fade.pointerEvents, gradient: getComputedStyle(node).maskImage, receivesTouch: node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
      });
      expect(layout.height).toBe(160); expect(layout.x).toBeGreaterThanOrEqual(0); expect(layout.right).toBeLessThanOrEqual(width);
      expect(layout.overflow).toBeLessThanOrEqual(1); expect(layout.pointer).toBe('none'); expect(layout.gradient).toContain('40%'); expect(layout.gradient).toContain('60%');
      expect(layout.receivesTouch, 'Scrolling exposes each wheel above the fixed footer').toBe(true);
    }
  }
  await page.clock.setFixedTime(new Date('2026-10-22T12:00:00'));
  await page.goto(`${origin}/?unified-wheels-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--preview-safe-area-bottom', '34px');
    const stamp = new Date().toISOString();
    window.__miniFixture.guestToolStates = {
      todos: { version: 1, categories: [], tasks: [{ id: 'wheel-task', title: '滚轮提醒测试', description: '', categoryId: '', important: true, urgent: true, completedAt: null, createdAt: stamp, updatedAt: stamp, tags: [], subtasks: [], nextTasks: [], dueDate: '2028-03-31', dueTime: '10:00', reminderAt: new Date('2028-03-30T09:30:00').toISOString() }] },
      meals: { version: 1, meals: [], nutrition: [] },
    };
    location.hash = '#/pages/todos/index';
  });
  await button('编辑任务：滚轮提醒测试').click(); await schedule.openSchedule(page, expect); await schedule.openSection(page, '设置提醒');
  const reminder = page.locator('.todo-schedule-reminder-popover');
  const lead = reminder.locator('.todo-schedule-reminder-lead');
  await geometry(reminder, 4);
  await expect(select('提醒月份')).toHaveValue('03'); await expect(select('提醒日期')).toHaveValue('30');
  await expect(lead).toHaveText('提前1天30分钟提醒');
  await expect(select('提醒月份').locator('option')).toHaveCount(12);
  await expect(select('提醒小时').locator('option')).toHaveCount(24);
  await expect(select('提醒分钟').locator('option')).toHaveCount(60);
  await select('提醒日期').selectOption('31'); await select('提醒月份').selectOption('02');
  await expect(select('提醒日期')).toHaveValue('29'); await expect(select('提醒日期').locator('option')).toHaveCount(29);
  await button('提醒下一年').click(); await expect(select('提醒日期')).toHaveValue('28');
  await expect(reminder).toContainText('2029年'); await button('提醒上一年').click();
  await select('提醒月份').selectOption('03'); await select('提醒日期').selectOption('31');
  await select('提醒小时').selectOption('10'); await select('提醒分钟').selectOption('00'); await expect(lead).toHaveText('准时提醒');
  await select('提醒分钟').selectOption('01'); await expect(lead).toHaveText('晚于任务时间1分钟提醒');
  await select('提醒月份').selectOption('01'); await select('提醒日期').selectOption('01');
  await select('提醒小时').selectOption('00'); await select('提醒分钟').selectOption('00');
  await expect(reminder.locator('.todo-schedule-reminder-preview-value')).toHaveText('2028年1月1日 00:00');
  await select('提醒月份').selectOption('12'); await select('提醒日期').selectOption('31');
  await select('提醒小时').selectOption('23'); await select('提醒分钟').selectOption('59');
  await expect(reminder.locator('.todo-schedule-reminder-preview-value')).toHaveText('2028年12月31日 23:59');
  await select('提醒月份').selectOption('03'); await select('提醒日期').selectOption('30'); await select('提醒小时').selectOption('09'); await select('提醒分钟').selectOption('30');
  await page.screenshot({ path: path.join(out, `unified-reminder-${width}.png`) });
  expect((await stored('todos')).tasks || []).toEqual([]);
  await button('完成提醒设置').click();
  await schedule.openSection(page, '设置重复'); await button('自定义重复').click();
  await geometry(page.locator('.todo-schedule-repeat-popover'), 2);
  await expect(select('重复间隔').locator('option')).toHaveCount(365); await select('重复间隔').selectOption('365');
  await select('重复单位').selectOption('天');
  await schedule.confirmSchedule(page, expect);
  await button('保存', page.locator('.todo-sheet:not(.entry-composer)')).click();
  await expect(page.locator('.todo-sheet')).toHaveCount(0);
  const saved = (await stored('todos')).tasks[0]; expect(saved.id).toBe('wheel-task'); expect(saved.recurrence.interval).toBe(365);
  await page.reload(); await button('编辑任务：滚轮提醒测试').click(); await schedule.openSchedule(page, expect); await schedule.openSection(page, '设置提醒');
  await expect(lead).toHaveText('提前1天30分钟提醒');
  await select('提醒分钟').selectOption('29'); await button('关闭提醒设置').click(); await button('关闭日期设置').click();
  await prompt().getByRole('button', { name: '不保存', exact: true }).click();
  await button('关闭编辑').click(); expect((await stored('todos')).tasks[0]).toEqual(saved);
  await require('./check-reminder-wheel-edges.cjs')({ page, origin, expect });
  if (reminderOnly) return;

  await page.evaluate(() => { location.hash = '#/pages/pomodoro/index'; });
  await page.locator('.focus-settings-toggle').click();
  const settings = page.locator('.focus-settings');
  await geometry(settings, 4);
  for (const [label, max, value] of [['专注', 120, '40'], ['短休息', 60, '6'], ['长休息', 120, '20'], ['长休息间隔', 12, '5']]) {
    const field = select(label === '长休息间隔' ? label : `${label}时长`, settings); await expect(field.locator('option')).toHaveCount(max); await field.selectOption(value);
  }
  await button('保存节奏').click(); await expect(settings).toHaveCount(0);
  await page.locator('.focus-settings-toggle').click(); await expect(select('专注时长', settings)).toHaveValue('40');
  await select('专注时长', settings).selectOption('120'); await button('关闭节奏设置').click(); await button('不保存', prompt()).click();
  await page.locator('.focus-settings-toggle').click(); await expect(select('专注时长', settings)).toHaveValue('40');
  await page.screenshot({ path: path.join(out, `unified-focus-settings-${width}.png`) }); await button('关闭节奏设置').click();
  await button('修改当前计时时长').click(); const quick = page.getByRole('dialog', { name: '本次计时时长', exact: true });
  await geometry(quick, 1); await expect(select('本次计时分钟')).toHaveValue('40'); await select('本次计时分钟').selectOption('7');
  await button('确认', quick).click(); await expect(page.locator('.focus-time')).toHaveText('07:00');

  await page.evaluate(() => { location.hash = '#/pages/mottos/index'; });
  await button('格言轮播设置').click(); const motto = page.locator('.mottos-rotation-popover');
  await geometry(motto, 4);
  for (const [unit, value] of [['天', '24'], ['时', '23'], ['分', '59'], ['秒', '59']]) await select(`格言轮播间隔${unit}`).selectOption(value);
  await expect(motto.locator('.wheel-duration-total')).toHaveText('共 2147483 秒');
  await expect(select('格言轮播间隔时')).toHaveValue('20'); await expect(select('格言轮播间隔分')).toHaveValue('31'); await expect(select('格言轮播间隔秒')).toHaveValue('23');
  await button('保存', motto).click(); await expect(motto).toHaveCount(0);
  await page.reload(); await button('格言轮播设置').click(); await expect(motto.locator('.wheel-duration-total')).toHaveText('共 2147483 秒');
  for (const unit of ['天', '时', '分', '秒']) await select(`格言轮播间隔${unit}`).selectOption('00');
  await expect(motto.locator('.wheel-duration-total')).toHaveText('共 1 秒');
  await page.screenshot({ path: path.join(out, `unified-motto-${width}.png`) });
  await button('关闭轮播设置').click(); await button('不保存', prompt()).click();
  await button('格言轮播设置').click(); await expect(motto.locator('.wheel-duration-total')).toHaveText('共 2147483 秒'); await button('关闭轮播设置').click();
  await button('格言轮播设置').click(); await select('格言轮播间隔天').selectOption('00');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['mottos']; });
  await button('保存', motto).click(); await expect(motto.getByRole('alert')).toContainText('重试');
  await expect(motto.locator('.time-wheel')).toHaveClass(/is-disabled/);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await button('保存', motto).click(); await expect(motto).toHaveCount(0);
  await page.reload(); await button('格言轮播设置').click(); await expect(motto.locator('.wheel-duration-total')).toHaveText('共 73883 秒'); await button('关闭轮播设置').click();

};
