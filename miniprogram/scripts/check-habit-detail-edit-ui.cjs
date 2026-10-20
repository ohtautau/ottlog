const path = require('node:path');
const createHabitFilter = require('./habit-filter-test-helpers.cjs');

module.exports = async function checkHabitDetailEditUI({ page, origin, out, width, expect, host }) {
  await page.goto(`${origin}/?habit-detail-edit-${host}-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    const item = { id: 'detail-target', title: '详情中修改习惯', note: '完整备注\n'.repeat(60), group: '工作', domainId: 'work', kind: 'plant', minutes: 7, enabled: true, createdAt: 1234, priority: 'medium', timePeriod: 'free' };
    const domain = (id, name) => ({ id, name, iconId: 'notes', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] });
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    window.__miniFixture.guestToolStates = { reminders: { version: 1, items: [item, { ...item, id: 'detail-survivor', title: '保留其他习惯' }], done: { '2026-09-15': ['detail-target'] },
      completionHistory: { 'detail-target': [[20000, 20002]] }, reflections: [{ id: 'detail-reflection', habitId: item.id, day: '2026-09-15', text: '保留完整历史', createdAt: 1234 }], checkInTimes: { '2026-09-15': { 'detail-target': 5678 } } },
      domains: { version: 1, domains: [domain('work', '工作'), domain('life', '生活')], completedGoals: [] } };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
  });
  await page.evaluate(host => { location.hash = host === 'daily' ? '#/pages/daily/index' : '#/pages/domain-detail/index?id=work'; }, host);
  if (host === 'daily') await createHabitFilter({ page, expect }).select('全部');
  const sheet = () => page.locator(host === 'daily' ? '.daily-detail-sheet' : '.domain-sheet-habit-detail');
  const open = () => page.locator(host === 'daily' ? '.swipe-panel-current .daily-habit-scroll' : '.domain-habit-scroll').getByRole('button', { name: '查看习惯：详情中修改习惯', exact: true }).click();
  const read = tool => page.evaluate(tool => window.__miniPreviewControl.readStorage(`ottlog-mini-tool-v1:guest:${tool}`).data, tool);
  await open(); await expect(sheet()).toBeVisible();
  await require('./check-habit-detail-layout.cjs')({ page, sheetSelector: host === 'daily' ? '.daily-detail-sheet' : '.domain-sheet-habit-detail', footerSelector: host === 'daily' ? '.daily-detail-actions' : '.domain-sheet-actions', phase: 'inline choices initial layout', width, expect });
  const original = await read('reminders'), originalDomains = await read('domains');
  const icon = () => sheet().getByRole('button', { name: '选择习惯图标', exact: true });
  const priority = () => sheet().getByRole('button', { name: /^选择习惯优先度：/ });
  const domain = () => sheet().getByRole('button', { name: '选择习惯领域', exact: true });
  const option = label => page.locator('.form-popover-panel,.icon-library-sheet').getByRole('button', { name: label, exact: true });
  for (const trigger of [icon, priority, domain]) {
    await trigger().click(); await page.keyboard.press('Escape');
    await expect(sheet()).toBeVisible();
    await expect(page.locator('.icon-library-sheet,.form-popover-panel')).toHaveCount(0);
    expect(await read('reminders'), 'Opening and cancelling a choice does not write habits').toEqual(original);
  }
  await icon().click(); await page.getByRole('button', { name: '选择图标：专注', exact: true }).click();
  await expect.poll(async () => (await read('reminders')).items[0].iconId).toBe('focus');
  await priority().click(); await page.getByRole('button', { name: '优先度高', exact: true }).click();
  await expect.poll(async () => (await read('reminders')).items[0].priority).toBe('high');
  await domain().click(); await option('生活').click();
  await expect.poll(async () => (await read('reminders')).items[0].domainId).toBe('life');
  await expect(sheet()).toBeVisible(); await expect(domain()).toContainText('生活');
  await domain().click(); await option('未分类').click();
  await expect.poll(async () => (await read('reminders')).items[0].group).toBe('未分类');
  expect((await read('reminders')).items[0].domainId).toBeUndefined();
  await domain().click(); await option('工作').click();
  await expect.poll(async () => (await read('reminders')).items[0].domainId).toBe('work');
  await page.screenshot({ path: path.join(out, `habit-detail-inline-${host}-${width}.png`) });
  for (const choice of [{ trigger: priority, label: '优先度低', field: 'priority', value: 'low' }, { trigger: icon, label: '选择图标：摄影', field: 'iconId', value: 'camera' }, { trigger: domain, label: '生活', field: 'domainId', value: 'life' }]) {
    const durable = await read('reminders');
    await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
    await choice.trigger().click(); await option(choice.label).click();
    await expect(sheet().getByRole('alert')).toContainText('本机存储不可用');
    for (const trigger of [icon, priority, domain]) await expect(trigger()).toBeDisabled();
    await expect(sheet().getByRole('button', { name: '编辑习惯', exact: true })).toBeDisabled();
    await expect(sheet().getByRole('button', { name: '关闭习惯详情', exact: true })).toBeDisabled();
    expect(await sheet().locator('.habit-calendar-day:not([disabled])').count()).toBe(0);
    await page.keyboard.press('Escape'); await expect(sheet()).toBeVisible();
    expect(await read('reminders')).toEqual(durable);
    await sheet().getByRole('button', { name: '重试保存', exact: true }).click();
    await expect(sheet().getByRole('alert')).toContainText('本机存储不可用'); expect(await read('reminders')).toEqual(durable);
    if (choice.field === 'domainId') await page.screenshot({ path: path.join(out, `habit-detail-inline-retry-${host}-${width}.png`) });
    await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
    await sheet().getByRole('button', { name: '重试保存', exact: true }).click();
    await expect(sheet().getByRole('alert')).toHaveCount(0);
    await expect.poll(async () => (await read('reminders')).items[0][choice.field]).toBe(choice.value);
  }
  const changed = await read('reminders');
  expect(changed.items[0]).toEqual({ ...original.items[0], iconId: 'camera', kind: 'camera', priority: 'low', group: '生活', domainId: 'life' });
  expect(changed.items[1]).toEqual(original.items[1]);
  for (const field of Object.keys(original).filter(field => field !== 'items')) expect(changed[field], `Inline choices preserve ${field}`).toEqual(original[field]);
  expect(await read('domains'), 'Choosing a habit domain never writes domain records').toEqual(originalDomains);
  await domain().click(); await option('工作').click();
  await expect(domain()).toContainText('工作');
  await sheet().getByRole('button', { name: '关闭习惯详情', exact: true }).click();
  await open(); await expect(priority()).toHaveAttribute('aria-label', '选择习惯优先度：低');
  await sheet().getByRole('button', { name: '编辑习惯', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '编辑习惯', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '选择习惯图标', exact: true }).locator('.habit-icon')).toBeVisible();
  await page.getByRole('button', { name: '关闭习惯编辑', exact: true }).click();
  if (host === 'daily') await open();
  const guest = await read('reminders');
  await icon().click();
  await page.evaluate(() => {
    window.__miniFixture.accountToolStates = { 'detail-edit-account': window.__miniFixture.guestToolStates };
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'detail-edit-account', isAdmin: false };
    window.__miniPreviewControl.emit('ottlog-session');
  });
  await expect(sheet()).toHaveCount(0); await expect(page.locator('.icon-library-sheet')).toHaveCount(0);
  expect(await read('reminders')).toEqual(guest);
  await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
  console.log(`${width} ${host}: inline domain/icon/priority, cancel, durable retry, preserved history and account isolation passed`);
};
