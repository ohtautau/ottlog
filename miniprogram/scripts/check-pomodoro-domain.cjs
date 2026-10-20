const path = require('node:path');

module.exports = async function checkPomodoroDomain({ page, origin, out, width, expect }) {
  const preview = require('./domain-preview-records.cjs');
  const domains = preview.extendEntertainmentDomainPreview(preview.createDomainPreviewRecords(Date.now()));
  const longName = '属于休闲娱乐的很长领域名称会自动换行显示';
  domains.domains.find(domain => domain.id === 'entertainment').name = longName;
  await page.goto(`${origin}/?pomodoro-domain-${width}#/pages/posts/index`);
  await page.evaluate(data => {
    for (const tool of ['domains', 'reminders', 'todos']) localStorage.removeItem(`ottlog-mini-tool-v1:guest:${tool}`);
    const createdAt = '2026-09-15T00:00:00Z';
    window.__miniFixture.guestToolStates = {
      domains: data,
      reminders: { version: 1, items: [{ id: 'domain-habit', title: '阅读并整理摘录', kind: 'notes', group: '学习', minutes: 15, enabled: true, note: '' }], done: {} },
      todos: { version: 1, categories: [], tasks: [{ id: 'domain-task', title: '校对本周工作报告', description: '', categoryId: '', important: false, urgent: false, dueDate: '', completedAt: null, createdAt, updatedAt: createdAt }] },
    };
    location.hash = '#/pages/pomodoro/index';
  }, domains);
  const trigger = () => page.getByRole('button', { name: '选择番茄钟所属领域', exact: true });
  const state = () => page.evaluate(() => window.__miniFixture.pomodoroLocalState);
  const source = require('./pomodoro-source-controls.cjs')({ page, expect });
  const pick = async label => {
    await trigger().click();
    await expect(page.locator('.form-popover-panel')).toBeVisible();
    await page.getByRole('button', { name: `专注领域：${label}`, exact: true }).click();
    await expect(trigger()).toHaveText(label);
  };
  await expect(trigger()).toBeEnabled();
  await expect(trigger()).toHaveText('未分类');
  const before = await state();
  await trigger().click();
  await page.locator('.form-popover-backdrop').click({ position: { x: 4, y: 4 } });
  expect(await state(), 'Opening/closing the field does not write timer state').toEqual(before);
  await pick('工作');
  await page.locator('.focus-purpose-input').fill('属于工作领域的事项');
  await expect(trigger()).toHaveText('工作');
  await source.select('todo');
  await page.getByRole('button', { name: '选择待办：校对本周工作报告', exact: true }).click();
  await expect(trigger()).toHaveText('工作');
  await source.select('habit');
  await page.locator('.focus-habit-option').first().click();
  await expect(trigger()).toHaveText('工作');
  expect(await state(), 'Pre-start choices stay in the existing page draft').toEqual(before);
  await page.locator('.focus-start').click();
  await expect(page.locator('.focus-live')).toContainText('正在计时');
  const startedState = await state();
  const started = startedState.active;
  expect(started.selection.domainId).toBe('work');
  expect(started.selection.habitId).toBeTruthy();
  await page.clock.fastForward(6000);
  await page.locator('.focus-start').click();
  await expect(page.locator('.focus-live')).toContainText('已暂停');
  await pick(longName);
  const paused = (await state()).active;
  expect(paused).toMatchObject({ id: started.id, running: false, selection: { domainId: 'entertainment', habitId: started.selection.habitId } });
  await page.clock.runFor(150);
  const layout = await page.evaluate(() => {
    const box = selector => { const node = document.querySelector(selector), rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height }; };
    return { status: box('.focus-clock-top'), domain: box('.focus-domain-row'), button: box('.focus-domain-row button'), stage: box('.focus-timer-stage'), tomato: box('.focus-tomato-scene'), end: box('.focus-end'), viewport: box('.preview-content') };
  });
  expect(layout.domain.top - layout.status.bottom).toBeCloseTo(8, 0);
  expect(layout.button.left).toBeCloseTo(layout.domain.left, 0);
  expect(layout.button.right).toBeCloseTo(layout.domain.right, 0);
  expect(layout.button.height).toBeGreaterThanOrEqual(44);
  expect(layout.tomato.top).toBeGreaterThanOrEqual(layout.stage.top - 1);
  expect(layout.tomato.bottom).toBeLessThanOrEqual(layout.stage.bottom + 1);
  expect(layout.end.bottom).toBeLessThan(layout.viewport.bottom);
  await expect(trigger().locator('.library-icon')).toHaveAttribute('src', '/assets/icons/game.png');
  await page.screenshot({ path: path.join(out, `pomodoro-domain-paused-${width}.png`) });
  await page.evaluate(() => { location.hash = '#/pages/posts/index'; });
  await page.evaluate(() => { location.hash = '#/pages/pomodoro/index'; });
  await expect(trigger()).toHaveText(longName);
  expect((await state()).active.id).toBe(started.id);
  await page.locator('.focus-start').click();
  await expect(page.locator('.focus-live')).toContainText('正在计时');
  await page.locator('.focus-purpose-input').fill('领域保留的修改事项');
  await expect(trigger()).toHaveText(longName);
  await page.locator('.focus-start').click();
  await expect(page.locator('.focus-live')).toContainText('已暂停');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['pomodoro']; });
  await pick('生活');
  await expect(page.locator('.focus-feedback-slot')).toContainText('未能保存');
  await expect(trigger(), 'A failed absolute domain target is locked until the original queue is retried').toBeDisabled();
  expect((await state()).active.selection.domainId).toBe('entertainment');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await page.locator('.focus-feedback-slot').getByRole('button', { name: '重新同步', exact: true }).click();
  await expect(trigger()).toBeEnabled();
  await expect(trigger()).toHaveText('生活');
  expect((await state()).active.selection.domainId).toBe('life');
  await page.getByRole('button', { name: '结束', exact: true }).click();
  await expect(page.locator('.focus-live')).toContainText('准备就绪');
  expect((await state()).sessions.find(session => session.id === started.id)).toMatchObject({ domainId: 'life', title: '领域保留的修改事项', durationSeconds: 6 });
  await pick('未分类');
  await page.locator('.focus-start').click();
  await expect(page.locator('.focus-live')).toContainText('正在计时');
  expect((await state()).active.selection.domainId).toBeNull();
  await trigger().click();
  await page.evaluate(() => {
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'domain-other-account', isAdmin: false };
    window.__miniPreviewControl.emit('ottlog-session');
  });
  await expect(trigger()).toBeEnabled();
  await expect(trigger()).toHaveText('未分类');
  await expect(page.locator('.form-popover-panel')).toHaveCount(0);
  const deletedSelection = { ...paused.selection, domainId: 'deleted-domain' };
  const deletedState = { ...startedState, selection: deletedSelection, active: { ...paused, selection: deletedSelection } };
  await page.evaluate(({ timer, domains }) => {
    window.__miniFixture.accountToolStates = {
      'domain-deleted': { pomodoro: timer, domains },
      'domain-invalid': { pomodoro: timer, domains: { version: 1, domains: 'invalid', completedGoals: [] } },
    };
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'domain-deleted', isAdmin: false };
    window.__miniPreviewControl.emit('ottlog-session');
  }, { timer: deletedState, domains });
  await expect(page.locator('.focus-live')).toContainText('已暂停');
  await expect(trigger()).toBeEnabled();
  await expect(trigger()).toHaveText('未分类');
  expect((await state()).active.selection.domainId, 'A deleted domain falls back for display without rewriting the stored ID').toBe('deleted-domain');
  const writesBefore = await page.evaluate(() => window.__miniRequests.filter(row => row.path === '/personal-tools/pomodoro' && row.method === 'PUT').length);
  await trigger().click();
  await page.locator('.form-popover-backdrop').click({ position: { x: 4, y: 4 } });
  expect(await page.evaluate(() => window.__miniRequests.filter(row => row.path === '/personal-tools/pomodoro' && row.method === 'PUT').length)).toBe(writesBefore);
  await page.evaluate(() => {
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'domain-invalid', isAdmin: false };
    window.__miniPreviewControl.emit('ottlog-session');
  });
  await expect(page.locator('.focus-live')).toContainText('已暂停');
  await expect(trigger(), 'Invalid domain archives remain protected and cannot provide selectable options').toBeDisabled();
  await expect(page.locator('.form-popover-panel')).toHaveCount(0);
};
