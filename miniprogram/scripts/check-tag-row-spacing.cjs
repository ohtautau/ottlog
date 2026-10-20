const path = require('node:path');

module.exports = async function checkTagRowSpacing({ page, origin, out, width, expect, checkButtonAppearance }) {
  await page.goto(`${origin}/#/pages/tag-row-fixture/index`);
  const example = id => page.locator(`[data-tag-case="${id}"]`);
  async function checkRow(id) {
    const trigger = example(id).getByRole('button', { name: /^选择/ });
    await checkButtonAppearance(trigger, { kind: 'secondary' }, expect);
    for (const button of await example(id).locator('.form-tag-common button').all()) await checkButtonAppearance(button, { kind: 'choice', selected: await button.getAttribute('aria-pressed') === 'true' }, expect);
    for (const button of await example(id).locator('.form-tag-common button').all()) await expect(button).toHaveText(`#${await button.getAttribute('aria-label')}`);
    const geometry = await example(id).locator('.form-tag-row').evaluate(node => {
      const rect = node.getBoundingClientRect(), trigger = node.querySelector('.form-choice-trigger').getBoundingClientRect();
      const buttons = [...node.querySelectorAll('.form-tag-common button')].map(button => button.getBoundingClientRect());
      return { gap: trigger.left - (buttons.at(-1)?.right ?? rect.left), overflow: node.scrollWidth - node.clientWidth, left: rect.left, right: rect.right, triggerLeft: trigger.left, triggerRight: trigger.right, height: trigger.height, buttons: buttons.map(button => ({ left: button.left, right: button.right, width: button.width, top: button.top, bottom: button.bottom })), top: trigger.top, bottom: trigger.bottom };
    });
    expect(geometry.gap, `${width} ${id}: the arrow follows visible tags without a filler area`).toBeGreaterThanOrEqual(-1);
    expect(geometry.gap, `${width} ${id}: the gap stays small even on a wide screen`).toBeLessThanOrEqual(id === 'empty' ? 1 : 12);
    expect(geometry.overflow, `${width} ${id}: labels and the arrow stay in one bounded row`).toBeLessThanOrEqual(2);
    expect(geometry.triggerLeft).toBeGreaterThanOrEqual(geometry.left - 1);
    expect(geometry.triggerRight).toBeLessThanOrEqual(geometry.right + 1);
    expect(geometry.height, 'The disclosure remains an accessible touch target').toBeGreaterThanOrEqual(40);
    if (geometry.buttons.length) {
      expect(Math.abs(geometry.buttons[0].left - geometry.left), `${width} ${id}: tags start at the row edge`).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.triggerRight - geometry.right), `${width} ${id}: tag buttons use the available width up to the disclosure`).toBeLessThanOrEqual(1);
    }
    for (const [index, button] of geometry.buttons.entries()) {
      expect(Math.abs(button.width - geometry.buttons[0].width), `${width} ${id}: common tag buttons have balanced widths`).toBeLessThanOrEqual(1);
      expect(button.width, 'A tag keeps a usable touch width').toBeGreaterThanOrEqual(40);
      expect(button.left).toBeGreaterThanOrEqual(geometry.left - 1);
      expect(button.right).toBeLessThanOrEqual(geometry.triggerLeft - 5);
      if (index) expect(Math.abs(button.left - geometry.buttons[index - 1].right - 6), 'Tags keep their standard gap').toBeLessThanOrEqual(1);
      expect(Math.abs(button.top - geometry.top)).toBeLessThanOrEqual(2);
      expect(Math.abs(button.bottom - geometry.bottom)).toBeLessThanOrEqual(2);
    }
    await expect(example(id).getByRole('button', { name: /^选择/ })).toBeInViewport({ ratio: 1 });
  }
  for (const id of ['empty', 'one', 'short', 'long', 'count', 'dynamic']) await checkRow(id);
  await expect(example('empty').locator('.form-tag-count')).toHaveCount(0);
  await expect(example('count').locator('.form-tag-count')).toHaveText('12');
  await page.getByRole('button', { name: '切换常用标签', exact: true }).click();
  await checkRow('dynamic');
  await page.getByRole('button', { name: '切换常用标签', exact: true }).click();
  await checkRow('dynamic');

  // A truncated common label is still available in full in the floating list.
  const long = example('long');
  const fullLabel = await long.locator('.form-tag-common button').first().getAttribute('aria-label');
  await long.getByRole('button', { name: '选择四个长标签', exact: true }).click();
  await expect(long.getByRole('button', { name: '选择四个长标签', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await checkButtonAppearance(long.getByRole('button', { name: '选择四个长标签', exact: true }), { kind: 'secondary', selected: true }, expect);
  const panel = long.locator('.form-popover-panel');
  const panelOption = panel.getByRole('button', { name: fullLabel, exact: true });
  await expect(panelOption).toHaveText(`#${fullLabel}`);
  await checkButtonAppearance(panelOption, { kind: 'choice' }, expect);
  await panel.getByRole('button', { name: fullLabel, exact: true }).click();
  await expect(panel.getByRole('button', { name: fullLabel, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(long.locator('.form-tag-common button').first()).toHaveAttribute('aria-pressed', 'true');
  const selectedPopup = await checkButtonAppearance(panelOption, { kind: 'choice', selected: true }, expect);
  const selectedCommon = await checkButtonAppearance(long.locator('.form-tag-common button').first(), { kind: 'choice', selected: true }, expect);
  for (const name of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'foreground', 'background', 'border', 'radius']) expect(selectedCommon[name], 'Common labels and floating options share the same selection design').toEqual(selectedPopup[name]);
  await checkButtonAppearance(panel.getByRole('button', { name: '完成', exact: true }), { kind: 'secondary' }, expect);
  await panel.getByRole('button', { name: '完成', exact: true }).click();
  await checkRow('long');
  await long.getByRole('button', { name: '选择四个长标签', exact: true }).click();
  await expect(panel.getByRole('button', { name: fullLabel, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: '完成', exact: true }).click();
  await page.screenshot({ path: path.join(out, `tag-row-spacing-${width}.png`) });
  const wrapping = example('wrap');
  await wrapping.getByRole('button', { name: '选择换行标签', exact: true }).click();
  const editor = wrapping.getByRole('textbox', { name: '换行标签文字', exact: true });
  await expect(editor).toHaveValue('购物，阅读，创作，示例');
  const initial = await editor.evaluate(node => {
    const frame = node.closest('.form-tag-input-frame'), box = node.getBoundingClientRect(), outer = frame.getBoundingClientRect();
    const custom = node.closest('.form-tag-custom'), grid = custom.previousElementSibling.getBoundingClientRect();
    return { inset: box.left - outer.left, height: box.height, touch: outer.height, gap: custom.getBoundingClientRect().top - grid.bottom };
  });
  expect(initial.inset, 'Tag text has protected left padding inside task/memo styles').toBeGreaterThanOrEqual(12);
  expect(initial.touch).toBeGreaterThanOrEqual(44);
  expect(initial.gap, 'The custom tag field is separated from the options').toBe(12);
  const text = '购物，阅读，创作，示例，学习，记录观察与感受，LongTagNameWithoutSpaces'.repeat(2);
  await editor.fill(text); await expect(editor).toHaveValue(text);
  const wrapped = await editor.evaluate(node => ({ height: node.getBoundingClientRect().height, line: parseFloat(getComputedStyle(node).lineHeight), horizontal: node.scrollWidth - node.clientWidth, vertical: node.scrollHeight - node.clientHeight }));
  expect(wrapped.height, 'Many tags wrap into multiple visible lines').toBeGreaterThan(initial.height);
  expect(wrapped.height).toBeGreaterThanOrEqual(wrapped.line * 2);
  expect(wrapped.horizontal).toBeLessThanOrEqual(1); expect(wrapped.vertical).toBeLessThanOrEqual(1);
  await editor.scrollIntoViewIfNeeded();
  await expect(editor, 'Wrapped tag text can be read completely inside the popup').toBeInViewport({ ratio: 1 });
  await expect(wrapping.getByRole('button', { name: '完成', exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: path.join(out, `tag-text-wrapped-${width}.png`) });
  await wrapping.getByRole('button', { name: '完成', exact: true }).click();
  await wrapping.getByRole('button', { name: '选择换行标签', exact: true }).click();
  await expect(editor).toHaveValue(text);
  await editor.fill('购物');
  expect((await editor.boundingBox()).height, 'Clearing extra tags returns to one line').toBe(initial.height);
  await editor.evaluate(node => node.blur());
  await wrapping.locator('.form-tag-input-frame').click({ position: { x: 3, y: 3 } });
  await expect(editor).toBeFocused();
  await wrapping.getByRole('button', { name: '完成', exact: true }).click();
  expect(await page.evaluate(() => window.__miniRequests.filter(request => ['POST', 'PUT', 'DELETE'].includes(request.method)))).toEqual([]);
};
