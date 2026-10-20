const path = require('node:path');
const { goToPageSection } = require('./page-section-test-helpers.cjs');

module.exports = async ({ page, origin, out, width, expect }) => {
  await page.goto(`${origin}/?home-directory-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    localStorage.clear();
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    window.__miniFixture.guestToolStates = {
      domains: { version: 1, domains: [{ id: 'home-work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] },
      reminders: { version: 1, items: [{ id: 'home-existing', title: '原习惯', group: '工作', domainId: 'home-work', kind: 'plant', note: '', minutes: 0, enabled: true }], done: { '2026-10-01': ['home-existing'] }, reflections: [{ id: 'home-reflection', habitId: 'home-existing', day: '2026-10-01', text: '原留言', createdAt: new Date('2026-10-01T12:00:00').getTime() }] },
    };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    location.hash = '#/pages/index/index';
  });
  const directory = () => page.locator('#page-more');
  const option = key => directory().locator(`.today-all-tool[data-feature-key="${key}"]`);
  const card = key => directory().locator(`.home-feature-entry[data-feature-key="${key}"]`);
  const keys = () => directory().locator('.today-all-tool').evaluateAll(nodes => nodes.map(node => node.dataset.featureKey));
  const storedOrder = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog.home-feature-order.v1')));
  const business = () => page.evaluate(() => Object.fromEntries(['domains', 'reminders'].map(tool => [tool, JSON.parse(localStorage.getItem(`ottlog-mini-tool-v1:guest:${tool}`)).data])));
  async function home() {
    await page.evaluate(() => { location.hash = '#/pages/index/index'; });
    await expect(option('create-habit')).toBeAttached();
    await goToPageSection(page);
  }
  await home();
  const before = await business();
  await expect(directory().locator('.home-feature-group > .home-feature-heading')).toHaveText(['快捷操作', '功能界面', '阅读与空间']);
  await expect(directory().locator('.today-all-tool')).toHaveCount(16);
  await expect(option('posts')).toHaveCount(0); await expect(option('domains')).toHaveCount(0);
  await expect(option('eat')).toHaveCount(0);
  await expect(option('todos')).toContainText('任务'); await expect(option('growth')).toContainText('领域');
  await expect(option('favorites')).toContainText('收藏');
  await expect(option('create-habit')).toContainText('创建习惯'); await expect(option('create-domain')).toContainText('创建领域');
  await page.screenshot({ path: path.join(out, `home-directory-${width}.png`) });
  const original = await keys(), sort = () => page.getByRole('button', { name: '排序全部功能', exact: true });
  await sort().click();
  await expect(card('create').getByRole('button', { name: '上移创建任务', exact: true })).toBeDisabled();
  await expect(card('pomodoro').getByRole('button', { name: '下移开始番茄钟', exact: true })).toBeDisabled();
  await expect(card('todos').getByRole('button', { name: '上移任务', exact: true })).toBeDisabled();
  await expect(card('choose').getByRole('button', { name: '下移选境', exact: true })).toBeDisabled();
  await expect(card('categories').getByRole('button', { name: '上移文章分类', exact: true })).toBeDisabled();
  await expect(card('journal').getByRole('button', { name: '下移个人空间', exact: true })).toBeDisabled();
  await card('create-habit').getByRole('button', { name: '上移创建习惯', exact: true }).click();
  const target = [...original]; [target[1], target[2]] = [target[2], target[1]];
  expect(await keys()).toEqual(target); expect((await storedOrder()).keys).toEqual(target);
  await card('journal').getByRole('button', { name: '上移个人空间', exact: true }).click();
  const pageMoved = [...target]; [pageMoved[14], pageMoved[15]] = [pageMoved[15], pageMoved[14]];
  expect(await keys()).toEqual(pageMoved);
  await card('journal').getByRole('button', { name: '下移个人空间', exact: true }).click();
  expect(await keys()).toEqual(target);
  // A reverse gesture inside the final long section returns to the first screen.
  await goToPageSection(page, 'page-core'); await goToPageSection(page);
  await expect(sort()).toHaveAttribute('aria-pressed', 'true');
  await option('create-domain').click(); await expect(page).toHaveURL(/pages\/index\/index$/);
  const controls = await card('create-habit').locator('.card-corner-actions button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  expect(controls.map(rect => [rect.width, rect.height])).toEqual([[40, 40], [40, 40]]);
  expect(controls[1].left - controls[0].right).toBeCloseTo(2, 1);
  await page.screenshot({ path: path.join(out, `home-directory-sorting-${width}.png`) });
  await page.evaluate(() => { window.__miniFixture.failHomeFeatureOrderWrites = true; });
  await card('create-domain').getByRole('button', { name: '上移创建领域', exact: true }).click();
  const retry = page.getByRole('button', { name: '重试全部功能排序', exact: true });
  await expect(retry).toBeVisible(); expect(await keys()).toEqual(target); expect((await storedOrder()).keys).toEqual(target);
  await expect(card('create-habit').getByRole('button', { name: '上移创建习惯', exact: true })).toBeDisabled();
  await retry.click(); expect(await keys()).toEqual(target);
  await page.evaluate(() => { window.__miniFixture.failHomeFeatureOrderWrites = false; });
  await retry.click();
  const retried = [...target]; [retried[2], retried[3]] = [retried[3], retried[2]];
  expect(await keys()).toEqual(retried); expect((await storedOrder()).keys).toEqual(retried);
  await sort().click(); await page.reload(); await goToPageSection(page);
  expect(await keys()).toEqual(retried); expect(await business()).toEqual(before);
  await goToPageSection(page, 'page-core');
  await page.getByRole('button', { name: '设置快捷方式', exact: true }).click();
  await page.locator('#home-sort-pomodoro .home-shortcut-replace').click();
  const replacement = page.getByRole('dialog', { name: '替换快捷方式', exact: true });
  expect(await replacement.locator('.home-editor-option').evaluateAll(nodes => nodes.map(node => node.dataset.featureKey))).toEqual(retried);
  await replacement.locator('.editor-heading-actions button').click(); await expect(replacement).toHaveCount(0);
  await page.getByRole('button', { name: '设置快捷方式', exact: true }).click(); await goToPageSection(page);
  await option('create-habit').click();
  await expect(page).toHaveURL(/pages\/daily\/index$/);
  const habit = page.getByRole('dialog', { name: '创建习惯', exact: true });
  await expect(habit).toBeVisible();
  await habit.getByRole('button', { name: '关闭习惯编辑', exact: true }).click();
  expect(await business()).toEqual(before);
  await home(); await option('create-habit').click(); await expect(habit).toBeVisible();
  await habit.getByRole('textbox', { name: '习惯名称', exact: true }).fill(`首页习惯${width}`);
  await habit.getByRole('button', { name: '创建习惯', exact: true }).click(); await expect(habit).toHaveCount(0);
  const afterHabit = await business();
  expect(afterHabit.reminders.items.filter(item => item.title === `首页习惯${width}`)).toHaveLength(1);
  expect(afterHabit.reminders.done).toEqual(before.reminders.done); expect(afterHabit.reminders.reflections).toEqual(before.reminders.reflections);
  expect(afterHabit.domains).toEqual(before.domains);
  await home(); await option('create-domain').click();
  await expect(page).toHaveURL(/pages\/domains\/index$/);
  const domain = page.getByRole('dialog', { name: '创建领域', exact: true });
  await expect(domain).toBeVisible();
  await domain.getByRole('textbox', { name: '领域名称', exact: true }).fill('取消的领域');
  await domain.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '保存修改？', exact: true })).toBeVisible();
  await require('./confirm-unsaved-close.cjs')(page); expect(await business()).toEqual(afterHabit);
  await home(); await option('create-domain').click(); await expect(domain).toBeVisible();
  await domain.getByRole('textbox', { name: '领域名称', exact: true }).fill(`首页领域${width}`);
  await domain.getByRole('button', { name: '创建领域', exact: true }).click(); await expect(domain).toHaveCount(0);
  const afterDomain = await business();
  expect(afterDomain.domains.domains.filter(item => item.name === `首页领域${width}`)).toHaveLength(1);
  expect(afterDomain.reminders).toEqual(afterHabit.reminders);
  await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
  await expect(habit).toHaveCount(0);
  await home(); await option('growth').click(); await expect(page).toHaveURL(/pages\/domains\/index$/); await expect(domain).toHaveCount(0);
  // Retirement is a read projection; custom cards and dormant dining archives remain intact.
  const savedRetirement = await page.evaluate(() => {
    const shortcuts = { version: 1, items: [
      { key: 'eat', name: '我的食选', color: 'peach', kind: 'card', rank: 1, icon: 'library:cook' },
      { key: 'growth', name: '我的领域', color: 'blue', kind: 'card', rank: 4, icon: 'library:work' },
      { key: 'meals', name: '我的餐单', color: 'rose', kind: 'card', rank: 19, icon: 'library:coffee' },
    ] };
    const archive = JSON.stringify({ data: { version: 1, customFoods: [], history: [{ id: 'retired-choice', name: '原食选', at: new Date().toISOString() }] }, pending: false, revision: 3 });
    const order = JSON.stringify({ version: 1, keys: ['eat', 'meals', 'growth'] });
    localStorage.setItem('ottlog.home-shortcuts.v1', JSON.stringify(shortcuts));
    localStorage.setItem('ottlog.home-feature-order.v1', order);
    localStorage.setItem('ottlog-mini-tool-v1:guest:dining', archive);
    return { shortcuts: JSON.stringify(shortcuts), order, archive, remaining: shortcuts.items.slice(1) };
  });
  await page.reload(); await home(); await goToPageSection(page, 'page-core');
  await expect(page.locator('.today-entry-name')).toHaveText(['我的领域', '我的餐单']);
  await expect(page.locator('#home-sort-eat')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ottlog.home-shortcuts.v1'))).toBe(savedRetirement.shortcuts);
  expect(await page.evaluate(() => localStorage.getItem('ottlog.home-feature-order.v1'))).toBe(savedRetirement.order);
  await page.getByRole('button', { name: '设置快捷方式', exact: true }).click();
  await page.locator('#home-sort-meals .home-shortcut-replace').click();
  await expect(replacement.locator('[data-feature-key="eat"]')).toHaveCount(0);
  await expect(replacement.locator('.home-editor-option')).toHaveCount(16);
  await replacement.locator('.editor-heading-actions button').click();
  expect(await page.evaluate(() => localStorage.getItem('ottlog.home-shortcuts.v1'))).toBe(savedRetirement.shortcuts);
  await page.locator('#home-sort-meals .home-shortcut-replace').click();
  await replacement.getByRole('button', { name: '保存快捷方式', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ottlog.home-shortcuts.v1')).items)).toEqual(savedRetirement.remaining);
  await page.getByRole('button', { name: '设置快捷方式', exact: true }).click();
  await page.locator('#home-sort-meals').click(); await expect(page).toHaveURL(/pages\/meals\/index$/);
  await expect(page.locator('.meal-page')).toBeVisible(); await goToPageSection(page);
  await expect(page.locator('button').filter({ hasText: '选下一餐' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ottlog-mini-tool-v1:guest:dining'))).toBe(savedRetirement.archive);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path === '/personal-tools/dining'))).toEqual([]);
  await page.screenshot({ path: path.join(out, `home-retired-food-${width}.png`) });
  await page.evaluate(() => localStorage.setItem('ottlog.home-shortcuts.v1', JSON.stringify({ version: 1, items: [{ key: 'eat', name: '我的食选', color: 'peach', kind: 'card', rank: 1 }] })));
  await page.reload(); await home();
  await expect(page.locator('.today-entry')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ottlog.home-shortcuts.v1')).items[0].key)).toBe('eat');
  await page.getByRole('button', { name: '添加快捷方式', exact: true }).click();
  const selector = page.getByRole('dialog', { name: '选择快捷方式', exact: true });
  await expect(selector.locator('[data-feature-key="eat"]')).toHaveCount(0);
  await expect(selector.locator('.home-editor-option')).toHaveCount(16);
  await selector.getByRole('button', { name: '添加快捷方式：饮食记录', exact: true }).click();
  await selector.getByRole('button', { name: '保存快捷方式', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ottlog.home-shortcuts.v1')).items.map(item => item.key))).toEqual(['meals']);
  expect(await page.evaluate(() => localStorage.getItem('ottlog-mini-tool-v1:guest:dining'))).toBe(savedRetirement.archive);
  console.log(`PASS ${width}: shared 40px sorting, group bounds, stored moves/retry, and direct habit/domain creation with cancellation and history preserved.`);
};
