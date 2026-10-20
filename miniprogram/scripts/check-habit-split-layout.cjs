const path = require('node:path');
const { touchGesture, backgroundPosition } = require('./entry-swipe-test-helpers.cjs');

module.exports = async function checkHabitSplitLayout({ page, origin, out, width, expect }) {
  await page.goto(`${origin}/?habit-split-layout-${width}#/pages/posts/index`);
  const original = await page.evaluate(() => {
    localStorage.clear();
    const periods = ['free', 'morning', 'noon', 'afternoon', 'night'];
    const items = periods.flatMap(period => Array.from({ length: period === 'free' ? 20 : 12 }, (_, index) => ({
      id: `split-${period}-${index}`, title: `习惯${period}${index}`, note: '', kind: 'plant', group: '工作', domainId: 'work',
      timePeriod: period, enabled: true, priority: 'none', minutes: 0, createdAt: index + 1,
    })));
    const reminders = { version: 1, items, done: {}, sort: { field: 'custom', direction: 'asc' } };
    window.__miniFixture.guestToolStates = { reminders, domains: { version: 1, domains: [{ id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] } };
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    location.hash = '#/pages/daily/index';
    return reminders;
  });
  const root = page.locator('.swipe-panel-current .daily-habit-scroll');
  const free = () => root.locator('.daily-time-period-section[data-time-period="free"]');
  const timed = () => root.locator('.daily-time-period-section:not([data-time-period="free"])');
  const freeScroll = () => free().locator('.daily-time-period-scroll');
  const timedScroll = () => timed().locator('.daily-time-period-scroll');
  const category = label => root.getByRole('button', { name: `习惯时段分类：${label}`, exact: true });
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders')).data);
  async function lastRowFits(card) {
    const bounds = await card.evaluate(node => {
      const card = node.getBoundingClientRect(), window = node.closest('.daily-time-period-scroll').getBoundingClientRect();
      return { top: card.top - window.top, bottom: card.bottom - window.bottom };
    });
    expect(bounds.top, 'The last row can be fully read inside its window').toBeGreaterThanOrEqual(-1);
    expect(bounds.bottom, 'ScrollTop rounding allows at most one pixel at the lower edge').toBeLessThanOrEqual(1);
  }
  await expect(free().locator('.habit-sort-tile')).toHaveCount(20);
  await expect(timed().locator('.habit-sort-tile')).toHaveCount(12);
  await category('上午').click();
  await expect(timed()).toHaveAttribute('data-time-period', 'morning');
  await expect(root.locator('.section-title-disclosure,.select-chevron')).toHaveCount(0);
  await expect(root.locator('.daily-time-period-categories button')).toHaveText(['上午', '中午', '下午', '晚上']);
  await expect(page.locator('.daily-reminder-heading .section-title')).toHaveText('提醒');
  const geometry = await root.evaluate(node => {
    const bounds = value => { const r = value.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const sections = [...node.querySelectorAll('.daily-time-period-section')];
    const cards = [...node.querySelectorAll('.daily-suggestion')];
    return { outer: bounds(document.querySelector('.page-scroll')), root: bounds(node), rootOverflow: node.scrollHeight - node.clientHeight, reminder: bounds(document.querySelector('.daily-reminder-heading')),
      sections: sections.map(section => ({ box: bounds(section), header: bounds(section.querySelector('.habit-list-section-heading')), scroll: bounds(section.querySelector('.daily-time-period-scroll')), overflow: section.querySelector('.daily-time-period-scroll').scrollHeight - section.querySelector('.daily-time-period-scroll').clientHeight })),
      buttons: [...node.querySelectorAll('.daily-time-period-categories button')].map(button => ({ ...bounds(button), weight: Number(getComputedStyle(button).fontWeight) })),
      cards: cards.map(card => ({ height: card.getBoundingClientRect().height, padding: parseFloat(getComputedStyle(card.querySelector('.daily-suggestion-open')).paddingTop), overflow: card.scrollWidth - card.clientWidth })),
      horizontal: document.querySelector('.page-scroll').scrollWidth - document.querySelector('.page-scroll').clientWidth };
  });
  expect(geometry.sections[0].header.width, 'Free title and time-period row have equal width').toBeCloseTo(geometry.sections[1].header.width, 0);
  expect(geometry.sections[0].header.left).toBeCloseTo(geometry.sections[1].header.left, 0);
  expect(geometry.sections[0].header.height).toBeGreaterThanOrEqual(40);
  expect(geometry.sections[1].header.height).toBeGreaterThanOrEqual(40);
  expect(geometry.reminder.height, 'Reminder subtitle uses the same heading row size').toBeGreaterThanOrEqual(40);
  expect(geometry.reminder.width).toBeCloseTo(geometry.sections[0].header.width, 0);
  expect(geometry.reminder.left).toBeCloseTo(geometry.sections[0].header.left, 0);
  expect(geometry.sections[0].box.bottom).toBeLessThanOrEqual(geometry.sections[1].box.top + 1);
  expect(geometry.root.bottom).toBeLessThanOrEqual(geometry.outer.bottom + 1);
  expect(geometry.horizontal).toBeLessThanOrEqual(2);
  expect(geometry.rootOverflow, 'The combined frame stays fixed; only its two card lists scroll').toBeLessThanOrEqual(2);
  for (const section of geometry.sections) {
    expect(section.overflow, 'Dense habits remain accessible inside each window').toBeGreaterThan(100);
    expect(section.scroll.top).toBeGreaterThanOrEqual(section.header.bottom - 1);
    expect(section.scroll.bottom).toBeLessThanOrEqual(section.box.bottom + 1);
  }
  for (const button of geometry.buttons) { expect(button.height).toBeGreaterThanOrEqual(40); expect(button.weight).toBe(700); }
  for (const card of geometry.cards) { expect(card.height).toBeGreaterThanOrEqual(64); expect(card.padding).toBeGreaterThanOrEqual(5); expect(card.overflow).toBeLessThanOrEqual(2); }
  const fixed = await root.evaluate(node => [...node.querySelectorAll('.habit-list-section-heading')].map(header => header.getBoundingClientRect().top));
  const before = await backgroundPosition(page);
  await freeScroll().evaluate(node => { node.scrollTop = node.scrollHeight; node.dispatchEvent(new Event('scroll')); });
  expect(await freeScroll().evaluate(node => node.scrollTop)).toBeGreaterThan(100);
  expect(await timedScroll().evaluate(node => node.scrollTop)).toBe(0);
  await lastRowFits(free().locator('#habit-sort-split-free-19'));
  await timedScroll().evaluate(node => { node.scrollTop = node.scrollHeight; node.dispatchEvent(new Event('scroll')); });
  expect(await timedScroll().evaluate(node => node.scrollTop)).toBeGreaterThan(100);
  await lastRowFits(timed().locator('#habit-sort-split-morning-11'));
  expect(await root.evaluate(node => [...node.querySelectorAll('.habit-list-section-heading')].map(header => header.getBoundingClientRect().top)), 'Reading either list cannot move either header').toEqual(fixed);
  expect(await backgroundPosition(page), 'Reading either list cannot move the page').toEqual(before);
  const freePosition = await freeScroll().evaluate(node => node.scrollTop);
  for (const [period, label] of [['noon', '中午'], ['afternoon', '下午'], ['night', '晚上'], ['morning', '上午']]) {
    await category(label).click();
    await expect(category(label)).toHaveAttribute('aria-pressed', 'true');
    await expect(timed()).toHaveAttribute('data-time-period', period);
    await expect(timed().locator('.habit-sort-tile')).toHaveCount(12);
    await expect(timed().locator('.daily-suggestion-title').first()).toHaveText(`习惯${period}0`);
    expect(await freeScroll().evaluate(node => node.scrollTop), 'Switching time periods preserves free-list reading position').toBe(freePosition);
    expect(await timedScroll().evaluate(node => node.scrollTop), 'A newly selected time period starts at its first row').toBe(0);
  }
  expect(await read(), 'Scrolling and selecting periods do not write habits or sorting').toEqual(original);
  await page.screenshot({ path: path.join(out, `habit-split-lists-${width}.png`) });
  await touchGesture(category('上午'));
  await expect(category('上午')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.swipe-panel-adjacent')).toHaveCount(0);
  expect(await read()).toEqual(original);
  await freeScroll().evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event('scroll')); });
  const tile = free().locator('#habit-sort-split-free-0');
  const box = await tile.boundingBox(), scrollBox = await freeScroll().boundingBox();
  const start = { identifier: 29, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
  await tile.dispatchEvent('touchstart', { touches: [start] });
  await page.clock.runFor(450);
  await expect(tile).toHaveClass(/is-dragging/);
  await tile.dispatchEvent('touchmove', { touches: [{ ...start, clientY: scrollBox.y + scrollBox.height - 2 }] });
  await page.clock.runFor(1000);
  expect(await freeScroll().evaluate(node => node.scrollTop), 'Free-list drag scrolls its own window').toBeGreaterThanOrEqual(32);
  expect(await timedScroll().evaluate(node => node.scrollTop), 'Free-list drag cannot scroll the time-period window').toBe(0);
  expect(await backgroundPosition(page)).toEqual(before);
  await tile.dispatchEvent('touchcancel', { touches: [] });
  await page.clock.runFor(450);
  expect(await read(), 'Cancelling the scroll drag preserves the absolute saved order').toEqual(original);
};
