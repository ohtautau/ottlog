// Exercise the public filter window; habit status is no longer a separate row.
module.exports = function habitFilterControls({ page, expect }) {
  const labels = ['进行中', '已完成', '已归档', '全部'];
  const filter = () => page.getByRole('button', { name: '筛选习惯', exact: true });
  const option = label => page.getByRole('button', { name: `习惯完成状态：${label}`, exact: true });
  async function assertNoStatusRow() {
    await expect(page.locator('.daily-status-scroll,[id^="daily-status-"]'), 'Habit status has no independent row or placeholder').toHaveCount(0);
    await expect(page.locator('.daily-habit-sections > .page-category-bar'), 'The main list keeps only its domain category row').toHaveCount(1);
  }
  async function open() {
    if (await filter().getAttribute('aria-expanded') !== 'true') await filter().click();
    await expect(option(labels[0])).toBeVisible();
  }
  async function close() {
    if (await filter().getAttribute('aria-expanded') === 'true') await page.getByRole('dialog', { name: '筛选习惯', exact: true }).locator('..').locator('.form-popover-backdrop').click({ position: { x: 2, y: 2 } });
    await expect(option(labels[0])).toHaveCount(0);
  }
  async function select(label) {
    if (!labels.includes(label)) throw new Error(`Unsupported habit status: ${label}`);
    await open();
    await option(label).click();
    await page.getByRole('dialog', { name: '筛选习惯', exact: true }).getByRole('button', { name: /^筛选 \d+ 个习惯$/ }).click();
    await expect(filter()).toHaveAttribute('aria-expanded', 'false');
    await assertNoStatusRow();
  }
  async function selected(label) {
    const wasOpen = await filter().getAttribute('aria-expanded') === 'true';
    await open();
    await expect(page.getByRole('button', { name: /^习惯完成状态：/ })).toHaveText(labels);
    for (const candidate of labels) await expect(option(candidate)).toHaveAttribute('aria-pressed', String(candidate === label));
    await assertNoStatusRow();
    if (!wasOpen) await close();
  }
  return { filter, option, open, close, select, selected, assertNoStatusRow };
};
