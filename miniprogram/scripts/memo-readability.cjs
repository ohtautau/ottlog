/** Measure rendered ink against the actual painted ancestor surfaces. */
async function textReadability(locator) {
  return locator.evaluateAll(nodes => {
    const rgba = value => { const channels = value.match(/[\d.]+/g).map(Number); return [...channels.slice(0, 3), channels[3] ?? 1]; };
    const composite = (front, back) => front.slice(0, 3).map((channel, index) => channel * front[3] + back[index] * (1 - front[3]));
    const luminance = color => color.map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
    return nodes.map(node => {
      const ancestors = []; for (let parent = node; parent; parent = parent.parentElement) ancestors.unshift(parent);
      let background = [255, 255, 255], opacity = 1;
      for (const ancestor of ancestors) { const style = getComputedStyle(ancestor); background = composite(rgba(style.backgroundColor), background); opacity *= Number(style.opacity); }
      const ink = rgba(getComputedStyle(node).color); ink[3] *= opacity;
      const foreground = composite(ink, background), values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      const rect = node.getBoundingClientRect();
      return { text: (node.value ?? node.textContent).trim(), contrast: (values[0] + .05) / (values[1] + .05), width: rect.width, height: rect.height };
    });
  });
}

async function expectReadableText(locator, context, expect, minimumContrast = 4.5) {
  const measurements = await textReadability(locator);
  expect(measurements.length, `${context}: actual text is present`).toBeGreaterThan(0);
  for (const item of measurements) {
    expect(item.text, `${context}: text is not an empty placeholder`).not.toBe('');
    expect(item.width, `${context}: text has usable horizontal space`).toBeGreaterThan(0);
    expect(item.height, `${context}: text is rendered`).toBeGreaterThan(0);
    expect(item.contrast, `${context}: ${item.text.slice(0, 18)} remains readable on its painted background`).toBeGreaterThanOrEqual(minimumContrast);
  }
  return measurements;
}

module.exports = { expectReadableText, textReadability };
