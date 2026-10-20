const path = require('node:path');

module.exports = async function checkTodoSorting({ page, origin, out, width, expect }) {
  await page.addInitScript(() => {
    let fixture;
    Object.defineProperty(window, '__miniFixture', { configurable: true, get: () => fixture, set: value => { fixture = value; if (/^\?todo-sorting-\d/.test(location.search)) fixture.persistEntryTools = true; } });
  });
  await page.goto(`${origin}/?todo-sorting-${width}#/pages/posts/index`);
  const original = await page.evaluate(() => {
    window.__miniFixture.persistEntryTools = true;
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    const base = { description: '保持原备注', categoryId: '', important: true, urgent: true, dueDate: '', completedAt: null, createdAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z', tags: [], nextTasks: [], subtasks: [] };
    const data = { version: 1, categories: [], tasks: [
      { ...base, id: 'none', title: '没有日程' },
      { ...base, id: 'late', title: '晚日程', dueDate: '2026-10-04', createdAt: '2026-09-01T00:00:00Z' },
      { ...base, id: 'early', title: '早日程', dueDate: '2026-10-01', dueTime: '09:00', tags: ['筛选'], createdAt: '2026-09-04T00:00:00Z' },
      { ...base, id: 'tie', title: '同时间日程', dueDate: '2026-10-01', dueTime: '09:00', tags: ['筛选'], createdAt: '2026-09-04T00:00:00Z' },
      { ...base, id: 'date', title: '只有日期', dueDate: '2026-10-01', createdAt: '' },
      { ...base, id: 'done', title: '完成任务', dueDate: '2026-09-30', completedAt: '2026-09-30T12:00:00Z', createdAt: '2026-09-02T00:00:00Z' },
      { ...base, id: 'done2', title: '另一完成任务', dueDate: '2026-09-30', completedAt: '2026-09-30T13:00:00Z', createdAt: '2026-09-02T00:00:00Z' },
      { ...base, id: 'other', title: '中优先任务', urgent: false, dueDate: '2026-10-02', createdAt: '2026-09-05T00:00:00Z' },
    ] };
    window.__miniFixture.guestToolStates = { todos: data };
    localStorage.setItem('ottlog-mini-tool-v1:guest:todos', JSON.stringify({ data, pending: false, revision: 0 }));
    window.__miniNotices.length = 0;
    location.hash = '#/pages/todos/index';
    return data;
  });
  const labels = { schedule: '日程时间最近', created: '创建时间最近' };
  const scheduleIds = ['done', 'done2', 'early', 'tie', 'date', 'other', 'late', 'none'];
  const createdIds = ['other', 'early', 'tie', 'none', 'done', 'done2', 'late', 'date'];
  const trigger = () => page.locator('.todo-sort-toggle');
  const filter = () => page.locator('.todo-filter-toggle');
  const panel = () => page.locator('.todo-sort-popover');
  const retry = () => page.locator('.todo-sort-retry');
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:todos')).data);
  const ids = async () => (await read()).tasks.map(item => item.id);
  const row = id => page.locator('.todo-task').filter({ has: page.getByRole('button', { name: `编辑任务：${original.tasks.find(task => task.id === id).title}`, exact: true }) });
  const listTitles = (quadrant, done = false) => page.locator(`.todo-quadrant-${quadrant} .todo-task${done ? '.is-done' : ':not(.is-done)'} .todo-task-title`);
  const unchangedFields = async () => {
    const current = await read();
    expect(current.categories).toEqual(original.categories);
    expect([...current.tasks].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...original.tasks].sort((a, b) => a.id.localeCompare(b.id)));
  };
  const retainedFields = (current, previous, movedId, quadrant) => {
    expect(current.categories).toEqual(previous.categories);
    for (const task of previous.tasks) {
      const actual = current.tasks.find(item => item.id === task.id);
      if (task.id !== movedId) expect(actual).toEqual(task);
      else {
        const { updatedAt: _old, ...oldFields } = task, { updatedAt: _new, ...newFields } = actual;
        expect(newFields).toEqual({ ...oldFields, ...(quadrant || {}) });
        expect(Number.isFinite(Date.parse(actual.updatedAt))).toBe(true);
      }
    }
  };
  async function confirm() { await panel().getByRole('button', { name: '排序', exact: true }).click(); }
  async function choose(mode) {
    await trigger().click(); await panel().getByRole('button', { name: labels[mode], exact: true }).click();
    await confirm(); await expect(panel()).toHaveCount(0);
    await expect.poll(async () => (await read()).sort).toBe(mode);
    await expect(trigger(), 'Applied automatic sorting stays highlighted after confirming and closing').toHaveAttribute('aria-pressed', 'true');
    await expect(trigger()).toHaveCSS('background-color', 'rgb(48, 76, 66)');
  }
  async function selected(mode) {
    const before = await read();
    await trigger().click(); await expect(panel().getByRole('button', { name: labels[mode === 'custom' ? 'schedule' : mode], exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel().getByRole('button', { name: '自定义', exact: true })).toHaveCount(0);
    await panel().getByRole('button', { name: '关闭排序', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '保存修改？', exact: true })).toHaveCount(0);
    expect(await read(), 'Opening and closing the automatic-sort draft does not rewrite manual order').toEqual(before);
    await expect(trigger(), 'Closed highlight follows saved mode, including after reload or manual drag').toHaveAttribute('aria-pressed', String(mode !== 'custom'));
  }
  async function filterBy({ tag, completion = '全部' } = {}) {
    await filter().click(); await page.getByRole('button', { name: '重置任务筛选', exact: true }).click();
    if (tag) await page.getByRole('button', { name: `筛选标签：${tag}`, exact: true }).click();
    await page.getByRole('button', { name: `筛选状态：${completion}`, exact: true }).click();
    await page.locator('.todo-filter-actions').getByRole('button', { name: /^查看/ }).click();
  }
  async function drag(from, to, { hold = true, cancel = false, stationary = false, sameSlot = false } = {}) {
    const tile = row(from), first = await tile.boundingBox(), target = await row(to).boundingBox();
    // Only drag rows currently visible in their own scroll viewport; this also keeps short-screen checks meaningful.
    const bounds = await tile.locator('..').locator('..').boundingBox(), targetBounds = await row(to).locator('..').locator('..').boundingBox();
    expect(first.y + first.height / 2).toBeGreaterThanOrEqual(bounds.y);
    expect(first.y + first.height / 2).toBeLessThanOrEqual(bounds.y + bounds.height);
    const touch = { identifier: 1, clientX: first.x + first.width / 2, clientY: first.y + first.height / 2 };
    const point = stationary ? touch : sameSlot ? { ...touch, clientY: touch.clientY + 10 } : { ...touch, clientX: target.x + target.width / 2, clientY: target.y + target.height / 4 };
    expect(point.clientY).toBeGreaterThanOrEqual(targetBounds.y);
    expect(point.clientY).toBeLessThanOrEqual(targetBounds.y + targetBounds.height);
    await tile.dispatchEvent('touchstart', { touches: [touch] });
    if (hold) { await page.waitForTimeout(430); await expect(tile).toHaveClass(/is-drag-source/); }
    if (!stationary) await tile.dispatchEvent('touchmove', { touches: [point] });
    if (!hold) await page.waitForTimeout(430);
    await tile.dispatchEvent(cancel ? 'touchcancel' : 'touchend', { touches: [], changedTouches: [point] });
    await expect(page.locator('.is-drag-source')).toHaveCount(0);
    if (hold) {
      await tile.getByRole('button', { name: /^编辑任务/ }).dispatchEvent('click');
      await expect(page.locator('.todo-overlay')).toHaveCount(0);
    }
    await page.waitForTimeout(430);
  }

  await expect(trigger()).toBeEnabled();
  const before = await trigger().boundingBox(), filterBefore = await filter().boundingBox();
  expect(before.width).toBeGreaterThanOrEqual(40); expect(before.height).toBeGreaterThanOrEqual(40);
  expect(before.x + before.width).toBeLessThan(filterBefore.x);
  await expect(trigger()).toHaveText(''); await expect(trigger().locator('.sort-symbol')).toHaveCount(1);
  await expect(trigger().locator('.select-chevron')).toHaveCount(0);
  await expect(page.locator('.page-toolbar-create')).toHaveCount(0);
  await trigger().click(); await expect(panel()).toBeVisible();
  await expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  await expect(panel().locator('.todo-sort-options button')).toHaveText(Object.values(labels));
  await expect(panel().getByRole('button', { name: '自定义', exact: true })).toHaveCount(0);
  await expect(panel().getByRole('button', { name: '日程时间最近', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel().getByText('顺序', { exact: true })).toHaveCount(0);
  await expect(panel().getByRole('button', { name: /升序|降序/ })).toHaveCount(0);
  for (const button of await panel().locator('button').all()) {
    const box = await button.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(40);
    await expect(button).toBeInViewport({ ratio: 1 });
  }
  const box = await panel().boundingBox();
  expect(Math.abs(box.y - (before.y + before.height) - 8)).toBeLessThanOrEqual(2);
  await panel().getByRole('button', { name: '创建时间最近', exact: true }).click();
  await page.locator('.form-popover-backdrop').click({ position: { x: 1, y: 1 } });
  await require('./confirm-unsaved-close.cjs')(page);
  await expect(panel()).toHaveCount(0); expect(await read()).toEqual(original);
  await expect(trigger()).toHaveAttribute('aria-expanded', 'false'); await expect(trigger()).toHaveAttribute('aria-pressed', 'false');
  expect(await trigger().boundingBox()).toEqual(before); expect(await filter().boundingBox()).toEqual(filterBefore);

  await choose('schedule'); expect(await ids()).toEqual(scheduleIds); await unchangedFields();
  await expect(listTitles('do')).toHaveText(['早日程', '同时间日程', '只有日期', '晚日程', '没有日程']);
  await expect(listTitles('do', true)).toHaveText(['完成任务', '另一完成任务']);
  await expect(listTitles('plan')).toHaveText(['中优先任务']);
  await page.reload(); await expect(trigger()).toBeEnabled(); expect(await ids()).toEqual(scheduleIds); await selected('schedule');

  await filterBy({ tag: '筛选' }); await expect(filter()).toHaveAttribute('aria-pressed', 'true');
  await trigger().click(); await panel().getByRole('button', { name: '创建时间最近', exact: true }).click();
  await page.screenshot({ path: path.join(out, `todo-sort-options-${width}.png`) });
  await confirm(); await expect(panel()).toHaveCount(0);
  expect(await ids()).toEqual(createdIds); expect((await read()).sort).toBe('created'); await unchangedFields();
  await expect(filter()).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('.todo-task-title')).toHaveText(['早日程', '同时间日程']);
  await filterBy();
  expect(await ids()).toEqual(createdIds); await unchangedFields();
  await choose('created');
  const saved = await read();
  await trigger().click(); await panel().getByRole('button', { name: '日程时间最近', exact: true }).click();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['todos']; }); await confirm();
  await expect(panel().getByRole('alert')).toContainText('尚未保存'); expect(await read()).toEqual(saved);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; }); await confirm();
  await expect(panel()).toHaveCount(0); expect(await ids()).toEqual(scheduleIds); expect((await read()).sort).toBe('schedule'); await unchangedFields();

  // A touch scroll, cancelled drag, stationary release and moved pointer in the same slot preserve automatic sorting.
  await choose('created'); const untouched = await read();
  await drag('early', 'tie', { hold: false }); expect(await read()).toEqual(untouched);
  await drag('tie', 'early', { cancel: true }); expect(await read()).toEqual(untouched);
  await drag('early', 'early', { stationary: true }); expect(await read()).toEqual(untouched);
  await drag('early', 'early', { sameSlot: true }); expect(await read()).toEqual(untouched);
  await selected('created');
  await drag('tie', 'early');
  await expect.poll(async () => (await read()).sort).toBe('custom');
  expect(await ids()).toEqual(['other', 'tie', 'early', 'none', 'done', 'done2', 'late', 'date']);
  retainedFields(await read(), untouched, 'tie');
  await expect(listTitles('do')).toHaveText(['同时间日程', '早日程', '没有日程', '晚日程', '只有日期']);
  await selected('custom');
  await page.reload(); await expect(trigger()).toBeEnabled();
  expect(await ids()).toEqual(['other', 'tie', 'early', 'none', 'done', 'done2', 'late', 'date']); await selected('custom');

  // Filtering restricts the moved slots, but does not remove or reorder the hidden task records.
  await choose('schedule'); await filterBy({ tag: '筛选' }); const filteredBefore = await read();
  // Equal-time records keep the earlier manual order when automatic sorting is reapplied.
  await expect(page.locator('.todo-task-title')).toHaveText(['同时间日程', '早日程']);
  await drag('early', 'tie'); await expect.poll(async () => (await read()).sort).toBe('custom');
  expect(await ids()).toEqual(['done', 'done2', 'early', 'tie', 'date', 'other', 'late', 'none']);
  retainedFields(await read(), filteredBefore, 'early'); await expect(page.locator('.todo-task-title')).toHaveText(['早日程', '同时间日程']);
  await expect(filter()).toHaveAttribute('aria-pressed', 'true');

  // Completed tasks have the same drag-to-custom rule while retaining completion timestamps.
  await choose('schedule'); await filterBy({ completion: '已完成' }); const completedBefore = await read();
  await drag('done2', 'done'); await expect.poll(async () => (await read()).sort).toBe('custom');
  expect(await ids()).toEqual(['done2', 'done', 'early', 'tie', 'date', 'other', 'late', 'none']);
  retainedFields(await read(), completedBefore, 'done2'); await expect(listTitles('do', true)).toHaveText(['另一完成任务', '完成任务']);

  // Crossing a quadrant changes its existing priority fields and switches the persisted mode together.
  await filterBy(); await choose('created'); const crossedBefore = await read();
  await drag('tie', 'other'); await expect.poll(async () => (await read()).sort).toBe('custom');
  retainedFields(await read(), crossedBefore, 'tie', { important: true, urgent: false });
  await expect(listTitles('plan')).toHaveText(['同时间日程', '中优先任务']);
  expect((await read()).tasks).toHaveLength(original.tasks.length);

  // Failed manual ordering remains visible with one absolute target; retry cannot move the record twice.
  await choose('schedule');
  // 'tie' now belongs to the middle quadrant, so use the completed group in the original high quadrant.
  await filterBy({ completion: '已完成' }); const durableBeforeFailure = await read();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['todos']; });
  await expect(listTitles('do', true)).toHaveText(['另一完成任务', '完成任务']);
  await drag('done', 'done2'); await expect(retry()).toBeVisible();
  expect(await read()).toEqual(durableBeforeFailure);
  await expect(listTitles('do', true)).toHaveText(['完成任务', '另一完成任务']);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await retry().getByRole('button', { name: '重试任务排序', exact: true }).click(); await expect(retry()).toHaveCount(0);
  const retried = await read(); expect(retried.sort).toBe('custom');
  retainedFields(retried, durableBeforeFailure, 'done');
  await expect(listTitles('do', true)).toHaveText(['完成任务', '另一完成任务']);
  await page.reload(); await expect(trigger()).toBeEnabled(); expect(await read()).toEqual(retried);
  expect(await trigger().boundingBox()).toEqual(before); expect(await filter().boundingBox()).toEqual(filterBefore);
  await page.screenshot({ path: path.join(out, `todo-sort-result-${width}.png`) });
  expect(await page.evaluate(() => window.__miniNotices.filter(item => ['toast', 'modal', 'actionSheet'].includes(item.type)))).toEqual([]);

  if (width === 360) {
    const guest = await read(); await trigger().click();
    await panel().getByRole('button', { name: '日程时间最近', exact: true }).click();
    await page.evaluate(original => {
      window.__miniFixture.accountToolStates = { 'sort-reader': { todos: { ...original, sort: 'created' } } };
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'sort-reader', isAdmin: false };
      window.__miniPreviewControl.emit('ottlog-session');
    }, original);
    await expect(panel()).toHaveCount(0); await expect(trigger()).toBeEnabled(); await selected('created');
    await trigger().click(); await panel().getByRole('button', { name: '日程时间最近', exact: true }).click(); await confirm();
    await expect(panel()).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__miniFixture.accountToolStates['sort-reader'].todos.sort)).toBe('schedule');
    expect(await read()).toEqual(guest);
    await drag('tie', 'early');
    await expect.poll(() => page.evaluate(() => window.__miniFixture.accountToolStates['sort-reader'].todos.sort)).toBe('custom');
    expect(await read()).toEqual(guest);
    await expect(listTitles('do')).toHaveText(['同时间日程', '早日程', '只有日期', '晚日程', '没有日程']);

    // Leaving a failed guest drag clears that page's target; subsequent account sorting must use its own records.
    const accountBeforePending = await page.evaluate(() => structuredClone(window.__miniFixture.accountToolStates['sort-reader'].todos));
    await page.evaluate(() => {
      window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
      window.__miniPreviewControl.emit('ottlog-session');
    });
    await expect(trigger()).toBeEnabled(); await filterBy({ completion: '已完成' }); await choose('schedule');
    await expect(listTitles('do', true)).toHaveText(['完成任务', '另一完成任务']);
    const guestBeforePending = await read();
    await page.evaluate(() => { window.__miniFixture.failToolWrites = ['todos']; });
    await drag('done2', 'done'); await expect(retry()).toBeVisible(); expect(await read()).toEqual(guestBeforePending);
    await page.evaluate(() => {
      window.__miniFixture.failToolWrites = [];
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'sort-reader', isAdmin: false };
      window.__miniPreviewControl.emit('ottlog-session');
    });
    await expect(retry()).toHaveCount(0); await expect(trigger()).toBeEnabled(); await selected('custom');
    expect(await page.evaluate(() => window.__miniFixture.accountToolStates['sort-reader'].todos)).toEqual(accountBeforePending);
    expect(await read()).toEqual(guestBeforePending);
    await filterBy(); await trigger().click(); await panel().getByRole('button', { name: '创建时间最近', exact: true }).click(); await confirm();
    await expect(panel()).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__miniFixture.accountToolStates['sort-reader'].todos.sort)).toBe('created');
    const accountAfterPending = await page.evaluate(() => window.__miniFixture.accountToolStates['sort-reader'].todos);
    retainedFields(accountAfterPending, accountBeforePending); expect(await read()).toEqual(guestBeforePending);
    await expect(listTitles('do')).toHaveText(['同时间日程', '早日程', '没有日程', '晚日程', '只有日期']);
  }
  await page.goto(`${origin}/?todo-sort-invalid-${width}#/pages/posts/index`);
  await page.evaluate(() => { window.__miniFixture.guestToolStates = { todos: { version: 2, tasks: [], categories: [] } }; location.hash = '#/pages/todos/index'; });
  await expect(trigger()).toBeDisabled(); await trigger().evaluate(node => node.click()); await expect(panel()).toHaveCount(0);
};
