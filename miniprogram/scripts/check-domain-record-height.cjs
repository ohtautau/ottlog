module.exports = async function checkDomainRecordHeight({ rows, expect }) {
  const geometry = await rows.evaluateAll(nodes => nodes.map(node => {
    const body = node.querySelector('.domain-record-content'), text = node.querySelector('.domain-record-plain');
    const style = getComputedStyle(node);
    return {
      height: node.getBoundingClientRect().height,
      contentHeight: Math.max(body.getBoundingClientRect().height, node.querySelector('.domain-record-sign').getBoundingClientRect().height),
      padding: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
      lines: text ? text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight) : 0,
      text: text?.textContent ?? '',
    };
  }));
  for (const row of geometry) {
    expect(row.height, 'Records reserve only their content and original padding, without a blank extra line').toBeCloseTo(row.contentHeight + row.padding, 1);
  }
  expect(geometry.some(row => Math.abs(row.lines - 1) < .05), 'Single-line content remains one line').toBe(true);
  expect(geometry.some(row => Math.abs(row.lines - 2) < .05 && row.text.includes('\n')), 'Explicit two-line content remains two lines').toBe(true);
  expect(geometry.some(row => row.lines > 2 && !row.text.includes('\n')), 'Long unbroken content naturally wraps without truncation').toBe(true);
};
