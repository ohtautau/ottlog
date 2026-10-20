const path = require('node:path');
const createHabitFilter = require('./habit-filter-test-helpers.cjs');
module.exports = async function checkCalendarEdit({ page, origin, out, width, expect, host }) {
  const habitFilter = createHabitFilter({ page, expect });
  await page.setViewportSize({ width, height: width === 375 ? 667 : width >= 700 ? 1024 : 844 });
  await page.clock.install({ time: new Date('2026-10-01T12:00:00') });
  await page.goto(`${origin}/?calendar-edit-${host}-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    for (const tool of ['reminders', 'domains']) localStorage.removeItem(`ottlog-mini-tool-v1:guest:${tool}`);
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    const item = (id, title) => ({ id, title, note: '', group: '工作', domainId: 'work', kind: 'plant', minutes: 0, enabled: true, priority: 'none' });
    window.__miniFixture.guestToolStates = {
      reminders: { version: 1, items: [item('calendar-target', '日历打卡习惯'), item('calendar-other', '另一个习惯')], done: { '2026-09-30': ['calendar-other'] }, reflections: [] },
      domains: { version: 1, domains: [{ id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] },
    };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    window.__miniNotices.length = 0;
  });
  const route = host === 'daily' ? '#/pages/daily/index' : '#/pages/domain-detail/index?id=work';
  const sheet = page.locator(host === 'daily' ? '.daily-detail-sheet' : '.domain-sheet-habit-detail');
  const calendar = sheet.locator('.habit-calendar');
  const date = day => calendar.locator(`button.habit-calendar-day[aria-label^="${day} "]`);
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders')).data);
  async function open() { await page.evaluate(route => { location.hash = route; }, route); if (host === 'daily') { await habitFilter.assertNoStatusRow(); await habitFilter.select('全部'); } await page.getByRole('button', { name: '查看习惯：日历打卡习惯', exact: true }).first().click(); }
  await open();
  const before = await read();
  await expect(date('2026-10-02')).toBeDisabled();
  await expect(date('2026-10-01')).toBeEnabled();
  for (const button of await calendar.locator('button.habit-calendar-day').all()) {
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(40); expect(box.width).toBeGreaterThanOrEqual(40);
  }
  await date('2026-10-01').click();
  await expect(date('2026-10-01')).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet).toBeVisible();
  await expect(page.locator('.daily-reflection-sheet')).toHaveCount(0);
  await expect(calendar.locator('.habit-calendar-stat-number').nth(1)).toHaveText('1天');
  expect((await read()).done['2026-10-01']).toEqual(['calendar-target']);
  expect((await read()).items).toEqual(before.items);
  await date('2026-09-30').click();
  expect((await read()).done['2026-09-30']).toEqual(['calendar-other', 'calendar-target']);
  await date('2026-09-30').click();
  expect((await read()).done['2026-09-30']).toEqual(['calendar-other']);
  await page.screenshot({ path: path.join(out, `calendar-checkin-${host}-${width}.png`) });
  await page.reload(); await open();
  await expect(date('2026-10-01')).toHaveAttribute('aria-pressed', 'true');
  await date('2026-10-01').click();
  expect((await read()).done['2026-10-01']).not.toContain('calendar-target');
  for (let index = 0; index < 3; index++) await calendar.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
  await expect(date('2026-07-03')).toBeDisabled();
  await expect(date('2026-07-04')).toBeEnabled();
  await date('2026-07-04').click();
  expect((await read()).done['2026-07-04']).toContain('calendar-target');
  await date('2026-07-04').click();
  expect((await read()).done['2026-07-04']).not.toContain('calendar-target');
  await calendar.getByRole('button', { name: '回到本月打卡', exact: true }).click();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
  await date('2026-10-01').click();
  await expect(calendar.locator('.habit-calendar-error')).toContainText('尚未保存');
  expect((await read()).done['2026-10-01']).not.toContain('calendar-target');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await date('2026-10-01').click();
  await expect(calendar.locator('.habit-calendar-error')).toHaveCount(0);
  expect((await read()).done['2026-10-01']).toEqual(['calendar-target']);
  const saved = await read();
  expect(saved.items).toEqual(before.items);
  expect(saved.reflections).toEqual([]);
  expect(saved.completionHistory['calendar-target']).toHaveLength(1);
  const notices = await page.evaluate(() => window.__miniNotices);
  expect(notices.filter(item => /toast|modal/i.test(item))).toEqual([]);
  await sheet.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
  await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=habits'; });
  await expect(page.locator('.statistics-habits')).toBeVisible();
  await expect(page.locator('.statistics-habits button.habit-calendar-day')).toHaveCount(0);
  expect(await read()).toEqual(saved);

  if (width === 360) {
    // A pending guest undo must not become an account check-in with the same ID.
    await open();
    await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
    await date('2026-10-01').click();
    await expect(calendar.locator('.habit-calendar-error')).toContainText('尚未保存');
    await page.evaluate(before => {
      window.__miniFixture.failToolWrites = [];
      window.__miniFixture.accountToolStates = { 'calendar-reader': { reminders: before, domains: JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:domains')).data } };
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'calendar-reader', isAdmin: false };
      window.__miniPreviewControl.emit('ottlog-session');
    }, before);
    await expect(sheet).toHaveCount(0);
    await open();
    await expect(date('2026-10-01')).toHaveAttribute('aria-pressed', 'false');
    await date('2026-10-01').click();
    await expect.poll(() => page.evaluate(() => window.__miniFixture.accountToolStates['calendar-reader'].reminders.done['2026-10-01'])).toEqual(['calendar-target']);
    expect((await read()).done['2026-10-01']).toEqual(['calendar-target']);
    await page.evaluate(() => {
      window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
      window.__miniPreviewControl.emit('ottlog-session');
    });
    await expect(sheet).toHaveCount(0); await open();
    await expect(date('2026-10-01')).toHaveAttribute('aria-pressed', 'false');
    if ((await read()).done['2026-10-01']?.includes('calendar-target')) await date('2026-10-01').click();
    expect((await read()).done['2026-10-01']).not.toContain('calendar-target');
    expect(await page.evaluate(() => window.__miniFixture.accountToolStates['calendar-reader'].reminders.done['2026-10-01'])).toEqual(['calendar-target']);
  }
};
