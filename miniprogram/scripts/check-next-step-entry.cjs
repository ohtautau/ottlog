const path = require('node:path');

module.exports = async function checkNextStepEntry({ page, origin, out, width, expect }) {
  await page.goto(`${origin}/?next-step-${width}#/pages/posts/index`);
  const kept = { id: 'kept-task', title: '保留任务', description: '', categoryId: '', important: false, urgent: false, dueDate: '', nextTasks: [], completedAt: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' };
  await page.evaluate(kept => {
    window.__miniFixture.persistEntryTools = true;
    localStorage.clear(); window.__miniFixture.guestToolStates = { todos: { version: 1, tasks: [kept], categories: [] }, memos: { version: 1, notes: [] } };
    location.hash = '#/pages/todos/index';
  }, kept);
  const sheet = () => page.locator('.todo-sheet');
  const rows = () => sheet().locator('.todo-next-step');
  const field = number => sheet().getByRole('textbox', { name: `下一步任务 ${number}`, exact: true });
  const add = () => sheet().getByRole('button', { name: '添加下一步任务', exact: true });
  const read = () => page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-tool-v1:guest:todos').data);
  async function checkRowAlignment() {
    const geometry = await rows().evaluateAll(nodes => nodes.map(row => {
      const box = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; };
      return { row: box(row), input: box(row.querySelector('input')), buttons: [...row.querySelectorAll('button')].map(box) };
    }));
    for (const item of geometry) {
      expect(item.row.left, 'Every next-step row has the same left boundary').toBeCloseTo(geometry[0].row.left, 2);
      expect(item.row.right, 'Every next-step row has the same right boundary').toBeCloseTo(geometry[0].row.right, 2);
      expect(item.input.left, 'Filled and trailing prompt inputs share their left boundary').toBeCloseTo(geometry[0].input.left, 2);
      expect(item.input.width, 'Single, multiple and trailing prompt rows keep equal input width').toBeCloseTo(geometry[0].input.width, 2);
      for (const button of item.buttons) { expect(button.width).toBe(40); expect(button.height).toBe(40); }
      expect(item.buttons.at(-1).right, 'Add and delete align with the common right boundary').toBeCloseTo(item.row.right, 2);
      if (item.buttons.length === 3) {
        const firstGap = item.buttons[1].left - item.buttons[0].right, secondGap = item.buttons[2].left - item.buttons[1].right;
        expect(firstGap, 'Up/down and down/delete use identical spacing').toBeCloseTo(secondGap, 2);
        expect(firstGap).toBeGreaterThan(0); expect(firstGap).toBeLessThanOrEqual(6);
      }
    }
  }
  await page.getByRole('button', { name: '创建无优先级任务', exact: true }).click();
  await expect(rows()).toHaveCount(1); await expect(field(1)).toHaveAttribute('placeholder', '还要做什么？');
  await checkRowAlignment();
  await field(1).evaluate(node => { window.__firstNextNode = node; });
  await add().evaluate(node => { node.click(); node.click(); });
  await expect(rows()).toHaveCount(2); await expect(field(1)).toBeFocused();
  expect(await field(1).evaluate(node => node === window.__firstNextNode), 'Activation retains the native input node').toBe(true);
  await expect(rows().last().getByRole('button', { name: '添加下一步任务', exact: true })).toBeVisible();
  await field(1).fill('第一步'); await expect(field(1)).toBeFocused(); await expect(rows()).toHaveCount(2);
  await checkRowAlignment();
  await field(2).click(); await expect(rows()).toHaveCount(3); await expect(field(2)).toBeFocused();
  await field(2).fill('第二步'); await field(2).fill('第二步'); await expect(rows()).toHaveCount(3);
  await checkRowAlignment();
  const moves = sheet().locator('.todo-next-controls button'); await expect(moves).toHaveText(['', '', '', '']);
  for (const box of await moves.evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }))) { expect(box.width).toBe(40); expect(box.height).toBe(40); }
  await expect(sheet().getByRole('button', { name: '提前第 1 步', exact: true })).toBeDisabled();
  await expect(sheet().getByRole('button', { name: '后移第 2 步', exact: true })).toBeDisabled();
  await expect(moves.locator('.sort-symbol-up')).toHaveCount(2); await expect(moves.locator('.sort-symbol-down')).toHaveCount(2);
  const originalIds = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest').task.nextTasks.map(step => step.id));
  await sheet().getByRole('button', { name: '提前第 2 步', exact: true }).click(); await expect(field(1)).toHaveValue('第二步'); await expect(field(2)).toHaveValue('第一步');
  await page.screenshot({ path: path.join(out, `next-step-create-${width}.png`) });
  await field(3).click(); await expect(rows()).toHaveCount(4); await expect(field(3)).toBeFocused();
  await field(3).press('Enter'); await expect(rows()).toHaveCount(5); await expect(field(4)).toBeFocused();
  await sheet().getByRole('textbox', { name: '任务名称', exact: true }).fill('连续输入任务');
  await sheet().getByRole('button', { name: '创建任务', exact: true }).click(); await expect(sheet()).toHaveCount(0);
  const created = (await read()).tasks.find(task => task.title === '连续输入任务');
  expect(created.nextTasks.map(step => step.title)).toEqual(['第二步', '第一步']); expect(created.nextTasks.map(step => step.id)).toEqual([originalIds[1], originalIds[0]]);
  expect((await read()).tasks.find(task => task.id === kept.id)).toEqual(kept);
  await page.getByRole('button', { name: '编辑任务：连续输入任务', exact: true }).click(); await expect(rows()).toHaveCount(3);
  const modalCount = await page.evaluate(() => window.__miniFixture.modalCalls?.length || 0);
  await add().click(); await expect(rows()).toHaveCount(4);
  await sheet().getByRole('button', { name: '关闭编辑', exact: true }).click(); await expect(sheet()).toHaveCount(0);
  expect(await page.evaluate(() => window.__miniFixture.modalCalls?.length || 0), 'An empty activated row is not an unsaved edit').toBe(modalCount);
  await page.getByRole('button', { name: '编辑任务：连续输入任务', exact: true }).click(); await expect(rows()).toHaveCount(3);
  await add().click(); await expect(rows()).toHaveCount(4); await page.locator('.todo-backdrop').click({ position: { x: 2, y: 2 } }); await expect(sheet()).toHaveCount(0);
  await page.getByRole('button', { name: '编辑任务：连续输入任务', exact: true }).click(); await expect(rows()).toHaveCount(3);
  expect((await read()).tasks.find(task => task.id === created.id)).toEqual(created);
  await add().click(); await expect(field(3)).toBeFocused(); await expect(rows()).toHaveCount(4); await field(3).fill('新增第三步');
  await field(1).fill('修改后的第二步'); await expect(rows()).toHaveCount(4);
  await sheet().getByRole('button', { name: '后移第 1 步', exact: true }).click(); await expect(field(1)).toHaveValue('第一步');
  await field(4).click(); await expect(rows()).toHaveCount(5); await expect(field(4)).toBeFocused();
  await checkRowAlignment();
  await page.screenshot({ path: path.join(out, `next-step-edit-${width}.png`) });
  await sheet().getByRole('button', { name: '保存', exact: true }).click(); await expect(sheet()).toHaveCount(0);
  const edited = (await read()).tasks.find(task => task.id === created.id);
  expect(edited.createdAt).toBe(created.createdAt); expect(edited.nextTasks.map(step => step.title)).toEqual(['第一步', '修改后的第二步', '新增第三步']);
  expect(edited.nextTasks.slice(0, 2).map(step => step.id)).toEqual(originalIds);
  await page.goto(`${origin}/?next-step-reopen-${width}#/pages/posts/index`);
  await page.evaluate(() => { window.__miniFixture.persistEntryTools = true; location.hash = '#/pages/todos/index'; });
  await page.getByRole('button', { name: '编辑任务：连续输入任务', exact: true }).click(); await expect(rows()).toHaveCount(4);
  await field(2).fill(''); await sheet().getByRole('button', { name: '保存', exact: true }).click(); await expect(sheet()).toHaveCount(0);
  const filtered = (await read()).tasks.find(task => task.id === created.id);
  expect(filtered.nextTasks.map(step => step.title)).toEqual(['第一步', '新增第三步']); expect(filtered.nextTasks.map(step => step.id)).toEqual([edited.nextTasks[0].id, edited.nextTasks[2].id]);
  if (width !== 360) return;
  await page.getByRole('button', { name: '创建无优先级任务', exact: true }).click(); await field(1).fill('图片处理前的步骤');
  await sheet().getByRole('button', { name: '插入图片', exact: true }).evaluate(node => { node.click(); node.closest('.todo-sheet').querySelector('.todo-add-next').click(); });
  await expect(sheet().locator('.memo-image')).toHaveCount(1); await expect(rows()).toHaveCount(2); await expect(field(1)).toHaveValue('图片处理前的步骤');
  await page.evaluate(() => { window.__miniFixture.deferChooseMedia = true; }); await sheet().getByRole('button', { name: '插入图片', exact: true }).click();
  await expect(add()).toBeDisabled(); await expect(field(2)).toBeDisabled();
  await page.evaluate(() => { window.__miniFixture.resolveChooseMedia(); window.__miniFixture.deferChooseMedia = false; });
  await expect(add()).toBeEnabled(); await expect(rows()).toHaveCount(2);
};
