const path = require('node:path');

// Actual shared forms; all account data and storage belong to this test fixture.
module.exports = async function checkDocumentAutosave({ page, origin, width, out, expect }) {
  const owner = 'document-autosave', stamp = '2026-11-03T00:00:00.000Z';
  const notes = ['blue', 'sage', 'sand', 'rose', 'violet', 'mint'].map((color, i) => ({ id: `memo-${i}`, title: `便签${i + 1}`, body: `原便签正文${i + 1}`, color, tags: [], pinned: false, createdAt: stamp, updatedAt: stamp }));
  const states = { todos: { version: 1, tasks: [], categories: [] }, memos: { version: 1, notes }, domains: { version: 1, domains: [{ id: 'autosave-domain', name: '记录领域', iconId: 'plant', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] } };
  await page.goto(`${origin}/?document-autosave-${width}#/pages/posts/index`);
  await page.evaluate(({ states, owner }) => { localStorage.clear(); for (const [key, data] of Object.entries(states)) localStorage.setItem(`ottlog-mini-tool-v1:reader:${owner}:${key}`, JSON.stringify({ data, pending: false, revision: 0 })); }, { states, owner });
  await page.reload();
  await page.evaluate(({ states, owner }) => { window.__miniFixture.sessionProfile = { authenticated: true, userName: owner, isAdmin: false }; window.__miniFixture.accountToolStates = { [owner]: states }; location.hash = '#/pages/memos/index'; }, { states, owner });
  const data = key => page.evaluate(({ key, owner }) => window.__miniPreviewControl.readStorage(`ottlog-mini-tool-v1:reader:${owner}:${key}`)?.data, { key, owner });
  const button = name => page.getByRole('button', { name, exact: true });
  const memoTitle = () => page.getByRole('textbox', { name: '便签标题', exact: true });
  const closeMemo = async () => { await page.locator('.memo-overlay > .memo-backdrop').click({ position: { x: 4, y: 4 } }); await expect(page.locator('.document-editor-sheet')).toHaveCount(0); };
  const closeEntry = async () => { await page.locator('.entry-overlay > .todo-backdrop').click({ position: { x: 4, y: 4 } }); await expect(page.locator('.entry-composer')).toHaveCount(0); };
  await expect(page.locator('.memo-note')).toHaveCount(6);
  const paints = await page.locator('.memo-note').evaluateAll(nodes => nodes.map(node => ({ background: getComputedStyle(node).backgroundColor, border: getComputedStyle(node).borderTopColor })));
  expect(new Set(paints.map(paint => JSON.stringify(paint))).size).toBe(1);
  expect(paints[0].background).toBe('rgb(32, 51, 62)');
  await button('筛选便签').click(); await expect(page.locator('.memo-filter-colors,.memo-palette')).toHaveCount(0); await expect(page.getByRole('button', { name: /^便签颜色：/ })).toHaveCount(0); await button('关闭便签筛选').click();
  expect((await data('memos')).notes).toEqual(notes);
  await button('查看便签：便签1').click(); await expect(page.locator('.memo-reader')).toBeVisible();
  const readerSurface = await page.locator('.memo-reader .memo-editor-fields').evaluate(node => getComputedStyle(node).getPropertyValue('--memo-paper-background').trim()); expect(readerSurface).toBe('#20333e');
  await button('编辑便签：便签1').click(); await expect(memoTitle()).toBeEnabled();
  await expect(page.locator('.document-editor-sheet').getByRole('button', { name: /^(保存|关闭便签编辑)$/ })).toHaveCount(0);
  await expect(page.locator('.memo-palette')).toHaveCount(0);
  await memoTitle().fill('自动保存便签'); await expect.poll(async () => (await data('memos')).notes.find(note => note.id === 'memo-0').title).toBe('自动保存便签');
  await memoTitle().fill('关窗最后输入'); await closeMemo();
  expect((await data('memos')).notes.find(note => note.id === 'memo-0')).toMatchObject({ title: '关窗最后输入', color: 'blue', body: '原便签正文1' });
  await button('关闭便签内容').click();

  await page.locator('.floating-create-button').click(); await expect(memoTitle()).toBeEnabled();
  await expect(page.locator('.entry-composer').getByRole('button', { name: /^(保存|创建便签|关闭编辑)$/ })).toHaveCount(0);
  await memoTitle().fill('新建自动便签'); await expect.poll(async () => (await data('memos')).notes.length).toBe(7);
  const newId = (await data('memos')).notes.find(note => note.title === '新建自动便签').id;
  await page.locator('.entry-composer').getByText('备注', { exact: true }).click();
  await page.getByRole('textbox', { name: '便签内容', exact: true }).fill('持续输入仍然是同一张便签');
  await expect.poll(async () => (await data('memos')).notes.find(note => note.id === newId).body).toBe('持续输入仍然是同一张便签');
  const receiptDraft = await page.evaluate(owner => window.__miniPreviewControl.readStorage(`ottlog-mini-entry-draft-v1:reader:${owner}`), owner);
  expect(receiptDraft.autoSaveReceipt.memo).toEqual([newId]);
  await closeEntry(); expect((await data('memos')).notes).toHaveLength(7);

  await button('查看便签：关窗最后输入').click(); await button('编辑便签：关窗最后输入').click();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['memos']; }); await memoTitle().fill('失败保留原便签');
  await expect(page.locator('.document-autosave-status')).toBeVisible();
  await page.locator('.memo-overlay > .memo-backdrop').click({ position: { x: 4, y: 4 } }); await expect(memoTitle()).toHaveValue('失败保留原便签');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; }); await page.locator('.document-editor-sheet').getByRole('button', { name: '重试', exact: true }).click();
  await expect.poll(async () => (await data('memos')).notes.find(note => note.id === 'memo-0').title).toBe('失败保留原便签'); await closeMemo(); await button('关闭便签内容').click();
  expect((await data('memos')).notes.filter(note => notes.slice(1).some(old => old.id === note.id))).toEqual(notes.slice(1));

  await page.locator('.floating-create-button').click(); await expect(memoTitle()).toBeEnabled();
  await button('创建类型：任务').click();
  const taskTitle = () => page.locator('.entry-composer').getByRole('textbox', { name: '任务名称', exact: true });
  await expect(taskTitle()).toBeEnabled(); await taskTitle().fill('共享创建器自动任务');
  await expect.poll(async () => (await data('todos')).tasks.length).toBe(1);
  const taskId = (await data('todos')).tasks[0].id;
  await taskTitle().fill('共享创建器同一任务修改'); await closeEntry();
  expect((await data('todos')).tasks[0]).toMatchObject({ id: taskId, title: '共享创建器同一任务修改' });
  expect((await data('todos')).tasks).toHaveLength(1); expect((await data('memos')).notes).toHaveLength(7);

  await page.evaluate(() => { location.hash = '#/pages/domains/index'; }); await button('记录进展').click();
  const content = () => page.getByRole('textbox', { name: '记录内容', exact: true }); await expect(content()).toBeEnabled();
  await expect(page.locator('.entry-composer').getByRole('button', { name: /^(保存记录|关闭编辑)$/ })).toHaveCount(0);
  await content().fill('第一条自动进展');
  const records = async () => (await data('domains')).domains.flatMap(domain => domain.positiveRecords);
  await expect.poll(async () => (await records()).length).toBe(1); const recordId = (await records())[0].id;
  await content().fill('同一条进展的修改'); await expect.poll(async () => (await records())[0].content).toBe('同一条进展的修改');
  expect((await records())[0].id).toBe(recordId);
  await content().fill(''); await expect.poll(async () => (await records()).length).toBe(0);
  await content().fill('进展关窗最后输入'); await closeEntry(); expect((await records())[0].content).toBe('进展关窗最后输入'); expect(await records()).toHaveLength(1);
  // A draft left by a crash must never recreate an acknowledged record deleted remotely.
  const removedMemoState = { ...(await data('memos')), notes: (await data('memos')).notes.filter(note => note.id !== newId) };
  await page.evaluate(({ owner, removedMemoState, receiptDraft }) => {
    window.__miniFixture.accountToolStates[owner].memos = removedMemoState;
    localStorage.setItem(`ottlog-mini-tool-v1:reader:${owner}:memos`, JSON.stringify({ data: removedMemoState, pending: false, revision: 20 }));
    localStorage.setItem(`ottlog-mini-entry-draft-v1:reader:${owner}`, JSON.stringify(receiptDraft));
    location.hash = '#/pages/memos/index';
  }, { owner, removedMemoState, receiptDraft });
  await expect(page.locator('.memo-note')).toHaveCount(6);
  await page.locator('.floating-create-button').click(); await expect(memoTitle()).toHaveValue('新建自动便签');
  await expect(page.locator('.entry-error')).toContainText('原内容已删除'); await closeEntry();
  expect((await data('memos')).notes.some(note => note.id === newId)).toBe(false);
  await page.screenshot({ path: path.join(out, `document-autosave-${width}.png`) });
  console.log(`PASS document autosave ${width}: neutral memo surfaces/no color controls, same-ID create/edit, last-input close, local retry and progress updates.`);
};
