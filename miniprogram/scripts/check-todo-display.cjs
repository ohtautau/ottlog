/* Real task markup with deliberately dense local fixtures. Browser adaptation
   verifies layout/interactions only; it is not a WeChat device certification. */
const path = require('node:path');

async function checkQuadrantCreateFeedback(page, button, expect, disabled = false) {
  const background = () => button.evaluate(node => getComputedStyle(node).backgroundColor);
  const before = await button.boundingBox();
  const feedback = disabled ? 'rgba(0, 0, 0, 0)' : 'rgba(199, 215, 223, 0.1)';
  await page.mouse.move(0, 0);
  expect(await background(), 'Quadrant add controls are transparent by default').toBe('rgba(0, 0, 0, 0)');
  await button.hover({ force: disabled });
  expect(await background(), 'Quadrant add controls use shared hover feedback').toBe(feedback);
  await page.mouse.down();
  expect(await background(), 'Quadrant add controls use shared press feedback').toBe(feedback);
  await page.mouse.move(0, 0); await page.mouse.up();
  expect(await background(), 'Leaving the control restores its transparent background').toBe('rgba(0, 0, 0, 0)');
  // The adapter does not synthesize Taro hoverClass. Check native pressed-class
  // CSS separately; this does not certify native WeChat touch behavior.
  await button.evaluate(node => node.classList.add('ui-control-pressed'));
  expect(await background(), 'The Taro pressed class uses the same feedback and respects disabled').toBe(feedback);
  await button.evaluate(node => node.classList.remove('ui-control-pressed'));
  expect(await button.boundingBox(), 'Feedback does not move or resize the creation control').toEqual(before);
}

