const fs = require('node:fs');
const path = require('node:path');

// Measure the real shared editor; fixtures supply isolated business data only.
exports.checkTrigger = async function checkTrigger({ composer, expect, label, asset, out, width, scenario }) {
  const row = composer.locator('.progress-domain-row');
  const trigger = row.getByRole('button', { name: '选择记录领域', exact: true });
  await expect(row.locator('.progress-field-label'), 'The domain field is one full-width control').toHaveCount(0);
  await expect(row.locator('button')).toHaveCount(1);
  await expect(trigger).toHaveText(label);
  await expect(trigger.locator('.library-icon')).toHaveCount(1);
  await expect(trigger.locator('.library-icon')).toHaveAttribute('src', asset);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger.locator('.select-chevron.is-expanded')).toHaveCount(0);
  await expect(trigger).toBeInViewport({ ratio: .999 });
  const geometry = await trigger.evaluate(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const row = node.closest('.progress-domain-row'), icon = node.querySelector('.library-icon'), arrow = node.querySelector('.select-chevron');
    const label = node.querySelector('.form-choice-label');
    const range = document.createRange(); range.selectNodeContents(label);
    const lines = [...range.getClientRects()].map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }));
    return { row: box(row), trigger: box(node), icon: box(icon), arrow: box(arrow), label: box(label), lines,
      font: parseFloat(getComputedStyle(label).fontSize), textOverflow: getComputedStyle(label).textOverflow,
      iconLoaded: icon.complete && icon.naturalWidth > 0, overflow: node.scrollWidth - node.clientWidth };
  });
  expect(geometry.trigger.left).toBeCloseTo(geometry.row.left, 1);
  expect(geometry.trigger.right).toBeCloseTo(geometry.row.right, 1);
  expect(geometry.trigger.height).toBeGreaterThanOrEqual(44);
  expect(geometry.font).toBe(14);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.iconLoaded, 'The current domain icon loads').toBe(true);
  expect(geometry.icon.width).toBeGreaterThanOrEqual(18);
  expect(geometry.icon.height).toBeGreaterThanOrEqual(18);
  expect(geometry.label.left - geometry.icon.right).toBeGreaterThanOrEqual(5);
  expect(geometry.arrow.left - geometry.label.right).toBeGreaterThanOrEqual(5);
  expect(geometry.textOverflow, 'Long domain names remain readable').not.toBe('ellipsis');
  expect(geometry.lines.length).toBeGreaterThan(0);
  for (const box of [geometry.icon, geometry.arrow, geometry.label, ...geometry.lines]) {
    expect(box.left).toBeGreaterThanOrEqual(geometry.trigger.left - 1);
    expect(box.right).toBeLessThanOrEqual(geometry.trigger.right + 1);
    expect(box.top).toBeGreaterThanOrEqual(geometry.trigger.top - 1);
    expect(box.bottom).toBeLessThanOrEqual(geometry.trigger.bottom + 1);
  }
  if (out) fs.writeFileSync(path.join(out, `progress-domain-choice-${scenario}-${width}.json`), JSON.stringify(geometry, null, 2));
  return geometry;
};

exports.checkMenu = async function checkMenu({ composer, expect, options, selected }) {
  const trigger = composer.getByRole('button', { name: '选择记录领域', exact: true });
  await trigger.click();
  const panel = composer.locator('.form-popover-panel');
  await expect(panel).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(trigger.locator('.select-chevron.is-expanded')).toHaveCount(1);
  await expect(panel.locator('.form-option')).toHaveCount(options.length);
  const geometry = await panel.evaluate(node => {
    const r = node.getBoundingClientRect(), a = node.closest('.entry-composer').querySelector('.progress-domain-row button').getBoundingClientRect();
    const v = document.querySelector('.preview-content').getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, gap: r.top >= a.bottom ? r.top - a.bottom : a.top - r.bottom, viewport: { left: v.left, right: v.right, top: v.top, bottom: v.bottom } };
  });
  expect(geometry.gap, 'Options remain adjacent to the horizontal domain selector').toBeCloseTo(8, 0);
  expect(geometry.left).toBeGreaterThanOrEqual(geometry.viewport.left - 1);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport.right + 1);
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewport.top - 1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport.bottom + 1);
  for (const [label, asset] of options) {
    const option = panel.getByRole('button', { name: `记录到${label}`, exact: true });
    await expect(option).toHaveText(label);
    await expect(option).toHaveAttribute('aria-pressed', String(label === selected));
    await expect(option.locator('.library-icon')).toHaveCount(1);
    await expect(option.locator('.library-icon')).toHaveAttribute('src', asset);
    await option.scrollIntoViewIfNeeded();
    // Chromium's nearest scroll rounds to integer scrollTop, which can leave a
    // fraction of the last row outside a fractional-height viewport. Continue
    // scrolling inside the actual options area as a user can, then keep the
    // strict visibility check; never move the panel or relax its boundary.
    await option.evaluate(node => {
      const scroll = node.closest('.form-popover-scroll'), r = node.getBoundingClientRect(), v = scroll.getBoundingClientRect();
      if (r.bottom > v.bottom) scroll.scrollTop += Math.ceil(r.bottom - v.bottom);
      else if (r.top < v.top) scroll.scrollTop -= Math.ceil(v.top - r.top);
    });
    await expect(option).toBeInViewport({ ratio: .999 });
    const content = await option.evaluate(node => {
      const r = node.getBoundingClientRect(), icon = node.querySelector('.library-icon'), image = icon.getBoundingClientRect();
      const label = node.querySelector('.form-choice-label'), range = document.createRange(); range.selectNodeContents(label);
      const lines = [...range.getClientRects()].map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }));
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height, iconLoaded: icon.complete && icon.naturalWidth > 0,
        icon: { left: image.left, right: image.right, top: image.top, bottom: image.bottom, width: image.width }, lines, overflow: node.scrollWidth - node.clientWidth };
    });
    expect(content.height).toBeGreaterThanOrEqual(40);
    expect(content.iconLoaded, `${label} uses its existing loaded domain icon`).toBe(true);
    expect(content.icon.width).toBeGreaterThanOrEqual(18);
    expect(content.lines.length).toBeGreaterThan(0);
    expect(content.overflow).toBeLessThanOrEqual(1);
    for (const box of [content.icon, ...content.lines]) {
      expect(box.left).toBeGreaterThanOrEqual(content.left - 1);
      expect(box.right).toBeLessThanOrEqual(content.right + 1);
      expect(box.top).toBeGreaterThanOrEqual(content.top - 1);
      expect(box.bottom).toBeLessThanOrEqual(content.bottom + 1);
    }
    for (const line of content.lines) expect(line.left - content.icon.right).toBeGreaterThanOrEqual(5);
  }
  return panel;
};

exports.dismissOutside = async function dismissOutside({ composer, expect, label }) {
  const trigger = composer.getByRole('button', { name: '选择记录领域', exact: true });
  await composer.locator('.form-popover-backdrop').click({ position: { x: 8, y: 8 } });
  await expect(composer.locator('.form-popover-panel')).toHaveCount(0);
  await expect(composer).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger.locator('.select-chevron.is-expanded')).toHaveCount(0);
  await expect(trigger).toHaveText(label);
};
