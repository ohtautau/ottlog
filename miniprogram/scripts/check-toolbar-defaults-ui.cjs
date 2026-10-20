const path = require('node:path');

module.exports = async function checkToolbarDefaults({ page, origin, out, width, expect }) {
  const button = name => page.getByRole('button', { name, exact: true });
  const read = key => page.evaluate(key => window.__miniPreviewControl.readStorage(`ottlog-mini-tool-v1:guest:${key}`).data, key);
  async function fresh(route, states) {
    await page.goto(`${origin}/?toolbar-defaults-${route}-${width}#/pages/posts/index`);
    await page.evaluate(states => {
      for (const [key, data] of Object.entries(states)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${key}`, JSON.stringify({ data, pending: false, revision: 0 }));
    }, states);
    await page.reload();
    await page.evaluate(({ route, states }) => {
      window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
      window.__miniFixture.guestToolStates = states;
      location.hash = `#/pages/${route}/index`;
    }, { route, states });
  }
  async function reset(label) {
    const control = button(label); await expect(control).toBeInViewport({ ratio: 1 });
    await expect(control).toHaveText(''); await expect(control.locator('.reset-symbol')).toHaveCount(1);
    const box = await control.boundingBox(); expect(box.width).toBe(40); expect(box.height).toBe(40);
    const next = await control.evaluate(node => {
      const slot = node.closest('.page-toolbar-slot'), next = slot ? slot.nextElementSibling : node.nextElementSibling;
      const r = next.getBoundingClientRect(), b = node.getBoundingClientRect();
      return { gap: r.left - b.right, center: (r.top + r.bottom - b.top - b.bottom) / 2 };
    });
    expect(next.gap).toBeCloseTo(6, 0); expect(Math.abs(next.center)).toBeLessThanOrEqual(1);
    await control.click();
    await expect(page.getByRole('dialog', { name: '保存修改？', exact: true })).toHaveCount(0);
  }
  const stamp = '2026-10-01T00:00:00.000Z';
  const todo = { description: '原备注', categoryId: '', important: false, urgent: false, dueDate: '', completedAt: null, createdAt: stamp, updatedAt: stamp, tags: ['工作'] };
  const todos = { version: 1, sort: 'created', categories: [], tasks: [{ ...todo, id: 'restore-task', title: '恢复前任务' }, { ...todo, id: 'restore-done', title: '完成任务', completedAt: stamp }] };
  await fresh('todos', { todos });
  await button('筛选').click(); await page.getByRole('textbox', { name: '筛选关键词', exact: true }).fill('无匹配');
  await button('筛选状态：待完成').click(); await button('筛选标签：工作').click(); await button('关闭筛选').click();
  await reset('恢复任务默认方式');
  await expect.poll(async () => (await read('todos')).sort).toBe('custom');
  expect((await read('todos')).tasks).toEqual(todos.tasks);
  await expect(page.locator('.todo-task')).toHaveCount(2); await expect(button('筛选')).toHaveAttribute('aria-pressed', 'false');
  const afterTodo = await read('todos'); await button('恢复任务默认方式').click(); expect(await read('todos')).toEqual(afterTodo);
  if (width === 360) {
    await fresh('todos', { todos }); await page.evaluate(() => { window.__miniFixture.failToolWrites = ['todos']; });
    await button('恢复任务默认方式').click(); await expect(page.locator('.todo-sort-error')).toContainText('尚未保存');
    await expect(button('恢复任务默认方式')).toBeDisabled(); expect((await read('todos')).sort).toBe('created');
    await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
    await page.locator('.todo-sort-popover').getByRole('button', { name: '排序', exact: true }).click();
    await expect.poll(async () => (await read('todos')).sort).toBe('custom'); await expect(button('恢复任务默认方式')).toBeEnabled();
  }
  const reminders = { version: 1, sort: { field: 'created', direction: 'asc' }, items: [
    { id: 'restore-habit', title: '恢复前习惯', group: '工作', kind: 'plant', note: '保留习惯备注', minutes: 0, enabled: true, priority: 'high', timePeriod: 'free' },
  ], done: {} };
  await fresh('daily', { reminders });
  await button('筛选习惯').click(); await page.getByRole('textbox', { name: '搜索习惯', exact: true }).fill('无匹配');
  await button('习惯筛选领域：工作').click(); await button('习惯时段筛选：夜晚').click(); await button('习惯优先度筛选：高').click(); await button('关闭习惯筛选').click();
  await reset('恢复习惯默认方式');
  await expect.poll(async () => (await read('reminders')).sort).toEqual({ field: 'priority', direction: 'desc' });
  expect((await read('reminders')).items).toEqual(reminders.items);
  await expect(button('筛选习惯')).toHaveAttribute('aria-pressed', 'false'); await expect(button('排序习惯')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#daily-habit-free-scroll .daily-suggestion')).toHaveCount(1);
  if (width === 360) {
    await fresh('daily', { reminders }); await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
    await button('恢复习惯默认方式').click(); await expect(page.locator('.daily-sort-retry')).toContainText('尚未保存');
    await expect(button('恢复习惯默认方式')).toBeDisabled(); expect((await read('reminders')).sort).toEqual(reminders.sort);
    await page.evaluate(() => { window.__miniFixture.failToolWrites = []; }); await page.locator('.daily-sort-retry').getByRole('button', { name: '重试', exact: true }).click();
    await expect.poll(async () => (await read('reminders')).sort).toEqual({ field: 'priority', direction: 'desc' });
  }
  const memos = { version: 1, notes: [0, 1].map(index => ({ id: `restore-memo-${index}`, title: `便签${index}`, body: '保留正文', color: 'blue', tags: ['工作'], pinned: false, createdAt: stamp, updatedAt: stamp })) };
  await fresh('memos', { memos });
  await button('排序便签').click(); await button('便签排序：标题顺序').click(); await page.locator('.sort-popover').getByRole('button', { name: '完成', exact: true }).click();
  await button('筛选便签').click(); await page.getByRole('textbox', { name: '搜索便签', exact: true }).fill('无匹配'); await button('关闭便签筛选').click();
  await button('管理便签删除').click(); await reset('恢复便签默认方式');
  await expect(page.locator('.memo-note')).toHaveCount(2); await expect(button('筛选便签')).toHaveAttribute('aria-pressed', 'false');
  await expect(button('排序便签')).toHaveAttribute('aria-pressed', 'false'); await expect(button('管理便签删除')).toHaveAttribute('aria-pressed', 'false'); expect(await read('memos')).toEqual(memos);
  await page.screenshot({ path: path.join(out, `toolbar-defaults-memos-${width}.png`) });
  await fresh('posts', {});
  await page.getByPlaceholder('搜索标题、摘要、分类或标签').fill('无匹配'); await button('搜索').click();
  await button('排序文章').click(); await button('文章标题').click(); await button('升序').click(); await page.locator('.sort-popover').getByRole('button', { name: '完成', exact: true }).click();
  await reset('恢复文章默认方式');
  await expect(page.getByPlaceholder('搜索标题、摘要、分类或标签')).toHaveValue(''); await expect(page.locator('.posts-results-count')).toContainText('发布时间 · 降序');
  await button('筛选文章').click(); await expect(button('文章显示数量')).toContainText('10 篇'); await page.keyboard.press('Escape');
  const domain = (id, name) => ({ id, name, longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] });
  const domains = { version: 1, domains: [domain('work', '工作'), domain('growth', '成长')], completedGoals: [] };
  await fresh('domains', { domains, reminders }); await button('排序领域').click(); await reset('恢复领域默认方式');
  await expect(button('排序领域')).toHaveAttribute('aria-pressed', 'false'); expect(await read('domains')).toEqual(domains);
  const cardIds = await page.locator('.domain-entry-shell:not(.domain-create-shell)').evaluateAll(nodes => nodes.map(node => node.id)); expect(cardIds.slice(0, 2)).toEqual(['domain-entry-work', 'domain-entry-growth']);
  await fresh('index', {});
  const preferences = () => page.evaluate(() => [localStorage.getItem('ottlog.home-shortcuts.v1'), localStorage.getItem('ottlog.home-feature-order.v1')]);
  const beforeHome = await preferences(); await button('排序快捷方式').click(); await reset('恢复快捷方式默认方式');
  await expect(button('排序快捷方式')).toHaveAttribute('aria-pressed', 'false'); await button('设置快捷方式').click(); await button('恢复快捷方式默认方式').click();
  await expect(button('设置快捷方式')).toHaveAttribute('aria-pressed', 'false'); expect(await preferences()).toEqual(beforeHome);
  await button('排序全部功能').scrollIntoViewIfNeeded(); await button('排序全部功能').click(); await reset('恢复全部功能默认方式');
  await expect(button('排序全部功能')).toHaveAttribute('aria-pressed', 'false'); expect(await preferences()).toEqual(beforeHome);
  await page.screenshot({ path: path.join(out, `toolbar-defaults-directory-${width}.png`) });
};
