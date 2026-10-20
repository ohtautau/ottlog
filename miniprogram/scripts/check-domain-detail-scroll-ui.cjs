const path = require('node:path');
const { png } = require('./toolbar-summary-fixtures.cjs');

module.exports = async function checkDomainDetailScroll({ page, origin, out, width, expect }) {
  const state = require('./habit-domain-test-fixture.cjs')();
  const domain = state.domains.find(item => item.id === 'work');
  const createdAt = '2026-10-06T08:00:00.000Z';
  domain.longTermGoal = { id: 'long', content: '完整长目标内容'.repeat(20), status: 'active', createdAt };
  domain.shortTermGoal = { id: 'short', content: '完成一次实际练习', status: 'active', createdAt };
  for (const kind of ['negative', 'positive']) domain[`${kind}Records`] = Array.from({ length: 12 }, (_, i) => ({
    id: `${kind}-${i}`, content: `${kind}记录${i}\n${'完整文本与**原始标记**。'.repeat(i === 11 ? 80 : 5)}`,
    createdAt: new Date(Date.parse(createdAt) + i * 60000).toISOString(),
    ...(i === 0 ? { images: [{ id: `${kind}-image`, dataUrl: png }] } : {}),
  }));
  for (const kind of ['negative', 'positive']) {
    domain[`${kind}Records`][10].content = '一行记录';
    domain[`${kind}Records`][9].content = '第一行\n第二行';
    domain[`${kind}Records`][8].content = '随可用宽度自然换行的完整记录。'.repeat(12);
  }
  const reminders = { version: 1, done: {}, items: Array.from({ length: 5 }, (_, i) => ({ id: `scroll-habit-${i}`, title: `固定区习惯${i}`, group: '工作', domainId: 'work', kind: 'focus', note: '', minutes: 0, enabled: true, priority: 'none' })) };
  async function fresh(suffix, data = state, habits = reminders) {
    await page.goto(`${origin}/?domain-detail-scroll-${suffix}-${width}#/pages/posts/index`);
    await page.evaluate(({ data, habits }) => {
      localStorage.clear(); window.__miniFixture.persistEntryTools = true;
      window.__miniFixture.guestToolStates = { domains: data, reminders: habits };
      for (const [tool, value] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data: value, pending: false, revision: 0 }));
      location.hash = '#/pages/domain-detail/index?id=work';
    }, { data, habits });
    await expect(page.locator('.domain-card')).toHaveCount(1);
  }
  const scroll = kind => page.locator(`.domain-card .is-${kind} .domain-record-scroll`);
  const outer = () => page.locator('.page-scroll');
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:domains')).data);
  const fixedBounds = () => page.locator('.domain-detail-toolbar,.domain-heading,.domain-goals,.domain-habits-heading,.domain-habit-scroll').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
  async function geometry(safeArea = 0) {
    await expect(page.locator('.domain-detail-page .domain-card')).toHaveCount(1);
    await expect(page.locator('.domain-detail-page .domain-record-scroll')).toHaveCount(2);
    const result = await page.locator('.domain-detail-page').evaluate((node, safeArea) => {
      const view = document.querySelector('.preview-content').getBoundingClientRect(), card = node.querySelector('.domain-card').getBoundingClientRect();
      const columns = [...node.querySelectorAll('.domain-record-scroll')].map(item => { const r = item.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, overflow: getComputedStyle(item).overflowY, widthOverflow: item.scrollWidth - item.clientWidth }; });
      return { top: card.top - view.top, bottom: card.bottom - (view.bottom - safeArea), columns, outerRange: node.closest('.page-scroll').scrollHeight - node.closest('.page-scroll').clientHeight };
    }, safeArea);
    expect(result.outerRange, 'Detail has no outer vertical scroll range').toBeLessThanOrEqual(1);
    expect(result.top).toBeGreaterThanOrEqual(0); expect(result.bottom).toBeLessThanOrEqual(-7);
    expect(result.columns).toHaveLength(2);
    for (const column of result.columns) {
      expect(column.height, 'Short phones retain usable independent record viewports').toBeGreaterThanOrEqual(40);
      expect(column.bottom).toBeLessThanOrEqual((await page.locator('.domain-card').boundingBox()).y + (await page.locator('.domain-card').boundingBox()).height);
      expect(column.widthOverflow).toBeLessThanOrEqual(1); expect(column.overflow).toMatch(/auto|scroll/);
    }
    expect(result.columns[0].top).toBeCloseTo(result.columns[1].top, 1);
    expect(result.columns[0].bottom).toBeCloseTo(result.columns[1].bottom, 1);
  }
  await fresh('long'); await geometry();
  await require('./check-domain-record-height.cjs')({ rows: page.locator('.domain-card .domain-record'), expect });
  await expect(page.locator('.domain-habit-grid')).toHaveCount(1);
  const habits = () => page.locator('.domain-habit-scroll');
  const before = await fixedBounds();
  for (const kind of ['negative', 'positive']) {
    await expect(scroll(kind).locator('.domain-record')).toHaveCount(12);
    const first = scroll(kind).locator('.domain-record').first();
    await expect(first).toContainText('完整文本与**原始标记**。'.repeat(80));
    expect(await scroll(kind).evaluate(node => node.scrollHeight - node.clientHeight)).toBeGreaterThan(300);
    await scroll(kind).hover(); await page.mouse.wheel(0, 350); await page.waitForTimeout(200);
    expect(await scroll(kind).evaluate(node => node.scrollTop), 'Wheel scrolls the selected record column').toBeGreaterThan(0);
    const other = kind === 'negative' ? 'positive' : 'negative';
    expect(await scroll(other).evaluate(node => node.scrollTop), 'The opposite column remains independent').toBe(0);
    await scroll(kind).evaluate(node => { node.scrollTop = node.scrollHeight; });
    await expect(scroll(kind).locator('.domain-record').last()).toBeInViewport();
    const end = await scroll(kind).evaluate(node => ({ viewport: node.getBoundingClientRect().bottom, last: node.querySelector('.domain-record:last-child').getBoundingClientRect().bottom }));
    expect(end.last, 'The complete last record can be read through the bottom of the column').toBeLessThanOrEqual(end.viewport + 1);
    await expect(scroll(kind).locator('.domain-record-images img')).toBeInViewport();
    await scroll(kind).hover(); await page.mouse.wheel(0, 500); await page.waitForTimeout(200);
    expect(await outer().evaluate(node => node.scrollTop)).toBe(0);
    expect(await fixedBounds(), 'Reading records leaves the toolbar, goals and habits fixed').toEqual(before);
    await scroll(kind).evaluate(node => { node.scrollTop = 0; });
  }
  expect(await saved(), 'Scrolling never rewrites history').toEqual(state);
  await page.screenshot({ path: path.join(out, `domain-detail-fixed-${width}.png`) });
  const recordPositions = await page.locator('.domain-record-scroll').evaluateAll(nodes => nodes.map(node => node.scrollTop));
  const habitRange = await habits().evaluate(node => ({ vertical: node.scrollHeight - node.clientHeight, horizontal: node.scrollWidth - node.clientWidth, overflow: getComputedStyle(node).overflowY }));
  expect(habitRange.vertical, 'Additional habits remain available through vertical scrolling').toBeGreaterThan(40);
  expect(habitRange.horizontal, 'Habits do not scroll horizontally').toBeLessThanOrEqual(1);
  expect(habitRange.overflow).toMatch(/auto|scroll/);
  await habits().hover(); await page.mouse.wheel(0, 220); await page.waitForTimeout(200);
  expect(await habits().evaluate(node => node.scrollTop), 'Wheel gestures scroll the habit grid down').toBeGreaterThan(0);
  await habits().evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(page.getByRole('button', { name: '创建工作习惯', exact: true })).toBeInViewport();
  expect(await fixedBounds()).toEqual(before);
  expect(await page.locator('.domain-record-scroll').evaluateAll(nodes => nodes.map(node => node.scrollTop)), 'Habit scrolling leaves both record columns in place').toEqual(recordPositions);
  await habits().hover(); await page.mouse.wheel(0, 500); await page.waitForTimeout(200);
  expect(await outer().evaluate(node => node.scrollTop)).toBe(0);
  await page.screenshot({ path: path.join(out, `domain-detail-habits-scrolled-${width}.png`) });
  if (width === 375) {
    await page.locator('.preview-device').evaluate(node => node.style.setProperty('--preview-safe-area-bottom', '34px'));
    await geometry(34);
    await page.screenshot({ path: path.join(out, `domain-detail-fixed-safe-area-${width}.png`) });
    await page.locator('.preview-device').evaluate(node => node.style.removeProperty('--preview-safe-area-bottom'));
  }
  await scroll('positive').locator('.domain-record').first().click();
  const editor = page.locator('.domain-sheet-record-edit');
  await expect(editor).toBeVisible(); await page.getByRole('button', { name: '关闭记录编辑', exact: true }).click(); await expect(editor).toHaveCount(0);
  expect(await saved()).toEqual(state);
  await page.getByRole('button', { name: '返回领域列表', exact: true }).click();
  await expect(page.locator('.domains-recent-records')).toBeVisible();
  await page.getByRole('button', { name: '打开工作领域', exact: true }).click(); await geometry();
  const empty = require('./habit-domain-test-fixture.cjs')();
  await fresh('empty', empty, { version: 1, items: [], done: {} }); await geometry();
  for (const kind of ['positive', 'negative']) {
    expect(await scroll(kind).evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1);
  }
  await scroll('negative').click(); await expect(page.locator('.entry-composer')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('.entry-composer')).toHaveCount(0);
  expect(await saved()).toEqual(empty);
};
