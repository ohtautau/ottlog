const path = require('node:path');

module.exports = async function checkPomodoroTodoWorkflow({ page, origin, out, width, expect }) {
  const source = require('./pomodoro-source-controls.cjs')({ page, expect });
  const picker = () => page.getByRole('button', { name: '从待办选择专注事项', exact: true });
  const sheet = () => page.locator('.focus-todo-sheet');
  const options = () => page.locator('.focus-todo-option');
  const option = title => page.getByRole('button', { name: `选择待办：${title}`, exact: true });
  const search = () => page.getByRole('textbox', { name: '搜索待办', exact: true });
  await page.goto(`${origin}/?pomodoro-todos-${width}#/pages/index/index`);
  await page.evaluate(() => {
    const task = (id, title, categoryId = '', completedAt = null) => ({ id, title, categoryId, completedAt, description: '', important: false, urgent: false, dueDate: '', createdAt: '2026-09-15T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z' });
    const session = (id, taskId) => ({ id, taskId, habitId: null, title: '历史待办', mode: 'focus', durationSeconds: 60, plannedSeconds: 1500, completed: false, startedAt: '2026-09-14T10:00:00Z', endedAt: '2026-09-14T10:01:00Z' });
    window.__miniFixture.guestToolStates = {
      todos: { version: 1, categories: [{ id: 'work', name: '工作', color: '#8aafff' }, { id: 'life', name: '生活', color: '#a8ceae' }], tasks: [
        { ...task('report', '整理本周工作报告', 'work'), dueDate: '2026-09-15', dueTime: '14:30' }, task('shopping', '买一些新鲜蔬菜', 'life'),
        { ...task('high', '处理紧急事故'), important: true, urgent: true },
        { ...task('middle', '规划下一季度'), important: true, urgent: false },
        { ...task('low', '确认快递时间'), important: false, urgent: true },
        ...Array.from({ length: 24 }, (_, i) => task(`extra-${i}`, `整理笔记第 ${i + 1} 页`)),
        task('done', '已经完成的待办', 'work', '2026-09-15T00:00:00Z'),
      ] },
      pomodoro: { version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' }, mode: 'focus', selection: { taskId: 'report', habitId: null, title: '整理本周工作报告' }, active: null, completedFocusCount: 0,
        sessions: [session('recent-done', 'done'), session('recent-deleted', 'deleted'), session('recent-report', 'report'), session('repeat-report', 'report')] },
    };
    location.hash = '#/pages/pomodoro/index';
  });
  await source.open();
  await expect(picker()).toBeEnabled();
  await expect(page.locator('.focus-todo-picker select')).toHaveCount(0);
  await source.select('todo');
  await expect(sheet()).toBeVisible();
  await expect(options()).toHaveCount(26);
  await expect(option('已经完成的待办')).toHaveCount(0);
  await expect(page.locator('.focus-todo-recent .focus-todo-option')).toHaveCount(1);
  await expect(page.locator('.focus-todo-recent')).toContainText('整理本周工作报告');
  await expect(option('整理本周工作报告').locator('.todo-task-date')).toHaveText('9月15日 14:30');
  await expect(page.locator('.focus-selection-todo-icon')).toHaveCount(0);
  const tasksBefore = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-tool-v1:guest:todos').data);
  const layout = await sheet().evaluate(node => {
    const box = node.getBoundingClientRect(), viewport = document.querySelector('.preview-content').getBoundingClientRect();
    const cards = [...node.querySelectorAll('.focus-todo-option')].slice(1, 3).map(item => item.getBoundingClientRect());
    const scroll = node.querySelector('.focus-todo-scroll');
    return { top: box.top, bottom: box.bottom, viewportTop: viewport.top, viewportBottom: viewport.bottom, overflow: node.scrollWidth - node.clientWidth,
      rowGap: cards[1].top - cards[0].bottom, cardLeftDifference: cards[0].left - cards[1].left, cardWidthDifference: cards[0].width - cards[1].width, cardHeight: cards[0].height, scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight };
  });
  expect(layout.top).toBeGreaterThanOrEqual(layout.viewportTop - 1);
  expect(layout.bottom).toBeLessThanOrEqual(layout.viewportBottom + 1);
  expect(layout.overflow).toBeLessThanOrEqual(2);
  expect(layout.rowGap).toBeGreaterThanOrEqual(-1);
  expect(Math.abs(layout.cardLeftDifference)).toBeLessThanOrEqual(1);
  expect(layout.cardHeight).toBeGreaterThanOrEqual(40);
  expect(Math.abs(layout.cardWidthDifference)).toBeLessThanOrEqual(1);
  expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight);
  await page.screenshot({ path: path.join(out, `pomodoro-todo-sheet-${width}.png`) });
  await page.locator('.focus-todo-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(option('整理笔记第 24 页')).toBeInViewport();
  await expect(search()).toBeInViewport();
  await expect(sheet().locator('.page-category-scroll button')).toHaveText(['', '', '', '']);
  await expect(sheet().locator('.page-category-scroll .priority-flag')).toHaveCount(4);
  const flags = await sheet().locator('.page-category-scroll button').evaluateAll(nodes => nodes.map(node => { const flag = node.querySelector('.priority-flag'), box = node.getBoundingClientRect(), mark = flag.getBoundingClientRect(); return { color: getComputedStyle(flag).color, outline: flag.classList.contains('is-none'), width: box.width, height: box.height, dx: (mark.left + mark.right - box.left - box.right) / 2, dy: (mark.top + mark.bottom - box.top - box.bottom) / 2 }; }));
  expect(flags.map(flag => flag.color)).toEqual(['rgb(231, 160, 151)', 'rgb(228, 206, 133)', 'rgb(153, 184, 236)', 'rgb(171, 208, 178)']);
  expect(flags.map(flag => flag.outline)).toEqual([false, false, false, true]);
  flags.forEach(flag => { expect(flag.width).toBeGreaterThanOrEqual(40); expect(flag.height).toBeGreaterThanOrEqual(40); expect(Math.abs(flag.dx)).toBeLessThanOrEqual(1); expect(Math.abs(flag.dy)).toBeLessThanOrEqual(1); });
  for (const [priority, title] of [['高', '处理紧急事故'], ['中', '规划下一季度'], ['低', '确认快递时间']]) {
    await page.getByRole('button', { name: `待办优先度：${priority}优先度`, exact: true }).click();
    await expect(options()).toHaveCount(1);
    await expect(option(title)).toBeVisible();
    await expect(page.locator('.focus-todo-recent')).toHaveCount(0);
  }
  await page.getByRole('button', { name: '待办优先度：无优先度', exact: true }).click();
  await expect(options()).toHaveCount(26);
  await search().fill('蔬菜');
  await expect(options()).toHaveCount(1);
  await expect(option('买一些新鲜蔬菜')).toBeVisible();
  await search().fill(' 整理 本周 工作报告 ');
  await expect(options()).toHaveCount(1);
  await search().fill('不存在的待办');
  await expect(options()).toHaveCount(0);
  await page.getByRole('button', { name: '清空搜索', exact: true }).click();
  await expect(options()).toHaveCount(26);
  await page.locator('.focus-todo-recent .todo-complete').click();
  await expect(sheet()).toHaveCount(0);
  await expect(page.locator('.focus-purpose-input')).toHaveValue('整理本周工作报告');
  expect(await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-tool-v1:guest:todos').data), 'Selecting a task leaves its completion, date and saved record unchanged').toEqual(tasksBefore);
  await source.select('todo');
  await expect(option('整理本周工作报告')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '关闭待办选择', exact: true }).click();
  await expect(page.locator('.focus-purpose-input')).toHaveValue('整理本周工作报告');
  await source.select('todo');
  await page.getByRole('button', { name: '改为自由专注', exact: true }).click();
  await expect(page.locator('.focus-purpose-input')).toHaveValue('');
  await source.open();
  await expect(picker()).toHaveAttribute('aria-pressed', 'false');
  await source.close();

  // A removed link remains clearable even when no unfinished tasks remain.
  await page.goto(`${origin}/?pomodoro-stale-todo-${width}#/pages/index/index`);
  await page.evaluate(() => {
    window.__miniFixture.guestToolStates = {
      todos: { version: 1, categories: [], tasks: [] },
      pomodoro: { version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: 'autoBreak' }, mode: 'focus', selection: { taskId: 'deleted', habitId: null, title: '过去的待办' }, active: null, sessions: [], completedFocusCount: 0 },
    };
    location.hash = '#/pages/pomodoro/index';
  });
  await source.open();
  await expect(picker()).toBeEnabled();
  await source.select('todo');
  await expect(options()).toHaveCount(0);
  await page.getByRole('button', { name: '改为自由专注', exact: true }).click();
  await expect(sheet()).toHaveCount(0);
  await source.open();
  await expect(picker()).toBeDisabled();
  await source.close();
  await expect(page.locator('.focus-purpose-input')).toHaveValue('');
};
