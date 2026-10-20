const confirmUnsavedClose = require('./confirm-unsaved-close.cjs');
/* Exercise shared creation through the real home, todo and memo pages.
   All records, accounts and images are isolated browser fixtures. */
const path = require('node:path');
const sharp = require('../../web/node_modules/sharp');
const schedule = require('./todo-schedule-test-helpers.cjs');
const { checkOverlayFeedback } = require('./check-button-context.cjs');
const { swipeMode, submitWithSwipe } = require('./entry-swipe-test-helpers.cjs');
const { storageKey: homeShortcutKey, legacyLayout } = require('./home-shortcut-test-helpers.cjs');

module.exports = async function checkEntryCreation({ page, origin, out, width, expect, checkButtonAppearance }) {
  const image = (await sharp({ create: { width: 480, height: 320, channels: 3, background: '#b9dbca' } }).png().toBuffer()).toString('base64');
  const photoBackgrounds = await Promise.all(['#ffffff', '#101923'].map(background => sharp({ create: { width: 480, height: 320, channels: 3, background } }).png().toBuffer()));
  const composer = () => page.locator('.entry-composer');
  const mode = type => composer().getByRole('button', { name: `创建类型：${type}`, exact: true });
  const switchMode = async type => {
    await mode(type).click();
    await expect(mode(type)).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['任务', '备忘', '进展']) await checkButtonAppearance(mode(name), { kind: 'choice', selected: name === type }, expect);
  };
  const swipe = (name, gesture, target, context) => swipeMode({ page, composer: composer(), expect, name, gesture, target, context });
  const taskTitle = () => composer().locator('.todo-title-input');
  const taskBody = () => composer().locator('.todo-description');
  const memoTitle = () => composer().locator('.memo-title-input');
  const memoBody = () => composer().locator('.memo-body-input');
  const saveTask = () => composer().getByRole('button', { name: '创建任务', exact: true });
  const saveMemo = () => composer().getByRole('button', { name: '创建便签', exact: true });
  const close = async () => {
    await composer().locator('.todo-sheet-close,.memo-sheet-close').click();
    await confirmUnsavedClose(page);
    await expect(composer()).toHaveCount(0);
  };
  const go = route => page.evaluate(route => { location.hash = `#/pages/${route}/index`; }, route);
  const stored = async (tool, owner = 'guest') => page.evaluate(({ tool, owner }) => window.__miniPreviewControl.readStorage(`ottlog-mini-tool-v1:${owner}:${tool}`)?.data || window.__miniFixture.guestToolStates?.[tool], { tool, owner });
  const tagsField = () => composer().locator('.todo-tags-row,.memo-tags-field');
  const tagsPanel = () => tagsField().locator('.form-popover-panel');
  async function imageActionContext(type) {
    const picture = composer().locator('.memo-image').first(), imageNode = picture.locator('img'), remove = picture.getByRole('button', { name: '移除图片 1', exact: true });
    await expect(remove).toBeVisible();
    const originalSource = await imageNode.getAttribute('src');
    for (const [index, buffer] of photoBackgrounds.entries()) {
      // Only the rendered photo changes. Shared draft/image bytes and the
      // existing persistence assertions keep their original fixture values.
      await imageNode.evaluate((node, src) => { node.src = src; }, `data:image/png;base64,${buffer.toString('base64')}`);
      await imageNode.evaluate(node => node.decode());
      const photo = index ? [16, 25, 35] : [255, 255, 255];
      await checkOverlayFeedback({ page, button: remove, photo, context: `${type} image ${index} ${width}`, expect });
      const placement = await picture.evaluate(node => ({ picture: node.getBoundingClientRect().toJSON(), button: node.querySelector('button').getBoundingClientRect().toJSON() }));
      expect(placement.button.right, 'Image action stays within the photo width').toBeLessThanOrEqual(placement.picture.right + 1);
      expect(placement.button.left).toBeGreaterThanOrEqual(placement.picture.left - 1);
      expect(placement.button.top, 'Image action stays in the photo top corner').toBeGreaterThanOrEqual(placement.picture.top - 1);
      expect(placement.button.bottom).toBeLessThanOrEqual(placement.picture.bottom + 1);
      await page.screenshot({ path: path.join(out, `entry-image-overlay-${type}-${index ? 'dark' : 'light'}-${width}.png`) });
      await remove.evaluate(node => { node.disabled = true; });
      await checkOverlayFeedback({ page, button: remove, photo, context: `${type} disabled image ${index} ${width}`, expect, disabled: true });
      await remove.evaluate(node => node.click());
      await expect(composer().locator('.memo-image'), 'Disabled image action does not remove draft bytes').toHaveCount(1);
      await remove.evaluate(node => { node.disabled = false; });
    }
    await imageNode.evaluate((node, src) => { node.src = src; }, originalSource);
  }
  async function choiceAppearance(options) {
    for (const button of await options.all()) await checkButtonAppearance(button, { kind: 'choice', selected: await button.getAttribute('aria-pressed') === 'true' }, expect);
  }
  const openTags = async () => {
    const trigger = composer().getByRole('button', { name: '选择现有标签', exact: true });
    await checkButtonAppearance(trigger, { kind: 'secondary' }, expect);
    await trigger.click();
    await expect(tagsPanel()).toBeVisible();
    await checkButtonAppearance(trigger, { kind: 'secondary', selected: true }, expect);
    await choiceAppearance(tagsField().locator('.form-tag-common button'));
    await choiceAppearance(tagsPanel().locator('.form-tag-options button'));
    for (const option of await tagsField().locator('.form-tag-common button,.form-tag-options button').all()) await expect(option).toHaveText(`#${await option.getAttribute('aria-label')}`);
  };
  const selectedTags = async () => {
    await openTags();
    const value = await tagsPanel().getByRole('textbox').inputValue();
    await tagsPanel().getByRole('button', { name: '完成', exact: true }).click();
    return value;
  };
  async function priorityFlag(color, label) {
    const taskColors = { 高: 'rgb(231, 160, 151)', 中: 'rgb(228, 206, 133)', 低: 'rgb(153, 184, 236)', 无: 'rgb(171, 208, 178)' };
    expect(color, 'Task and memo priorities use the task palette at every level').toBe(taskColors[label]);
    const flag = composer().locator('.priority-select-flag,.memo-priority-flag');
    await expect(flag, 'The priority flag retains the selected business color independently of the shared button foreground').toHaveCSS('color', color);
    const appearance = await flag.evaluate(node => {
      const flagStyle = getComputedStyle(node), pennant = getComputedStyle(node, '::after');
      return { border: flagStyle.borderLeftColor, pennantBorder: pennant.borderTopColor, pennant: pennant.backgroundColor,
        buttonForeground: getComputedStyle(node.closest('button')).color };
    });
    expect(appearance.border).toBe(color);
    expect(appearance.pennantBorder).toBe(color);
    expect(appearance.pennant).toBe(label === '无' ? 'rgba(0, 0, 0, 0)' : color);
    expect(appearance.buttonForeground, 'Priority meaning stays in the flag while the trigger follows the shared button colors').toBe('rgb(199, 215, 223)');
    const geometry = await flag.evaluate(node => {
      const box = node.getBoundingClientRect(), button = node.closest('button').getBoundingClientRect();
      return { width: box.width, height: box.height, buttonWidth: button.width, buttonHeight: button.height,
        dx: (box.left + box.right - button.left - button.right) / 2, dy: (box.top + box.bottom - button.top - button.bottom) / 2 };
    });
    expect(geometry.width).toBe(16);
    expect(geometry.height).toBe(20);
    expect(geometry.buttonWidth).toBe(48);
    expect(geometry.buttonHeight).toBe(40);
    expect(Math.abs(geometry.dx), 'Priority flag has symmetric horizontal padding').toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.dy), 'Priority flag has symmetric vertical padding').toBeLessThanOrEqual(1);
  }
  const choosePriority = async label => {
    await expect(composer().locator('.todo-priority-toggle .select-chevron,.memo-priority-trigger .select-chevron')).toHaveCount(0);
    await composer().locator('.todo-priority-toggle,.memo-priority-trigger').click();
    await expect(composer().locator('.priority-option')).toHaveText(['高优先度', '中优先度', '低优先度', '无优先度']);
    await expect(composer().locator('.priority-popover-panel')).toHaveClass(/is-positioned/);
    await choiceAppearance(composer().locator('.priority-option'));
    const markers = composer().locator('.priority-option-mark');
    await expect(markers, 'All four vertical priority choices retain their colored flags').toHaveCount(4);
    expect(await markers.evaluateAll(nodes => new Set(nodes.map(node => getComputedStyle(node).color)).size)).toBe(4);
    expect(await markers.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).color))).toEqual(['rgb(231, 160, 151)', 'rgb(228, 206, 133)', 'rgb(153, 184, 236)', 'rgb(171, 208, 178)']);
    const menu = await composer().locator('.priority-popover-panel').evaluate(node => {
      const box = node.getBoundingClientRect(), anchor = node.closest('.form-choice-field').querySelector('button').getBoundingClientRect();
      return { width: box.width, gap: box.top - anchor.bottom, rows: [...node.querySelectorAll('.priority-option')].map(button => {
        const rect = button.getBoundingClientRect(), flag = button.querySelector('.priority-option-mark').getBoundingClientRect();
        const label = button.lastElementChild, range = document.createRange(); range.selectNodeContents(label);
        const text = range.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height,
          flagInset: flag.left - rect.left, textGap: text.left - flag.right, trailingSpace: rect.right - text.right,
          menuTrailingSpace: box.right - text.right, textHeight: text.height, textTop: text.top - rect.top,
          textBottom: rect.bottom - text.bottom, lineHeight: parseFloat(getComputedStyle(label).lineHeight),
          textLines: range.getClientRects().length, overflow: label.scrollWidth - label.clientWidth };
      }) };
    });
    expect(menu.width, 'The complete priority labels use a compact window even on wide screens').toBeLessThanOrEqual(137);
    expect(menu.gap, 'The priority window is adjacent to its trigger').toBeCloseTo(8, 0);
    for (const [index, row] of menu.rows.entries()) {
      expect(row.height).toBeGreaterThanOrEqual(40);
      expect(Math.abs(row.left - menu.rows[0].left)).toBeLessThanOrEqual(1);
      expect(Math.abs(row.right - menu.rows[0].right)).toBeLessThanOrEqual(1);
      expect(row.flagInset, 'Flags retain readable left padding').toBeGreaterThanOrEqual(8);
      expect(Math.abs(row.flagInset - row.trailingSpace), 'The gap before the flag equals the gap after the final priority character').toBeLessThanOrEqual(1);
      expect(row.textGap, 'Flags and complete labels do not overlap').toBeGreaterThanOrEqual(6);
      expect(row.textGap).toBeLessThanOrEqual(13);
      expect(row.trailingSpace, 'Complete labels retain right padding').toBeGreaterThanOrEqual(8);
      expect(row.trailingSpace, 'The option has no large blank area after its last character').toBeLessThanOrEqual(24);
      expect(row.menuTrailingSpace, 'The window stays close to the complete label').toBeLessThanOrEqual(34);
      expect(row.textLines, 'Each complete priority label fits on one line').toBe(1);
      expect(row.textHeight).toBeLessThanOrEqual(row.lineHeight + 1);
      expect(row.textTop).toBeGreaterThanOrEqual(0);
      expect(row.textBottom).toBeGreaterThanOrEqual(0);
      expect(row.overflow, 'Complete priority text is not clipped').toBeLessThanOrEqual(1);
      if (index) expect(row.top - menu.rows[index - 1].bottom, 'Priority choices form a single vertical column').toBeGreaterThanOrEqual(5);
    }
    const kind = await composer().locator('.memo-priority-trigger').count() ? 'memo' : 'task';
    await page.screenshot({ path: path.join(out, `entry-priority-${kind}-${width}.png`) });
    const option = composer().locator('.priority-option').filter({ hasText: new RegExp(`^${label}优先度$`) });
    const color = await option.locator('.priority-option-mark').evaluate(node => getComputedStyle(node).color);
    await option.click();
    await priorityFlag(color, label);
  };
  const priority = async () => {
    await composer().locator('.todo-priority-toggle,.memo-priority-trigger').click();
    await choiceAppearance(composer().locator('.priority-option'));
    const option = composer().locator('.priority-option[aria-pressed="true"]');
    const label = (await option.textContent()).replace(/优先度$/, '');
    const color = await option.locator('.priority-option-mark').evaluate(node => getComputedStyle(node).color);
    await page.keyboard.press('Escape');
    await priorityFlag(color, label);
    return label;
  };
  async function colorGrid() {
    const grid = composer().locator('.memo-palette');
    await expect(grid).toBeVisible();
    await choiceAppearance(grid.locator('button'));
    const geometry = await grid.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, overflow: node.scrollWidth - node.clientWidth,
        options: [...node.querySelectorAll('button')].map(button => {
          const box = button.getBoundingClientRect();
          return { left: box.left - rect.left, right: box.right - rect.left, top: box.top - rect.top, bottom: box.bottom - rect.top, width: box.width };
        }) };
    });
    expect(geometry.options).toHaveLength(6);
    expect(geometry.overflow).toBeLessThanOrEqual(2);
    for (const [index, option] of geometry.options.entries()) {
      expect(Math.abs(option.width - geometry.options[0].width), `${width}: color options have equal widths`).toBeLessThanOrEqual(1);
      expect(option.width, `${width}: color choices keep 40px touch targets`).toBeGreaterThanOrEqual(40);
      expect(Math.abs(option.top - geometry.options[0].top), `${width}: all six colors stay on one row`).toBeLessThanOrEqual(1);
      if (index) expect(option.left - geometry.options[index - 1].right).toBeCloseTo(6, 0);
    }
    expect(Math.abs(geometry.options[0].left), 'The first full color row starts at the grid edge').toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.options[5].right - geometry.width), 'Six colors fill the row width').toBeLessThanOrEqual(1);
    expect((await grid.locator('button').allTextContents()).every(text => text === '' || text === '✓'), 'Only color dots and the selected checkmark are visible').toBe(true);
    return geometry;
  }
  let taskNoteGeometry;
  async function layout(type, name) {
    const selectors = type === '任务'
      ? ['.todo-editor-meta', '.todo-title-row', '.todo-description', '.todo-next-list', '.todo-tags-row']
      : ['.memo-title-row', '.memo-body-input', '.memo-editor-toolbar', '.memo-pin-row', '.memo-editor-settings', '.memo-tags-field'];
    const metrics = await composer().evaluate((node, selectors) => {
      const rect = element => { const box = element.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, height: box.height }; };
      const viewport = document.querySelector('.preview-content');
      const footer = node.querySelector('.todo-sheet-footer,.memo-sheet-footer');
      const scroll = node.querySelector('.todo-sheet-scroll,.memo-sheet-scroll');
      const memo = node.classList.contains('memo-sheet');
      const body = node.querySelector(memo ? '.memo-body-input' : '.todo-description'), bodyStyle = getComputedStyle(body);
      return { box: rect(node), viewport: rect(viewport), footer: rect(footer), scroll: rect(scroll), scrollTop: scroll.scrollTop,
        overflow: node.scrollWidth - node.clientWidth,
        fields: selectors.map(selector => ({ selector, ...rect(node.querySelector(selector)) })),
        titleInput: rect(node.querySelector(memo ? '.memo-title-input' : '.todo-title-input')),
        priority: rect(node.querySelector(memo ? '.memo-priority-trigger' : '.todo-priority-toggle')),
        body: rect(body), bodyFrame: { background: bodyStyle.backgroundColor, borders: ['Top', 'Right', 'Bottom', 'Left'].map(side => ({ width: parseFloat(bodyStyle[`border${side}Width`]), style: bodyStyle[`border${side}Style`], color: bodyStyle[`border${side}Color`] })) },
        modes: [...node.querySelectorAll('[aria-label^="创建类型："]')].map(rect),
        actions: [...footer.querySelectorAll('button')].map(rect) };
    }, selectors);
    expect(metrics.overflow, `${width} ${name}: no horizontal overflow`).toBeLessThanOrEqual(2);
    expect(metrics.box.top).toBeGreaterThanOrEqual(metrics.viewport.top - 1);
    expect(metrics.box.bottom).toBeLessThanOrEqual(metrics.viewport.bottom + 1);
    expect(metrics.scrollTop, `${name}: untouched editor begins at its top`).toBe(0);
    expect(metrics.modes).toHaveLength(3);
    const submit = type === '任务' ? saveTask() : saveMemo();
    await expect(submit).toHaveText(type === '任务' ? '创建任务' : '创建便签');
    await expect(submit.locator('.button-add-symbol')).toHaveCount(0);
    await checkButtonAppearance(submit, { kind: 'primary' }, expect);
    await checkButtonAppearance(composer().locator('.todo-sheet-close'), { kind: 'icon' }, expect);
    for (const name of ['任务', '备忘', '进展']) await checkButtonAppearance(mode(name), { kind: 'choice', selected: name === type }, expect);
    for (const control of [...metrics.modes, ...metrics.actions]) {
      expect(control.height, `${name}: complete usable controls`).toBeGreaterThanOrEqual(40);
      expect(control.top).toBeGreaterThanOrEqual(metrics.viewport.top - 1);
      expect(control.bottom).toBeLessThanOrEqual(metrics.viewport.bottom + 1);
    }
    for (const field of metrics.fields) {
      expect(field.top, `${name}: ${field.selector} is completely visible initially`).toBeGreaterThanOrEqual(metrics.scroll.top - 1);
      expect(field.bottom, `${name}: ${field.selector} is above the footer`).toBeLessThanOrEqual(Math.min(metrics.scroll.bottom, metrics.footer.top) + 1);
    }
    if (type === '任务') {
      await expect(composer().locator('.todo-title-row .todo-title-icon')).toHaveCount(0);
      expect(Math.abs(metrics.titleInput.left - metrics.fields.find(field => field.selector === '.todo-title-row').left), `${name}: the task title starts at the row edge without the removed icon slot`).toBeLessThanOrEqual(1);
      taskNoteGeometry = metrics.body;
    }
    else {
      await choiceAppearance(composer().locator('.memo-editor-modes button'));
      for (let index = 1; index < metrics.fields.length; index++) {
        expect(metrics.fields[index].top, `${name}: ${metrics.fields[index].selector} follows ${metrics.fields[index - 1].selector}`).toBeGreaterThanOrEqual(metrics.fields[index - 1].bottom - 1);
      }
      expect(taskNoteGeometry, 'The task form supplies the note-box baseline').toBeDefined();
      for (const dimension of ['left', 'right', 'height']) {
        expect(Math.abs(metrics.body[dimension] - taskNoteGeometry[dimension]), `${width}: memo content ${dimension} matches the task note box`).toBeLessThanOrEqual(1);
      }
      expect(metrics.titleInput.height, 'The memo title remains a usable input control').toBeGreaterThanOrEqual(40);
      expect(metrics.priority.height, 'The memo priority control remains easy to select').toBeGreaterThanOrEqual(40);
      expect(metrics.titleInput.right, 'The memo priority stays to the right of the title').toBeLessThanOrEqual(metrics.priority.left + 1);
      expect(['transparent', 'rgba(0, 0, 0, 0)']).not.toContain(metrics.bodyFrame.background);
      for (const border of metrics.bodyFrame.borders) {
        expect(border.width, 'Memo content has a complete visible frame').toBeGreaterThan(0);
        expect(['none', 'hidden']).not.toContain(border.style);
        expect(['transparent', 'rgba(0, 0, 0, 0)']).not.toContain(border.color);
      }
    }
    await page.screenshot({ path: path.join(out, `entry-${name}-${width}.png`) });
  }
  async function fresh(seed, suffix) {
    await page.goto(`${origin}/?entry-${suffix}-${width}#/pages/posts/index`);
    await page.evaluate(({ seed, image, homeShortcutKey, layout }) => {
      localStorage.clear();
      localStorage.setItem(homeShortcutKey, JSON.stringify(layout));
      window.__miniFixture.guestToolStates = seed;
      window.__miniFixture.memoImageBase64 = image;
      location.hash = '#/pages/index/index';
    }, { seed, image, homeShortcutKey, layout: legacyLayout(true) });
    await expect(page.locator('.today-capture')).toBeVisible();
    await expect(page.getByRole('button', { name: '创建', exact: true })).toBeEnabled();
  }
  const stamp = '2026-10-05T08:00:00.000Z';
  const seed = {
    todos: { version: 1, categories: [{ id: 'legacy-source', name: '旧分类标签', color: '#94b6e2' }], tasks: [{ id: 'existing-task', title: '原有任务', description: '原有备注', categoryId: 'legacy-source', important: true, urgent: false, dueDate: '', tags: ['任务来源'], completedAt: null, createdAt: stamp, updatedAt: stamp }] },
    memos: { version: 1, notes: [{ id: 'existing-memo', title: '原有备忘录', body: '原有正文', color: 'sage', tags: ['备忘录来源'], pinned: false, createdAt: stamp, updatedAt: stamp }] },
  };
  // Explicit quadrant entry still supplies its priority to the shared composer.
  for (const [label, important, urgent] of [['高', true, true], ['中', true, false], ['低', false, true], ['无', false, false]]) {
    await fresh(seed, `quadrant-${label}`);
    const otherLabel = label === '高' ? '低' : '高';
    await page.getByRole('button', { name: '创建任务', exact: true }).click();
    await choosePriority(otherLabel);
    await taskTitle().fill('其它入口保留的创建草稿');
    await taskBody().fill('象限入口只调整优先度，保留正文');
    await switchMode('备忘');
    await close();
    const retained = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
    await go('todos');
    const entry = page.getByRole('button', { name: `创建${label}优先级任务`, exact: true });
    await expect(entry.locator('.button-add-symbol')).toHaveAttribute('aria-hidden', 'true');
    await expect(entry.locator('.create-button-label')).toHaveCount(0);
    await page.mouse.move(0, 0);
    await checkButtonAppearance(entry, { kind: 'icon' }, expect);
    const before = await stored('todos');
    await entry.click();
    expect(await priority(), 'An explicit quadrant overrides a different priority in a restored creation draft').toBe(label);
    await switchMode('备忘');
    expect(await priority(), 'All four task levels retain their color and flag when switching to memo').toBe(label);
    await switchMode('任务');
    await expect(taskTitle()).toHaveValue('其它入口保留的创建草稿');
    await expect(taskBody()).toHaveValue('象限入口只调整优先度，保留正文');
    const resumed = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
    expect([resumed.task.id, resumed.memo.id], 'Quadrant defaults reuse the retained record IDs').toEqual([retained.task.id, retained.memo.id]);
    await page.screenshot({ path: path.join(out, `entry-quadrant-${label}-${width}.png`) });
    await taskTitle().fill(`象限${label}优先级新任务`);
    await close();
    expect(await stored('todos'), 'Closing a quadrant creation editor preserves business records without saving a task').toEqual(before);
    await entry.click();
    expect(await priority(), 'Reopening the quadrant keeps the retained draft priority').toBe(label);
    await expect(taskTitle()).toHaveValue(`象限${label}优先级新任务`);
    await choosePriority(otherLabel);
    await switchMode('备忘');
    expect(await priority(), 'A manual change after opening remains through a type switch').toBe(otherLabel);
    await switchMode('任务');
    expect(await priority()).toBe(otherLabel);
    await choosePriority(label);
    await saveTask().click();
    await expect(composer()).toHaveCount(0);
    expect((await stored('todos')).tasks.find(task => task.title === `象限${label}优先级新任务`)).toMatchObject({ important, urgent });
  }
  await fresh(seed, 'home-task-navigation');
  await page.locator('.today-capture input').fill('首页创建后进入待办');
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await saveTask().click();
  await expect(page).toHaveURL(/#\/pages\/todos\/index$/);
  await expect(page.locator('.todo-sheet')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '编辑任务：首页创建后进入待办', exact: true })).toBeVisible();
  expect((await stored('todos')).tasks.filter(task => task.title === '首页创建后进入待办')).toHaveLength(1);
  expect(await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog.todos.focus'))).toBeFalsy();
  await fresh(seed, 'workflow');
  const capture = page.locator('.today-capture');
  const captureInput = page.getByRole('textbox', { name: '创建内容', exact: true });
  await expect(captureInput).toHaveAttribute('placeholder', '准备记录什么？');
  const captureLayout = await capture.evaluate(node => {
    const input = node.querySelector('input').getBoundingClientRect(), button = node.querySelector('.create-button').getBoundingClientRect();
    return { input: { left: input.left, right: input.right, top: input.top, bottom: input.bottom, width: input.width }, button: { left: button.left, top: button.top, bottom: button.bottom, height: button.height }, overflow: node.scrollWidth - node.clientWidth };
  });
  expect(captureLayout.overflow).toBeLessThanOrEqual(2);
  expect(captureLayout.input.right, 'Create remains to the right of the inline capture input').toBeLessThanOrEqual(captureLayout.button.left + 1);
  expect(captureLayout.input.width).toBeGreaterThan(120);
  expect(captureLayout.button.height).toBeGreaterThanOrEqual(40);
  await checkButtonAppearance(capture.getByRole('button', { name: '创建', exact: true }), { kind: 'primary', compact: true }, expect);
  await expect(capture.locator('.button-add-symbol')).toHaveAttribute('aria-hidden', 'true');
  expect(Math.abs((captureLayout.input.top + captureLayout.input.bottom) / 2 - (captureLayout.button.top + captureLayout.button.bottom) / 2)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: path.join(out, `entry-home-${width}.png`) });
  await captureInput.fill('首页输入初稿');
  await capture.getByRole('button', { name: '创建', exact: true }).click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await expect(composer()).toHaveCount(1);
  await expect(mode('任务')).toHaveAttribute('aria-pressed', 'true');
  await expect(taskTitle()).toHaveValue('首页输入初稿');
  await layout('任务', 'task-default');
  const untouchedByGesture = { todos: await stored('todos'), memos: await stored('memos'), domains: await stored('domains') };
  for (const [context, gesture] of [
    ['A right swipe at the first type does not wrap', { dx: 96 }],
    ['A short horizontal gesture does not switch', { dx: -24, dy: 1 }],
    ['Vertical reading does not switch', { dx: -4, dy: 96 }],
    ['A diagonal gesture does not switch', { dx: -80, dy: 70 }],
    ['A cancelled horizontal gesture does not switch', { cancel: true }],
    ['A two-finger gesture does not switch', { multiple: true }],
    ['Adding a second finger cancels the gesture', { addFinger: true }],
    ['A different end finger cannot finish the gesture', { differentEndFinger: true }],
    ['A missing release point cannot finish the gesture', { missingEndPoint: true }],
    ['A release with a remaining finger cannot finish the gesture', { remainingTouch: true }],
    ['A vertical gesture cannot later become a type swipe', { verticalFirst: true }],
  ]) await swipe('任务', gesture, undefined, context);
  await swipe('任务', {}, taskTitle(), 'Selecting or moving within the task title does not switch');
  await swipe('任务', {}, taskBody(), 'Selecting or moving within the task note does not switch');
  await swipe('任务', {}, saveTask(), 'Starting on a submit button does not switch or submit');
  await composer().locator('.todo-priority-toggle').click();
  await swipe('任务', {}, composer().locator('.priority-popover-panel'), 'Starting in a priority window preserves the type');
  await expect(composer().locator('.priority-popover-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await swipe('备忘', { moveSteps: [-12, -36, -3, -96], onStep: async distance => {
    const geometry = await composer().locator('.swipe-panels').evaluate(node => {
      const box = node.getBoundingClientRect(), active = node.querySelector('.swipe-panel-current').getBoundingClientRect(), adjacent = node.querySelector('.swipe-panel-adjacent').getBoundingClientRect();
      return { offset: active.left - box.left, reveal: box.right - adjacent.left, nativeInputs: node.querySelectorAll('input,textarea').length };
    });
    expect(geometry.offset, 'Current content follows every movement before release').toBeCloseTo(distance, 0);
    expect(geometry.reveal, 'Adjacent content is visible from the first deliberate horizontal movement').toBeCloseTo(-distance, 0);
    expect(geometry.nativeInputs, 'Moving snapshots cannot leave native title/input overlays on screen').toBe(0);
    const taskSnapshot = composer().locator('.swipe-panel-current .todo-title-row');
    await expect(taskSnapshot.locator('.todo-title-icon,.memo-icon-preview')).toHaveCount(0);
    expect(await taskSnapshot.evaluate(node => Math.abs(node.querySelector('.entry-preview-title').getBoundingClientRect().left - node.getBoundingClientRect().left)), 'Moving task snapshot fills the removed icon position').toBeLessThanOrEqual(1);
    await expect(composer().locator('.swipe-panel-adjacent .memo-icon-preview'), 'The adjacent memo snapshot retains its icon').toHaveCount(1);
    await expect(mode('任务')).toHaveAttribute('aria-pressed', 'true');
    await expect(composer().locator('.swipe-panel-adjacent')).toContainText('首页输入初稿');
    if (distance === -96) await page.screenshot({ path: path.join(out, `entry-following-swipe-${width}.png`) });
  } }, undefined, 'A left swipe advances from task to memo');
  await expect(memoTitle()).toHaveValue('首页输入初稿');
  await swipe('进展', {}, undefined, 'A second left swipe advances from memo to progress');
  await expect(composer().locator('.memo-title-input,.todo-title-input')).toHaveCount(0);
  await expect(composer().locator('.entry-preview')).toHaveCount(0);
  await swipe('进展', {}, undefined, 'A left swipe at the last type does not wrap');
  await swipe('备忘', { dx: 96 }, undefined, 'A right swipe returns from progress to memo');
  await swipe('任务', { dx: 96, endOnly: true }, undefined, 'The final changedTouches point can finish a right swipe');
  await swipe('任务', { during: async () => { await switchMode('备忘'); await switchMode('任务'); } }, undefined, 'A previous gesture cannot revive after clicking away and back to its starting type');
  await swipe('任务', { endOnly: true, during: async () => { await schedule.openSchedule(page, expect); await schedule.closeSchedule(page, expect); } }, undefined, 'Opening and closing a date sheet cancels a previous creation gesture before horizontal intent');
  await expect(taskTitle()).toHaveValue('首页输入初稿');
  for (const tool of ['todos', 'memos', 'domains']) expect(await stored(tool), 'Type gestures never submit or change business records').toEqual(untouchedByGesture[tool]);
  await page.screenshot({ path: path.join(out, `entry-swipe-task-${width}.png`) });
  expect(await priority()).toBe('无');
  await taskBody().fill('任务和备忘录共用的内容\n第二行保持原文。');
  await composer().getByRole('textbox', { name: '下一步任务 1', exact: true }).fill('确定日期');
  await composer().getByRole('button', { name: '添加下一步任务', exact: true }).click();
  await composer().getByRole('textbox', { name: '下一步任务 2', exact: true }).fill('确认同行者');
  await composer().getByRole('button', { name: '提前第 2 步', exact: true }).click();
  await schedule.openSchedule(page, expect);
  await swipe('任务', {}, page.locator('.todo-schedule-sheet'), 'A date-sheet gesture does not change the creation type');
  await expect(page.locator('.todo-schedule-sheet')).toBeVisible();
  await schedule.openSection(page, '设置时间');
  await swipe('任务', {}, page.locator('.todo-schedule-sheet .form-popover-panel'), 'A nested schedule window does not change the creation type');
  await expect(page.locator('.todo-schedule-sheet .form-popover-panel')).toBeVisible();
  await schedule.closeOptionWindows(page);
  await schedule.selectDate(page, '2099-12-17');
  await schedule.setTime(page, 18, 30);
  await schedule.openSection(page, '设置重复');
  await schedule.button(page, '每周').click();
  await schedule.setCustomReminder(page, '2099-12-16', 17, 45);
  await schedule.confirmSchedule(page, expect);
  await openTags();
  await swipe('任务', {}, tagsPanel(), 'A tag-window gesture preserves the creation type');
  await expect(tagsPanel()).toBeVisible();
  for (const tag of ['任务来源', '备忘录来源', '旧分类标签']) await expect(tagsPanel().getByRole('button', { name: tag, exact: true })).toBeVisible();
  await tagsPanel().getByRole('textbox').fill('共用标签，备忘录来源');
  await tagsPanel().getByRole('button', { name: '完成', exact: true }).click();
  await choosePriority('中');
  const beforeSwitch = { todos: await stored('todos'), memos: await stored('memos') };
  await swipe('备忘', {}, undefined, 'Swiping carries the complete task fields into memo');
  await expect(memoTitle()).toHaveValue('首页输入初稿');
  await expect(memoBody()).toHaveValue('任务和备忘录共用的内容\n第二行保持原文。');
  expect(await selectedTags()).toBe('共用标签，备忘录来源');
  expect(await priority()).toBe('中');
  await layout('备忘', 'memo-default');
  await memoTitle().fill('切换后保留的备忘录');
  await memoBody().fill('**共有内容**在两种界面都保留。');
  await swipe('备忘', {}, memoTitle(), 'The memo title protects native editing gestures');
  await swipe('备忘', {}, memoBody(), 'The memo body protects native editing gestures');
  const originalColorGrid = await colorGrid();
  await composer().getByRole('button', { name: '使用薄荷', exact: true }).click();
  await expect(composer().getByRole('button', { name: '使用薄荷', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await composer().getByRole('button', { name: '使用雾蓝', exact: true }).click();
  await expect(composer().getByRole('button', { name: '使用雾蓝', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await colorGrid(), 'Selecting a color keeps the same grid geometry').toEqual(originalColorGrid);
  await page.screenshot({ path: path.join(out, `entry-memo-colors-${width}.png`) });
  await checkButtonAppearance(composer().getByRole('button', { name: '置顶便签', exact: true }), { kind: 'icon' }, expect);
  await composer().getByRole('button', { name: '置顶便签', exact: true }).click();
  await checkButtonAppearance(composer().getByRole('button', { name: '取消置顶便签', exact: true }), { kind: 'icon', selected: true, expectedColors: ['rgb(148, 182, 226)', 'rgb(32, 45, 59)', 'rgb(148, 182, 226)'] }, expect);
  await swipe('备忘', { endOnly: true, during: async () => {
    await page.evaluate(() => { window.__miniFixture.deferChooseMedia = true; });
    await composer().getByRole('button', { name: '插入图片', exact: true }).click();
    await expect(mode('进展')).toBeDisabled();
    await page.evaluate(() => { window.__miniFixture.resolveChooseMedia(); window.__miniFixture.deferChooseMedia = false; });
    await expect(mode('进展')).toBeEnabled();
  } }, undefined, 'Finishing asynchronous image processing cannot revive the gesture that started before it');
  await expect(composer().locator('.memo-image')).toHaveCount(1);
  await imageActionContext('memo');
  await swipe('备忘', {}, composer().locator('.memo-image img'), 'A picture interaction does not change the creation type');
  await swipe('任务', { dx: 96 }, undefined, 'Swiping back retains the shared content and task-only fields');
  await imageActionContext('task');
  await expect(taskTitle()).toHaveValue('切换后保留的备忘录');
  await expect(taskBody()).toHaveValue('**共有内容**在两种界面都保留。');
  await expect(composer().locator('.todo-schedule-trigger')).toContainText('18:30');
  await expect(composer().getByRole('textbox', { name: '下一步任务 1', exact: true })).toHaveValue('确认同行者');
  await expect(composer().getByRole('textbox', { name: '下一步任务 2', exact: true })).toHaveValue('确定日期');
  await schedule.openSchedule(page, expect);
  await expect(schedule.button(page, '选择日期2099-12-17')).toHaveAttribute('aria-pressed', 'true');
  await schedule.openSection(page, '设置重复');
  await expect(schedule.button(page, '每周')).toHaveAttribute('aria-pressed', 'true');
  await schedule.checkReminderValues(page, expect, '2099-12-16', 17, 45);
  await schedule.closeSchedule(page, expect);
  await choosePriority('低');
  await switchMode('备忘');
  expect(await priority()).toBe('低');
  await choosePriority('低');
  await expect(composer().locator('.memo-image img')).toHaveAttribute('src', `data:image/png;base64,${image}`);
  await expect(composer().getByRole('button', { name: '使用雾蓝', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(composer().getByRole('button', { name: '取消置顶便签', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await stored('todos'), 'Switching never creates or changes a task').toEqual(beforeSwitch.todos);
  expect(await stored('memos'), 'Switching never creates or changes a memo').toEqual(beforeSwitch.memos);
  await page.screenshot({ path: path.join(out, `entry-memo-retained-${width}.png`) });
  await submitWithSwipe(saveMemo(), expect, '备忘');
  await expect(composer()).toHaveCount(0);
  await expect(page).toHaveURL(/pages\/index\/index$/);
  const savedMemo = (await stored('memos')).notes.find(note => note.title === '切换后保留的备忘录');
  expect(savedMemo).toMatchObject({ body: '**共有内容**在两种界面都保留。', tags: ['共用标签', '备忘录来源'], priority: 'low', color: 'blue', pinned: true });
  expect(savedMemo.images[0].dataUrl).toBe(`data:image/png;base64,${image}`);
  expect((await stored('todos')).tasks).toHaveLength(1);
  expect((await stored('memos')).notes).toHaveLength(2);
  await page.reload();
  await expect(page.locator('.today-capture')).toBeVisible();
  expect((await stored('memos')).notes.find(note => note.id === savedMemo.id)).toEqual(savedMemo);

  // The task entry shares the new memo label without copying its saved record.
  await go('todos');
  await checkButtonAppearance(page.locator('.todo-quadrant-later .todo-quadrant-add'), { kind: 'icon' }, expect);
  await page.locator('.todo-quadrant-later .todo-quadrant-add').click();
  await expect(composer()).toBeVisible();
  await expect(taskTitle()).toHaveValue('');
  await openTags();
  await tagsPanel().getByRole('button', { name: '共用标签', exact: true }).click();
  await tagsPanel().getByRole('button', { name: '完成', exact: true }).click();
  await taskTitle().fill('共享弹窗创建的任务');
  await taskBody().fill('从备忘录标签中选择');
  expect(await priority(), 'A fresh ordinary task needs no manual priority reset').toBe('无');
  await composer().getByRole('textbox', { name: '下一步任务 1', exact: true }).fill('完成后的下一步');
  await switchMode('备忘');
  await expect(memoTitle()).toHaveValue('共享弹窗创建的任务');
  expect(await priority()).toBe('无');
  await switchMode('任务');
  await saveTask().click();
  await expect(composer()).toHaveCount(0);
  const savedTask = (await stored('todos')).tasks.find(task => task.title === '共享弹窗创建的任务');
  expect(savedTask).toMatchObject({ description: '从备忘录标签中选择', tags: ['共用标签'], important: false, urgent: false });
  expect(savedTask.nextTasks.map(task => task.title)).toEqual(['完成后的下一步']);
  expect((await stored('memos')).notes).toHaveLength(2);
  await page.getByRole('button', { name: '编辑任务：共享弹窗创建的任务', exact: true }).click();
  await expect(page.getByRole('button', { name: /^创建类型：/ }), 'Editing an existing record offers no conversion').toHaveCount(0);
  await expect(page.locator('.todo-sheet:not(.entry-composer) .todo-sheet-footer .ui-button-primary')).toHaveText('保存');
  await checkButtonAppearance(page.locator('.todo-sheet:not(.entry-composer) .todo-sheet-footer .ui-button-primary'), { kind: 'primary' }, expect);
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await go('memos');
  await page.getByRole('button', { name: '管理便签删除', exact: true }).click();
  await page.getByRole('button', { name: '查看便签：原有备忘录', exact: true }).click();
  await page.getByRole('button', { name: '编辑便签：原有备忘录', exact: true }).click();
  await expect(page.getByRole('button', { name: /^创建类型：/ })).toHaveCount(0);
  await expect(page.locator('.memo-sheet:not(.entry-composer) .memo-sheet-footer .ui-button-primary')).toHaveText('保存');
  await checkButtonAppearance(page.locator('.memo-sheet:not(.entry-composer) .memo-sheet-footer .ui-button-primary'), { kind: 'primary' }, expect);
  await page.locator('.memo-priority-trigger').click();
  await choiceAppearance(page.locator('.priority-option'));
  await expect(page.locator('.priority-option[aria-pressed="true"]'), 'Legacy memos default to no priority').toHaveText('无优先度');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '关闭便签编辑', exact: true }).click();
  expect((await stored('memos')).notes.find(note => note.id === 'existing-memo')).toEqual(seed.memos.notes[0]);
  await checkButtonAppearance(page.getByRole('button', { name: '创建便签', exact: true }), { kind: 'primary', compact: true }, expect);
  await page.getByRole('button', { name: '创建便签', exact: true }).click();
  await expect(mode('备忘')).toHaveAttribute('aria-pressed', 'true');
  expect(await priority()).toBe('无');
  await openTags();
  await expect(tagsPanel().getByRole('button', { name: '共用标签', exact: true })).toBeVisible();
  await tagsPanel().getByRole('button', { name: '完成', exact: true }).click();
  await memoBody().fill('只有正文也可以创建备忘录。');
  await expect(saveMemo()).toBeEnabled();
  await saveMemo().click();
  await expect(composer()).toHaveCount(0);
  expect((await stored('memos')).notes[0]).toMatchObject({ title: '', body: '只有正文也可以创建备忘录。', priority: 'none' });

  // Closing retains a local creation draft, not a new business record.
  await go('index');
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await choosePriority('中');
  await taskTitle().fill('尚未保存的草稿');
  await taskBody().fill('关闭与刷新后继续');
  await composer().getByRole('textbox', { name: '下一步任务 1', exact: true }).fill('草稿中的下一步');
  await switchMode('备忘');
  await composer().getByRole('button', { name: '插入图片', exact: true }).click();
  await expect(composer().locator('.memo-image')).toHaveCount(1);
  const beforeCancel = { todos: await stored('todos'), memos: await stored('memos') };
  await close();
  expect(await stored('todos')).toEqual(beforeCancel.todos);
  expect(await stored('memos')).toEqual(beforeCancel.memos);
  await page.reload();
  await page.getByRole('button', { name: '创建便签', exact: true }).click();
  await expect(composer()).toBeVisible();
  await expect(memoTitle()).toHaveValue('尚未保存的草稿');
  expect(await priority(), 'The new default cannot overwrite a restored selected priority').toBe('中');
  await expect(memoBody()).toHaveValue('关闭与刷新后继续');
  await expect(composer().locator('.memo-image')).toHaveCount(1);
  await switchMode('任务');
  await expect(composer().getByRole('textbox', { name: '下一步任务 1', exact: true })).toHaveValue('草稿中的下一步');
  await switchMode('备忘');
  await page.evaluate(() => { window.__miniFixture.failImageRead = true; });
  await composer().getByRole('button', { name: '插入图片', exact: true }).click();
  await expect(composer().getByRole('button', { name: '插入图片', exact: true })).toBeEnabled();
  await expect(memoTitle()).toHaveValue('尚未保存的草稿');
  await expect(memoBody()).toHaveValue('关闭与刷新后继续');
  await expect(composer().locator('.memo-image')).toHaveCount(1);
  await page.evaluate(() => { window.__miniFixture.failImageRead = false; });
  await switchMode('任务');
  const longTitle = '长'.repeat(90), longBody = '内容'.repeat(3100);
  await taskTitle().fill(longTitle);
  await taskBody().fill(longBody);
  await switchMode('备忘');
  await expect(memoTitle(), 'Changing type never truncates the longer task title').toHaveValue(longTitle);
  await expect(memoBody(), 'Changing type never truncates the longer task body').toHaveValue(longBody);
  if (await saveMemo().isEnabled()) await saveMemo().click();
  await expect(composer()).toBeVisible();
  await expect(composer().getByRole('alert')).toContainText('备忘录标题最多 80 字');
  expect(await stored('memos'), 'Over-limit type conversion cannot save partial content').toEqual(beforeCancel.memos);
  await memoTitle().fill('长正文校验');
  await saveMemo().click();
  await expect(composer().getByRole('alert')).toContainText('备忘录内容最多 6000 字');
  await expect(memoBody()).toHaveValue(longBody);
  await switchMode('任务');
  await expect(taskTitle()).toHaveValue('长正文校验');
  await expect(taskBody()).toHaveValue(longBody);
  await taskTitle().fill('尚未保存的草稿');
  await taskBody().fill('关闭与刷新后继续');
  // Native input limits cannot truncate raw tag text when changing type.
  const longTags = '未整理的标签原文'.repeat(18);
  await openTags();
  await tagsPanel().getByRole('textbox').fill(longTags);
  await tagsPanel().getByRole('button', { name: '完成', exact: true }).click();
  await switchMode('备忘');
  await openTags();
  await expect(tagsPanel().getByRole('textbox')).toHaveValue(longTags);
  await tagsPanel().getByRole('button', { name: '完成', exact: true }).click();
  await saveMemo().click();
  await expect(composer().getByRole('alert')).toContainText('最多 5 个标签，每个不超过 20 字');
  expect(await stored('memos')).toEqual(beforeCancel.memos);
  await switchMode('任务');
  await openTags();
  await expect(tagsPanel().getByRole('textbox')).toHaveValue(longTags);
  await tagsPanel().getByRole('textbox').fill('');
  await tagsPanel().getByRole('button', { name: '完成', exact: true }).click();
  await close();
  expect(await stored('todos')).toEqual(beforeCancel.todos);

  // New home input is preserved alongside an existing restored title.
  await captureInput.fill('首页后来输入的新内容');
  await capture.getByRole('button', { name: '创建', exact: true }).click();
  await expect(mode('备忘'), 'Home capture remembers the last successful memo rather than the cancelled task view').toHaveAttribute('aria-pressed', 'true');
  await switchMode('任务');
  await expect(taskTitle()).toHaveValue('尚未保存的草稿');
  const restoredBody = '关闭与刷新后继续\n首页后来输入的新内容';
  await expect(taskBody()).toHaveValue(restoredBody);
  await expect(composer().getByRole('status')).toContainText('新输入已追加到内容');
  await switchMode('备忘');
  await expect(memoTitle()).toHaveValue('尚未保存的草稿');
  await expect(memoBody()).toHaveValue(restoredBody);
  await memoTitle().fill('弹窗中修改的草稿标题');
  await close();
  await capture.getByRole('button', { name: '创建', exact: true }).click();
  await expect(mode('备忘')).toHaveAttribute('aria-pressed', 'true');
  await switchMode('任务');
  await expect(taskTitle(), 'Reopening the same capture input keeps an edited draft title').toHaveValue('弹窗中修改的草稿标题');
  await expect(taskBody(), 'The same home capture is appended to the restored draft only once').toHaveValue(restoredBody);
  await close();
  await captureInput.fill('');
  expect(await stored('todos')).toEqual(beforeCancel.todos);
  expect(await stored('memos')).toEqual(beforeCancel.memos);

  if (width !== 360) return;
  // Switching identity while open closes the old owner's editor. Private labels
  // and locally restored drafts remain scoped to their original account.
  const accountTask = name => ({ version: 1, categories: [], tasks: [{ ...seed.todos.tasks[0], id: name, title: name, categoryId: '', tags: [name] }] });
  await page.evaluate(({ a, b }) => {
    window.__miniFixture.accountToolStates = {
      'entry-reader-a': { todos: a, memos: { version: 1, notes: [] } },
      'entry-reader-b': { todos: b, memos: { version: 1, notes: [] } },
    };
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'entry-reader-a', isAdmin: false };
    window.__miniPreviewControl.emit('ottlog-session');
  }, { a: accountTask('账号甲标签'), b: accountTask('账号乙标签') });
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(taskTitle()).toHaveValue('');
  await openTags();
  await expect(tagsPanel().getByRole('button', { name: '账号甲标签', exact: true })).toBeVisible();
  await expect(tagsPanel().getByRole('button', { name: '共用标签', exact: true })).toHaveCount(0);
  await tagsPanel().getByRole('button', { name: '完成', exact: true }).click();
  await taskTitle().fill('账号甲的未保存内容');
  await page.evaluate(() => {
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'entry-reader-b', isAdmin: false };
    window.__miniPreviewControl.emit('ottlog-session');
  });
  await expect(composer(), 'An open creation draft cannot transfer to another account').toHaveCount(0);
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(taskTitle()).toHaveValue('');
  await openTags();
  await expect(tagsPanel().getByRole('button', { name: '账号乙标签', exact: true })).toBeVisible();
  await expect(tagsPanel().getByRole('button', { name: '账号甲标签', exact: true })).toHaveCount(0);
  await tagsPanel().getByRole('button', { name: '完成', exact: true }).click();
  await close();
  expect((await stored('todos', 'reader:entry-reader-a')).tasks).toHaveLength(1);
  expect((await stored('todos', 'reader:entry-reader-b')).tasks).toHaveLength(1);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method === 'PUT')), 'Cancelled account drafts never reach business sync').toEqual([]);
  await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: false }; window.__miniPreviewControl.emit('ottlog-session'); });
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(taskTitle(), 'Returning to guest restores only the guest creation draft').toHaveValue('弹窗中修改的草稿标题');
  await expect(taskBody()).toHaveValue(restoredBody);
  await close();

  const emptySeed = { todos: { version: 1, categories: [], tasks: [] }, memos: { version: 1, notes: [] } };
  await fresh(emptySeed, 'write-failure');
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await taskTitle().fill('失败后重试的任务');
  await taskBody().fill('写入失败不能丢失输入');
  const retryTaskDraft = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['todos']; });
  await saveTask().click();
  await expect(composer().getByRole('alert')).toContainText('本机存储不可用');
  await expect(page).toHaveURL(/#\/pages\/index\/index$/);
  await expect(taskTitle()).toHaveValue('失败后重试的任务');
  await expect(taskBody()).toHaveValue('写入失败不能丢失输入');
  await expect(mode('备忘'), 'An unsaved volatile task cannot also create another type').toBeDisabled();
  await expect(composer().getByRole('button', { name: '清空所有输入', exact: true })).toBeDisabled();
  await composer().getByRole('button', { name: '清空所有输入', exact: true }).evaluate(node => node.click());
  await expect(taskTitle()).toHaveValue('失败后重试的任务');
  await swipe('任务', {}, undefined, 'A pending same-ID task retry cannot swipe into another type');
  expect((await stored('todos')).tasks).toHaveLength(0);
  await close();
  await go('todos');
  await page.getByRole('button', { name: '创建高优先级任务', exact: true }).click();
  await expect(taskTitle()).toHaveValue('失败后重试的任务');
  expect(await priority(), 'A pending same-ID save keeps its original priority when reopened from another quadrant').toBe('无');
  await expect(composer().getByRole('button', { name: '清空所有输入', exact: true })).toBeDisabled();
  await expect(mode('备忘')).toBeDisabled();
  await swipe('任务', {}, undefined, 'Reopening a pending task keeps its type locked for touch gestures');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await saveTask().click();
  await expect(composer()).toHaveCount(0);
  const retriedTasks = (await stored('todos')).tasks;
  expect(retriedTasks).toHaveLength(1);
  expect(retriedTasks[0]).toMatchObject({ id: retryTaskDraft.task.id, title: '失败后重试的任务', description: '写入失败不能丢失输入' });
  await go('index');
  await page.getByRole('button', { name: '创建便签', exact: true }).click();
  await memoTitle().fill('失败后重试的备忘录');
  await memoBody().fill('同一个记录 ID 只保存一遍');
  const retryMemoDraft = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['memos']; });
  await saveMemo().click();
  await expect(composer().getByRole('alert')).toContainText('本机存储不可用');
  await expect(memoTitle()).toHaveValue('失败后重试的备忘录');
  await expect(memoBody()).toHaveValue('同一个记录 ID 只保存一遍');
  await expect(composer().getByRole('button', { name: '清空所有输入', exact: true })).toBeDisabled();
  await swipe('备忘', {}, undefined, 'A pending same-ID memo retry cannot swipe to progress');
  await swipe('备忘', { dx: 96 }, undefined, 'A pending same-ID memo retry cannot swipe to task');
  expect((await stored('memos')).notes).toHaveLength(0);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await saveMemo().click();
  await expect(composer()).toHaveCount(0);
  expect((await stored('memos')).notes).toHaveLength(1);
  expect((await stored('memos')).notes[0]).toMatchObject({ id: retryMemoDraft.memo.id, title: '失败后重试的备忘录', body: '同一个记录 ID 只保存一遍' });

  await fresh(emptySeed, 'invalid-draft-images');
  await page.evaluate(draft => {
    localStorage.setItem('ottlog-mini-entry-draft-v1:guest', JSON.stringify({ ...draft, mode: 'memo', memo: { ...draft.memo, title: '坏草稿不能进入编辑器', images: { broken: true } } }));
  }, retryMemoDraft);
  await page.getByRole('button', { name: '创建便签', exact: true }).click();
  await expect(mode('备忘')).toHaveAttribute('aria-pressed', 'true');
  await expect(memoTitle(), 'Malformed image drafts are rejected before rendering').toHaveValue('');
  await expect(composer().locator('.memo-image')).toHaveCount(0);
  await expect(composer().getByRole('alert')).toHaveCount(0);
  await close();
  expect((await stored('todos')).tasks).toHaveLength(0);
  expect((await stored('memos')).notes).toHaveLength(0);
};
