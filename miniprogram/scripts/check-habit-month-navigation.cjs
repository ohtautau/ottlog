const path = require('node:path');

module.exports = async function checkHabitMonthNavigation({ page, calendar, read, width, host, out, expect }) {
  const before = await read(), original = await calendar.locator('.habit-calendar-month').textContent();
  const open = () => calendar.getByRole('button', { name: '选择打卡年月', exact: true });
  const panel = () => calendar.locator('.calendar-month-popover');
  const year = () => panel().getByLabel('打卡日历年份', { exact: true });
  const month = () => panel().getByLabel('打卡日历月份', { exact: true });
  const done = () => panel().getByRole('button', { name: '查看月份', exact: true });
  const current = () => calendar.getByRole('button', { name: '回到本月打卡', exact: true });
  await expect(current()).toBeVisible(); await expect(current()).toHaveText('○');
  await expect(calendar.getByRole('button', { name: '查看下个月打卡', exact: true })).toBeDisabled();
  const order = await calendar.locator('.habit-calendar-navigation button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
  expect(order).toEqual(['选择打卡年月', '查看上个月打卡', '回到本月打卡', '查看下个月打卡']);
  await open().click(); await expect(panel()).toHaveClass(/is-positioned/);
  const fields = await panel().locator('.schedule-number-field').evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  for (const field of fields) { expect(field.width).toBeCloseTo(96, 1); expect(field.height).toBeCloseTo(40, 1); }
  const center = await panel().evaluate(node => { const bounds = node.getBoundingClientRect(), row = node.querySelector('.numeric-input-row'); return (row.firstElementChild.getBoundingClientRect().left + row.lastElementChild.getBoundingClientRect().right - bounds.left - bounds.right) / 2; });
  expect(Math.abs(center)).toBeLessThanOrEqual(1);
  await year().fill('2026'); await month().fill('11'); await done().click();
  await expect(panel().getByRole('alert')).toBeVisible();
  await expect(calendar.locator('.habit-calendar-month')).toHaveText(original);
  expect(await read(), 'An invalid future view does not write history').toEqual(before);
  await month().fill('9'); await done().click(); await expect(panel()).toHaveCount(0);
  await expect(calendar.locator('.habit-calendar-month')).toHaveText('2026年9月');
  await expect(calendar.locator('.habit-calendar-day')).toHaveCount(42);
  await current().click(); await expect(calendar.locator('.habit-calendar-month')).toHaveText(original);
  await open().click(); await month().fill('9');
  await panel().getByRole('button', { name: '关闭打卡年月选择', exact: true }).click();
  const prompt = page.getByRole('dialog', { name: '保存修改？', exact: true });
  await expect(prompt).toBeVisible(); await prompt.getByRole('button', { name: '不保存', exact: true }).click();
  await expect(panel()).toHaveCount(0); await expect(calendar.locator('.habit-calendar-month')).toHaveText(original);
  await open().click(); await month().fill('9'); await page.keyboard.press('Escape');
  await expect(prompt).toBeVisible(); await prompt.getByRole('button', { name: '保存', exact: true }).click();
  await expect(panel()).toHaveCount(0); await expect(calendar.locator('.habit-calendar-month')).toHaveText('2026年9月');
  await current().click();
  expect(await read(), 'Navigation and view-month confirmation never change habit/check-in storage').toEqual(before);
  await page.screenshot({ path: path.join(out, `habit-month-navigation-${host}-${width}.png`) });
};
