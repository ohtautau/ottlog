const confirmUnsavedClose = require('./confirm-unsaved-close.cjs');
const path = require('node:path');
const { storageKey: homeShortcutKey, legacyLayout } = require('./home-shortcut-test-helpers.cjs');

module.exports = async function checkEntryClearFocus({ page, origin, out, width, expect }) {
  await page.goto(`${origin}/?entry-clear-focus-${width}#/pages/posts/index`);
  const seed = await page.evaluate(({ homeShortcutKey, layout }) => {
    const stamp = '2026-10-07T08:00:00.000Z';
    const tools = {
      todos: { version: 1, categories: [], tasks: [{ id: 'kept-task', title: '正式任务', description: '保留内容', categoryId: '', important: false, urgent: false, dueDate: '', completedAt: null, createdAt: stamp, updatedAt: stamp }] },
      memos: { version: 1, notes: [{ id: 'kept-memo', title: '正式备忘录', body: '保留正文', color: 'sage', tags: ['原标签'], pinned: false, createdAt: stamp, updatedAt: stamp }] },
      domains: { version: 1, completedGoals: [], domains: [{ id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }] },
    };
    localStorage.clear(); window.__miniFixture.guestToolStates = tools;
    localStorage.setItem(homeShortcutKey, JSON.stringify(layout));
    for (const [tool, data] of Object.entries(tools)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, revision: 0, pending: false }));
    localStorage.setItem('ottlog-mini-entry-draft-v1:reader:other-owner', '"其他账号草稿"');
    window.__miniNotices.length = 0;
    location.hash = '#/pages/index/index'; return tools;
  }, { homeShortcutKey, layout: legacyLayout(true) });
  const composer = () => page.locator('.entry-composer');
  const clear = () => composer().getByRole('button', { name: '清空所有输入', exact: true });
  const mode = name => composer().getByRole('button', { name: `创建类型：${name}`, exact: true });
  const title = () => composer().locator('.todo-title-input,.memo-title-input');
  const body = () => composer().locator('.todo-description,.memo-body-input').first();
  const positive = () => composer().getByRole('textbox', { name: '记录内容', exact: true });
  const second = () => composer().getByRole('textbox', { name: '第二条记录内容', exact: true });
  const draft = () => page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  const close = async () => { await composer().getByRole('button', { name: '关闭编辑', exact: true }).click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0); };
  const go = route => page.evaluate(route => { location.hash = `#/pages/${route}/index`; }, route);
  async function noAutoFocus() {
    // Wait beyond the composer's original 100ms focus timer to catch delayed reopening.
    await page.waitForTimeout(200);
    await expect(composer().locator('input:focus,textarea:focus')).toHaveCount(0);
  }
  await page.locator('.today-capture input').fill('来自首页的输入');
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await noAutoFocus(); await expect(title()).toHaveValue('来自首页的输入');
  await body().fill('正文不会被自动聚焦打断'); await expect(body()).toBeFocused();
  await title().fill('填入标题'); await expect(title()).toBeFocused();
  const initial = await draft();
  await close();
  // Restore a valid rich draft with hidden type-specific fields as well as images.
  const rich = { ...initial, tagsText: '输入标签',
    task: { ...initial.task, description: '**待清空备注**', dueDate: '2030-10-08', dueTime: '12:30', reminderAt: '2030-10-08T03:30:00.000Z', recurrence: { unit: 'day', interval: 2 }, tags: ['输入标签'], nextTasks: [{ id: 'step-clear', title: '待清空下一步' }], images: [{ id: 'task-photo', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1cAAAAASUVORK5CYII=' }] },
    memo: { ...initial.memo, color: 'rose', pinned: true, iconId: 'plant' },
    progress: { ...initial.progress, domainId: 'work', positive: { ...initial.progress.positive, content: '待清空正记录' }, negative: { ...initial.progress.negative, content: '待清空负记录', images: [{ id: 'negative-photo', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1cAAAAASUVORK5CYII=' }] } },
  };
  await page.evaluate(rich => localStorage.setItem('ottlog-mini-entry-draft-v1:guest', JSON.stringify(rich)), rich);
  await page.reload();
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await expect(title()).toBeFocused();
  await expect(body()).toHaveValue('**待清空备注**');
  const layout = await clear().boundingBox(); expect(layout.width).toBe(40); expect(layout.height).toBe(40); await expect(clear()).toHaveText('');
  await expect(composer().locator('.entry-heading .entry-clear')).toHaveCount(0);
  await expect(composer().locator('.entry-footer .entry-clear')).toHaveCount(1);
  const submitBox = await composer().locator('.entry-submit').boundingBox();
  expect(submitBox.x - layout.x - layout.width, 'Clear is immediately left of the submit button').toBe(8);
  expect(layout.y + layout.height / 2, 'Clear and submit are vertically centered').toBe(submitBox.y + submitBox.height / 2);
  await expect(clear().locator('.delete-symbol')).toHaveCount(1);
  // Clear and submit in one browser task: the old title must never be saved.
  await clear().evaluate(node => { const save = node.closest('.entry-composer').querySelector('.entry-submit'); node.click(); save.click(); });
  await expect(composer()).toBeVisible(); await expect(title()).toHaveValue(''); await expect(title()).toBeFocused();
  await expect(body()).toHaveValue(''); await expect(composer().locator('.memo-image')).toHaveCount(0);
  await expect(composer().getByRole('button', { name: '创建任务', exact: true })).toBeDisabled();
  const empty = await draft();
  expect(empty.task.id).not.toBe(initial.task.id); expect(empty.memo.id).not.toBe(initial.memo.id);
  expect(empty.progress.positive.id).not.toBe(initial.progress.positive.id);
  expect(empty.task).toMatchObject({ title: '', description: '', dueDate: '', tags: [], nextTasks: [] });
  expect(empty.task.dueTime).toBeUndefined(); expect(empty.task.reminderAt).toBeUndefined(); expect(empty.task.recurrence).toBeUndefined();
  expect(empty.tagsText).toBe(''); expect(empty.task.images || []).toEqual([]);
  expect(empty.memo).toMatchObject({ title: '', body: '', color: 'sand', pinned: false }); expect(empty.memo.iconId).toBeUndefined();
  for (const kind of ['positive', 'negative']) { expect(empty.progress[kind].content).toBe(''); expect(empty.progress[kind].images).toEqual([]); }
  await mode('备忘').click(); await noAutoFocus(); await expect(title()).toHaveValue('');
  await mode('进展').click(); await noAutoFocus(); await expect(positive()).toHaveValue('');
  await positive().fill('记录内容'); await second().fill('第二框保留独立焦点'); await expect(second()).toBeFocused();
  await composer().getByRole('button', { name: '第一条记录类型：负记录', exact: true }).click();
  await composer().getByRole('button', { name: '第二条记录类型：正记录', exact: true }).click();
  await clear().click(); await expect(mode('进展')).toHaveAttribute('aria-pressed', 'true'); await expect(positive()).toHaveValue(''); await expect(second()).toHaveValue(''); await expect(positive()).toBeFocused();
  expect((await draft()).progress.kinds).toEqual(['positive', 'negative']);
  await mode('任务').click(); await noAutoFocus();
  await title().fill('手动输入仍然可用'); await expect(title()).toBeFocused();
  await mode('任务').click(); await noAutoFocus();
  await require('./entry-swipe-test-helpers.cjs').swipeMode({ page, composer: composer(), expect, name: '备忘' }); await noAutoFocus();
  await require('./entry-swipe-test-helpers.cjs').swipeMode({ page, composer: composer(), expect, name: '进展' }); await noAutoFocus();
  await mode('任务').click(); await noAutoFocus();
  await clear().click(); await expect(title()).toBeFocused();
  await page.screenshot({ path: path.join(out, `entry-clear-focus-${width}.png`) });
  await close(); await expect(page.locator('.today-capture input')).toHaveValue('');
  await page.reload(); await page.getByRole('button', { name: '创建', exact: true }).click(); await expect(title()).toHaveValue(''); await expect(title()).toBeFocused();
  await close();
  await page.getByRole('button', { name: '创建任务', exact: true }).click(); await expect(title()).toBeFocused(); await close();
  await go('todos'); await page.getByRole('button', { name: '创建高优先级任务', exact: true }).click(); await expect(title()).toBeFocused();
  await title().fill('高优先度草稿'); await clear().click();
  expect((await draft()).task).toMatchObject({ title: '', important: true, urgent: true });
  await composer().getByRole('button', { name: '设置日期、提醒和重复', exact: true }).click();
  await expect(clear()).toBeDisabled();
  await page.getByRole('button', { name: '关闭日期设置', exact: true }).click(); await expect(clear()).toBeEnabled(); await close();
  await go('memos'); await page.getByRole('button', { name: '创建便签', exact: true }).click(); await expect(title()).toBeFocused();
  await body().fill('便签正文'); await expect(body()).toBeFocused();
  await composer().getByRole('button', { name: '插入图片', exact: true }).evaluate(node => { node.click(); node.closest('.entry-composer').querySelector('[aria-label="清空所有输入"]').click(); });
  await expect(composer().locator('.memo-image')).toHaveCount(1); await expect(body()).toHaveValue('便签正文');
  await clear().click(); await expect(title()).toBeFocused(); await expect(composer().locator('.memo-image')).toHaveCount(0); await close();
  await go('domains'); await page.getByRole('button', { name: '记录进展', exact: true }).click(); await expect(positive()).toBeFocused(); await close();
  await page.getByRole('button', { name: '打开工作领域', exact: true }).click();
  await page.locator('.domain-record-column.is-positive').dispatchEvent('click'); await expect(positive()).toBeFocused();
  await positive().fill('领域内进展'); await clear().click(); await expect(positive()).toBeFocused(); expect((await draft()).progress.domainId).toBe('work'); await close();
  if (width === 360) {
    await go('index'); await page.getByRole('button', { name: '创建任务', exact: true }).click();
    await title().fill('写入失败前的草稿');
    await page.evaluate(() => {
      window.__entryClearSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('ottlog-mini-entry-draft-v1:')) throw new Error('草稿暂时无法写入');
        return window.__entryClearSetItem.call(this, key, value);
      };
    });
    await clear().click(); await expect(title()).toHaveValue(''); await expect(title()).toBeFocused();
    await expect(composer().getByRole('alert')).toContainText('草稿暂时无法写入');
    await page.evaluate(() => { Storage.prototype.setItem = window.__entryClearSetItem; delete window.__entryClearSetItem; });
    await close(); await page.reload(); await page.getByRole('button', { name: '创建任务', exact: true }).click();
    await expect(title()).toHaveValue(''); await expect(title()).toBeFocused(); await close();
  }
  for (const [tool, data] of Object.entries(seed)) expect(await page.evaluate(tool => window.__miniPreviewControl.readStorage(`ottlog-mini-tool-v1:guest:${tool}`).data, tool)).toEqual(data);
  expect(await page.evaluate(() => localStorage.getItem('ottlog-mini-entry-draft-v1:reader:other-owner'))).toBe('"其他账号草稿"');
  expect(await page.evaluate(() => window.__miniNotices)).toEqual([]);
};
