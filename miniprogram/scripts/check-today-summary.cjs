const { goToPageSection } = require('./page-section-test-helpers.cjs');
const path = require('node:path');
const { checkDefaultEntrances } = require('./home-shortcut-test-helpers.cjs');

// Legacy home-overview/summary commands now verify the requested two-screen home.
module.exports = async function checkHomeNavigation({ page, origin, out, width, expect }) {
  const groups = [
    { title: '快捷操作', type: 'action', items: [['create', '创建任务'], ['memos', '创建便签'], ['create-habit', '创建习惯'], ['create-domain', '创建领域'], ['pomodoro', '开始番茄钟']] },
    { title: '功能界面', type: 'page', items: [['todos', '任务'], ['memo-list', '便签'], ['statistics', '统计'], ['daily', '习惯'], ['growth', '领域'], ['pomodoro-page', '番茄钟'], ['meals', '饮食记录'], ['choose', '选境']] },
    { title: '阅读与空间', type: 'page', items: [['categories', '文章分类'], ['favorites', '收藏'], ['journal', '个人空间']] },
  ];
  const directory = () => page.locator('#page-more');
  const feature = key => directory().locator(`.today-all-tool[data-feature-key="${key}"]`);
  async function checkDirectory() {
    await expect(directory().locator('.home-feature-group > .home-feature-heading')).toHaveText(groups.map(group => group.title));
    await expect(directory().locator('.today-all-tool')).toHaveCount(groups.reduce((count, group) => count + group.items.length, 0));
    expect(await directory().locator('.today-all-tool').evaluateAll(nodes => nodes.map(node => node.dataset.featureKey))).toEqual(groups.flatMap(group => group.items.map(([key]) => key)));
    await expect(directory().locator('.more-section-title')).toHaveText('全部功能');
    await expect(directory().locator('.today-all-heading'), 'The directory has one main heading').toHaveCount(0);
    await expect(feature('create'), 'The first group starts in the current viewport; later groups remain reachable by scrolling').toBeInViewport({ ratio: 1 });
    for (let index = 0; index < groups.length; index += 1) {
      const group = directory().locator('.home-feature-group').nth(index);
      await expect(group.locator('.today-all-tool')).toHaveCount(groups[index].items.length);
      for (const [key, name] of groups[index].items) {
        await expect(feature(key)).toHaveAttribute('aria-label', groups[index].type === 'action' ? `操作：${name}` : `打开${name}`);
        await expect(feature(key).locator('.shortcut-icon')).toHaveCount(1);
        await expect(feature(key)).toHaveAttribute('data-feature-type', groups[index].type);
      }
    }
    await expect.poll(() => directory().locator('.shortcut-icon img.library-icon').evaluateAll(images => images.length === 16 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    const geometry = await directory().locator('.home-feature-group').evaluateAll((nodes, groups) => {
      const box = node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
      return nodes.map((group, index) => {
        const grid = group.querySelector('.home-feature-grid');
        return { grid: box(grid), columns: getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
          overflow: grid.scrollWidth - grid.clientWidth,
          buttons: [...grid.querySelectorAll('.today-all-tool')].map((button, item) => {
            const name = groups[index].items[item][1];
            const label = [...button.querySelectorAll('*')].find(node => node.textContent.trim() === name && ![...node.children].some(child => child.textContent.trim() === name));
            const range = document.createRange(); range.selectNodeContents(label);
            const style = getComputedStyle(label);
            const arrow = button.querySelector('.home-feature-arrow');
            return { key: button.dataset.featureKey, button: box(button), label: box(label), text: box(range),
              fontSize: style.fontSize, fontWeight: style.fontWeight, labelOverflow: label.scrollWidth - label.clientWidth, arrow: arrow && box(arrow) };
          }) };
      });
    }, groups);
    for (const [index, group] of geometry.entries()) {
      expect(group.columns, `${width}: ${groups[index].title} keeps two columns`).toBe(2);
      expect(group.overflow).toBeLessThanOrEqual(1);
      for (const [item, control] of group.buttons.entries()) {
        const label = `${width}: ${control.key}`;
        expect(control.button.height, `${label} touch height`).toBeGreaterThanOrEqual(40);
        expect(control.button.width, `${label} touch width`).toBeGreaterThanOrEqual(40);
        expect(control.button.width, `${label} equal column widths`).toBeCloseTo(group.buttons[0].button.width, 1);
        expect(control.fontSize, `${label} readable fixed text size`).toBe('14px');
        expect(control.fontWeight, `${label} shared control text weight`).toBe('500');
        expect(control.labelOverflow, `${label} full name`).toBeLessThanOrEqual(1);
        expect(control.text.left, `${label} text left boundary`).toBeGreaterThanOrEqual(control.button.left - 1);
        expect(control.text.right, `${label} text right boundary`).toBeLessThanOrEqual(control.button.right + 1);
        expect(control.text.top, `${label} text top boundary`).toBeGreaterThanOrEqual(control.button.top - 1);
        expect(control.text.bottom, `${label} text bottom boundary`).toBeLessThanOrEqual(control.button.bottom + 1);
        expect(control.button.left).toBeGreaterThanOrEqual(group.grid.left - 1);
        expect(control.button.right).toBeLessThanOrEqual(group.grid.right + 1);
        if (control.arrow) expect(control.text.right, `${label} arrow does not overlap the name`).toBeLessThanOrEqual(control.arrow.left - 4);
        if (item % 2 === 1) {
          const previous = group.buttons[item - 1].button;
          expect(control.button.top, `${label} row alignment`).toBeCloseTo(previous.top, 1);
          expect(control.button.left - previous.right, `${label} column gap`).toBeGreaterThanOrEqual(6);
        }
        expect(control.button.left, `${label} fixed column boundary`).toBeCloseTo(group.buttons[item % 2].button.left, 1);
      }
      expect(group.grid.left, `${width}: aligned group grids`).toBeCloseTo(geometry[0].grid.left, 1);
      expect(group.grid.right, `${width}: aligned group widths`).toBeCloseTo(geometry[0].grid.right, 1);
    }
    expect(await directory().evaluate(node => node.scrollWidth - node.clientWidth), `${width}: directory has no horizontal overflow`).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  async function revealFeature(key) {
    const button = feature(key);
    await button.scrollIntoViewIfNeeded();
    await expect.poll(() => button.evaluate(node => {
      const box = node.getBoundingClientRect(), viewport = node.closest('.preview-content').getBoundingClientRect();
      return box.top >= viewport.top - 1 && box.bottom <= viewport.bottom + 1 && box.left >= viewport.left - 1 && box.right <= viewport.right + 1;
    }), { message: `${width}: ${key} is fully reachable inside the actual page viewport` }).toBe(true);
    return button;
  }
  await page.goto(`${origin}/?home-navigation-${width}#/pages/index/index`);
  await checkDefaultEntrances({ page, expect, out, width });
  const removed = () => page.locator('#page-third,#page-summary,.home-domain-overview,.today-summary,.growth-garden');
  await expect(removed()).toHaveCount(0);
  await expect(page.locator('#page-core')).toHaveCount(1);
  await expect(page.locator('#page-more')).toHaveCount(1);
  for (const name of ['进入领域进展', '返回领域进展']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  const positions = await page.locator('.page-scroll').evaluate(node => {
    const viewport = node.getBoundingClientRect(), core = node.querySelector('#page-core').getBoundingClientRect(), more = node.querySelector('#page-more').getBoundingClientRect();
    return { coreHeight: core.height, viewportHeight: viewport.height, gap: more.top - core.bottom };
  });
  expect(Math.abs(positions.coreHeight - positions.viewportHeight)).toBeLessThanOrEqual(2);
  expect(Math.abs(positions.gap), 'The directory directly follows the home screen without an empty overview slot').toBeLessThanOrEqual(2);
  const aligned = id => expect.poll(() => page.locator(id).evaluate(node => Math.abs(node.getBoundingClientRect().top - node.closest('.page-scroll').getBoundingClientRect().top))).toBeLessThan(2);
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  await expect(page.getByRole('button', { name: '返回主页', exact: true })).toHaveCount(0);
  await checkDirectory();
  await expect(directory().locator('.today-more-shortcuts,.today-shortcuts,.today-grid')).toHaveCount(0);
  expect(await directory().locator('.today-merged-shortcut').count(), 'The complete directory does not merge personalized cards').toBe(0);
  await expect(directory().locator('.today-journal'), 'Personal space has one directory entry without a duplicate footer button').toHaveCount(0);
  await page.screenshot({ path: path.join(out, `home-directory-${width}.png`) });
  for (const group of groups) {
    await revealFeature(group.items.at(-1)[0]);
    await page.screenshot({ path: path.join(out, `home-directory-${group.items.at(-1)[0]}-${width}.png`) });
  }
  await goToPageSection(page, 'page-core');
  await aligned('#page-core');
  await expect(removed()).toHaveCount(0);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => /^\/personal-tools\/(?:domains|reminders)$/.test(request.path))), 'Home no longer loads domain or habit records for the removed overview').toEqual([]);
  await page.screenshot({ path: path.join(out, `home-two-screens-${width}.png`) });
  await page.getByRole('button', { name: '领域', exact: true }).click();
  await expect(page).toHaveURL(/pages\/domains\/index$/);
  await expect(page.locator('.domain-entry-shell:not(.domain-uncategorized-shell) .domain-entry')).toHaveCount(8);
  await expect(page.locator('.domain-entry-shell:not(.domain-uncategorized-shell) .domain-progress-track')).toHaveCount(8);
  await expect(page.locator('.domain-uncategorized-shell')).toHaveCount(1);
  await page.locator('.preview-native-tabs a[href="#/pages/index/index"]').click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await expect(removed()).toHaveCount(0);
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  await (await revealFeature('memo-list')).click();
  await expect(page).toHaveURL(/pages\/memos\/index$/);
  await expect(page.locator('.memo-page')).toBeVisible();
  await expect(page.locator('.entry-composer,.memo-editor'), 'The new memo entry opens the saved-note list directly').toHaveCount(0);
  await page.locator('.preview-native-header > button').click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await expect(removed()).toHaveCount(0);
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  await (await revealFeature('statistics')).click();
  await expect(page).toHaveURL(/pages\/statistics\/index$/);
  await expect(page.locator('.statistics-page')).toBeVisible();
  await expect(page.locator('.statistics-tab')).toHaveText(['待办', '专注', '习惯', '饮食', '领域', '成长']);
  await page.getByRole('button', { name: '返回上一页', exact: true }).click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await expect(removed()).toHaveCount(0);
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  await (await revealFeature('memos')).click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await expect(page.locator('.entry-composer')).toBeVisible();
  await expect(page.getByRole('button', { name: '创建类型：备忘', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await expect(page.locator('.entry-composer')).toHaveCount(0);
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  await (await revealFeature('create')).click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await expect(page.getByRole('button', { name: '创建类型：任务', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await expect(page.locator('.entry-composer')).toHaveCount(0);
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  await expect(feature('eat')).toHaveCount(0);
  await (await revealFeature('meals')).click();
  await expect(page).toHaveURL(/pages\/meals\/index$/);
  await expect(page.locator('.meal-page')).toBeVisible();
  await expect(page.locator('button').filter({ hasText: '选下一餐' })).toHaveCount(0);
  await page.locator('.preview-native-header > button').click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await goToPageSection(page, 'page-core');
  await aligned('#page-core');
  await expect(removed()).toHaveCount(0);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && ['POST', 'PUT', 'DELETE'].includes(request.method)))).toEqual([]);
  // A page visit must not launch a timer or request reminder authorization.
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  const timerState = () => page.evaluate(() => window.__miniFixture.pomodoroLocalState?.active ?? null);
  const timerBefore = await timerState();
  await (await revealFeature('pomodoro-page')).click();
  await expect(page).toHaveURL(/pages\/pomodoro\/index$/);
  await expect(page.getByRole('button', { name: /开始专注$/ })).toBeVisible();
  expect(await timerState(), 'Page entry leaves the timer unchanged').toEqual(timerBefore);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && ['POST', 'PUT', 'DELETE'].includes(request.method)))).toEqual([]);
  await page.locator('.preview-native-header > button').click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  await (await revealFeature('pomodoro')).click();
  await expect(page).toHaveURL(/pages\/pomodoro\/index$/);
  await expect(page.locator('.focus-live')).toContainText('正在计时');
  await expect.poll(timerState).toMatchObject({ running: true });
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect.poll(timerState).toMatchObject({ running: false });
  const paused = await timerState();
  await page.locator('.preview-native-header > button').click();
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  await (await revealFeature('pomodoro-page')).click();
  await expect(page).toHaveURL(/pages\/pomodoro\/index$/);
  expect(await timerState(), 'Page entry preserves a paused timer without resuming it').toEqual(paused);
  await page.locator('.preview-native-header > button').click();
  await goToPageSection(page, 'page-more');
  await aligned('#page-more');
  await (await revealFeature('pomodoro')).click();
  await expect(page).toHaveURL(/pages\/pomodoro\/index$/);
  await expect.poll(timerState, { message: 'The start action resumes the same paused timer' }).toMatchObject({ id: paused.id, running: true });

};
