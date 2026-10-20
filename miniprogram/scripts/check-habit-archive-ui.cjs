const path = require('node:path');
const confirmUnsavedClose = require('./confirm-unsaved-close.cjs');
const fields = require('./check-habit-editor-fields.cjs');
const createHabitFilter = require('./habit-filter-test-helpers.cjs');
module.exports = async function checkArchive({ page, origin, out, width, expect, host = 'daily' }) {
  const habitFilter = createHabitFilter({ page, expect });
  await page.clock.install({ time: new Date('2026-10-06T12:00:00') });
  await page.goto(`${origin}/?archive-${host}-${width}#/pages/posts/index`);
  await page.evaluate(host => {
    const domain = (id, name) => ({ id, name, iconId: 'plant', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] });
    const item = (id, title, domainId, group) => ({ id, title, domainId, group, kind: 'plant', note: '原有提醒', minutes: 25, enabled: host === 'domain' && id === 'target', priority: 'high', createdAt: 1000 });
    const at = new Date(2026, 9, 6, 10, 30).getTime();
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    window.__miniFixture.guestToolStates = {
      domains: { version: 1, domains: [domain('work', '工作'), domain('life', '生活')], completedGoals: [] },
      reminders: { version: 1, items: [item('target', '恢复原有习惯', 'work', '工作'), item('other', '另一个归档习惯', 'life', '生活')], done: { '2026-10-06': ['target'] }, completionHistory: { target: ['2026-10-06'] }, checkInTimes: { '2026-10-06': { target: at } }, reflections: [{ id: 'log', habitId: 'target', day: '2026-10-06', text: '原有日志', createdAt: at }], sort: { field: 'custom', direction: 'asc' } },
    };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    window.__miniNotices.length = 0;
    location.hash = host === 'daily' ? '#/pages/daily/index' : '#/pages/domain-detail/index?id=work';
  }, host);
  const detail = page.locator(host === 'daily' ? '.daily-detail-sheet' : '.domain-sheet-habit-detail');
  const editor = page.getByRole('dialog', { name: '编辑习惯', exact: true });
  const target = page.locator(host === 'daily' ? '.swipe-panel-current .daily-habit-scroll' : '.domain-habit-scroll').getByRole('button', { name: '查看习惯：恢复原有习惯', exact: true });
  const category = name => page.locator('.daily-core-filter-scroll').getByRole('button', { name, exact: true });
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders')).data);
  const changed = (state, enabled) => ({ ...state, items: state.items.map(item => item.id === 'target' ? { ...item, enabled } : item) });
  const before = await read();
  if (host === 'daily') {
    await habitFilter.assertNoStatusRow();
    await expect(page.getByRole('button', { name: /^(查看已归档习惯|返回启用习惯)$/ })).toHaveCount(0);
    await expect(page.locator('.daily-page-toolbar .page-toolbar-summary-count')).toHaveText('今日完成 1');
    await expect(page.locator('.swipe-panel-current .daily-time-period-section')).toHaveCount(2);
    await expect(page.locator('.swipe-panel-current .daily-time-period-empty')).toHaveText(['暂无自由习惯', '暂无该时段习惯']);
    await expect(page.locator('.daily-neglected-empty')).toHaveText('暂无提醒');
    await expect(page.locator('.daily-core-empty')).toHaveCount(0);
    await page.screenshot({ path: path.join(out, `habit-archive-no-row-${width}.png`) });
    await category('生活').click(); await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
    await page.getByRole('button', { name: '习惯完成状态：进行中', exact: true }).click();
    await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
    await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
    await page.getByRole('button', { name: '习惯完成状态：已归档', exact: true }).click();
    await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
    await expect(category('生活')).toHaveAttribute('aria-pressed', 'true'); await expect(target).toHaveCount(0);
    await category('全部').click(); await expect(target).toBeVisible();
    await expect(page.locator('.daily-page-toolbar .page-toolbar-summary-count')).toHaveText('今日完成 1');
    await page.screenshot({ path: path.join(out, `habit-archive-filtered-no-row-${width}.png`) });
    await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
    await page.getByRole('button', { name: '习惯完成状态：进行中', exact: true }).click();
    await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
    await expect(target).toHaveCount(0);
    expect(await read(), 'Viewing archives and returning through the filter does not change records').toEqual(before);
    await category('生活').click();
    await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
    await page.getByRole('button', { name: '习惯完成状态：已归档', exact: true }).click();
    await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
    await expect(category('生活')).toHaveAttribute('aria-pressed', 'true'); await expect(target).toHaveCount(0); await category('全部').click(); await expect(target).toBeVisible();
  }
  async function openEditor() { if (host === 'daily') await habitFilter.select('全部'); await target.click(); await expect(detail.getByRole('button', { name: /归档习惯|恢复习惯|专注.*分钟/ })).toHaveCount(0); await detail.getByRole('button', { name: '编辑习惯', exact: true }).click(); }
  await openEditor(); await fields(editor, expect, `archive/${host}/${width}`);
  const title = editor.getByRole('textbox', { name: '习惯名称', exact: true }), note = editor.getByRole('textbox', { name: '提醒自己的话', exact: true });
  await title.fill('未保存的新标题'); await note.fill('未保存的备注');
  async function failedChange(label, retry, expected) {
    await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
    await editor.getByRole('button', { name: label, exact: true }).click();
    await expect(editor.getByRole('alert')).toContainText('尚未保存'); expect(await read()).toEqual(expected);
    await expect(editor.getByRole('button', { name: retry, exact: true })).toBeEnabled();
    await expect(editor.getByRole('button', { name: '保存', exact: true })).toBeDisabled();
    await expect(editor.getByRole('button', { name: '删除习惯', exact: true })).toBeDisabled();
    await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
    await editor.getByRole('button', { name: retry, exact: true }).click(); await expect(editor).toBeVisible();
    await expect(title).toHaveValue('未保存的新标题'); await expect(note).toHaveValue('未保存的备注');
  }
  await failedChange(host === 'daily' ? '恢复习惯' : '归档习惯', host === 'daily' ? '重试恢复' : '重试归档', before);
  const afterFirst = changed(before, host === 'daily'); expect(await read()).toEqual(afterFirst);
  await page.screenshot({ path: path.join(out, `habit-archive-editor-${host}-${width}.png`) });
  await failedChange(host === 'daily' ? '归档习惯' : '恢复习惯', host === 'daily' ? '重试归档' : '重试恢复', afterFirst);
  expect(await read()).toEqual(before);
  if (host === 'daily') await editor.getByRole('button', { name: '恢复习惯', exact: true }).click();
  const restored = changed(before, true);
  await editor.getByRole('button', { name: '关闭习惯编辑', exact: true }).click(); await confirmUnsavedClose(page); await page.reload(); if (host === 'daily') { await expect(target).toHaveCount(0); await habitFilter.select('已完成'); } await expect(target).toBeVisible();
  expect(await read()).toEqual(restored);
  expect(await page.evaluate(() => window.__miniNotices.filter(item => /toast|modal/i.test(item)))).toEqual([]);
  if (width === 360 && host === 'daily') {
    await openEditor(); await editor.getByRole('button', { name: '归档习惯', exact: true }).click();
    await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
    await editor.getByRole('button', { name: '恢复习惯', exact: true }).click(); await expect(editor.getByRole('button', { name: '重试恢复', exact: true })).toBeEnabled();
    await page.evaluate(before => {
      window.__miniFixture.failToolWrites = [];
      window.__miniFixture.accountToolStates = { 'archive-reader': { reminders: before, domains: JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:domains')).data } };
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'archive-reader', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session');
    }, before);
    await expect(editor).toHaveCount(0);
    await page.getByRole('button', { name: '筛选习惯', exact: true }).click();
    await page.getByRole('button', { name: '习惯完成状态：已归档', exact: true }).click();
    await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
    await openEditor();
    await editor.getByRole('button', { name: '恢复习惯', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__miniFixture.accountToolStates['archive-reader'].reminders)).toEqual(restored);
    expect(await read()).toEqual(before);
    await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
    await expect(editor).toHaveCount(0); await openEditor();
    expect(await read(), 'Returning to the guest retries its own volatile write through the shared store').toEqual(restored);
    await expect(editor.getByRole('button', { name: '归档习惯', exact: true })).toBeEnabled();
  }
  await page.evaluate(() => { for (const owner of ['guest', 'reader:archive-reader']) for (const tool of ['reminders', 'domains']) localStorage.removeItem(`ottlog-mini-tool-v1:${owner}:${tool}`); });
};
