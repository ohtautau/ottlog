const path = require('node:path');
const schedule = require('./todo-schedule-test-helpers.cjs');
module.exports = async function checkCalendarLabels({ page, origin, out, width, expect }) {
  async function geometry(calendar, phase) {
    const cells = await calendar.locator('.calendar-date-circle').evaluateAll(nodes => nodes.map(circle => {
      const cell = circle.parentElement, note = cell.querySelector('.calendar-date-note');
      const c = circle.getBoundingClientRect(), n = note.getBoundingClientRect(), b = cell.getBoundingClientRect();
      return { width: c.width, height: c.height, radius: getComputedStyle(circle).borderRadius,
        noteSize: Number.parseFloat(getComputedStyle(note).fontSize), top: c.top - b.top, gap: n.top - c.bottom, bottom: b.bottom - n.bottom, cellHeight: b.height };
    }));
    expect(cells).toHaveLength(42);
    for (const cell of cells) {
      expect(Math.abs(cell.width - cell.height), `${phase}: round disc`).toBeLessThan(.1);
      expect(cell.radius).toBe('50%'); expect(cell.noteSize).toBeGreaterThanOrEqual(10);
      expect(cell.top, `${phase}: complete disc`).toBeGreaterThanOrEqual(-.5);
      expect(cell.gap, `${phase}: separate subtitle`).toBeGreaterThanOrEqual(-.5);
      expect(cell.bottom, `${phase}: complete subtitle`).toBeGreaterThanOrEqual(-.5);
    }
  }
  await page.clock.install({ time: new Date('2026-10-01T12:00:00') });
  await page.goto(`${origin}/?calendar-labels-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--preview-safe-area-bottom', '34px');
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    window.__miniFixture.guestToolStates = { todos: { version: 1, tasks: [], categories: [] } };
    localStorage.removeItem('ottlog-mini-tool-v1:guest:todos'); location.hash = '#/pages/todos/index';
  });
  await page.locator('.todo-quadrant-later .todo-quadrant-add').click();
  await schedule.openSchedule(page, expect);
  const calendar = schedule.sheet(page).locator('.todo-schedule-calendar').first();
  await geometry(calendar, `${width} task default`);
  const october = schedule.button(page, '选择日期2026-10-01');
  await expect(october.locator('.calendar-date-note')).toHaveText('国庆节');
  await expect(schedule.button(page, '选择日期2026-10-02').locator('.calendar-date-note')).not.toHaveClass(/is-holiday/);
  await expect(schedule.button(page, '选择日期2026-10-03').locator('.calendar-date-note')).not.toHaveClass(/is-holiday/);
  await expect(schedule.button(page, '选择日期2026-10-04').locator('.calendar-date-note')).not.toHaveClass(/is-holiday/);
  await october.click();
  await expect(october).toHaveAttribute('aria-pressed', 'true');
  expect(await october.locator('.calendar-date-circle').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(185, 219, 202)');
  await geometry(calendar, `${width} selected task`);
  await page.screenshot({ path: path.join(out, `calendar-task-${width}.png`) });
  await schedule.viewMonth(page, 2026, 5);
  const may = schedule.button(page, '选择日期2026-05-25');
  await may.click();
  await may.click({ button: 'right' });
  await expect(page.getByRole('dialog', { name: '日期详情', exact: true })).toContainText('春季银行假日');
  await expect(page.getByRole('dialog', { name: '日期详情', exact: true })).toContainText('阵亡将士纪念日');
  await expect(may).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.calendar-date-overlay .sheet-backdrop').click({ position: { x: 3, y: 3 } });
  await expect(page.locator('.calendar-date-details')).toHaveCount(0);
  await schedule.openSection(page, '设置提醒');
  await schedule.button(page, '提前30分钟').click();
  await expect(schedule.sheet(page).locator('.todo-schedule-reminder-days-inline button')).toHaveText(['当天', '前一天', '前两天', '前三天', '前一周', '前一月']);
  await expect(schedule.button(page, '选择日期2026-05-25')).toHaveAttribute('aria-pressed', 'true');
  await geometry(schedule.sheet(page).locator('.todo-schedule-calendar'), `${width} main calendar behind reminder choices`);
  await expect(page.locator('.todo-schedule-reminder-days-inline')).toHaveCount(1);
  await expect(page.locator('.todo-schedule-reminder-popover')).toBeVisible();
  await page.screenshot({ path: path.join(out, `calendar-reminder-${width}.png`) });
  await schedule.closeSchedule(page, expect);
  // Existing real check-in tests cover persistence, undo, archived dates,
  // failure/retry and account isolation through both calendar hosts.
  for (const host of ['daily', 'domain']) {
    await require('./check-habit-calendar-edit-ui.cjs')({ page, origin, out, width, expect, host });
    const sheet = page.locator(host === 'daily' ? '.daily-detail-sheet' : '.domain-sheet-habit-detail');
    await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=habits'; });
    await expect(page.locator('.statistics-habits')).toBeVisible();
    await geometry(page.locator('.statistics-habits .habit-calendar'), `${width} statistics readonly`);
    await page.evaluate(() => document.documentElement.style.setProperty('--preview-safe-area-bottom', '34px'));
    await page.evaluate(route => { location.hash = route; }, host === 'daily' ? '#/pages/daily/index' : '#/pages/domain-detail/index?id=work');
    await page.getByRole('button', { name: '查看习惯：日历打卡习惯', exact: true }).first().click();
    const habit = sheet.locator('.habit-calendar');
    await geometry(habit, `${width} ${host} habit`);
    await expect(habit.locator('[aria-label^="2026-10-01 "] .calendar-date-note')).toHaveText('国庆节');
    const today = habit.locator('button[aria-label^="2026-10-01 "]'), pressed = await today.getAttribute('aria-pressed');
    await today.click({ button: 'right' });
    await expect(page.locator('.calendar-date-details')).toContainText('中国大陆');
    await sheet.getByRole('button', { name: '关闭日期详情', exact: true }).click();
    await expect(today).toHaveAttribute('aria-pressed', pressed);
    await require('./check-habit-detail-layout.cjs')({ page, sheetSelector: host === 'daily' ? '.daily-detail-sheet' : '.domain-sheet-habit-detail', footerSelector: '.sheet-actions', phase: `${host} lunar labels`, width, expect });
    await page.screenshot({ path: path.join(out, `calendar-habit-${host}-${width}.png`) });
  }
};
