// Real page components, with the browser adapter supplying native scroll offsets.
module.exports = async function checkPageSnap({ page, origin, width, expect, routes }) {
  const root = () => page.locator('.page-scroll').first();
  const top = () => root().evaluate(node => node.scrollTop);
  async function gesture(destination, { horizontal = false, cancel = false, scroller = root(), direction } = {}) {
    const down = direction ? direction === 'down' : destination < await scroller.evaluate(node => node.scrollTop);
    const touch = { identifier: 1, clientX: 120, clientY: 300 };
    await scroller.dispatchEvent('touchstart', { touches: [touch] });
    await page.waitForTimeout(35);
    await scroller.dispatchEvent('touchmove', { touches: [{ ...touch, clientX: horizontal ? 250 : 122, clientY: horizontal ? 305 : down ? 410 : 190 }] });
    await scroller.evaluate((node, value) => { node.scrollTop = value; }, destination);
    await page.waitForTimeout(20);
    await scroller.dispatchEvent(cancel ? 'touchcancel' : 'touchend', { touches: [], changedTouches: [touch] });
    await page.waitForTimeout(330);
  }
  for (const route of routes) {
    await page.goto(`${origin}/?page-snap#/pages/${route}/index${route === 'detail' ? '?slug=preview-0' : ''}`);
    if (route === 'statistics') {
      await page.getByRole('button', { name: '成长统计', exact: true }).click();
      await expect(page.locator('.statistics-growth')).toBeVisible();
      await root().evaluate(node => { node.scrollTop = 0; });
      await gesture(180);
      expect(await top(), `${width}: statistics uses continuous scrolling`).toBeCloseTo(180, 0);
      await gesture(80);
      expect(await top(), `${width}: statistics reverse scroll does not snap`).toBeCloseTo(80, 0);
      continue;
    }
    await expect(page.locator('.screen-scroll-hint')).toHaveCount(0);
    if (['todos', 'daily', 'memos', 'pomodoro'].includes(route)) {
      await expect(page.locator('#page-more')).toHaveCount(0);
      await page.waitForTimeout(180);
      await gesture(90);
      expect(await top(), `${width}: ${route} has no second screen`).toBeLessThan(2);
      continue;
    }
    const ids = ['page-core', 'page-more'];
    for (const id of ids) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await page.waitForTimeout(180);
    const stops = [];
    for (const id of ids) stops.push(await page.locator(`#${id}`).evaluate(node => {
      const scroll = node.closest('.page-scroll');
      return node.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
    }));
    for (let index = 0; index < ids.length - 1; index += 1) {
      const before = stops[index], after = stops[index + 1];
      const label = `${width} ${route} screen ${index + 1}`;
      const near = async (target, reason) => expect(Math.abs(await top() - target), `${label}: ${reason}`).toBeLessThan(2);
      await gesture(before + 90);
      await near(after, 'forward snap');
      await gesture(after - 90);
      await near(before, 'reverse snap');
      await gesture(before + 8);
      await near(after, 'swipe with minimal native scrolling');
      await gesture(after, { direction: 'down' });
      await near(before, 'downward swipe without native scrolling');
      await gesture(before, { direction: 'up' });
      await near(after, 'upward swipe without native scrolling');
      await gesture(after - 8);
      await near(before, 'minimal reverse scroll');
      const back = page.locator(`#${ids[index + 1]} .screen-return-hint`);
      if (route === 'index') await expect(back).toHaveCount(0);
      else expect((await back.textContent()).trim()).toBe('返回');
      await gesture(after, { direction: 'up' });
      await expect.poll(async () => Math.abs(await top() - after)).toBeLessThan(2);
      if (route === 'index') await gesture(before, { direction: 'down' });
      else await back.click();
      await expect.poll(async () => Math.abs(await top() - before)).toBeLessThan(2);
      await gesture(after, { direction: 'up' });
      await expect.poll(async () => Math.abs(await top() - after)).toBeLessThan(2);
    }
    if (route === 'index') {
      // Home now has two stops. Fast swipes, cancellation and horizontal
      // gestures cannot land on the removed overview or between the two screens.
      await gesture(0);
      expect(Math.abs(await top() - stops[0])).toBeLessThan(2);
      await gesture(stops[1]);
      expect(Math.abs(await top() - stops[1])).toBeLessThan(2);
      await gesture(0);
      expect(Math.abs(await top() - stops[0])).toBeLessThan(2);
      await gesture(stops[1] - 10, { horizontal: true });
      expect(Math.abs(await top() - stops[1])).toBeLessThan(2);
      await gesture(0, { cancel: true });
      expect(Math.abs(await top() - stops[0])).toBeLessThan(2);
      await gesture(stops[1]);
      expect(Math.abs(await top() - stops[1])).toBeLessThan(2);
    }
  }
  await page.goto(`${origin}/?page-snap-long#/pages/posts/index`);
  await expect(page.locator('.article-card')).toHaveCount(10);
  const boundary = await page.locator('#page-more').evaluate(node => node.getBoundingClientRect().top - node.closest('.page-scroll').getBoundingClientRect().top);
  await gesture(boundary + 180);
  expect(Math.abs(await top() - boundary)).toBeLessThan(2);
  await gesture(boundary + 200);
  expect(await top()).toBeCloseTo(boundary + 200, 0);
  await gesture(boundary + 80);
  expect(await top()).toBeLessThan(2);
  await gesture(100, { horizontal: true });
  expect(await top()).toBeLessThan(2);
  await root().evaluate(node => { node.scrollTop = 0; });
  await page.waitForTimeout(180);
  await gesture(100, { cancel: true });
  expect(await top()).toBeLessThan(2);
  console.log(`${width}: two-screen home, single-screen todo/habit/memo/pomodoro pages, long-page scrolling and cancelled/horizontal gestures passed`);
};
