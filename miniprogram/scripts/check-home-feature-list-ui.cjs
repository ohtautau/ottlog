const path = require('node:path');

module.exports = async function checkHomeFeatureList({ page, origin, out, width, expect }) {
  const storageKey = 'ottlog.home-shortcuts.v1';
  await page.goto(`${origin}/#/pages/index/index`);
  await expect(page.locator('#home-sort-pomodoro')).toBeVisible();
  const saved = await page.evaluate(key => localStorage.getItem(key), storageKey);
  const configuredKeys = await page.locator('.today-grid [id^="home-sort-"]').evaluateAll(nodes => nodes.map(node => node.id.slice('home-sort-'.length)).sort());
  const snapshot = locator => locator.locator('.home-feature-option').evaluateAll(nodes => nodes.map(node => ({
    key: node.dataset.featureKey, type: node.dataset.featureType,
    name: node.querySelector('.home-feature-name').textContent,
    icon: node.querySelector('.shortcut-icon').dataset.icon,
    src: node.querySelector('img.library-icon').getAttribute('src'),
  })));
  const directory = page.locator('#page-more .home-feature-list');
  const definitions = await snapshot(directory);
  expect(definitions).toHaveLength(16);
  expect(definitions.find(item => item.key === 'pomodoro')).toMatchObject({ icon: 'library:focus', src: '/assets/habits/focus.png' });
  expect(definitions.find(item => item.key === 'memo-list')).toMatchObject({ icon: 'library:notes' });
  await page.getByRole('button', { name: '设置快捷方式', exact: true }).click();
  await page.locator('#home-sort-pomodoro .home-shortcut-replace').click();
  const sheet = page.getByRole('dialog', { name: '替换快捷方式', exact: true });
  expect(await snapshot(sheet)).toEqual(definitions);
  await expect(sheet.locator('.home-feature-heading')).toHaveText(['快捷操作', '功能界面', '阅读与空间']);
  await expect(sheet.getByRole('button', { name: '替换为：便签', exact: true })).toBeDisabled();
  await expect(sheet.getByRole('button', { name: '替换为：便签', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.getByRole('button', { name: '替换为：便签', exact: true })).toHaveCSS('opacity', '1');
  expect(await sheet.locator('.home-feature-option[aria-pressed="true"]').evaluateAll(nodes => nodes.map(node => node.dataset.featureKey).sort()), 'All configured shortcuts stay visibly selected, including unavailable duplicates').toEqual(configuredKeys);
  await expect(sheet.getByRole('button', { name: '替换为：开始番茄钟', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const controls = await sheet.locator('.home-feature-option').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect(), grid = node.parentElement;
    return { width: r.width, height: r.height, columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length, overflow: grid.scrollWidth - grid.clientWidth };
  }));
  for (const control of controls) {
    expect(control.width).toBeCloseTo(controls[0].width, 1);
    expect(control.height).toBeGreaterThanOrEqual(40);
    expect(control.columns).toBe(2); expect(control.overflow).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: path.join(out, `shared-feature-replacement-${width}.png`) });
  await sheet.locator('.home-editor-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(sheet.getByRole('button', { name: '替换为：个人空间', exact: true })).toBeInViewport();
  await page.screenshot({ path: path.join(out, `shared-feature-replacement-bottom-${width}.png`) });
  await sheet.getByRole('button', { name: '替换为：番茄钟', exact: true }).click();
  await expect(sheet.getByRole('button', { name: '替换为：番茄钟', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.getByRole('button', { name: '替换为：开始番茄钟', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(sheet.getByRole('button', { name: '替换为：便签', exact: true })).toBeDisabled();
  await expect(sheet.getByRole('button', { name: '替换为：便签', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(saved);
  await sheet.locator('.editor-heading-actions button').click();
  await require('./confirm-unsaved-close.cjs')(page);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(saved);
  await page.locator('#home-sort-pomodoro .home-shortcut-replace').click();
  await sheet.getByRole('button', { name: '替换为：番茄钟', exact: true }).click();
  await sheet.getByRole('button', { name: '保存快捷方式', exact: true }).click();
  await page.reload();
  await expect(page.locator('#home-sort-pomodoro-page .shortcut-background')).toHaveAttribute('data-background-icon', 'library:focus');
  await page.locator('#home-sort-pomodoro-page').getByRole('button', { name: '番茄钟', exact: true }).click();
  await expect(page.locator('.focus-live')).toContainText('准备就绪');
  await page.evaluate(({ key, value }) => value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value), { key: storageKey, value: saved });
  await page.goto(`${origin}/#/pages/index/index`);
  await expect(page.locator('#home-sort-pomodoro')).toBeVisible();
};
