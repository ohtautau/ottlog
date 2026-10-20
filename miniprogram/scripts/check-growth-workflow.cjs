const path = require('node:path');

// Growth input was removed from the home page. Existing records remain readable
// through statistics; business mutations retain their separate pure-data checks.
module.exports = async function checkGrowthArchives({ page, origin, out, width, expect }) {
  const statistics = () => page.locator('.statistics-growth');
  const card = name => statistics().locator('.statistics-growth-domain').filter({ has: page.locator('.statistics-growth-name').filter({ hasText: new RegExp(`^${name}$`) }) });
  const go = route => page.evaluate(value => { location.hash = `#/pages/${value}`; }, route);
  const click = name => page.getByRole('button', { name, exact: true }).click();
  async function values(name, recent, month = recent, week = recent) {
    await expect(card(name).locator('.growth-total-value')).toHaveText(String(recent));
    await expect(card(name).locator('.growth-month-value')).toHaveText(String(month));
    await expect(card(name).locator('.growth-week-value')).toHaveText(String(week));
  }
  async function layout() {
    const tracks = await statistics().locator('.statistics-growth-domain').evaluateAll(nodes => nodes.map(node => ({
      count: node.querySelectorAll('.growth-track').length,
      width: node.querySelector('.growth-track').getBoundingClientRect().width,
      overflow: node.scrollWidth - node.clientWidth,
    })));
    for (const track of tracks) {
      expect(track.count, `${width}: one shared scale line per domain`).toBe(1);
      expect(track.width).toBeGreaterThan(80);
      expect(track.overflow).toBeLessThanOrEqual(2);
    }
    expect(await statistics().evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(2);
  }
  await page.clock.install({ time: new Date('2026-09-02T12:00:00') });
  await page.goto(`${origin}/?growth-demo-statistics-${width}#/pages/statistics/index?panel=growth`);
  await expect(statistics().locator('.statistics-growth-domain')).toHaveCount(7);
  expect(Number(await card('工作').locator('.growth-total-value').textContent())).toBeGreaterThan(0);
  await layout();
  await page.screenshot({ path: path.join(out, `growth-demo-statistics-${width}.png`) });
  const demoState = await page.evaluate(() => window.__miniFixture.growthLocalState);
  await go('index/index');
  await require('./page-section-test-helpers.cjs').goToPageSection(page);
  await expect(page.locator('#page-third,.home-domain-overview')).toHaveCount(0);
  await expect(page.locator('.growth-garden,.growth-domain-card,.growth-detail-sheet,.growth-editor-sheet,.growth-goal-sheet,.growth-manage-sheet')).toHaveCount(0);
  for (const label of ['小进步 +1', '中等进步 +3', '大进步 +5']) await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.__miniFixture.growthLocalState), 'Viewing home does not migrate or replace legacy growth data').toEqual(demoState);

  // Monday 31 August belongs to this week, but not to September. The three
  // layers share one origin and scale, so week can exceed month. Older events
  // count only in lifetime values; future records and future goals stay excluded.
  await page.goto(`${origin}/?growth-periods-${width}#/pages/posts/index`);
  const original = await page.evaluate(() => {
    const at = (month, day) => new Date(2026, month - 1, day, 10).toISOString();
    const outside = Array.from({ length: 40 }, (_, index) => ({ id: `outside-${index}`, domainId: 'work', size: 'large', createdAt: at(6, 1) }));
    const older = Array.from({ length: 22 }, (_, index) => ({ id: `older-${index}`, domainId: 'work', size: 'large', createdAt: at(8, 20) }));
    const health = Array.from({ length: 16 }, (_, index) => ({ id: `health-${index}`, domainId: 'health', size: 'large', createdAt: at(8, 20) }));
    const growth = {
      version: 1,
      domains: [{ id: 'work', name: '旧工作存档', iconId: 'work', archived: false }, { id: 'health', name: '健康', iconId: 'pulse', archived: false }, { id: 'old', name: '已归档旧领域', iconId: 'plant', archived: true }],
      events: [...outside, ...older, ...health,
        { id: 'within-period', domainId: 'work', size: 'small', createdAt: at(7, 1) },
        { id: 'monday', domainId: 'work', size: 'large', createdAt: at(8, 31) },
        { id: 'tuesday', domainId: 'work', size: 'medium', createdAt: at(9, 1) },
        { id: 'wednesday', domainId: 'work', size: 'small', createdAt: at(9, 2) },
        { id: 'future-progress', domainId: 'work', size: 'large', createdAt: at(9, 3), note: '明天才发生的进步' },
        { id: 'archived-progress', domainId: 'old', size: 'medium', createdAt: at(8, 25) }],
      completedGoals: [
        { id: 'past-goal', domainId: 'work', title: '已完成的里程碑', createdAt: at(8, 20), completedAt: at(9, 1) },
        { id: 'future-goal', domainId: 'work', title: '明天才完成的目标', createdAt: at(9, 1), completedAt: at(9, 3) },
      ],
    };
    window.__miniFixture.guestToolStates = { growth };
    location.hash = '#/pages/statistics/index?panel=growth';
    return growth;
  });
  await values('旧工作存档', 120, 4, 9);
  await values('健康', 80, 0, 0);
  await values('已归档旧领域', 3, 0, 0);
  await expect(statistics().locator('.growth-legend')).toContainText('统一刻度 200');
  await expect(statistics()).toContainText('统计包含已归档领域');
  const bars = await card('旧工作存档').evaluate(node => {
    const get = period => node.querySelector(`.growth-progress-${period}`).getBoundingClientRect().width;
    const layers = ['recent', 'month', 'week'].map(period => node.querySelector(`.growth-progress-${period}`));
    return { recent: get('recent'), month: get('month'), week: get('week'), colors: layers.map(layer => getComputedStyle(layer).backgroundColor), origins: layers.map(layer => { const rect = layer.getBoundingClientRect(); return { left: rect.left, top: rect.top, bottom: rect.bottom }; }) };
  });
  expect(bars.recent).toBeGreaterThan(0);
  expect(bars.week).toBeGreaterThan(bars.month);
  expect(bars.week / bars.recent).toBeCloseTo(9 / 120, 2);
  expect(bars.month / bars.recent).toBeCloseTo(4 / 120, 2);
  expect(new Set(bars.colors).size).toBe(3);
  for (const layer of bars.origins.slice(1)) {
    expect(Math.abs(layer.left - bars.origins[0].left)).toBeLessThanOrEqual(1);
    expect(Math.abs(layer.top - bars.origins[0].top)).toBeLessThanOrEqual(1);
    expect(Math.abs(layer.bottom - bars.origins[0].bottom)).toBeLessThanOrEqual(1);
  }
  const healthWidth = await card('健康').locator('.growth-progress-recent').evaluate(node => node.getBoundingClientRect().width);
  expect(bars.recent).toBeGreaterThan(healthWidth);
  expect(bars.recent / healthWidth).toBeCloseTo(120 / 80, 2);
  await expect(card('旧工作存档').locator('.statistics-growth-total')).toHaveText('累计 320 · 66 次记录 · 已完成目标 1');
  await layout();
  await page.screenshot({ path: path.join(out, `growth-periods-${width}.png`) });
  expect(await page.evaluate(() => window.__miniFixture.guestToolStates.growth)).toEqual(original);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path === '/personal-tools/growth' && request.method !== 'GET'))).toEqual([]);
  await go('index/index');
  await require('./page-section-test-helpers.cjs').goToPageSection(page);
  await expect(page.locator('#page-third,.home-domain-overview')).toHaveCount(0);
  expect(await page.evaluate(() => window.__miniFixture.guestToolStates.growth)).toEqual(original);
  await go('statistics/index?panel=growth');
  await values('旧工作存档', 120, 4, 9);

  if (width !== 360) return;
  await go('favorites/index');
  await page.getByPlaceholder('输入博客账号').fill('preview-reader');
  await page.getByPlaceholder('输入密码', { exact: true }).fill('fixture-only-password');
  await click('登录并同步');
  await expect(page.locator('.account-user-name')).toHaveText('preview-reader');
  await go('statistics/index?panel=growth');
  await expect(card('旧工作存档')).toHaveCount(0);
  await expect(card('已归档旧领域')).toHaveCount(0);
  await go('favorites/index');
  await click('退出');
  await go('statistics/index?panel=growth');
  await values('旧工作存档', 120, 4, 9);
  await expect(card('旧工作存档').locator('.statistics-growth-total')).toHaveText('累计 320 · 66 次记录 · 已完成目标 1');
  expect(await page.evaluate(() => window.__miniFixture.guestToolStates.growth)).toEqual(original);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path === '/personal-tools/growth' && request.method !== 'GET'))).toEqual([]);
  console.log(`${width}: preserved growth archives, shared scales/periods, future filtering, read-only statistics and account isolation passed`);
};
