const assert = require('node:assert/strict');

// Navigate through the real PageScroll touch handlers; removed arrows are not test controls.
async function goToPageSection(page, id = 'page-more') {
  const scroll = page.locator('.page-scroll').first();
  const target = await page.locator(`#${id}`).evaluate(node => {
    const host = node.closest('.page-scroll');
    return node.getBoundingClientRect().top - host.getBoundingClientRect().top + host.scrollTop;
  });
  const start = await scroll.evaluate(node => node.scrollTop);
  if (Math.abs(start - target) < 2) return;
  const touch = { identifier: 1, clientX: 120, clientY: 300 };
  await scroll.dispatchEvent('touchstart', { touches: [touch] });
  await page.waitForTimeout(35);
  await scroll.dispatchEvent('touchmove', { touches: [{ ...touch, clientY: target > start ? 190 : 410 }] });
  await scroll.evaluate((node, value) => { node.scrollTop = value; }, target);
  await page.waitForTimeout(20);
  await scroll.dispatchEvent('touchend', { touches: [], changedTouches: [touch] });
  await page.waitForTimeout(330);
  const actual = await scroll.evaluate(node => node.scrollTop);
  assert.ok(Math.abs(actual - target) < 2, `${id}: gesture must reach section (${actual} vs ${target})`);
}

module.exports = { goToPageSection };
