const { goToPageSection } = require('./page-section-test-helpers.cjs');
const path = require('node:path');

module.exports = async function checkScreenLayout({ page, origin, out, width, expect, routes, failures }) {
  async function checkCurrent(route) {
    await page.waitForTimeout(250);
    if (route === 'favorites') {
      await expect(page.locator('.account-data-notice')).toContainText('数据保存与同步');
      await expect(page.locator('.account-data-notice')).toContainText('保存在本机');
      await expect(page.locator('.account-data-notice')).toContainText('不会自动合并');
    } else expect(await page.locator('body').innerText(), `${route}: routine local-save notice belongs on My`).not.toContain('保存在本机');
    if (route === 'statistics') {
      await expect(page.locator('.statistics-page')).toBeVisible();
      for (const label of ['待办', '专注', '习惯', '饮食', '领域', '成长']) {
        await page.getByRole('button', { name: `${label}统计`, exact: true }).click();
        await expect(page.locator('.statistics-content')).toBeVisible();
        await require('./section-title-checks.cjs')(page, expect);
        const layout = await page.locator('.statistics-page').evaluate(node => ({ page: node.scrollWidth - node.clientWidth, document: document.documentElement.scrollWidth - innerWidth }));
        if (layout.page > 2 || layout.document > 2) failures.push(`${width} statistics ${label}: ${JSON.stringify(layout)}`);
      }
      await page.locator('.page-scroll').evaluate(node => { node.scrollTop = 0; });
      await page.screenshot({ path: path.join(out, `screen-statistics-${width}.png`), fullPage: true });
      return;
    }
    if (route === 'domains') {
      await expect(page.locator('.domain-first-grid .domain-entry-shell:not(.domain-create-shell)')).toHaveCount(8);
      await expect(page.locator('.domain-continuation-grid .domain-uncategorized-shell')).toHaveCount(1);
      await expect(page.locator('.domains-recent-records')).toBeVisible();
      await expect(page.locator('.domains-recent-records .section-title,.domains-recent-records .domain-record-add,.domains-recent-records .domains-recent-meta')).toHaveCount(0);
      const domainLayout = await page.locator('.domains-index').evaluate(node => {
        const viewport = document.querySelector('.preview-content').getBoundingClientRect(), outer = node.closest('.page-scroll'), recent = node.querySelector('.domains-recent-records').getBoundingClientRect(), grid = node.querySelector('.domain-first-grid').getBoundingClientRect();
        const cards = [...node.querySelectorAll('.domain-first-grid .domain-entry-shell:not(.domain-create-shell)')].map(card => card.getBoundingClientRect());
        return { outerOverflow: outer.scrollHeight - outer.clientHeight, outerTop: outer.scrollTop, horizontalOverflow: node.scrollWidth - node.clientWidth, recentBottom: recent.bottom, gridTop: grid.top, gridBottom: grid.bottom, viewportBottom: viewport.bottom, clippedCards: cards.filter(card => card.top < grid.top - 1 || card.bottom > grid.bottom + 1).length, rows: new Set(cards.map(card => Math.round(card.top))).size, columns: new Set(cards.map(card => Math.round(card.left))).size };
      });
      expect(domainLayout.outerOverflow, 'The domain page has no outer scroll range').toBeLessThanOrEqual(1); expect(domainLayout.outerTop).toBe(0); expect(domainLayout.horizontalOverflow).toBeLessThanOrEqual(1);
      expect(await page.locator('.domain-entry-scroll').evaluate(node => node.scrollHeight - node.clientHeight), 'Creation and additional cards use the card window').toBeGreaterThan(40);
      expect(domainLayout.recentBottom).toBeLessThanOrEqual(domainLayout.gridTop); expect(domainLayout.gridBottom).toBeLessThanOrEqual(domainLayout.viewportBottom);
      expect(domainLayout.clippedCards).toBe(0); expect(domainLayout.rows).toBe(4); expect(domainLayout.columns).toBe(2);
      await require('./section-title-checks.cjs')(page, expect);
      await page.screenshot({ path: path.join(out, `screen-domains-${width}.png`), fullPage: true });
      return;
    }
    const single = ['todos', 'daily', 'daily-return', 'memos'].includes(route) || route.startsWith('pomodoro');
    const ids = single ? ['page-core'] : ['page-core', 'page-more'];
    await expect(page.locator('#page-core')).toBeVisible();
    await expect(page.locator('.screen-scroll-hint')).toHaveCount(0);
    if (route === 'index') await expect(page.locator('#page-more .screen-return-hint')).toHaveCount(0);
    if (single) await expect(page.locator('#page-more')).toHaveCount(0);
    await page.waitForTimeout(250);
    await require('./section-title-checks.cjs')(page, expect);
    const layout = await page.evaluate(() => {
      const viewport = document.querySelector('.preview-content').getBoundingClientRect();
      const core = document.querySelector('#page-core').getBoundingClientRect();
      const more = document.querySelector('#page-more')?.getBoundingClientRect();
      const content = document.querySelector('#page-core .core-content');
      const clock = document.querySelector('#page-core .focus-clock-card');
      const clockBox = clock?.getBoundingClientRect();
      const clippedClock = clock ? [...clock.children].some(child => { const rect = child.getBoundingClientRect(); return rect.top < clockBox.top - 1 || rect.bottom > clockBox.bottom + 1; }) : false;
      return { viewport: viewport.height, core: core.height, top: core.top - viewport.top, more: more ? more.top - viewport.top : null,
        clippedClock,
        contentOverflow: content ? content.scrollHeight - content.clientHeight : 0,
        overflow: document.querySelector('.page-scroll').scrollWidth - document.querySelector('.page-scroll').clientWidth };
    });
    if (Math.abs(layout.core - layout.viewport) > 2 || Math.abs(layout.top) > 2 || (layout.more !== null && layout.more < layout.viewport - 2) || layout.overflow > 2 || layout.contentOverflow > 2 || layout.clippedClock)
      failures.push(`${width} ${route} first screen: ${JSON.stringify(layout)}`);
    await page.screenshot({ path: path.join(out, `screen-${route}-${width}.png`), fullPage: true });
    for (let index = 0; index < ids.length - 1; index += 1) {
      if (index > 0) {
        const screen = await page.locator(`#${ids[index]}`).evaluate(node => {
          const viewport = node.closest('.page-scroll').getBoundingClientRect();
          const bounds = node.getBoundingClientRect();
          const content = node.querySelector('.core-content');
          const buttons = [...node.querySelectorAll(':scope > .screen-scroll-hint,:scope > .screen-return-hint')];
          return { height: bounds.height, viewport: viewport.height, top: bounds.top - viewport.top,
            overflow: content ? content.scrollHeight - content.clientHeight : 0,
            clippedHint: buttons.some(button => { const box = button.getBoundingClientRect(); return box.top < viewport.top - 2 || box.bottom > viewport.bottom + 2; }) };
        });
        if (Math.abs(screen.height - screen.viewport) > 2 || Math.abs(screen.top) > 2 || screen.overflow > 2 || screen.clippedHint)
          failures.push(`${width} ${route} ${ids[index]}: ${JSON.stringify(screen)}`);
        await page.screenshot({ path: path.join(out, `screen-${route}-${ids[index]}-${width}.png`), fullPage: true });
      }
      await goToPageSection(page, ids[index + 1]);
      await expect.poll(() => page.locator(`#${ids[index + 1]}`).evaluate(node => Math.abs(node.getBoundingClientRect().top - node.closest('.page-scroll').getBoundingClientRect().top))).toBeLessThan(2);
      await expect(page.locator(`#${ids[index + 1]}`)).toBeInViewport();
    }
  }
  for (const route of routes) {
    await page.goto(`${origin}/?screen-layout#/pages/${route}/index${route === 'detail' ? '?slug=preview-0' : ''}`);
    await checkCurrent(route);
    if (route === 'choose') {
      for (let step = 0; step < 9; step += 1) await page.locator('.choice-aligned-option').first().click();
      await expect(page.locator('.choice-result-page')).toBeVisible();
      await checkCurrent('choose-result');
    }
    if (route === 'daily') {
      await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
      const filters = page.getByRole('dialog', { name: '筛选习惯', exact: true });
      await expect(filters).toBeInViewport({ ratio: 1 });
      await expect(filters.getByRole('button', { name: '重置习惯筛选', exact: true })).toBeInViewport({ ratio: 1 });
      await expect(filters.getByRole('button', { name: '打卡日历', exact: true })).toHaveCount(0);
      await page.screenshot({ path: path.join(out, `screen-daily-filter-${width}.png`) });
      await filters.getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
      await checkCurrent('daily-return');
    }
    if (route === 'pomodoro') {
      await expect(page.locator('#page-core .focus-clock-card')).toHaveCount(1);
      await expect(page.locator('#page-core .focus-week-card, #page-core .focus-record-filters, #page-core .focus-tabs')).toHaveCount(0);
      await expect(page.locator('.activity-analysis,.focus-today-card,.focus-week-card')).toHaveCount(0);
      await expect(page.locator('.focus-history-heading,.focus-reminders,#page-more')).toHaveCount(0);
      await page.getByRole('button', { name: '开始专注', exact: true }).click();
      await page.locator('.page-scroll').first().evaluate(node => { node.scrollTop = 0; });
      await checkCurrent('pomodoro-running');
    }
  }
};
