const path = require('node:path');

module.exports = async function checkDomainHabitCreateCard({ page, origin, out, width, expect, checkCreateButton }) {
  await page.clock.install({ time: new Date('2026-10-09T12:00:00') });
  await page.goto(`${origin}/?habit-create-card-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    const domains = { version: 1, domains: ['工作', '生活'].map((name, index) => ({ id: index ? 'life' : 'work', name, iconId: index ? 'home' : 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] })), completedGoals: [] };
    const reminders = { version: 1, items: [{ id: 'other-habit', title: '其他领域习惯', note: '', group: '生活', domainId: 'life', kind: 'plant', minutes: 0, enabled: true, priority: 'none' }], done: { '2026-10-01': ['other-habit'] }, reflections: [] };
    window.__miniFixture.guestToolStates = { domains, reminders };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    location.hash = '#/pages/domains/index';
  });
  const read = tool => page.evaluate(tool => JSON.parse(localStorage.getItem(`ottlog-mini-tool-v1:guest:${tool}`)).data, tool);
  const originalDomains = await read('domains'), originalReminders = await read('reminders');
  const domainAdd = page.getByRole('button', { name: '创建领域', exact: true });
  await checkCreateButton(domainAdd, '创建领域', expect, { iconOnly: true });
  const domainTarget = await domainAdd.evaluate(node => {
    const target = node.getBoundingClientRect(), cell = node.parentElement.getBoundingClientRect();
    return { widthGap: cell.width - target.width, heightGap: cell.height - target.height };
  });
  expect(Math.abs(domainTarget.widthGap), 'The shared domain add button fills its card').toBeLessThanOrEqual(2);
  expect(Math.abs(domainTarget.heightGap), 'The shared domain add button fills its card').toBeLessThanOrEqual(2);
  await page.getByRole('button', { name: '打开工作领域', exact: true }).click();
  const add = () => page.getByRole('button', { name: '创建工作习惯', exact: true });
  const editor = () => page.getByRole('dialog', { name: '创建习惯', exact: true });
  async function checkCard(count) {
    await expect(page.locator('.domain-habits-heading button')).toHaveCount(0);
    await expect(page.locator('.domain-habit-grid')).toHaveCount(1);
    await expect(page.locator('.domain-habit-card')).toHaveCount(count);
    await expect(page.locator('.domain-habit-create-card')).toHaveCount(1);
    await expect(page.locator('.domain-habit-grid > .daily-suggestion').last()).toHaveClass(/domain-habit-create-card/);
    await checkCreateButton(add(), '创建习惯', expect, { iconOnly: true });
    const layout = await add().evaluate(node => {
      const target = node.getBoundingClientRect(), cell = node.parentElement.getBoundingClientRect();
      const page = node.closest('.domain-habit-scroll');
      const habit = page.querySelector('.domain-habit-card')?.getBoundingClientRect();
      return { widthGap: cell.width - target.width, heightGap: cell.height - target.height,
        centerX: (target.left + target.right - cell.left - cell.right) / 2,
        centerY: (target.top + target.bottom - cell.top - cell.bottom) / 2,
        singleRow: page.classList.contains('is-single-row'), habitHeightGap: habit ? cell.height - habit.height : 0 };
    });
    expect(Math.abs(layout.widthGap), 'The whole card is clickable').toBeLessThanOrEqual(2);
    expect(Math.abs(layout.heightGap), 'The whole card is clickable').toBeLessThanOrEqual(2);
    expect(layout.centerX).toBeCloseTo(0, 0);
    expect(layout.centerY).toBeCloseTo(0, 0);
    expect(Math.abs(layout.habitHeightGap), 'The placeholder shares the habit card height').toBeLessThanOrEqual(2);
    if (count <= 1) expect(layout.singleRow, 'An empty second row is omitted').toBe(true);
    const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth - innerWidth, page: document.querySelector('.domains-page').scrollWidth - document.querySelector('.domains-page').clientWidth }));
    expect(overflow.document).toBeLessThanOrEqual(2);
    expect(overflow.page, 'The vertical habit grid does not overflow the surrounding page').toBeLessThanOrEqual(2);
  }
  await checkCard(0);
  await page.screenshot({ path: path.join(out, `domains-habit-create-entry-${width}.png`) });
  await add().click();
  await expect(editor().getByRole('button', { name: '选择习惯领域', exact: true })).toHaveText('工作');
  await page.getByRole('button', { name: '关闭习惯编辑', exact: true }).click();
  await expect(editor()).toHaveCount(0);
  expect(await read('reminders'), 'Closing an unchanged creation leaves existing data intact').toEqual(originalReminders);
  for (let index = 0; index < 5; index++) {
    await add().click();
    await expect(editor().getByRole('button', { name: '选择习惯领域', exact: true })).toHaveText('工作');
    await editor().getByRole('textbox', { name: '习惯名称', exact: true }).fill(`末尾创建习惯${index + 1}`);
    if (index === 0) {
      await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
      await editor().locator('.daily-editor-footer .ui-button-primary').click();
      await expect(editor().getByRole('alert')).toContainText('尚未保存');
      expect(await read('reminders'), 'A failed creation cannot mutate the archive').toEqual(originalReminders);
      await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
    }
    await editor().locator('.daily-editor-footer .ui-button-primary').click();
    await expect(editor()).toHaveCount(0);
    const saved = await read('reminders');
    expect(saved.items.filter(item => item.domainId === 'work')).toHaveLength(index + 1);
    expect(saved.items.find(item => item.id === 'other-habit')).toEqual(originalReminders.items[0]);
    expect(saved.done, 'Creation retains existing check-ins').toEqual(originalReminders.done);
    expect(await read('domains'), 'The add card and new habits never create domain records').toEqual(originalDomains);
    await checkCard(index + 1);
    if (index >= 3) {
      await page.locator('.domain-habit-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
      await expect(add()).toBeInViewport();
      await page.screenshot({ path: path.join(out, `domains-habit-${index === 3 ? 'full-page-add' : 'next-page'}-${width}.png`) });
    }
  }
  const saved = await read('reminders');
  await page.reload();
  await checkCard(5);
  expect(await read('reminders'), 'Reload retains all five original IDs and fields').toEqual(saved);
};
