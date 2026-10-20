// Measure actual headings inside their page/row containers at every preview size.
module.exports = async function checkSectionTitles(root, expect) {
  const titles = await root.locator('.section-title').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node), box = node.getBoundingClientRect(), parent = node.parentElement.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(node);
    const text = range.getBoundingClientRect();
    return { label: node.textContent, compact: node.classList.contains('section-title-compact'), size: parseFloat(style.fontSize), weight: style.fontWeight,
      lineHeight: parseFloat(style.lineHeight), color: style.color, spacing: style.letterSpacing, align: style.textAlign,
      overflow: node.scrollWidth - node.clientWidth, bottomGap: parseFloat(style.marginBottom),
      left: box.left - parent.left, right: parent.right - box.right,
      textLeft: text.left - box.left, textRight: box.right - text.right };
  }));
  for (const title of titles) {
    expect(title.size, `${title.label}: shared size variant on every screen`).toBe(title.compact ? 12 : 14);
    expect(title.weight, `${title.label}: shared emphasis`).toBe('600');
    expect(title.lineHeight).toBeCloseTo(title.size * 1.4, 2);
    expect(title.color).toBe('rgb(156, 175, 185)');
    expect(title.align).toBe('left');
    expect(['normal', '0px']).toContain(title.spacing);
    expect([0, 6]).toContain(title.bottomGap);
    expect(title.overflow, `${title.label}: full text fits or wraps`).toBeLessThanOrEqual(1);
    for (const key of ['left', 'right', 'textLeft', 'textRight']) expect(title[key], `${title.label}: stays inside its row (${key})`).toBeGreaterThanOrEqual(-1);
  }
  return titles;
};
