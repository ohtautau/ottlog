const path = require('node:path');
module.exports = async ({ page, origin, out, width, expect, tasksOnly = false }) => {
  await page.goto(`${origin}/?improvements#/pages/index/index`);
  await page.evaluate(() => {
    const now = new Date(), stamp = now.toISOString();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const base = { description: '', categoryId: '', important: true, urgent: true, completedAt: null, createdAt: stamp, updatedAt: stamp, tags: ['工作'] };
    window.__miniFixture.guestToolStates = {
      todos: { version: 1, categories: [], tasks: [
        { ...base, id: 'a', title: 'No date', dueDate: '' },
        { ...base, id: 'b', title: 'Later', dueDate: '2099-12-01' },
        { ...base, id: 'c', title: 'Earlier', dueDate: '2099-01-01' },
        { ...base, id: 'd', title: 'Completed', dueDate: day, completedAt: stamp },
      ] },
      pomodoro: { version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 }, mode: 'focus', active: null, selection: { taskId: null, title: '' }, sessions: [
        { id: 'focus-a', mode: 'focus', durationSeconds: 1500, plannedSeconds: 1500, startedAt: stamp, endedAt: stamp, completed: true, taskId: null, title: 'Read' },
        { id: 'focus-b', mode: 'focus', durationSeconds: 300, plannedSeconds: 1500, startedAt: stamp, endedAt: stamp, completed: false, taskId: null, title: 'Write' },
        { id: 'break-a', mode: 'shortBreak', durationSeconds: 300, plannedSeconds: 300, startedAt: stamp, endedAt: stamp, completed: true, taskId: null, title: '' },
      ] },
    };
    location.hash = '#/pages/todos/index';
  });
  const high = page.locator('.todo-quadrant-do');
  await expect(high.locator('.todo-task:not(.is-done) .todo-task-title')).toHaveText(['No date', 'Later', 'Earlier']);
  await expect(page.locator('.todo-toolbar .page-toolbar-sort')).toHaveCount(1);
  await expect(page.locator('.todo-status-row,.todo-toolbar .page-category-scroll')).toHaveCount(0);
  const state = () => page.evaluate(() => window.__miniFixture.todoLocalState);
  const nativeScrollViews = () => page.locator('.page-scroll, .todo-quadrant-scroll');
  async function expectScrollLocked(locked) {
    await expect(nativeScrollViews()).toHaveCount(5);
    await expect.poll(() => nativeScrollViews().evaluateAll(nodes => nodes.map(node => node.getAttribute('data-scroll-enabled')))).toEqual(Array(5).fill(String(!locked)));
  }
  await expectScrollLocked(false);
  // A short touch and a scroll gesture must never arm a drag.
  const shortTouch = high.locator('.todo-task-content').first();
  const shortBox = await shortTouch.boundingBox();
  const shortPoint = { identifier: 1, clientX: shortBox.x + 10, clientY: shortBox.y + 10 };
  await shortTouch.dispatchEvent('touchstart', { touches: [shortPoint] });
  await shortTouch.dispatchEvent('touchend', { touches: [] });
  await page.waitForTimeout(450);
  await expect(page.locator('.todo-task.is-drag-source')).toHaveCount(0);
  await shortTouch.dispatchEvent('touchstart', { touches: [shortPoint] });
  await shortTouch.dispatchEvent('touchmove', { touches: [{ ...shortPoint, clientY: shortPoint.clientY + 20 }] });
  await page.waitForTimeout(450);
  await expect(page.locator('.todo-task.is-drag-source')).toHaveCount(0);
  await shortTouch.dispatchEvent('touchend', { touches: [] });
  await expectScrollLocked(false);
  async function drag(title, zone, before, cancel = false, options = {}) {
    const row = page.locator('.todo-task').filter({ has: page.getByRole('button', { name: `编辑任务：${title}`, exact: true }) });
    const handle = row.locator(options.checkbox ? '.todo-complete' : '.todo-task-content');
    await handle.scrollIntoViewIfNeeded();
    const start = await handle.boundingBox();
    const target = await page.locator(before ? '.todo-task' : `#todo-zone-${zone}`).filter(before ? { has: page.getByRole('button', { name: `编辑任务：${before}`, exact: true }) } : {}).boundingBox();
    const point = { identifier: 1, clientX: start.x + start.width / 2, clientY: start.y + start.height / 2 };
    const destination = { ...point, clientX: target.x + target.width / 2, clientY: before ? target.y + 2 : target.y + target.height / 2 };
    const originalTouchTarget = await handle.elementHandle();
    await originalTouchTarget.dispatchEvent('touchstart', { touches: [point] });
    if (options.nativeLongPress) await originalTouchTarget.dispatchEvent('contextmenu', point);
    await expect(page.locator('.todo-task.is-drag-source')).toHaveCount(1);
    expect(await originalTouchTarget.evaluate(node => node.isConnected), 'Long press must preserve the original native touch target').toBe(true);
    await expectScrollLocked(true);
    if (!options.finalPointOnly) {
      await originalTouchTarget.dispatchEvent('touchmove', { touches: [destination] });
      await expect(page.locator('.todo-drag-ghost')).toBeVisible();
    }
    await originalTouchTarget.dispatchEvent(cancel ? 'touchcancel' : 'touchend', { touches: [], changedTouches: [destination] });
    await expect(page.locator('.todo-drag-ghost')).toHaveCount(0);
    await expect(page.locator('.todo-task.is-drag-source')).toHaveCount(0);
    await expectScrollLocked(false);
    await expect(page.locator('.todo-sheet')).toHaveCount(0);
    await originalTouchTarget.dispose();
    await page.waitForTimeout(450);
  }
  await drag('Earlier', 'plan');
  await expect(page.locator('.todo-quadrant-plan .todo-task-title')).toHaveText(['Earlier']);
  expect((await state()).tasks.find(item => item.id === 'c')).toMatchObject({ important: true, urgent: false });
  await drag('No date', 'do', 'Later');
  await expect(high.locator('.todo-task:not(.is-done) .todo-task-title')).toHaveText(['No date', 'Later']);
  await drag('Later', 'do', 'No date');
  await expect(high.locator('.todo-task:not(.is-done) .todo-task-title')).toHaveText(['Later', 'No date']);
  await drag('Later', 'later', null, true);
  await expect(high.locator('.todo-task:not(.is-done) .todo-task-title')).toHaveText(['Later', 'No date']);
  // Native long press on the checkbox must drag without completing the task.
  // The final point may only arrive in changedTouches when moves are throttled.
  await drag('Earlier', 'delegate', null, false, { checkbox: true, nativeLongPress: true, finalPointOnly: true });
  await expect(page.locator('.todo-quadrant-delegate .todo-task-title')).toHaveText(['Earlier']);
  expect((await state()).tasks.find(item => item.id === 'c')).toMatchObject({ important: false, urgent: true, completedAt: null });
  await drag('Earlier', 'plan', null, false, { checkbox: true, nativeLongPress: true });
  await expect(page.locator('.todo-quadrant-plan .todo-task-title')).toHaveText(['Earlier']);
  // A late native node callback must not lock the page after cancellation.
  await page.evaluate(() => { window.__miniFixture.scrollNodeQueryDelay = 800; });
  const delayedHandle = page.locator('.todo-task').filter({ has: page.getByRole('button', { name: '编辑任务：Earlier', exact: true }) }).locator('.todo-task-content');
  const delayedBox = await delayedHandle.boundingBox();
  const delayedPoint = { identifier: 1, clientX: delayedBox.x + 12, clientY: delayedBox.y + 12 };
  await delayedHandle.dispatchEvent('touchstart', { touches: [delayedPoint] });
  await delayedHandle.dispatchEvent('contextmenu', delayedPoint);
  await expect(page.locator('.todo-task.is-drag-source')).toHaveCount(1);
  await delayedHandle.dispatchEvent('touchcancel', { touches: [] });
  await page.waitForTimeout(900);
  await expectScrollLocked(false);
  await page.evaluate(() => { window.__miniFixture.scrollNodeQueryDelay = 0; });
  await page.evaluate(() => { location.hash = '#/pages/index/index'; });
  await expect(page.locator('.today-grid')).toBeVisible();
  await page.evaluate(() => { location.hash = '#/pages/todos/index'; });
  await expect(high.locator('.todo-task:not(.is-done) .todo-task-title')).toHaveText(['Later', 'No date']);
  const filterToggle = page.locator('.todo-filter-toggle');
  async function filterExpanded(expanded) {
    await expect(filterToggle).toHaveAttribute('aria-expanded', String(expanded));
    await expect(filterToggle).toHaveText('');
    await expect(filterToggle.locator('.select-chevron')).toHaveCount(0);
    await expect(filterToggle.locator('.filter-symbol')).toHaveCount(1);
  }
  async function filterHighlighted(active) {
    await expect(filterToggle).toHaveAttribute('aria-pressed', String(active));
    await page.mouse.move(0, 0);
    const appearance = await filterToggle.evaluate(node => {
      const button = node.getBoundingClientRect(), icon = node.querySelector('.filter-symbol').getBoundingClientRect(), style = getComputedStyle(node);
      return { foreground: style.color, background: style.backgroundColor, width: button.width, height: button.height,
        iconWidth: icon.width, iconHeight: icon.height, centerX: icon.left + icon.width / 2 - button.left - button.width / 2,
        centerY: icon.top + icon.height / 2 - button.top - button.height / 2 };
    });
    expect([appearance.foreground, appearance.background], 'Filter conditions control the shared highlight independently of opening').toEqual(active
      ? ['rgb(211, 239, 223)', 'rgb(48, 76, 66)'] : ['rgb(199, 215, 223)', 'rgba(0, 0, 0, 0)']);
    expect(appearance.width).toBe(40);
    expect(appearance.height).toBe(40);
    expect(appearance.iconWidth).toBe(20);
    expect(appearance.iconHeight).toBe(20);
    expect(Math.abs(appearance.centerX)).toBeLessThanOrEqual(1);
    expect(Math.abs(appearance.centerY)).toBeLessThanOrEqual(1);
  }
  await filterExpanded(false);
  await filterHighlighted(false);
  await filterToggle.click();
  const filterSheet = page.locator('.todo-filter-sheet');
  const filterSearch = filterSheet.getByPlaceholder('搜索任务、备注、标签');
  const filterState = label => filterSheet.getByRole('button', { name: `筛选状态：${label}`, exact: true });
  const filterTag = label => filterSheet.getByRole('button', { name: `筛选标签：${label}`, exact: true });
  const filterResult = count => filterSheet.getByRole('button', { name: `查看 ${count} 件任务`, exact: true });
  async function filterLayout() {
    const layout = await filterSheet.evaluate(node => {
      const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
      const scroll = node.querySelector('.form-popover-scroll'), tags = node.querySelector('.todo-filter-tags');
      return { panel: box(node), anchor: box(document.querySelector('.todo-filter-toggle')), viewport: box(document.querySelector('.preview-content')),
        heading: box(node.querySelector('.todo-filter-heading')), scroll: box(scroll), footer: box(node.querySelector('.todo-filter-actions')),
        input: box(node.querySelector('.todo-filter-search')),
        actions: [...node.querySelectorAll('.todo-filter-actions button')].map(box),
        overflow: Math.max(node.scrollWidth - node.clientWidth, scroll.scrollWidth - scroll.clientWidth, tags.scrollWidth - tags.clientWidth) };
    });
    const { panel, anchor, viewport, heading, scroll, footer } = layout;
    const below = panel.top >= anchor.bottom - 1, above = panel.bottom <= anchor.top + 1;
    expect(below || above, `${width}: task filters stay on one side of their trigger`).toBe(true);
    expect(Math.abs((below ? panel.top - anchor.bottom : anchor.top - panel.bottom) - 8), `${width}: task filter popover is adjacent to its trigger`).toBeLessThanOrEqual(2);
    expect(panel.left).toBeLessThan(anchor.right);
    expect(panel.right).toBeGreaterThan(anchor.left);
    expect(panel.left).toBeGreaterThanOrEqual(viewport.left - 1);
    expect(panel.right).toBeLessThanOrEqual(viewport.right + 1);
    expect(panel.top).toBeGreaterThanOrEqual(viewport.top - 1);
    expect(panel.bottom).toBeLessThanOrEqual(viewport.bottom + 1);
    expect(heading.top).toBeGreaterThanOrEqual(panel.top - 1);
    expect(scroll.top).toBeGreaterThanOrEqual(heading.bottom - 1);
    expect(scroll.bottom).toBeLessThanOrEqual(footer.top + 1);
    expect(footer.bottom).toBeLessThanOrEqual(panel.bottom + 1);
    expect(layout.input.bottom - layout.input.top, 'The task filter input retains a 40px touch target').toBeGreaterThanOrEqual(40);
    expect(layout.input.bottom - layout.input.top, 'The task filter input does not grow with global rpx rules').toBeLessThanOrEqual(44);
    expect(layout.overflow).toBeLessThanOrEqual(2);
    expect(layout.actions).toHaveLength(2);
    expect(layout.actions[0].right).toBeLessThanOrEqual(layout.actions[1].left + 1);
    expect(layout.actions[1].right - layout.actions[1].left, 'Viewing retains more width than the left reset symbol').toBeGreaterThan(layout.actions[0].right - layout.actions[0].left);
    for (const action of layout.actions) {
      expect(action.top).toBeGreaterThanOrEqual(footer.top - 1);
      expect(action.bottom).toBeLessThanOrEqual(panel.bottom + 1);
    }
    return layout;
  }
  await expect(filterSheet).toBeVisible();
  await filterExpanded(true);
  await filterHighlighted(false);
  await filterLayout();
  // The shared C34 catalog also contains the existing default memo tags.
  await expect(filterSheet.locator('.todo-filter-tags button')).toHaveCount(11);
  for (const tag of ['工作', '学习', '生活', '购物', '示例', '摄影', '阅读', '饮食', '英语', '创作']) await expect(filterTag(tag)).toHaveCount(1);
  await expect(filterSheet.getByRole('button', { name: '不限标签', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // Every existing condition works alone; opening and blank keywords do not
  // imply a filter, and clearing restores the unselected shared appearance.
  const clearFilters = () => filterSheet.getByRole('button', { name: '重置任务筛选', exact: true }).click();
  await filterSearch.fill('   ');
  await filterHighlighted(false);
  await filterSearch.fill('Earlier');
  await filterResult(1).click();
  await filterExpanded(false);
  await filterHighlighted(true);
  await filterToggle.click();
  await clearFilters();
  await filterHighlighted(false);
  await filterTag('工作').click();
  await filterResult(4).click();
  await filterHighlighted(true);
  await filterToggle.click();
  await filterSheet.getByRole('button', { name: '不限标签', exact: true }).click();
  await filterHighlighted(false);
  await filterState('已完成').click();
  await filterResult(1).click();
  await filterHighlighted(true);
  await expect(page.locator('.todo-task-title')).toHaveText(['Completed']);
  await filterToggle.click();
  await filterState('待完成').click();
  await filterResult(3).click();
  await filterHighlighted(true);
  await expect(page.locator('.todo-task.is-done')).toHaveCount(0);
  await page.screenshot({ path: path.join(out, `tasks-filter-active-${width}.png`) });
  await filterToggle.click();
  await clearFilters();
  await filterHighlighted(false);
  await filterTag('工作').click();
  await filterState('已完成').click();
  await expect(filterTag('工作')).toHaveAttribute('aria-pressed', 'true');
  await expect(filterState('已完成')).toHaveAttribute('aria-pressed', 'true');
  await filterResult(1).click();
  await expect(filterSheet).toHaveCount(0);
  await filterExpanded(false);
  await expect(page.locator('.todo-task-title')).toHaveText(['Completed']);
  await page.locator('.todo-filter-toggle').click();
  await expect(filterTag('工作')).toHaveAttribute('aria-pressed', 'true');
  await expect(filterState('已完成')).toHaveAttribute('aria-pressed', 'true');
  await filterSearch.fill('Earlier');
  await filterResult(0).click();
  await expect(page.locator('.todo-task-title')).toHaveCount(0);
  await expect(page.locator('.todo-filter-summary')).toContainText('0 件匹配');
  await page.locator('.todo-filter-toggle').click();
  await filterSheet.getByRole('button', { name: '清除关键词', exact: true }).click();
  await expect(filterSearch).toHaveValue('');
  await expect(filterResult(1)).toBeVisible();
  await filterState('待完成').click();
  await expect(filterResult(3)).toBeVisible();
  await filterTag('学习').click();
  await expect(filterResult(0)).toBeVisible();
  await filterSheet.getByRole('button', { name: '不限标签', exact: true }).click();
  await expect(filterResult(3)).toBeVisible();
  await filterTag('工作').click();
  await filterSearch.fill('Earlier');
  await expect(filterResult(1)).toBeVisible();
  const panelLayout = await filterLayout();
  await filterSheet.locator('.form-popover-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
  const scrollState = await filterSheet.locator('.form-popover-scroll').evaluate(node => ({ top: node.scrollTop, excess: node.scrollHeight - node.clientHeight,
    bottom: node.getBoundingClientRect().bottom, lastBottom: node.querySelector('.todo-filter-tags button:last-child').getBoundingClientRect().bottom }));
  if (scrollState.excess > 1) expect(scrollState.top, 'Long filter options can scroll to the final tag choice').toBeGreaterThan(0);
  expect(scrollState.lastBottom).toBeLessThanOrEqual(scrollState.bottom + 1);
  const layoutAfterScroll = await filterLayout();
  expect(layoutAfterScroll.heading).toEqual(panelLayout.heading);
  expect(layoutAfterScroll.footer).toEqual(panelLayout.footer);
  await expect(filterResult(1)).toBeInViewport();
  await expect(filterSheet.getByRole('button', { name: '重置任务筛选', exact: true })).toBeInViewport();
  await page.screenshot({ path: path.join(out, `tasks-filter-panel-${width}.png`) });
  await filterSheet.locator('.todo-filter-actions').getByRole('button', { name: '重置任务筛选', exact: true }).click();
  await expect(filterSearch).toHaveValue('');
  await expect(filterState('全部')).toHaveAttribute('aria-pressed', 'true');
  await expect(filterSheet.getByRole('button', { name: '不限标签', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(filterResult(4)).toBeVisible();
  await filterHighlighted(false);
  await filterSearch.fill('Earlier');
  await filterResult(1).click();
  await expect(page.locator('.todo-task-title')).toHaveText(['Earlier']);
  await expect(page.locator('.todo-filter-summary')).toContainText('关键词：Earlier');
  await filterHighlighted(true);
  await page.getByRole('button', { name: '筛选', exact: true }).click();
  await filterSheet.getByRole('button', { name: '重置任务筛选', exact: true }).click();
  await filterResult(4).click();
  await expect(filterSheet).toHaveCount(0);
  await filterExpanded(false);
  await filterHighlighted(false);
  await filterToggle.click();
  await expect(filterSheet).toBeVisible();
  await filterExpanded(true);
  await page.keyboard.press('Escape');
  await expect(filterSheet).toHaveCount(0);
  await filterExpanded(false);
  await expect(page.locator('.todo-task-title')).toHaveCount(4);
  await page.screenshot({ path: path.join(out, `tasks-drag-filter-${width}.png`) });
  await expect(page.locator('.activity-analysis')).toHaveCount(0);
  if (!tasksOnly) {
  await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=todos'; });
  const analysis = page.locator('.activity-analysis');
  await expect(analysis).toBeVisible();
  await analysis.scrollIntoViewIfNeeded();
  await expect(analysis.locator('.analysis-kpis')).toContainText('1期间完成');
  await analysis.locator('.analysis-column').last().click();
  await expect(analysis.locator('.analysis-details')).toContainText('Completed');
  await analysis.getByRole('button', { name: '近30天', exact: true }).click();
  await expect(analysis.locator('.analysis-column')).toHaveCount(30);
  await analysis.locator('.analysis-bar').filter({ hasText: '中优先级' }).click();
  await expect(analysis.locator('.analysis-details')).toContainText('Earlier');
  await page.screenshot({ path: path.join(out, `tasks-analysis-${width}.png`) });
  await page.evaluate(() => { location.hash = '#/pages/pomodoro/index'; });
  await expect(page.locator('.focus-clock-card')).toBeVisible();
  await expect(page.locator('.activity-analysis,.focus-today-card,.focus-week-card')).toHaveCount(0);
  await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=focus'; });
  await expect(analysis).toBeVisible();
  await analysis.scrollIntoViewIfNeeded();
  await expect(analysis.locator('.analysis-kpis')).toContainText('30专注分钟');
  await expect(analysis.locator('.analysis-kpis')).toContainText('1完整番茄');
  await analysis.locator('.analysis-bar').filter({ hasText: 'Read' }).click();
  await expect(analysis.locator('.analysis-details')).toContainText('25 分钟');
  await expect(analysis.locator('.analysis-findings')).toContainText('1 轮提前结束');
  await page.screenshot({ path: path.join(out, `focus-analysis-${width}.png`) });
  await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
  await expect(page.locator('.daily-suggestion-grid .habit-icon').first()).toBeVisible();
  await expect.poll(() => page.locator('.habit-icon').evaluateAll(nodes => nodes.every(node => node.complete && node.naturalWidth === 192))).toBe(true);
  const icons = await page.locator('.habit-icon').evaluateAll(nodes => nodes.map(node => ({ loaded: node.complete && node.naturalWidth === 192, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, src: node.getAttribute('src') })));
  expect(icons.every(icon => icon.loaded && Math.abs(icon.width - icon.height) < 1 && icon.src.startsWith('/assets/habits/')), JSON.stringify(icons)).toBe(true);
  await page.screenshot({ path: path.join(out, `habit-icons-${width}.png`) });
  expect(await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll('.page-scroll')).map(node => node.scrollWidth - node.clientWidth)))).toBeLessThanOrEqual(2);
  }
  await page.goto(`${origin}/?drag-scroll#/pages/index/index`);
  await page.evaluate(() => {
    const stamp = new Date().toISOString();
    window.__miniFixture.guestToolStates = { todos: { version: 1, categories: [], tasks: Array.from({ length: 24 }, (_, index) => ({ id: `scroll-${index}`, title: `Scrollable ${index}`, categoryId: '', description: '', dueDate: '', important: true, urgent: true, completedAt: null, createdAt: stamp, updatedAt: stamp })) } };
    const example = window.__miniFixture.guestToolStates.todos.tasks[0];
    window.__miniFixture.guestToolStates.todos.tasks.push({ ...example, id: 'lower-first', title: 'Target first', important: false }, { ...example, id: 'lower-last', title: 'Target last', important: false });
    location.hash = '#/pages/todos/index';
  });
  const scroll = page.locator('#todo-scroll-do');
  await expect(scroll.locator('.todo-task')).toHaveCount(24);
  await scroll.evaluate(node => { node.scrollTop = 100; node.dispatchEvent(new Event('scroll')); });
  const handle = page.locator('.todo-task').filter({ has: page.getByRole('button', { name: '编辑任务：Scrollable 4', exact: true }) }).locator('.todo-complete');
  await handle.scrollIntoViewIfNeeded();
  const startTop = await scroll.evaluate(node => node.scrollTop), box = await handle.boundingBox(), viewport = await scroll.boundingBox();
  const point = { identifier: 1, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
  await handle.dispatchEvent('touchstart', { touches: [point] });
  await expect(page.locator('.todo-task.is-drag-source')).toHaveCount(1);
  await expectScrollLocked(true);
  expect(await scroll.evaluate(node => node.scrollTop)).toBe(startTop);
  await handle.dispatchEvent('touchmove', { touches: [{ ...point, clientY: viewport.y + viewport.height - 4 }] });
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(startTop + 30);
  await handle.dispatchEvent('touchcancel', { touches: [] });
  await expect(page.locator('.todo-drag-ghost')).toHaveCount(0);
  await expectScrollLocked(false);
  await expect(scroll.locator('.todo-task-title').first()).toHaveText('Scrollable 0');
  await drag('Scrollable 4', 'delegate', 'Target last');
  await expect(page.locator('.todo-quadrant-delegate .todo-task-title')).toHaveText(['Target first', 'Scrollable 4', 'Target last']);
  // Leaving a page during a held drag must restore its native contexts too.
  const leavingHandle = page.locator('.todo-task').filter({ has: page.getByRole('button', { name: '编辑任务：Scrollable 4', exact: true }) }).locator('.todo-task-content');
  const leavingBox = await leavingHandle.boundingBox();
  const leavingPoint = { identifier: 1, clientX: leavingBox.x + 12, clientY: leavingBox.y + 12 };
  await page.evaluate(() => { window.__miniFixture.nativeScrollChanges = []; });
  await leavingHandle.dispatchEvent('touchstart', { touches: [leavingPoint] });
  await leavingHandle.dispatchEvent('contextmenu', leavingPoint);
  await expectScrollLocked(true);
  await page.evaluate(() => { location.hash = '#/pages/index/index'; });
  await expect(page.locator('.today-grid')).toBeVisible();
  const locksAfterLeave = await page.evaluate(() => Object.values(Object.fromEntries(window.__miniFixture.nativeScrollChanges.map(change => [change.id, change.enabled]))));
  expect(locksAfterLeave).toHaveLength(5);
  expect(locksAfterLeave.every(Boolean), 'Unmount must release every native scroll lock').toBe(true);
};
