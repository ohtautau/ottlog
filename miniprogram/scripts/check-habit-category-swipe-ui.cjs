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
  const grid = () => page.locator('.swipe-panel-current .daily-habit-scroll');
  const domainRow = () => page.locator('.daily-core-filter-scroll');
  const domain = name => domainRow().getByRole('button', { name, exact: true });
  const selected = habitFilter.selected;
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders')).data);
  const filter = habitFilter.filter;
  const visibleIds = () => grid().locator('.habit-sort-tile').evaluateAll(nodes => nodes.map(node => node.id));
  async function swipe(name, gesture, target = grid()) {
    const before = await backgroundPosition(page);
    await touchGesture(target, gesture);
    await selected(name);
    expect(await backgroundPosition(page), 'Status gestures cannot scroll the outer page').toEqual(before);
    await expect(page.locator('.daily-habit-pages .swipe-panel-adjacent')).toHaveCount(0);
  }
  await selected('进行中');
  await habitFilter.assertNoStatusRow();
  await expect(grid().locator('.habit-sort-tile')).toHaveCount(22);
  await expect(grid().locator('#habit-sort-swipe-0,#habit-sort-swipe-3')).toHaveCount(0);
  await expect(domainRow().getByRole('button')).toHaveText(['全部', '成长', '工作', '英语', '健身', '生活', '心理', '摄影', '自媒体', '未分类']);
  await expect(page.locator('.daily-page-toolbar .page-toolbar-summary-count')).toHaveText('今日完成 1');
  await expect(page.locator('.daily-page-toolbar .page-toolbar-summary-recent')).toHaveText('分类习惯0');
  expect(await page.locator('.page-toolbar-summary').evaluate(node => node.closest('.page-toolbar') !== null), 'Completion feedback shares the toolbar row').toBe(true);
  const footer = await page.locator('.daily-page-toolbar').evaluate(node => { const r = node.getBoundingClientRect(), count = node.querySelector('.page-toolbar-summary').getBoundingClientRect(); return { countTop: count.top - r.top, countBottom: count.bottom - r.bottom }; });
  expect(footer.countTop).toBeGreaterThanOrEqual(0); expect(footer.countBottom).toBeLessThanOrEqual(1);
  await page.screenshot({ path: path.join(out, `habit-without-status-row-${width}.png`) });
  await swipe('进行中', { dx: 96 });
  await swipe('进行中', { dx: -20, during: async () => {
    await expect(page.locator('.swipe-panel-adjacent .daily-suggestion-title')).toHaveText(['分类习惯0']);
    const geometry = await page.locator('.daily-habit-pages').evaluate(node => {
      const viewport = node.getBoundingClientRect(), current = node.querySelector('.swipe-panel-current').getBoundingClientRect(), adjacent = node.querySelector('.swipe-panel-adjacent').getBoundingClientRect();
      return { offset: current.left - viewport.left, visible: viewport.right - adjacent.left, adjacentWidth: adjacent.width, width: viewport.width };
    });
    expect(geometry.offset).toBeCloseTo(-20, 0); expect(geometry.visible).toBeCloseTo(20, 0); expect(geometry.adjacentWidth).toBeCloseTo(geometry.width, 0);
    await page.screenshot({ path: path.join(out, `habit-status-preview-${width}.png`) });
  } });
  await swipe('已完成', undefined, grid().locator('.daily-suggestion-open').first());
  await expect(grid().locator('.habit-sort-tile')).toHaveCount(1);
  await grid().locator('.daily-suggestion-open').first().dispatchEvent('click');
  await grid().locator('.daily-suggestion-check').first().dispatchEvent('click');
  await expect(page.locator('.daily-detail-sheet,.daily-reflection-sheet')).toHaveCount(0);
  expect(await read()).toEqual(original);
  await swipe('已归档'); await expect(grid().locator('#habit-sort-swipe-3')).toBeVisible();
  await swipe('全部'); await expect(grid().locator('.habit-sort-tile')).toHaveCount(24);
  await swipe('全部');
  await swipe('已归档', { dx: 96 }); await swipe('已完成', { dx: 96 }); await swipe('进行中', { dx: 96 });
  for (const gesture of [
    { dx: -20 }, { dx: 0, dy: 60 }, { dx: -60, dy: 45 }, { multiple: true }, { addFinger: true },
    { cancel: true }, { verticalFirst: true }, { differentEndFinger: true }, { missingEndPoint: true }, { remainingTouch: true },
  ]) await swipe('进行中', gesture);
  await swipe('进行中', undefined, domainRow());
  await domain('成长').click(); await expect(grid().locator('.habit-sort-tile')).toHaveCount(1);
  await swipe('已完成'); await expect(grid().locator('#habit-sort-swipe-0')).toBeVisible();
  await swipe('已归档'); await expect(grid().locator('.daily-core-empty')).toBeVisible();
  await swipe('全部', undefined, grid().locator('.daily-core-empty'));
  await expect(grid().locator('.habit-sort-tile')).toHaveCount(2);
  await expect(domain('成长')).toHaveAttribute('aria-pressed', 'true');
  await domain('工作').click(); await expect(grid().locator('.habit-sort-tile')).toHaveCount(2);
  await habitFilter.select('进行中'); await expect(grid().locator('#habit-sort-swipe-2')).toBeVisible();
  expect(await read(), 'Statuses and domains only filter the original records').toEqual(original);
  await filter().click();
  await expect(page.getByRole('button', { name: '习惯完成状态：进行中', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await touchGesture(grid()); await selected('进行中');
  await page.locator('.form-popover-backdrop').click({ position: { x: 2, y: 2 } });
  const protectedIds = await visibleIds();
  await page.getByRole('button', { name: '排序习惯', exact: true }).click(); await touchGesture(grid()); expect(await visibleIds()).toEqual(protectedIds);
  await page.getByRole('button', { name: '关闭习惯排序', exact: true }).click();
  await selected('进行中');
  await page.getByRole('button', { name: '创建习惯', exact: true }).click(); await touchGesture(grid()); expect(await visibleIds()).toEqual(protectedIds);
  await page.getByRole('button', { name: '关闭习惯编辑', exact: true }).click();
  await selected('进行中');
  await touchGesture(grid(), { during: () => habitFilter.select('全部') }); await selected('全部');
  await domain('心理').click();
  await expect(grid().locator('.habit-sort-tile')).toHaveCount(20);
  await grid().evaluate(node => { node.scrollTop = 90; node.dispatchEvent(new Event('scroll')); });
  const top = await grid().evaluate(node => node.scrollTop); expect(top).toBeGreaterThan(0);
  await swipe('全部', { dx: 0, dy: 70 }); expect(await grid().evaluate(node => node.scrollTop)).toBe(top);
  await grid().evaluate(node => { node.scrollTop = 0; });
  const first = grid().locator('#habit-sort-swipe-23'), second = grid().locator('#habit-sort-swipe-22');
  const a = await first.boundingBox(), b = await second.boundingBox();
  const start = { identifier: 17, clientX: a.x + a.width / 2, clientY: a.y + a.height / 2 }, end = { ...start, clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 };
  await first.dispatchEvent('touchstart', { touches: [start] }); await page.clock.runFor(450); await expect(first).toHaveClass(/is-dragging/);
  await first.dispatchEvent('touchmove', { touches: [end] }); await first.dispatchEvent('touchend', { touches: [], changedTouches: [end] });
  await selected('全部'); await expect.poll(async () => (await read()).sort?.field).toBe('custom');
  await first.locator('.daily-suggestion-open').dispatchEvent('click'); await expect(page.locator('.daily-detail-sheet')).toHaveCount(0);
  const reordered = await read(); expect(reordered.done).toEqual(original.done); expect(reordered.checkInTimes).toEqual(original.checkInTimes);
  await page.clock.runFor(450);
  await domain('成长').click(); await grid().getByRole('button', { name: '查看习惯：分类习惯1', exact: true }).click();
  const detail = page.locator('.daily-detail-sheet'), calendar = detail.locator('.habit-calendar');
  await expect(calendar.locator('.habit-calendar-log-toggle')).toHaveCount(0);
  await detail.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
  await expect(calendar.locator('.habit-calendar-log-row')).toHaveCount(10);
  await expect(calendar.locator('.habit-calendar-log-row').first()).toContainText('9月30日');
  await expect(calendar.locator('.habit-calendar-log-row').last()).toContainText('9月21日');
  await expect(calendar.locator('.habit-calendar-legend,.habit-calendar-month-rate')).toHaveCount(0);
  const more = calendar.getByRole('button', { name: '更多', exact: true });
  await more.click(); await expect(calendar.locator('.habit-calendar-log-row')).toHaveCount(20);
  expect(await more.evaluate(node => node.getBoundingClientRect().width / node.parentElement.getBoundingClientRect().width)).toBeGreaterThan(.95);
  await more.click(); await expect(calendar.locator('.habit-calendar-log-row')).toHaveCount(30); await expect(more).toHaveCount(0);
  await detail.getByRole('button', { name: '回到本月打卡', exact: true }).click();
  await detail.getByRole('button', { name: '查看上个月打卡', exact: true }).click(); await expect(calendar.locator('.habit-calendar-log-row')).toHaveCount(10);
  await page.screenshot({ path: path.join(out, `habit-month-logs-${width}.png`) });
  await page.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
  if (width === 360) {
    await habitFilter.select('进行中');
    await touchGesture(grid(), { during: async () => {
      await page.evaluate(original => { window.__miniFixture.accountToolStates = { 'habit-swipe-user': { reminders: original } }; window.__miniFixture.sessionProfile = { authenticated: true, userName: 'habit-swipe-user', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); }, original);
      await expect(grid().locator('.habit-sort-tile')).toHaveCount(22);
      await expect(domain('全部')).toHaveAttribute('aria-pressed', 'true');
    } });
    await selected('进行中'); expect(await read()).toEqual(reordered);
    expect(await page.evaluate(() => window.__miniFixture.accountToolStates['habit-swipe-user'].reminders)).toEqual(original);
    await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
    await selected('进行中');
  }
  await habitFilter.select('进行中'); await domain('成长').click(); await page.clock.runFor(450);
  await grid().locator('#habit-sort-swipe-1 .daily-suggestion-check').click();
  await expect(page.locator('.daily-reflection-sheet')).toBeVisible(); await expect(grid().locator('#habit-sort-swipe-1')).toHaveCount(0);
  await expect(page.locator('.daily-page-toolbar .page-toolbar-summary-count')).toHaveText('今日完成 2');
  await expect(page.locator('.daily-page-toolbar .page-toolbar-summary-recent')).toHaveText('分类习惯1');
  await page.locator('.daily-reflection-overlay .sheet-backdrop').click({ position: { x: 2, y: 2 } });
  await habitFilter.select('已完成'); await expect(grid().locator('#habit-sort-swipe-1')).toBeVisible();
  await page.reload(); await selected('进行中');
  await expect(page.locator('.daily-page-toolbar .page-toolbar-summary-recent')).toHaveText('分类习惯1');
  await page.evaluate(() => { for (const owner of ['guest', 'reader:habit-swipe-user']) localStorage.removeItem(`ottlog-mini-tool-v1:${owner}:reminders`); });
};

