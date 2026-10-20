const fs = require('node:fs');
const path = require('node:path');

// Exercise the real shared selector and card without the historical add-entry helper.
// This browser adapter does not certify rendering in the native WeChat runtime.
module.exports = async function checkHomeShortcutLibrary({ page, origin, out, width, expect }) {
  await require('./check-home-feature-list-ui.cjs')({ page, origin, out, width, expect });
  const key = 'ottlog.home-shortcuts.v1';
  const setting = () => page.getByRole('button', { name: '设置快捷方式', exact: true });
  const picker = () => page.getByRole('dialog', { name: '选择快捷方式背景图标', exact: true });
  const editor = () => page.getByRole('dialog', { name: '编辑快捷方式', exact: true });
  const read = () => page.evaluate(key => localStorage.getItem(key), key);
  const edit = async shortcut => {
    if (await setting().getAttribute('aria-pressed') !== 'true') await setting().click();
    await page.locator(`#home-sort-${shortcut} .home-shortcut-edit`).click();
  };
  const openPicker = () => page.getByRole('button', { name: '选择快捷方式背景', exact: true }).click();
  const closePicker = () => page.getByRole('button', { name: '关闭背景图标选择', exact: true }).click();
  const choose = async label => {
    await openPicker();
    await picker().getByRole('button', { name: '选择背景图标：' + label, exact: true }).click();
    await expect(picker()).toHaveCount(0);
  };
  const save = () => page.getByRole('button', { name: '保存快捷方式', exact: true }).click();
  const closeEdit = () => page.getByRole('button', { name: '关闭快捷方式编辑', exact: true }).click();
  const prompt = () => page.getByRole('dialog', { name: '保存修改？', exact: true });
  async function geometry(label) {
    const result = await page.evaluate(() => {
      const box = node => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; };
      const sheet = document.querySelector('.icon-library-sheet,.home-editor-sheet');
      return {
        documentOverflow: document.documentElement.scrollWidth - innerWidth,
        sheetOverflow: sheet ? sheet.scrollWidth - sheet.clientWidth : 0,
        cards: [...document.querySelectorAll('.today-grid > .today-entry')].map(node => ({ id: node.id, ...box(node) })),
        capture: box(document.querySelector('.today-capture')),
      };
    });
    expect(result.documentOverflow, `${width}: ${label} does not overflow the screen`).toBeLessThanOrEqual(1);
    expect(result.sheetOverflow, `${width}: ${label} does not overflow its sheet`).toBeLessThanOrEqual(1);
    return result;
  }

  await page.goto(`${origin}/#/pages/index/index`);
  await expect(page.locator('.today-grid > .today-entry')).toHaveCount(6);
  const original = await read();
  const originalGeometry = await geometry('original cards');
  await edit('memo-list');
  await expect(editor().locator('.home-editor-field-label,.single-line-field')).toHaveCount(0);
  const titleLayout = await editor().evaluate(node => {
    const row = node.querySelector('.entity-title-row'), input = row.querySelector('input'), icon = row.querySelector('.home-editor-icon-trigger');
    const colors = node.querySelector('.home-editor-color-section'), preview = node.querySelector('.home-editor-preview');
    const box = target => { const r = target.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
    const inputStyle = getComputedStyle(input), rowStyle = getComputedStyle(row), colorsStyle = getComputedStyle(colors);
    return { sheet: box(node), row: box(row), input: box(input), icon: box(icon), colors: box(colors), preview: box(preview), font: parseFloat(inputStyle.fontSize), inputBorder: inputStyle.borderTopWidth,
      underline: parseFloat(rowStyle.borderBottomWidth), lineColor: rowStyle.borderBottomColor, separator: parseFloat(colorsStyle.borderBottomWidth), separatorColor: colorsStyle.borderBottomColor,
      image: icon.querySelector('.library-icon').getAttribute('src'), buttons: [...colors.querySelectorAll('button')].map(box) };
  });
  expect(titleLayout.icon.right).toBeLessThanOrEqual(titleLayout.input.left);
  expect(Math.abs((titleLayout.icon.top + titleLayout.icon.bottom) / 2 - (titleLayout.input.top + titleLayout.input.bottom) / 2)).toBeLessThanOrEqual(1);
  expect(titleLayout.icon.width).toBeGreaterThanOrEqual(40); expect(titleLayout.icon.height).toBeGreaterThanOrEqual(40);
  expect(titleLayout.font).toBeGreaterThan(18); expect(titleLayout.inputBorder).toBe('0px');
  expect(titleLayout.underline).toBeGreaterThan(0); expect(titleLayout.lineColor).toBe('rgb(59, 75, 86)');
  expect(titleLayout.separator).toBe(0);
  expect(titleLayout.colors.top).toBeGreaterThanOrEqual(titleLayout.row.bottom);
  expect(titleLayout.row.top).toBeGreaterThanOrEqual(titleLayout.preview.bottom);
  expect(titleLayout.image).toBe('/assets/habits/notes.png');
  for (const button of titleLayout.buttons) expect(button.height).toBeGreaterThanOrEqual(40);
  await expect(editor().locator('.home-editor-footer')).toHaveCount(1);
  await expect(editor().getByRole('button', { name: '取消', exact: true })).toHaveCount(0);
  await expect(editor().getByRole('button', { name: '保存快捷方式', exact: true })).toBeInViewport({ ratio: 1 });
  const footerLayout = await editor().evaluate(node => {
    const footer = node.querySelector('.home-editor-footer'), button = footer.querySelector('button');
    const r = button.getBoundingClientRect(), sheet = node.getBoundingClientRect(), style = getComputedStyle(footer);
    return { height: r.height, bottomGap: sheet.bottom - r.bottom, buttons: footer.querySelectorAll('button').length, border: parseFloat(style.borderTopWidth) };
  });
  expect(footerLayout.height).toBeGreaterThanOrEqual(48); expect(footerLayout.buttons).toBe(1);
  expect(footerLayout.bottomGap).toBeCloseTo(8, 0); expect(footerLayout.border).toBe(0);
  await expect(editor().locator('.home-editor-preview')).toBeInViewport();
  await page.screenshot({ path: path.join(out, `shortcut-editor-title-${width}.png`) });
  await page.evaluate(() => document.documentElement.style.setProperty('--preview-safe-area-bottom', '34px'));
  await expect(editor().locator('.home-editor-preview')).toBeInViewport();
  const safeGap = await editor().evaluate(node => node.getBoundingClientRect().bottom - node.querySelector('.home-editor-footer button').getBoundingClientRect().bottom);
  expect(safeGap, 'The native tabBar owns its safe area; the save row keeps one eight-pixel bottom gap').toBeCloseTo(8, 0);
  await page.evaluate(() => document.documentElement.style.removeProperty('--preview-safe-area-bottom'));
  const nameInput = page.getByRole('textbox', { name: '快捷方式名称：便签', exact: true });
  await nameInput.fill('');
  await expect(editor().locator('.today-entry-name')).toHaveText('便签');
  await nameInput.pressSequentially('便签小册');
  expect(await read(), 'Typing edits only the draft').toBe(original);
  const renamed = await read();
  await expect(editor()).toBeVisible();
  await openPicker();
  await expect(picker().locator('.icon-library-option')).toHaveCount(64);
  await expect(picker().locator('.icon-library-option[aria-pressed="true"]')).toHaveCount(1);
  await expect(picker().getByRole('button', { name: '选择背景图标：笔记', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const cells = await picker().locator('.icon-library-option').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height, src: node.querySelector('.library-icon').getAttribute('src') };
  }));
  expect(new Set(cells.map(cell => cell.src)).size).toBe(64);
  for (const cell of cells) {
    expect(cell.width).toBeGreaterThanOrEqual(40); expect(cell.height).toBeGreaterThanOrEqual(40);
    expect(cell.src).toMatch(/\/assets\/(?:habits|icons)\/[a-z]+\.png$/);
    expect(cell.src).not.toContain('outline-sheet');
  }
  await expect(editor().locator('input')).toBeDisabled();
  const search = picker().getByRole('textbox', { name: '搜索图标', exact: true });
  await search.fill('摄影');
  await expect(picker().locator('.icon-library-option')).toHaveCount(1);
  await expect(picker().getByRole('button', { name: '选择背景图标：摄影', exact: true }).locator('.library-icon')).toHaveAttribute('src', '/assets/habits/camera.png');
  for (const query of ['镜头', '  PHOTOGRAPHY  ']) {
    await search.fill(query);
    await expect(picker().locator('.icon-library-option')).toHaveCount(1);
    await expect(picker().locator('.icon-library-option')).toHaveText('摄影');
    await expect(picker().getByRole('button', { name: '选择背景图标：摄影', exact: true }).locator('.library-icon')).toHaveAttribute('src', '/assets/habits/camera.png');
  }
  await picker().getByRole('button', { name: '清空图标搜索', exact: true }).click();
  await picker().getByRole('button', { name: '图标分类：运动健康', exact: true }).click();
  await expect(picker().locator('.icon-library-option')).toHaveCount(14);
  await expect(picker().getByRole('button', { name: '选择背景图标：摄影', exact: true })).toHaveCount(0);
  await search.fill('骑行');
  await expect(picker().locator('.icon-library-option')).toHaveCount(1);
  await expect(picker().getByRole('button', { name: '选择背景图标：骑行', exact: true })).toBeVisible();
  for (const query of ['脚踏车', 'bicycle']) {
    await search.fill(query);
    await expect(picker().locator('.icon-library-option')).toHaveText('骑行');
  }
  await search.fill('photography');
  await expect(picker().locator('.icon-library-option')).toHaveCount(0);
  await picker().getByRole('button', { name: '清空图标搜索', exact: true }).click();
  await picker().getByRole('button', { name: '图标分类：全部', exact: true }).click();
  await expect(picker().locator('.icon-library-option')).toHaveCount(64);
  await geometry('64 colored choices');
  await page.screenshot({ path: path.join(out, `shortcut-colored-library-${width}.png`) });
  await page.locator('.icon-library-backdrop').click({ position: { x: 2, y: 2 } });
  await expect(picker()).toHaveCount(0);
  await expect(editor()).toBeVisible();
  await expect(page.getByRole('textbox', { name: '快捷方式名称：便签', exact: true })).toHaveValue('便签小册');
  await expect(page.locator('.home-editor-preview .shortcut-background')).toHaveAttribute('data-background-icon', 'library:notes');
  expect(await read(), 'Closing only the top picker preserves the name draft without saving').toBe(renamed);
  await openPicker();
  await page.keyboard.press('Escape');
  await expect(picker()).toHaveCount(0);
  await expect(editor()).toBeVisible();
  await expect(page.getByRole('textbox', { name: '快捷方式名称：便签', exact: true })).toHaveValue('便签小册');
  expect(await read(), 'Escape closes only the picker and preserves the unsaved draft').toBe(renamed);

  for (const [label, icon] of [['摄影', 'camera'], ['目标', 'goal'], ['理财', 'money']]) {
    await choose(label);
    await expect(page.locator('.home-editor-preview .shortcut-background')).toHaveAttribute('data-background-icon', `library:${icon}`);
    expect(await read(), 'Choosing an icon remains a draft until saved').toBe(renamed);
    await openPicker();
    await expect(picker().locator('.icon-library-option[aria-pressed="true"]')).toHaveCount(1);
    await expect(picker().getByRole('button', { name: '选择背景图标：' + label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await closePicker();
  }
  await choose('摄影');
  await page.getByRole('button', { name: '使用玫瑰色', exact: true }).click();
  const art = await page.locator('.home-editor-preview .shortcut-background-icon').evaluate(node => {
    const style = getComputedStyle(node), image = node.querySelector('img');
    return { width: parseFloat(style.width), height: parseFloat(style.height), opacity: parseFloat(style.opacity), src: image.getAttribute('src'), icon: node.querySelector('.library-icon').getAttribute('data-icon') };
  });
  expect(art.width).toBe(142); expect(art.height).toBe(142); expect(art.opacity).toBeCloseTo(.19, 2);
  expect(art.src).toBe('/assets/icons/outline-sheet.png'); expect(art.icon).toBe('camera');
  await geometry('gray outline preview');
  await page.screenshot({ path: path.join(out, `shortcut-outline-preview-${width}.png`) });
  const savedBeforeClose = await read();
  expect(savedBeforeClose).toBe(original);
  await closeEdit();
  await expect(prompt()).toBeVisible();
  expect(await read(), 'Closing through X does not commit before confirmation').toBe(original);
  await page.screenshot({ path: path.join(out, `shortcut-editor-unsaved-${width}.png`) });
  await prompt().getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(editor()).toBeVisible(); await expect(nameInput).toHaveValue('便签小册');
  await closeEdit(); await prompt().getByRole('button', { name: '保存', exact: true }).click();
  await expect(editor()).toHaveCount(0); await page.reload();
  const saved = await read();
  expect(saved, 'Confirmation saves the draft before closing').not.toBe(savedBeforeClose);
  expect(JSON.parse(saved).items.find(item => item.key === 'memo-list')).toMatchObject({ icon: 'library:camera', name: '便签小册', color: 'rose', rank: 1 });
  await expect(page.locator('#home-sort-memo-list .shortcut-background')).toHaveAttribute('data-background-icon', 'library:camera');
  expect((await geometry('saved cards')).cards).toEqual(originalGeometry.cards);
  await edit('memo-list'); await openPicker();
  await expect(picker().locator('.icon-library-option[aria-pressed="true"]')).toHaveCount(1);
  await expect(picker().getByRole('button', { name: '选择背景图标：摄影', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await closePicker(); await closeEdit(); await page.reload();
  expect(await read(), 'Opening and closing without edits does not write preferences').toBe(saved);
  await edit('memo-list'); await choose('植物'); await closeEdit();
  await prompt().getByRole('button', { name: '不保存', exact: true }).click();
  expect(await read(), 'Discarding a changed icon keeps the persisted appearance').toBe(saved);
  await edit('memo-list'); await choose('植物');
  await page.locator('.home-editor-backdrop').click({ position: { x: 2, y: 2 } });
  await prompt().getByRole('button', { name: '保存', exact: true }).click();
  expect(JSON.parse(await read()).items.find(item => item.key === 'memo-list').icon).toBe('library:plant');
  await edit('memo-list'); await choose('摄影'); await save();
  expect(await read()).toBe(saved);

  await edit('memo-list');
  await page.evaluate(() => { window.__miniFixture.failHomeShortcutWrites = true; });
  await page.getByRole('button', { name: '使用晴蓝色', exact: true }).click();
  await expect(editor().getByRole('alert')).toHaveCount(0);
  expect(await read(), 'Changing color never writes before Save').toBe(saved);
  await save();
  await expect(editor().getByRole('alert')).toContainText('保存失败');
  await expect(editor().getByRole('textbox')).toBeDisabled();
  await expect(editor().getByRole('button', { name: '使用晴蓝色', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await read(), 'Failed explicit save keeps the previous persisted layout').toBe(saved);
  await closeEdit(); await expect(editor()).toBeVisible();
  await expect(prompt()).toBeVisible();
  await prompt().getByRole('button', { name: '保存', exact: true }).click();
  await expect(prompt()).toHaveCount(0); await expect(editor().getByRole('alert')).toContainText('保存失败');
  expect(await read(), 'Closing cannot drop a still-failing absolute save target').toBe(saved);
  await page.evaluate(() => { window.__miniFixture.failHomeShortcutWrites = false; });
  await save(); await expect(editor()).toHaveCount(0);
  expect(JSON.parse(await read()).items.find(item => item.key === 'memo-list')).toMatchObject({ icon: 'library:camera', name: '便签小册', color: 'blue', rank: 1 });
  await edit('memo-list'); await page.getByRole('button', { name: '使用玫瑰色', exact: true }).click(); await save();
  expect(await read()).toBe(saved);

  if (await setting().getAttribute('aria-pressed') !== 'true') await setting().click();
  await page.locator('#home-sort-memo-list .home-shortcut-replace').click();
  await page.getByRole('button', { name: '替换为：任务', exact: true }).click();
  expect(await read(), 'Function replacement changes only its draft before saving').toBe(saved);
  await save(); await page.reload();
  expect(JSON.parse(await read()).items.find(item => item.key === 'todos')).toMatchObject({ icon: 'library:camera', name: '便签小册', color: 'rose', rank: 1 });
  await expect(page.locator('#home-sort-todos .shortcut-background')).toHaveAttribute('data-background-icon', 'library:camera');
  await page.getByRole('button', { name: '排序快捷方式', exact: true }).click();
  await page.locator('#home-sort-todos').getByRole('button', { name: /^下移.*快捷方式$/ }).click();
  await expect.poll(async () => JSON.parse(await read()).items.find(item => item.key === 'todos')).toMatchObject({ icon: 'library:camera', name: '便签小册', color: 'rose', rank: 2 });
  await page.reload();
  await expect(page.locator('#home-sort-todos .shortcut-background')).toHaveAttribute('data-background-icon', 'library:camera');
  const finalGeometry = await geometry('moved library card');
  for (const property of ['width', 'height']) expect(Math.abs(finalGeometry.cards.find(card => card.id === 'home-sort-todos')[property] - originalGeometry.cards[0][property]), 'Moving between grid rows keeps card dimensions within native subpixel rounding').toBeLessThanOrEqual(1);
  fs.writeFileSync(path.join(out, `shortcut-library-geometry-${width}.json`), JSON.stringify({ originalGeometry, art, finalGeometry }, null, 2));
  await page.screenshot({ path: path.join(out, `shortcut-outline-saved-${width}.png`) });

  const old = JSON.parse(await read());
  const oldEntry = old.items.find(item => item.key === 'todos');
  oldEntry.icon = 'camera'; oldEntry.name = '旧自定';
  const oldBytes = JSON.stringify(old);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value: oldBytes });
  await page.reload();
  await expect(page.locator('#home-sort-todos .shortcut-background')).toHaveAttribute('data-background-icon', 'library:camera');
  expect(await read(), 'Reading a legacy icon alias does not rewrite preferences').toBe(oldBytes);
  await edit('todos'); await closeEdit();
  expect(await read(), 'Closing an untouched legacy edit keeps the original stored bytes').toBe(oldBytes);
  await edit('todos'); await page.getByRole('textbox', { name: '快捷方式名称：任务', exact: true }).fill('旧自定新');
  expect(await read()).toBe(oldBytes);
  await page.keyboard.press('Escape'); await expect(prompt()).toBeVisible();
  await prompt().getByRole('button', { name: '保存', exact: true }).click(); await page.reload();
  expect(JSON.parse(await read()).items.find(item => item.key === 'todos')).toMatchObject({ ...oldEntry, name: '旧自定新', icon: 'library:camera' });
  await expect(page.locator('.shortcut-icon-sheet')).toHaveCount(0);

  // The real add card stays inside the shortcut scroll window, including empty layouts.
  await page.evaluate(key => localStorage.removeItem(key), key);
  await page.reload();
  const add = () => page.getByRole('button', { name: '添加快捷方式', exact: true });
  const selection = () => page.getByRole('dialog', { name: '选择快捷方式', exact: true });
  const shortcutScroll = () => page.locator('.today-shortcut-scroll');
  const pageScroll = () => page.locator('.page-scroll').first();
  await expect(page.locator('.today-grid > .home-shortcut-card')).toHaveCount(7);
  await expect(page.locator('.today-entry')).toHaveCount(6);
  await page.screenshot({ path: path.join(out, `shortcut-add-top-${width}.png`) });
  const captureBefore = await page.locator('.today-capture').boundingBox();
  await shortcutScroll().evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(add()).toBeInViewport({ ratio: 1 });
  const addGeometry = await add().evaluate(node => {
    const box = target => { const r = target.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { button: box(node), symbol: box(node.querySelector('.button-add-symbol')), text: node.textContent.trim(), card: box(node.parentElement) };
  });
  expect(addGeometry.text, 'The add card contains only the drawn plus').toBe('');
  expect(addGeometry.button.width).toBeGreaterThanOrEqual(40);
  expect(addGeometry.button.height).toBeGreaterThanOrEqual(40);
  for (const axis of ['x', 'y']) {
    const size = axis === 'x' ? 'width' : 'height';
    expect(Math.abs(addGeometry.symbol[axis] + addGeometry.symbol[size] / 2 - addGeometry.card[axis] - addGeometry.card[size] / 2), 'The plus is centered in its card').toBeLessThanOrEqual(1);
  }
  expect(await pageScroll().evaluate(node => node.scrollTop), 'Reading the add card keeps the first screen fixed').toBeLessThan(2);
  expect(await page.locator('.today-capture').boundingBox()).toEqual(captureBefore);
  await page.screenshot({ path: path.join(out, `shortcut-add-bottom-${width}.png`) });
  const beforeAdd = await read();
  await add().click();
  await expect(selection()).toBeVisible();
  expect(await read(), 'Opening the add card does not write preferences').toBe(beforeAdd);
  await selection().getByRole('button', { name: '取消修改快捷方式', exact: true }).click();
  await expect(selection()).toHaveCount(0);
  expect(await read()).toBe(beforeAdd);
  await add().click();
  for (const name of ['创建任务', '饮食记录', '文章分类', '收藏']) await selection().getByRole('button', { name: `添加快捷方式：${name}`, exact: true }).click();
  expect(await read(), 'Function selection remains a draft until saved').toBe(beforeAdd);
  if (width === 360) await page.evaluate(() => { window.__miniFixture.failHomeShortcutWrites = true; });
  await save();
  if (width === 360) {
    await expect(selection()).toBeVisible();
    expect(await read(), 'A failed save keeps the previous layout and selected draft').toBe(beforeAdd);
    await page.evaluate(() => { window.__miniFixture.failHomeShortcutWrites = false; });
    await save();
  }
  await expect(selection()).toHaveCount(0);
  const added = JSON.parse(await read());
  expect(added.items).toHaveLength(10);
  expect(added.items.every(item => !item.key.includes('add')), 'The placeholder never enters stored shortcuts').toBe(true);
  await page.reload();
  await shortcutScroll().evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(add()).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: '排序快捷方式', exact: true }).click();
  await expect(add()).toBeDisabled();
  await expect(page.locator('.home-shortcut-card.is-create .card-corner-actions')).toHaveCount(0);
  await page.getByRole('button', { name: '排序快捷方式', exact: true }).click();
  await page.getByRole('button', { name: '设置快捷方式', exact: true }).click();
  await expect(add()).toBeEnabled();
  await page.getByRole('button', { name: '设置快捷方式', exact: true }).click();
  await require('./page-section-test-helpers.cjs').goToPageSection(page, 'page-more');
  await require('./page-section-test-helpers.cjs').goToPageSection(page, 'page-core');
  await require('./home-shortcut-test-helpers.cjs').writeLayout(page, { version: 1, items: added.items.slice(0, 5) });
  await expect(page.locator('.today-grid > .home-shortcut-card')).toHaveCount(6);
  await expect(add()).toBeInViewport({ ratio: 1 });
  await require('./home-shortcut-test-helpers.cjs').writeLayout(page, { version: 1, items: [] });
  await expect(page.locator('.today-entry')).toHaveCount(0);
  await expect(add()).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: path.join(out, `shortcut-add-empty-${width}.png`) });
  const empty = await read();
  await add().click();
  await selection().getByRole('button', { name: '添加快捷方式：收藏', exact: true }).click();
  await selection().getByRole('button', { name: '取消修改快捷方式', exact: true }).click();
  await require('./confirm-unsaved-close.cjs')(page);
  expect(await read(), 'Discarding a selection keeps the intentionally empty layout').toBe(empty);
  await add().click();
  await selection().getByRole('button', { name: '添加快捷方式：收藏', exact: true }).click();
  await save(); await page.reload();
  expect(JSON.parse(await read()).items).toHaveLength(1);
  expect(JSON.parse(await read()).items[0]).toMatchObject({ key: 'favorites', rank: 1 });
  await expect(add()).toHaveCount(1);
};
