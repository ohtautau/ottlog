// Check prompt readability and reachable actions against the real page viewport.
module.exports = async function checkPromptAppearance(dialog, expect) {
  await expect(dialog).toHaveClass(/app-dialog-panel/);
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  const layout = await dialog.evaluate(node => {
    const box = element => element.getBoundingClientRect().toJSON();
    const style = getComputedStyle(node), heading = node.querySelector('.editor-heading-title');
    const body = node.querySelector('.app-dialog-body'), footer = node.querySelector('.sheet-actions');
    return { panel: box(node), viewport: box(document.querySelector('.preview-content')), radius: parseFloat(style.borderRadius), background: style.backgroundColor,
      title: [parseFloat(getComputedStyle(heading).fontSize), Number(getComputedStyle(heading).fontWeight)],
      body: body && [parseFloat(getComputedStyle(body).fontSize), parseFloat(getComputedStyle(body).lineHeight)],
      close: box(node.querySelector('.editor-heading-actions button')), separator: getComputedStyle(footer).borderTopWidth,
      actions: [...footer.querySelectorAll('button')].map(box) };
  });
  expect(layout.panel.width).toBeLessThanOrEqual(360);
  expect(layout.panel.left).toBeGreaterThanOrEqual(layout.viewport.left + 12);
  expect(layout.panel.right).toBeLessThanOrEqual(layout.viewport.right - 12);
  expect(layout.panel.top).toBeGreaterThanOrEqual(layout.viewport.top + 12);
  expect(layout.panel.bottom).toBeLessThanOrEqual(layout.viewport.bottom - 12);
  expect(layout.radius).toBe(12); expect(layout.background).toBe('rgb(34, 49, 61)');
  expect(layout.title).toEqual([18, 600]);
  if (layout.body) { expect(layout.body[0]).toBe(14); expect(layout.body[1] / layout.body[0]).toBeCloseTo(1.65, 3); }
  expect(layout.close.width).toBe(40); expect(layout.close.height).toBe(40);
  expect(layout.separator).toBe('0px');
  for (const button of layout.actions) {
    expect(button.height).toBe(48);
    expect(layout.panel.bottom - 1 - button.bottom).toBeCloseTo(8, 1);
  }
  if (layout.actions.length === 2) {
    expect(layout.actions[0].width).toBeCloseTo(layout.actions[1].width, 1);
    expect(layout.actions[1].left - layout.actions[0].right).toBeCloseTo(8, 1);
  }
};
