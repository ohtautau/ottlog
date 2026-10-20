const path = require('node:path');

// The real pages share a library; exercise the saved data as well as the picker.
// These run in the browser adapter and do not certify native WeChat rendering.
module.exports = async function checkIconLibrary({ page, origin, out, width, expect }) {
  const library = () => page.locator('.icon-library-sheet');
  const options = () => library().locator('.icon-library-option');
  const category = name => library().getByRole('button', { name: `图标分类：${name}`, exact: true });
  const option = name => library().getByRole('button', { name: `选择图标：${name}`, exact: true });
  const search = () => library().getByRole('textbox', { name: '搜索图标', exact: true });
  const closeLibrary = () => library().getByRole('button', { name: '关闭图标库', exact: true }).click();
  const habitEditor = () => page.locator('.daily-editor-sheet');
  const habitEntry = () => habitEditor().getByRole('button', { name: '选择习惯图标', exact: true }).first();
  const memoEditor = () => page.locator('.memo-sheet');
  const memoEntry = () => memoEditor().getByRole('button', { name: '选择便签图标', exact: true });
  const reminderState = () => page.evaluate(() => window.__miniFixture.reminderLocalState);
  const memoState = () => page.evaluate(() => window.__miniFixture.memoLocalState);
  const habitTitle = '每周游泳一次';
  const memoTitle = '旅行时想记下的事';
  const habitCard = () => page.locator('.daily-habit-scroll .daily-suggestion').filter({ has: page.locator('.daily-suggestion-title', { hasText: habitTitle }) });
  const memoRow = () => page.locator('.memo-note').filter({ has: page.locator('.memo-note-title', { hasText: memoTitle }) });

  async function checkLibraryGeometry(context, canClear) {
    await expect(library()).toBeVisible();
    await expect(library().getByRole('button', { name: '关闭图标库', exact: true })).toBeInViewport();
    const result = await library().evaluate(node => {
      const box = element => { const rect = element.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height }; };
      const scroll = node.querySelector('.icon-library-scroll');
      return {
        sheet: box(node), viewport: box(document.querySelector('.preview-content')),
        scroll: box(scroll), scrollHeight: scroll.scrollHeight, scrollWidth: scroll.scrollWidth,
        clientHeight: scroll.clientHeight, clientWidth: scroll.clientWidth,
        overflow: node.scrollWidth - node.clientWidth,
        options: [...node.querySelectorAll('.icon-library-option')].map(button => ({ ...box(button), overflow: button.scrollWidth - button.clientWidth })),
      };
    });
    expect(result.sheet.top, `${context}: sheet top`).toBeGreaterThanOrEqual(result.viewport.top - 1);
    expect(result.sheet.bottom, `${context}: sheet bottom`).toBeLessThanOrEqual(result.viewport.bottom + 1);
    expect(result.scroll.bottom, `${context}: scroll bottom`).toBeLessThanOrEqual(result.sheet.bottom + 1);
    expect(result.overflow, `${context}: sheet overflow`).toBeLessThanOrEqual(2);
    expect(result.scrollWidth - result.clientWidth, `${context}: grid overflow`).toBeLessThanOrEqual(2);
    expect(result.scrollHeight, `${context}: icons scroll internally`).toBeGreaterThan(result.clientHeight + 20);
    for (const button of result.options) expect(button.overflow, `${context}: icon label overflow`).toBeLessThanOrEqual(2);
    const outerTop = await page.locator('.page-scroll').evaluate(node => node.scrollTop);
    await library().locator('.icon-library-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; node.dispatchEvent(new Event('scroll')); });
    await expect(options().last()).toBeInViewport();
    await expect(library().getByRole('button', { name: '关闭图标库', exact: true })).toBeInViewport();
    if (canClear) await expect(library().getByRole('button', { name: '不使用图标', exact: true })).toBeInViewport();
    expect(await page.locator('.page-scroll').evaluate(node => node.scrollTop)).toBe(outerTop);
    await library().locator('.icon-library-scroll').evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event('scroll')); });
  }

  await page.goto(`${origin}/?icon-library-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    window.__miniFixture.guestToolStates = {
      reminders: { version: 1, items: [{ id: 'legacy-walk', title: '散步的旧习惯', group: '健康', kind: 'walk', note: '', minutes: 0, enabled: true }], done: {} },
      memos: { version: 1, notes: [] },
    };
    location.hash = '#/pages/daily/index';
  });
  const legacyCard = page.locator('.daily-habit-scroll .daily-suggestion').filter({ hasText: '散步的旧习惯' });
  await expect(legacyCard).toBeVisible();
  const legacySource = await legacyCard.locator('.habit-icon').getAttribute('src');
  await page.locator('#page-core').getByRole('button', { name: '创建习惯', exact: true }).click();
  await expect(habitEditor()).toBeVisible();
  const initialHabitSource = await habitEntry().locator('.habit-icon').getAttribute('src');
  await habitEntry().click();
  await expect(options()).toHaveCount(64);
  for (const name of ['全部', '运动健康', '学习工作', '生活家务', '饮食', '心情休息', '创作兴趣', '社交家庭', '出行财务']) await expect(category(name)).toBeVisible();
  await expect.poll(() => options().locator('.library-icon').evaluateAll(images => images.every(image => image.complete && image.naturalWidth === 192))).toBe(true);
  const allSources = await options().locator('.library-icon').evaluateAll(images => images.map(image => image.getAttribute('src')));
  expect(new Set(allSources).size, 'Each named icon has a distinct image').toBe(64);
  await checkLibraryGeometry(`${width} habit icons`, false);
  await page.screenshot({ path: path.join(out, `icon-library-habits-${width}.png`) });
  await category('运动健康').click();
  await expect(option('游泳')).toBeVisible();
  await expect(option('跑步')).toBeVisible();
  await expect(option('旅行')).toHaveCount(0);
  const sportsCount = await options().count();
  expect(sportsCount).toBeGreaterThan(1);
  expect(sportsCount).toBeLessThan(64);
  await search().fill('游泳');
  await expect(options()).toHaveCount(1);
  await expect(option('游泳')).toBeVisible();
  await search().fill('不存在的图标xyz');
  await expect(options()).toHaveCount(0);
  await expect(library().getByRole('button', { name: '关闭图标库', exact: true })).toBeEnabled();
  await search().fill('');
  await expect(options()).toHaveCount(sportsCount);
  await closeLibrary();
  await expect(habitEntry().locator('.habit-icon')).toHaveAttribute('src', initialHabitSource);
  await habitEntry().click();
  await category('全部').click();
  await search().fill('游泳');
  const swimSource = await option('游泳').locator('.library-icon').getAttribute('src');
  await option('游泳').click();
  await expect(library()).toHaveCount(0);
  await expect(habitEntry().locator('.habit-icon')).toHaveAttribute('src', swimSource);
  await page.getByPlaceholder('想多做什么？', { exact: true }).fill(habitTitle);
  await habitEditor().locator('.daily-editor-footer .ui-button-primary').click();
  await expect(habitEditor()).toHaveCount(0);
  expect((await reminderState()).items.find(item => item.title === habitTitle).iconId).toBe('swim');
  await expect(habitCard().locator('.habit-icon')).toHaveAttribute('src', swimSource);
  await expect(legacyCard.locator('.habit-icon')).toHaveAttribute('src', legacySource);
  expect((await reminderState()).items.find(item => item.id === 'legacy-walk').kind).toBe('walk');

  // Reopening a saved habit restores its icon. Cancelling an edit does not commit it.
  await habitCard().getByRole('button', { name: `查看习惯：${habitTitle}`, exact: true }).click();
  await expect(page.locator('.daily-detail-art .habit-icon')).toHaveAttribute('src', swimSource);
  await page.locator('.daily-detail-sheet').getByRole('button', { name: '编辑习惯', exact: true }).click();
  await habitEntry().click();
  await category('全部').click();
  await expect(option('游泳')).toHaveAttribute('aria-pressed', 'true');
  await search().fill('跑步');
  await option('跑步').click();
  await page.getByRole('button', { name: '关闭习惯编辑', exact: true }).click();
  expect((await reminderState()).items.find(item => item.title === habitTitle).iconId).toBe('swim');
  if (await page.locator('.daily-detail-sheet').count()) await page.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
  await page.locator('#page-core').getByRole('button', { name: '创建习惯', exact: true }).click();
  await expect(habitEntry().locator('.habit-icon')).toHaveAttribute('src', initialHabitSource);
  await page.getByRole('button', { name: '关闭习惯编辑', exact: true }).click();

  // The same library is optional in memos; cancelling and creating fresh notes
  // cannot inherit a previous note's selection.
  await page.evaluate(() => { location.hash = '#/pages/memos/index'; });
  await page.locator('.memo-toolbar').getByRole('button', { name: '创建便签', exact: true }).click();
  await memoEntry().click();
  await expect(options()).toHaveCount(64);
  await expect(library().locator('.icon-library-option[aria-pressed="true"]')).toHaveCount(0);
  await checkLibraryGeometry(`${width} memo icons`, true);
  await page.screenshot({ path: path.join(out, `icon-library-memos-${width}.png`) });
  await category('出行财务').click();
  await expect(option('旅行')).toBeVisible();
  await expect(option('理财')).toBeVisible();
  await expect(option('游泳')).toHaveCount(0);
  await search().fill('旅行');
  const travelSource = await option('旅行').locator('.library-icon').getAttribute('src');
  await option('旅行').click();
  await expect(memoEntry().locator('.library-icon')).toHaveAttribute('src', travelSource);
  await page.getByPlaceholder('准备记下什么？', { exact: true }).fill(memoTitle);
  await page.locator('.memo-body-input').fill('出门前检查行李，沿途多留一点时间。');
  await memoEditor().getByRole('button', { name: '创建便签', exact: true }).click();
  await expect(memoEditor()).toHaveCount(0);
  expect((await memoState()).notes.find(note => note.title === memoTitle).iconId).toBe('travel');
  await expect(memoRow().locator('.library-icon')).toHaveAttribute('src', travelSource);
  await page.evaluate(() => { location.hash = '#/pages/index/index'; });
  await expect(page.locator('.today-grid')).toBeVisible();
  await page.evaluate(() => { location.hash = '#/pages/memos/index'; });
  await expect(memoRow().locator('.library-icon')).toHaveAttribute('src', travelSource);
  await page.getByRole('button', { name: '管理便签删除', exact: true }).click();
  await memoRow().getByRole('button', { name: `查看便签：${memoTitle}`, exact: true }).click();
  await page.getByRole('dialog', { name: '便签内容', exact: true }).getByRole('button', { name: `编辑便签：${memoTitle}`, exact: true }).click();
  await memoEntry().click();
  await expect(option('旅行')).toHaveAttribute('aria-pressed', 'true');
  await search().fill('工作');
  await option('工作').click();
  await page.getByRole('button', { name: '关闭便签编辑', exact: true }).click();
  expect((await memoState()).notes.find(note => note.title === memoTitle).iconId).toBe('travel');
  await page.locator('.memo-toolbar').getByRole('button', { name: '创建便签', exact: true }).click();
  await memoEntry().click();
  await expect(library().locator('.icon-library-option[aria-pressed="true"]')).toHaveCount(0);
  await closeLibrary();
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();

  await memoRow().getByRole('button', { name: `查看便签：${memoTitle}`, exact: true }).click();
  await page.getByRole('dialog', { name: '便签内容', exact: true }).getByRole('button', { name: `编辑便签：${memoTitle}`, exact: true }).click();
  await memoEntry().click();
  await library().getByRole('button', { name: '不使用图标', exact: true }).click();
  await expect(library()).toHaveCount(0);
  await memoEditor().getByRole('button', { name: '保存', exact: true }).click();
  await expect(memoEditor()).toHaveCount(0);
  expect((await memoState()).notes.find(note => note.title === memoTitle).iconId).toBeUndefined();
  expect(await memoRow().locator('.library-icon').evaluateAll(images => images.map(image => image.getAttribute('src')))).not.toContain(travelSource);
  await expect(page.getByRole('dialog', { name: '便签内容', exact: true })).toBeVisible();
  await page.getByRole('dialog', { name: '便签内容', exact: true }).getByRole('button', { name: `编辑便签：${memoTitle}`, exact: true }).click();
  await memoEntry().click();
  await expect(library().locator('.icon-library-option[aria-pressed="true"]')).toHaveCount(0);
  await closeLibrary();
  await page.getByRole('button', { name: '关闭便签编辑', exact: true }).click();
};
