const path = require('node:path');
const createHabitFilter = require('./habit-filter-test-helpers.cjs');

// Isolated records exercise the real editor on both hosts, including a failed write.
module.exports = async function checkHabitDeleteUI({ page, origin, out, width, expect, host }) {
  const habitFilter = createHabitFilter({ page, expect });
  // Domain regression also inspects 1280px; restore this case's actual viewport.
  await page.setViewportSize({ width, height: width === 375 ? 667 : width >= 700 ? 1024 : 844 });
  await page.goto(`${origin}/?habit-delete-${host}-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    for (const tool of ['reminders', 'domains']) localStorage.removeItem(`ottlog-mini-tool-v1:guest:${tool}`);
    const item = (id, title) => ({ id, title, note: '原备注', group: '工作', domainId: 'work', kind: 'plant', minutes: 0, enabled: true, priority: 'none' });
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    window.__miniFixture.guestToolStates = {
      reminders: { version: 1, items: [item('delete-target', '待删除习惯'), item('delete-survivor', '保留习惯')], done: { '2026-09-15': ['delete-target', 'delete-survivor'] },
        reflections: ['delete-target', 'delete-survivor'].map((habitId, index) => ({ id: `reflection-${index}`, habitId, day: '2026-09-15', text: `记录${index}`, createdAt: 1234 + index })) },
      domains: { version: 1, domains: [{ id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] },
    };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
  });
  const route = host === 'daily' ? '#/pages/daily/index' : '#/pages/domain-detail/index?id=work';
  await page.evaluate(route => { location.hash = route; }, route);
  if (host === 'daily') { await habitFilter.assertNoStatusRow(); await habitFilter.select('全部'); }
  const cards = () => page.locator(host === 'daily' ? '.swipe-panel-current .daily-habit-scroll' : '.domain-habit-scroll');
  await cards().getByRole('button', { name: '查看习惯：待删除习惯', exact: true }).click();
  await page.getByRole('button', { name: '编辑习惯', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '编辑习惯', exact: true });
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders')).data);
  const before = await read();
  await editor.locator('.daily-sheet-title').click();
  await expect(editor).toBeVisible();
  await editor.getByRole('button', { name: '选择习惯图标', exact: true }).click();
  await expect(page.locator('.icon-library-sheet')).toBeVisible();
  await page.locator('.icon-library-backdrop').click({ position: { x: 8, y: 6 } });
  await expect(page.locator('.icon-library-sheet')).toHaveCount(0);
  await expect(editor).toBeVisible();
  await editor.getByRole('button', { name: '选择习惯优先度', exact: true }).click();
  await expect(editor.locator('.form-popover-panel')).toBeVisible();
  await editor.locator('.form-popover-backdrop').click({ position: { x: 8, y: 6 } });
  await expect(editor.getByRole('button', { name: '选择习惯优先度', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(editor).toBeVisible();
  await page.locator('.daily-editor-overlay > .sheet-backdrop').click({ position: { x: 8, y: 6 } });
  await expect(editor).toHaveCount(0);
  expect(await read(), 'Dismissing the editor or its nested windows does not save or delete habits').toEqual(before);
  if (host === 'daily') await cards().getByRole('button', { name: '查看习惯：待删除习惯', exact: true }).click();
  await page.getByRole('button', { name: '编辑习惯', exact: true }).click();
  await expect(editor).toBeVisible();
  await expect(editor.locator('.daily-editor-footer button')).toHaveText(['', '保存']);
  await expect(editor.locator('.daily-editor-footer .sheet-delete-button .delete-symbol')).toHaveCount(1);
  const footer = await editor.locator('.daily-editor-footer').evaluate(node => {
    const viewport = document.querySelector('.preview-content').getBoundingClientRect();
    return [...node.querySelectorAll('button')].map(button => {
      const box = button.getBoundingClientRect(), style = getComputedStyle(button);
      return { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom, viewportBottom: viewport.bottom, font: parseFloat(style.fontSize) };
    });
  });
  const [deleteButton, saveButton] = footer;
  expect(deleteButton.width).toBe(40); expect(deleteButton.height).toBe(40);
  expect(saveButton.height).toBe(48); expect(saveButton.font).toBe(16);
  expect(saveButton.x - deleteButton.x - deleteButton.width).toBeCloseTo(8, 0);
  expect(deleteButton.y + deleteButton.height / 2).toBeCloseTo(saveButton.y + saveButton.height / 2, 0);
  for (const button of footer) expect(button.bottom).toBeLessThanOrEqual(button.viewportBottom);
  await page.screenshot({ path: path.join(out, `habit-editor-delete-${host}-${width}.png`) });
  const title = editor.getByRole('textbox', { name: '习惯名称', exact: true });
  const note = editor.getByRole('textbox', { name: '提醒自己的话', exact: true });
  await title.fill('未保存的新标题'); await note.fill('未保存的备注');
  const remove = () => editor.getByRole('button', { name: '删除习惯', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: '确认删除习惯', exact: true });
  await remove(); await expect(confirmation).toContainText('及其打卡记录会一起删除');
  await require('./prompt-test-helpers.cjs')(confirmation, expect);
  await expect(confirmation.getByRole('button', { name: '取消', exact: true })).toHaveCount(0);
  await confirmation.getByRole('button', { name: '关闭习惯删除确认', exact: true }).click();
  await expect(title).toHaveValue('未保存的新标题'); await expect(note).toHaveValue('未保存的备注');
  expect(await read(), 'Cancel leaves the draft and original records intact').toEqual(before);
  await remove();
  await page.locator('.app-dialog-layer > .sheet-backdrop').click({ position: { x: 8, y: 6 } });
  await expect(confirmation).toHaveCount(0); await expect(editor).toBeVisible();
  expect(await read()).toEqual(before);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
  await remove(); await confirmation.getByRole('button', { name: '确认删除习惯', exact: true }).click();
  await expect(confirmation.getByRole('alert')).toContainText('删除尚未保存');
  await expect(title).toHaveValue('未保存的新标题'); await expect(note).toHaveValue('未保存的备注');
  expect(await read()).toEqual(before);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await confirmation.getByRole('button', { name: '确认删除习惯', exact: true }).click();
  await expect(editor).toHaveCount(0); await expect(confirmation).toHaveCount(0);
  const removed = await read();
  expect(removed.items).toEqual(before.items.filter(item => item.id !== 'delete-target'));
  expect(Object.values(removed.done).every(ids => !ids.includes('delete-target'))).toBe(true);
  expect(removed.completionHistory).not.toHaveProperty('delete-target');
  expect(removed.reflections.map(note => note.habitId)).toEqual(['delete-survivor']);
  await page.reload(); if (host === 'daily') await habitFilter.select('全部'); await expect(cards().getByRole('button', { name: '查看习惯：保留习惯', exact: true })).toBeVisible();
  await expect(cards().getByRole('button', { name: '查看习惯：待删除习惯', exact: true })).toHaveCount(0);
  expect(await read(), 'Reload preserves the deletion and unrelated history').toEqual(removed);
  await page.evaluate(route => { location.hash = route; }, host === 'daily' ? '#/pages/domain-detail/index?id=work' : '#/pages/daily/index');
  if (host !== 'daily') { await habitFilter.assertNoStatusRow(); await habitFilter.select('全部'); }
  await expect(page.getByRole('button', { name: '查看习惯：保留习惯', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '查看习惯：待删除习惯', exact: true })).toHaveCount(0);
};
