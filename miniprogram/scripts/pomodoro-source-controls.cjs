// Source choices are disclosed by one independent anchored window; opening the menu must not
// change the focus selection, and choosing a source closes it before its sheet.
module.exports = function pomodoroSourceControls({ page, expect }) {
  const toggle = () => page.getByRole('button', { name: '选择专注事项来源', exact: true });
  const menu = () => page.locator('.focus-source-menu');
  const option = kind => page.getByRole('button', { name: kind === 'todo' ? '从待办选择专注事项' : '从习惯选择专注事项', exact: true });
  async function centered() {
    const offset = await toggle().evaluate(node => { const box = node.getBoundingClientRect(), arrow = node.querySelector('.select-chevron').getBoundingClientRect(); return { x: (arrow.left + arrow.right - box.left - box.right) / 2, y: (arrow.top + arrow.bottom - box.top - box.bottom) / 2 }; });
    expect(Math.abs(offset.x), 'Source chevron is centered horizontally').toBeLessThanOrEqual(1);
    expect(Math.abs(offset.y), 'Source chevron is centered vertically').toBeLessThanOrEqual(1);
  }
  async function open() {
    if (await toggle().getAttribute('aria-expanded') !== 'true') await toggle().click();
    await expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(menu()).toBeVisible();
    await expect(menu().getByRole('button')).toHaveCount(2);
    await centered();
  }
  async function close() {
    if (await toggle().getAttribute('aria-expanded') === 'true') await page.locator('.form-popover-backdrop').click({ position: { x: 4, y: 4 } });
    await expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(menu()).toHaveCount(0);
    await centered();
  }
  async function select(kind) {
    await open();
    await option(kind).click();
    await expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(menu()).toHaveCount(0);
  }
  return { toggle, menu, option, open, close, select };
};
