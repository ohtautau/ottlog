const path = require('node:path');
const fs = require('node:fs');

async function snapshot(control) {
  return control.evaluate(node => {
    const rect = node.getBoundingClientRect(), style = getComputedStyle(node), range = document.createRange();
    range.selectNodeContents(node);
    return { text: node.textContent, width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      font: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight), color: style.color, background: style.backgroundColor,
      opacity: Number(style.opacity), radius: style.borderTopLeftRadius, overflow: node.scrollWidth - node.clientWidth,
      textBoxes: [...range.getClientRects()].filter(box => box.width > 0 && box.height > 0).map(box => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom })) };
  });
}

function completeLabel(metrics, context, expect) {
  expect(metrics.overflow, `${context}: full label does not overflow`).toBeLessThanOrEqual(1);
  for (const box of metrics.textBoxes) {
    expect(box.left, `${context}: text begins inside control`).toBeGreaterThanOrEqual(metrics.left - 1);
    expect(box.right, `${context}: text ends inside control`).toBeLessThanOrEqual(metrics.right + 1);
    expect(box.top, `${context}: text is above lower boundary`).toBeGreaterThanOrEqual(metrics.top - 1);
    expect(box.bottom, `${context}: text remains below upper boundary`).toBeLessThanOrEqual(metrics.bottom + 1);
  }
}

