const path = require('node:path');
const { touchGesture, backgroundPosition } = require('./entry-swipe-test-helpers.cjs');
const habitFilterControls = require('./habit-filter-test-helpers.cjs');
const habitDomainFixture = require('./habit-domain-test-fixture.cjs');

module.exports = async function checkHabitCategorySwipe({ page, origin, out, width, expect }) {
  const habitFilter = habitFilterControls({ page, expect });
  await page.clock.install({ time: new Date('2026-10-07T12:00:00') });
  await page.goto(`${origin}/?habit-category-swipe-${width}#/pages/posts/index`);
  const original = await page.evaluate(domains => {
    for (const tool of ['reminders', 'domains']) localStorage.removeItem(`ottlog-mini-tool-v1:guest:${tool}`);
    const items = Array.from({ length: 24 }, (_, index) => ({ id: `swipe-${index}`, title: `分类习惯${index}`, note: '', kind: 'plant', minutes: 0, enabled: index !== 3,
      group: index < 2 ? '成长' : index < 4 ? '工作' : '心理', priority: 'none', createdAt: index + 1 }));
    const done = { '2026-10-07': ['swipe-0'] };
    for (let day = 1; day <= 30; day++) done[`2026-09-${String(day).padStart(2, '0')}`] = ['swipe-1'];
    const reflections = Array.from({ length: 30 }, (_, index) => {
      const day = `2026-09-${String(index + 1).padStart(2, '0')}`;
      return { id: `swipe-log-${index}`, habitId: 'swipe-1', day, text: `九月留言${index + 1}`, createdAt: new Date(`${day}T10:00:00`).getTime() };
    });
    const reminders = { version: 1, items, done, reflections, checkInTimes: { '2026-10-07': { 'swipe-0': new Date('2026-10-07T08:00:00').getTime() } } };
    window.__miniFixture.guestToolStates = { reminders, domains };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    window.__miniNotices.length = 0;
    location.hash = '#/pages/daily/index';
    return reminders;
  }, habitDomainFixture());
  const grid = () => page.locator('.daily-habit-pages > .daily-habit-scroll');
  const domainRow = () => page.locator('.daily-core-filter-scroll');
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders')).data);
  await habitFilter.selected('进行中');
  await expect(grid().locator('.habit-sort-tile')).toHaveCount(22);
  await expect(page.locator('.daily-habit-pages .swipe-panels')).toHaveCount(0);
  const before = await backgroundPosition(page);
  for (const gesture of [{ dx: -100 }, { dx: 100 }, { dx: -20 }, { dx: 0, dy: 60 }, { multiple: true }, { cancel: true }]) {
    await touchGesture(grid(), gesture);
    await habitFilter.selected('进行中');
    await expect(grid().locator('.habit-sort-tile')).toHaveCount(22);
    expect(await backgroundPosition(page)).toEqual(before);
  }
  // Status changes remain available explicitly through the existing filter.
  for (const [status, count] of [['已完成', 1], ['已归档', 1], ['全部', 24], ['进行中', 22]]) {
    await habitFilter.select(status);
    await expect(grid().locator('.habit-sort-tile')).toHaveCount(count);
  }
  await domainRow().getByRole('button', { name: '成长', exact: true }).click();
  await expect(grid().locator('.habit-sort-tile')).toHaveCount(1);
  await habitFilter.select('已完成');
  await expect(grid().locator('#habit-sort-swipe-0')).toBeVisible();
  await habitFilter.select('全部');
  await expect(grid().locator('.habit-sort-tile')).toHaveCount(2);
  expect(await read(), 'Horizontal gestures and explicit filters never write business records').toEqual(original);
  await page.screenshot({ path: path.join(out, `habit-no-status-swipe-${width}.png`) });
};