module.exports = async function checkTodoDisplay({ page, origin, out, width, expect }) {
  await page.goto(`${origin}/?todo-display#/pages/index/index`);
  const titles = await page.evaluate(() => {
    const day = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const now = new Date(), yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const stamp = now.toISOString();
    const base = { description: '', categoryId: '', important: true, urgent: true, dueDate: '', completedAt: null, createdAt: stamp, updatedAt: stamp, tags: [], subtasks: [], nextTasks: [] };
    const chinese = '整理这周所有项目的会议记录并为每一个待跟进的问题补充负责人和具体截止日期避免任何重要事项被遗漏';
    const english = 'ConfirmTheVeryLongUnbrokenEnglishProjectIdentifierAndPrepareTheImplementationChecklistForNextWeek';
    const tasks = [
      { ...base, id: 'display-long-cn', title: chinese, dueDate: day(yesterday), dueTime: '09:30', tags: ['项目跟进和跨部门协作', '准备下一次会议的资料', '工作', '个人复盘', '长期计划'], recurrence: { unit: 'week', interval: 2 }, nextTasks: [{ id: 'display-next', title: '把会议结论发给同事' }], subtasks: [{ id: 'display-step-1', title: '收集会议记录', completed: true }, { id: 'display-step-2', title: '列出负责人', completed: false }] },
      { ...base, id: 'display-long-en', title: english, dueDate: day(now), dueTime: '23:59', tags: ['ImplementationPlanning', 'Review'] },
      ...Array.from({ length: 18 }, (_, index) => ({ ...base, id: `display-busy-${index}`, title: `本周待办事项 ${String(index + 1).padStart(2, '0')}` })),
      { ...base, id: 'display-done', title: '已经核对过的项目清单', completedAt: stamp },
      { ...base, id: 'display-plan', title: '给下个月的阅读计划留一点时间', urgent: false, dueDate: day(now), dueTime: '23:59', tags: ['阅读', '学习', '长期积累'] },
      { ...base, id: 'display-delegate', title: '请同事确认会场预订情况', important: false, dueDate: day(yesterday), tags: ['协作'] },
      { ...base, id: 'display-later', title: '周末整理相册', important: false, urgent: false },
    ];
    window.__miniFixture.guestToolStates = { todos: { version: 1, tasks, categories: [] } };
    location.hash = '#/pages/todos/index';
    return { chinese, english };
  });
  const high = page.locator('.todo-quadrant-do');
  await expect(high.locator('.todo-task:not(.is-done)')).toHaveCount(20);
  await expect(page.locator('.todo-sheet')).toHaveCount(0);
  await expect(high.locator('.todo-task.is-done')).toHaveCount(1);
  await expect(page.locator('.todo-quadrant-count')).toHaveCount(0);

  const quadrantBoxes = async () => page.locator('.todo-quadrant').evaluateAll(nodes => nodes.map(node => {
    const { x, y, width, height, bottom } = node.getBoundingClientRect(); return { x, y, width, height, bottom };
  }));
  async function checkToolbarTopSpacing(context) {
    const viewport = await page.locator('.preview-content').boundingBox();
    const navigation = await page.locator('.preview-native-header').boundingBox();
    const toolbar = await page.locator('.todo-toolbar').boundingBox();
    expect(toolbar.y - viewport.y, `${context}: the toolbar retains 12px above it`).toBeGreaterThanOrEqual(11);
    expect(Math.abs(toolbar.y - viewport.y - 12), `${context}: the top gap stays fixed across screen sizes`).toBeLessThanOrEqual(1);
    const controls = page.locator('.todo-page-toolbar button');
    await expect(controls, `${context}: sorting and filtering remain available`).toHaveCount(2);
    expect(await controls.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).toEqual(['排序', '筛选']);
    await expect(page.locator('.todo-toolbar .page-category-scroll')).toHaveCount(0);
    for (const control of await controls.all()) {
      await expect(control, `${context}: every toolbar action is completely visible`).toBeInViewport({ ratio: 1 });
      const box = await control.boundingBox();
      expect(box.y, `${context}: every action remains below the content top gap`).toBeGreaterThanOrEqual(viewport.y + 11);
      expect(box.y, `${context}: every action remains below the platform navigation`).toBeGreaterThanOrEqual(navigation.y + navigation.height + 11);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.y + viewport.height + 1);
      expect(box.x).toBeGreaterThanOrEqual(viewport.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.x + viewport.width + 1);
    }
    return toolbar;
  }
  const boxes = await quadrantBoxes(), viewport = await page.locator('.preview-content').boundingBox();
  expect(boxes).toHaveLength(4);
  expect(boxes[0].x).toBeLessThan(boxes[1].x);
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
  expect(Math.abs(boxes[2].x - boxes[0].x)).toBeLessThan(2);
  for (const box of boxes) {
    expect(Math.abs(box.width - boxes[0].width)).toBeLessThan(2);
    expect(Math.abs(box.height - boxes[0].height)).toBeLessThan(2);
    expect(box.y).toBeGreaterThanOrEqual(viewport.y);
    expect(box.bottom).toBeLessThanOrEqual(viewport.y + viewport.height + 1);
  }
  // One row retains the shared 40px touch targets on short screens. Verify
  // that the four quadrants fill the actual available area without clipping.
  const toolbar = await checkToolbarTopSpacing('Initial quadrant screen');
  await expect(page.locator('.screen-scroll-hint,#page-more')).toHaveCount(0);
  expect(Math.abs(boxes[0].y - (toolbar.y + toolbar.height))).toBeLessThan(2);
  expect(Math.abs(boxes[3].bottom - (viewport.y + viewport.height - 8)), 'Quadrants use the recovered footer space').toBeLessThan(2);
  for (const height of await page.locator('.todo-toolbar button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))) expect(height).toBeGreaterThanOrEqual(40);
  expect(await page.locator('.todo-page').evaluate(node => Math.max(node.scrollHeight - node.clientHeight, node.scrollWidth - node.clientWidth))).toBeLessThan(2);
  const createButtons = page.locator('.todo-quadrant-add');
  await expect(createButtons).toHaveCount(4);
  await expect(page.locator('.todo-toolbar .page-toolbar-create')).toHaveCount(0);
  await expect(page.locator('.todo-quadrant-footer'), 'Quadrant creation no longer occupies a footer').toHaveCount(0);
  const quadrantAdds = page.locator('.todo-quadrant-add');
  await expect(quadrantAdds).toHaveCount(4);
  const labels = ['高', '中', '低', '无'].map(label => `创建${label}优先级任务`);
  expect(await quadrantAdds.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), 'Every plus names its own quadrant for accessibility').toEqual(labels);
  await expect(quadrantAdds.locator('.create-button-label,.select-chevron')).toHaveCount(0);
  await expect(quadrantAdds, 'Only the plus symbol is visible in each quadrant').toHaveText(['', '', '', '']);
  const creationGeometry = await createButtons.evaluateAll(nodes => nodes.map(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height, width: r.width }; };
    const label = node.querySelector('.create-button-label'), symbol = node.querySelector('.button-add-symbol');
    const quadrant = node.classList.contains('todo-quadrant-add'), style = getComputedStyle(node);
    return { shared: node.classList.contains(quadrant ? 'ui-button-icon' : 'create-button'), quadrant, button: box(node), symbol: box(symbol), hidden: symbol.getAttribute('aria-hidden'),
      label: label && box(label), clipped: label ? label.scrollWidth - label.clientWidth : 0,
      radius: parseFloat(style.borderTopLeftRadius), border: style.borderTopColor, foreground: style.color };
  }));
  for (const control of creationGeometry) {
    expect(control.shared).toBe(true);
    expect(control.hidden).toBe('true');
    expect(control.button.height, 'All task creation entries retain a 40px touch target').toBeGreaterThanOrEqual(40);
    expect(control.symbol.height).toBeGreaterThan(0);
    if (control.quadrant) {
      expect(control.button.width, 'Every quadrant plus retains a 40px-wide touch target').toBeGreaterThanOrEqual(40);
      expect(control.radius, 'Quadrant plus controls retain the shared icon-button corners').toBe(10);
      expect(control.border).toBe('rgba(0, 0, 0, 0)');
      expect(control.foreground).toBe('rgb(199, 215, 223)');
      expect(Math.abs(control.symbol.left + control.symbol.right - control.button.left - control.button.right), 'The plus is centered horizontally').toBeLessThanOrEqual(1);
      expect(Math.abs(control.symbol.top + control.symbol.bottom - control.button.top - control.button.bottom), 'The plus is centered vertically').toBeLessThanOrEqual(1);
    } else expect(control.symbol.right).toBeLessThanOrEqual(control.label.left);
    expect(control.clipped).toBeLessThanOrEqual(1);
    for (const part of [control.symbol, control.label].filter(Boolean)) {
      expect(part.left).toBeGreaterThanOrEqual(control.button.left - 1);
      expect(part.right).toBeLessThanOrEqual(control.button.right + 1);
      expect(part.top).toBeGreaterThanOrEqual(control.button.top - 1);
      expect(part.bottom).toBeLessThanOrEqual(control.button.bottom + 1);
    }
  }
  const quadrantContent = await page.locator('.todo-quadrant').evaluateAll(nodes => nodes.map(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height }; };
    const title = node.querySelector('.todo-quadrant-title');
    return { card: box(node), title: box(title), titleLine: parseFloat(getComputedStyle(title).lineHeight),
      caption: box(node.querySelector('.todo-quadrant-caption')), add: box(node.querySelector('.todo-quadrant-add')),
      heading: box(node.querySelector('.todo-quadrant-heading')), scroll: box(node.querySelector('.todo-quadrant-scroll')) };
  }));
  for (const quadrant of quadrantContent) {
    expect(quadrant.title.height, 'Quadrant headings remain on one readable line').toBeLessThanOrEqual(quadrant.titleLine * 1.2);
    expect(quadrant.title.right, 'The title does not overlap the plus touch target').toBeLessThanOrEqual(quadrant.add.left + 1);
    expect(quadrant.caption.right, 'The caption does not overlap the plus touch target').toBeLessThanOrEqual(quadrant.add.left + 1);
    expect(Math.abs(quadrant.add.top + quadrant.add.bottom - quadrant.heading.top - quadrant.heading.bottom), 'The plus is vertically centered in its quadrant heading').toBeLessThanOrEqual(1);
    expect(Math.abs(quadrant.add.right - quadrant.heading.right), 'The plus is at the right edge of its quadrant heading').toBeLessThanOrEqual(1);
    for (const part of [quadrant.title, quadrant.caption, quadrant.add]) {
      expect(part.top).toBeGreaterThanOrEqual(quadrant.heading.top - 1);
      expect(part.bottom, 'Every heading control is fully above the task list').toBeLessThanOrEqual(quadrant.heading.bottom + 1);
    }
    expect(quadrant.heading.bottom).toBeLessThanOrEqual(quadrant.scroll.top + 1);
    expect(quadrant.scroll.bottom, 'The task list remains contained in its quadrant').toBeLessThanOrEqual(quadrant.card.bottom + 1);
  }
  for (const add of await quadrantAdds.all()) {
    await expect(add, 'Every quadrant plus is completely visible before scrolling').toBeInViewport({ ratio: 1 });
    await checkQuadrantCreateFeedback(page, add, expect);
    // The live page hides the whole quadrant grid when its source is not
    // writable. Exercise the shared disabled CSS on the real mounted control
    // separately, without claiming that source loading renders this state.
    await add.evaluate(node => { node.disabled = true; });
    await expect(add).toHaveCSS('opacity', '0.45');
    await checkQuadrantCreateFeedback(page, add, expect, true);
    await add.evaluate(node => node.click());
    await expect(page.locator('.entry-composer')).toHaveCount(0);
    await add.evaluate(node => { node.disabled = false; });
  }

  const cn = high.locator('.todo-task').filter({ has: page.getByText(titles.chinese, { exact: true }) });
  const en = high.locator('.todo-task').filter({ has: page.getByText(titles.english, { exact: true }) });
  for (const task of [cn, en]) {
    const geometry = await task.evaluate(node => {
      const title = node.querySelector('.todo-task-title'), content = node.querySelector('.todo-task-content'), complete = node.querySelector('.todo-complete');
      const box = title.getBoundingClientRect(), parent = content.getBoundingClientRect(), row = node.getBoundingClientRect();
      const check = complete.getBoundingClientRect();
      return { height: box.height, lineHeight: parseFloat(getComputedStyle(title).lineHeight), left: box.left, right: box.right, parentLeft: parent.left, parentRight: parent.right, parentHeight: parent.height, completeRight: check.right, completeWidth: check.width, completeHeight: check.height, rowWidth: row.width, overflow: node.scrollWidth - node.clientWidth };
    });
    expect(geometry.height).toBeLessThanOrEqual(geometry.lineHeight * 2 + 1);
    expect(geometry.parentLeft, 'Task editing and completion touch targets remain separate').toBeGreaterThanOrEqual(geometry.completeRight - 1);
    expect(geometry.left).toBeGreaterThanOrEqual(geometry.parentLeft - 1);
    expect(geometry.right).toBeLessThanOrEqual(geometry.parentRight + 1);
    expect(geometry.parentHeight).toBeGreaterThanOrEqual(40);
    expect(geometry.completeWidth).toBeGreaterThanOrEqual(40);
    expect(geometry.completeHeight).toBeGreaterThanOrEqual(40);
    expect(geometry.overflow).toBeLessThan(2);
  }
  await expect(page.locator('.todo-task-tag, .todo-task-details, .todo-drag-handle')).toHaveCount(0);
  await expect(cn.locator('.todo-check')).toHaveText('1');
  await expect(cn.locator('.todo-task-date')).toHaveClass(/is-overdue/);
  await expect(page.locator('.todo-quadrant-plan .todo-task-meta')).toContainText(await page.evaluate(() => { const date = new Date(); return String(date.getMonth() + 1) + '月' + date.getDate() + '日'; }));
  await expect(page.locator('.todo-quadrant-plan .todo-task-meta')).toContainText('23:59');
  await page.screenshot({ path: path.join(out, `todos-display-dense-${width}.png`), fullPage: true });

  // All title text is retained in the editor even when its list preview is clamped.
  await cn.locator('.todo-task-title').click();
  await expect(page.locator('.todo-title-input')).toHaveValue(titles.chinese);
  await page.getByRole('button', { name: '选择现有标签', exact: true }).click();
  await expect(page.getByPlaceholder('输入标签，用符号分隔')).toHaveValue('项目跟进和跨部门协作，准备下一次会议的资料，工作，个人复盘，长期计划');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await en.locator('.todo-task-title').click();
  await expect(page.locator('.todo-title-input')).toHaveValue(titles.english);
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();

  const scroll = high.locator('.todo-quadrant-scroll');
  await scroll.evaluate(node => { node.scrollTop = 0; });
  const beforeScroll = await page.locator('.todo-quadrant-scroll').evaluateAll(nodes => nodes.map(node => node.scrollTop));
  const dimensions = await scroll.evaluate(node => ({ client: node.clientHeight, content: node.scrollHeight }));
  expect(dimensions.content).toBeGreaterThan(dimensions.client * 2);
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  expect(await scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('.todo-quadrant-scroll').evaluateAll(nodes => nodes.slice(1).map(node => node.scrollTop))).toEqual(beforeScroll.slice(1));
  expect(await quadrantBoxes()).toEqual(boxes);
  expect(await createButtons.evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height, width: r.width };
  })), 'Task creation entries stay reachable while the dense list scrolls').toEqual(creationGeometry.map(control => control.button));
  await expect(high.getByRole('button', { name: /^已完成/ })).toBeInViewport();

  // Finished rows are visible by default, after all unfinished rows.
  await expect(high.locator('.todo-task.is-done')).toHaveCount(1);
  const completedLast = await high.locator('.todo-task').evaluateAll(nodes => nodes.map(node => node.classList.contains('is-done')));
  expect(completedLast).toEqual([...Array(20).fill(false), true]);
  expect(await quadrantBoxes()).toEqual(boxes);
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await page.screenshot({ path: path.join(out, `todos-display-scrolled-${width}.png`), fullPage: true });
  await high.getByRole('button', { name: /^已完成/ }).click();
  await expect(high.locator('.todo-task.is-done')).toHaveCount(0);

  // The checkbox completes a plain task without opening an editor or generating work.
  const completeTitle = '本周待办事项 18';
  await high.getByRole('button', { name: `完成：${completeTitle}`, exact: true }).click();
  await expect(high.locator('.todo-task:not(.is-done)')).toHaveCount(19);
  await expect(page.locator('.todo-sheet')).toHaveCount(0);
  await expect(high.locator('.todo-task.is-done')).toHaveCount(0);
  const stored = await page.evaluate(() => window.__miniFixture.todoLocalState);
  expect(stored.tasks).toHaveLength(24);
  expect(stored.tasks.find(task => task.title === completeTitle).completedAt).toBeTruthy();
  expect(stored.tasks.find(task => task.id === 'display-long-cn').title).toBe(titles.chinese);
  await high.getByRole('button', { name: /^已完成/ }).click();
  await expect(high.locator('.todo-task.is-done')).toHaveCount(2);
  expect(await high.locator('.todo-task').evaluateAll(nodes => nodes.map(node => node.classList.contains('is-done')))).toEqual([...Array(19).fill(false), true, true]);
  expect(await quadrantBoxes()).toEqual(boxes);

  // Todos stays on one screen; tab navigation must preserve its top gap and layout.
  await expect(page.locator('#page-more,.screen-scroll-hint')).toHaveCount(0);
  await page.locator('.preview-native-tabs a[href="#/pages/index/index"]').click();
  await expect(page.locator('.today-page')).toBeVisible();
  await page.locator('.preview-native-tabs a[href="#/pages/todos/index"]').click();
  await expect(page.locator('.todo-quadrant')).toHaveCount(4);
  await checkToolbarTopSpacing('Returning through the tab navigation');
  expect(await quadrantBoxes(), 'Page navigation retains all four complete quadrants').toEqual(boxes);
  await page.screenshot({ path: path.join(out, `todos-display-returned-${width}.png`), fullPage: true });

  // Incompatible source data keeps quadrant entries unavailable and disables
  // the ordinary creation entry. Retain the source as-is.
  await page.goto(`${origin}/?todo-display-disabled-${width}#/pages/posts/index`);
  const invalid = { version: 2, tasks: [{ id: 'future-task', title: '保留未兼容数据' }], categories: [] };
  await page.evaluate(invalid => { window.__miniFixture.guestToolStates = { todos: invalid }; location.hash = '#/pages/todos/index'; }, invalid);
  await expect(page.locator('.todo-page .tool-empty')).toContainText('当前数据格式暂不兼容');
  await expect(page.locator('.todo-quadrant-add'), 'Invalid source data offers no quadrant creation entry').toHaveCount(0);
  await expect(page.locator('.todo-toolbar .page-toolbar-create')).toHaveCount(0);
  await expect(page.locator('.entry-composer')).toHaveCount(0);
  expect(await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-tool-v1:guest:todos').data), 'Disabled quadrant creation preserves incompatible source records').toEqual(invalid);
};