function rgba(value) {
  const values = value.match(/[\d.]+/g).map(Number);
  return [...values.slice(0, 3), values[3] ?? 1];
}
function composite(front, back) { return front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3])); }
function contrast(foreground, background) {
  const luminance = color => color.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
function overlayContrast(metrics, photo) {
  const background = composite(rgba(metrics.background), photo), text = composite(rgba(metrics.color), background);
  return contrast(composite([...text, metrics.opacity], photo), composite([...background, metrics.opacity], photo));
}

async function checkOverlayFeedback({ page, button, photo, context, expect, disabled = false }) {
  await button.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const base = await snapshot(button);
  const readable = async state => {
    const metrics = await snapshot(button);
    expect(metrics.width, `${context} ${state}: touch width`).toBeGreaterThanOrEqual(40);
    expect(metrics.height, `${context} ${state}: touch height`).toBeGreaterThanOrEqual(40);
    const radius = parseFloat(metrics.radius) * (metrics.radius.endsWith('%') ? metrics.width / 100 : 1);
    expect(radius, `${context} ${state}: round image action`).toBeCloseTo(metrics.width / 2, 1);
    expect(overlayContrast(metrics, photo), `${context} ${state}: legible over image background`).toBeGreaterThanOrEqual(4.5);
    for (const key of ['width', 'height']) expect(metrics[key], `${context} ${state}: feedback keeps geometry`).toBeCloseTo(base[key], 1);
    return metrics;
  };
  await readable('default');
  await button.hover({ force: disabled });
  const hover = await readable('hover');
  if (disabled) expect(hover.background, `${context}: disabled action does not highlight`).toBe(base.background);
  else expect(hover.background, `${context}: enabled action has hover feedback`).not.toBe(base.background);
  await page.mouse.down();
  await readable('pressed');
  await page.mouse.move(0, 0); await page.mouse.up();
  const after = await readable('leave');
  expect(after.background, `${context}: leaving restores overlay surface`).toBe(base.background);
  // The browser adapter does not synthesize native hoverClass; this exercises
  // its shared CSS class on the real node, separately from the mouse states.
  await button.evaluate(node => node.classList.add('ui-control-pressed'));
  const touch = await readable('native pressed class');
  expect(touch.background, `${context}: native class matches mouse feedback`).toBe(disabled ? base.background : hover.background);
  await button.evaluate(node => node.classList.remove('ui-control-pressed'));
}

module.exports = async function checkButtonContext({ page, origin, out, width, expect }) {
  await page.goto(`${origin}/?button-context-${width}#/pages/button-context-fixture/index`);
  const fixture = page.locator('[data-button-fixture]');
  await expect(fixture).toBeVisible();
  const levels = fixture.locator('[data-button-case="levels"] button');
  const levelMetrics = await Promise.all((await levels.all()).map(snapshot));
  expect(new Set(levelMetrics.map(metrics => `${metrics.color}|${metrics.background}`)).size, 'Role determines distinct visual emphasis').toBe(4);
  for (const metrics of levelMetrics) {
    expect(metrics.height, 'The same explicit size stays compact across levels').toBeCloseTo(levelMetrics[0].height, 1);
    expect(metrics.width, 'Role does not force a different size for identical labels').toBeCloseTo(levelMetrics[0].width, 1);
    completeLabel(metrics, 'Same-size role button', expect);
  }
  const sizeMetrics = await Promise.all((await fixture.locator('[data-button-case="sizes"] button').all()).map(snapshot));
  expect(sizeMetrics.map(metrics => metrics.height)).toEqual([40, 44, 48, 44]);
  expect(sizeMetrics.map(metrics => metrics.font)).toEqual([14, 14, 16, 14]);
  expect(sizeMetrics[3].height, 'Explicit regular size overrides legacy primary compact default').toBe(sizeMetrics[1].height);
  await page.screenshot({ path: path.join(out, `button-context-sizes-${width}.png`) });

  const container = fixture.locator('[data-button-case="dynamic"]'), content = container.locator('.fixture-content'), fill = container.locator('.fixture-fill'), long = container.locator('.fixture-long');
  const narrowContainer = await container.boundingBox(), narrowContent = await snapshot(content), narrowFill = await snapshot(fill), narrowLong = await snapshot(long);
  expect(narrowFill.width, 'Fill button uses available narrow container width').toBeCloseTo(narrowContainer.width, 1);
  expect(narrowContent.width, 'Content button follows its label rather than filling container').toBeLessThan(narrowFill.width);
  completeLabel(narrowLong, 'Long label in narrow container', expect);
  expect(narrowLong.height, 'Long content can grow above its minimum height').toBeGreaterThan(44);
  await fixture.getByRole('button', { name: '切换按钮容器宽度', exact: true }).click();
  const wideContainer = await container.boundingBox(), wideFill = await snapshot(fill), wideContent = await snapshot(content), wideLong = await snapshot(long);
  expect(wideFill.width, 'Fill button responds to increased available width').toBeCloseTo(wideContainer.width, 1);
  expect(wideFill.width).toBeGreaterThan(narrowFill.width);
  expect(wideContent.width, 'Content width is unchanged when its parent grows').toBeCloseTo(narrowContent.width, 1);
  expect(wideLong.height, 'Complete long label needs fewer lines in wider container').toBeLessThan(narrowLong.height);
  expect(wideLong.text, 'Container resizing preserves the complete action label').toBe(narrowLong.text);
  completeLabel(wideLong, 'Long label in expanded container', expect);
  const wrappers = fixture.locator('[data-button-case="wrappers"]');
  const wrapperMetrics = {};
  for (const [selector, height] of [['.create-button', 44], ['.back-button', 48], ['.select-trigger', 48]]) {
    const control = wrappers.locator(selector), metrics = await snapshot(control);
    wrapperMetrics[selector] = metrics;
    expect(metrics.height, `${selector}: explicit size passes through wrapper`).toBe(height);
    expect(metrics.width, `${selector}: fill mode passes through wrapper`).toBe(160);
    completeLabel(metrics, selector, expect);
  }
  expect((await snapshot(wrappers.locator('.ui-choice'))).height, 'Form choices also support explicit contextual size').toBe(44);
  fs.writeFileSync(path.join(out, `button-context-metrics-${width}.json`), JSON.stringify({ width, levels: levelMetrics, sizes: sizeMetrics,
    dynamic: { narrow: { container: narrowContainer, content: narrowContent, fill: narrowFill, long: narrowLong },
      wide: { container: wideContainer, content: wideContent, fill: wideFill, long: wideLong } }, wrappers: wrapperMetrics }, null, 2));

  const danger = fixture.getByRole('button', { name: '移除示例内容', exact: true }), neutral = fixture.getByRole('button', { name: '普通轻量动作', exact: true });
  await page.mouse.move(0, 0);
  const dangerBase = await snapshot(danger), neutralBase = await snapshot(neutral);
  expect(dangerBase.background, 'A local dangerous action can retain lightweight appearance').toBe('rgba(0, 0, 0, 0)');
  expect(dangerBase.color, 'Danger intent retains its meaning independently of appearance').not.toBe(neutralBase.color);
  await danger.hover();
  const dangerHover = await snapshot(danger);
  expect(dangerHover.background, 'Danger lightweight action provides hover feedback').not.toBe(dangerBase.background);
  expect(dangerHover.color).toBe(dangerBase.color);
  await page.mouse.down();
  expect((await snapshot(danger)).color, 'Press retains dangerous meaning').toBe(dangerBase.color);
  await page.mouse.move(0, 0); await page.mouse.up();
  expect((await snapshot(danger)).background).toBe(dangerBase.background);
  const overlays = fixture.locator('[data-button-case="overlay"] button');
  for (const [index, button] of (await overlays.all()).entries()) await checkOverlayFeedback({ page, button, photo: index ? [16, 25, 35] : [255, 255, 255], context: `Overlay ${index} ${width}`, expect });
  await page.screenshot({ path: path.join(out, `button-context-overlay-${width}.png`) });
  await fixture.getByRole('button', { name: '切换示例禁用状态', exact: true }).click();
  await expect(danger).toBeDisabled();
  await danger.hover({ force: true });
  expect((await snapshot(danger)).background, 'Disabled dangerous lightweight control has no highlight').toBe(dangerBase.background);
  const before = await fixture.locator('[data-button-click-count]').textContent();
  await danger.evaluate(node => node.click());
  for (const [index, button] of (await overlays.all()).entries()) {
    await expect(button).toBeDisabled();
    await checkOverlayFeedback({ page, button, photo: index ? [16, 25, 35] : [255, 255, 255], context: `Disabled overlay ${index} ${width}`, expect, disabled: true });
    await button.evaluate(node => node.click());
  }
  expect(await fixture.locator('[data-button-click-count]').textContent(), 'Disabled controls cannot trigger their action').toBe(before);
  const inputCases = fixture.locator('[data-input-case="native-lines"]');
  for (const [size, height] of [['compact', 40], ['regular', 40]]) {
    const input = inputCases.getByRole('spinbutton', { name: `示例${size}分钟`, exact: true });
    await expect(input).toBeDisabled();
    await input.locator('..').click({ position: { x: 2, y: 2 } });
    await expect(input, 'A disabled touch frame cannot focus its native input').not.toBeFocused();
    const geometry = await input.evaluate(node => {
      const line = node.getBoundingClientRect(), frame = node.closest('.single-line-field').getBoundingClientRect(), style = getComputedStyle(node);
      return { frame: frame.height, line: line.height, lineHeight: parseFloat(style.lineHeight), padding: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
        center: (line.top + line.bottom - frame.top - frame.bottom) / 2 };
    });
    expect(geometry.frame, 'Disabled state retains the complete touch frame').toBe(height);
    expect(geometry.line, 'Caller layout cannot replace the native text line geometry').toBe(24);
    expect(geometry.lineHeight).toBe(24); expect(geometry.padding).toBe(0);
    expect(Math.abs(geometry.center), 'Disabled native text remains centered').toBeLessThanOrEqual(1);
  }
};

module.exports.checkOverlayFeedback = checkOverlayFeedback;
