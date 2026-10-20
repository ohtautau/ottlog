/* Reproduce native keyboard avoidance offsets through the isolated browser adapter. */
const confirmUnsavedClose = require('./confirm-unsaved-close.cjs');

module.exports = async ({ page, origin, width, expect }) => {
  await page.goto(`${origin}/?home-creation-scroll-${width}#/pages/index/index`);
  const root = () => page.locator('.page-scroll').first();
  const top = () => root().evaluate(node => node.scrollTop);
  const composer = () => page.locator('.entry-composer');
  const capture = () => page.getByRole('textbox', { name: '创建内容', exact: true });
  await expect(capture()).toBeVisible();
  await page.waitForTimeout(180);
  const boundary = await page.locator('#page-more').evaluate(node => {
    const scroll = node.closest('.page-scroll');
    return node.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
  });
  const keyboardOffset = boundary * 0.7;
  // Browsers do not emulate the WeChat keyboard. Inject its background scroll offset.
  const displace = async () => {
    await root().evaluate((node, offset) => { node.scrollTop = offset; }, keyboardOffset);
    await page.waitForTimeout(260);
    expect(Math.abs(await top() - keyboardOffset), 'Keyboard avoidance must not trigger page-two snapping').toBeLessThan(2);
  };
  const firstScreen = async () => {
    await expect.poll(async () => Math.abs(await top()), 'Closing creation restores the first screen').toBeLessThan(2);
    await page.waitForTimeout(700);
    expect(await top(), 'No delayed snap after keyboard dismissal').toBeLessThan(2);
  };
  for (const [index, kind] of ['备忘', '进展', '备忘'].entries()) {
    await capture().fill(`底部创建 ${kind} ${width}-${index}`);
    await displace();
    if (index % 2) await capture().press('Enter');
    else await page.getByRole('button', { name: '创建', exact: true }).click();
    await composer().getByRole('button', { name: `创建类型：${kind}`, exact: true }).click();
    await displace();
    await composer().getByRole('button', { name: kind === '备忘' ? '创建便签' : '保存记录', exact: true }).click();
    await expect(composer()).toHaveCount(0);
    await expect(page).toHaveURL(/#\/pages\/index\/index$/);
    await firstScreen();
  }
  await capture().fill('取消创建仍留在首屏');
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await displace();
  await composer().getByRole('button', { name: '关闭编辑', exact: true }).click();
  await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  await firstScreen();
  // Restoring the background must preserve the directory when that was the origin.
  const touch = { identifier: 1, clientX: 100, clientY: 300 };
  const swipe = async (direction, destination) => {
    await root().dispatchEvent('touchstart', { touches: [touch] });
    await root().dispatchEvent('touchmove', { touches: [{ ...touch, clientY: direction === 'up' ? 190 : 410 }] });
    await root().evaluate((node, offset) => { node.scrollTop = offset; }, destination);
    await root().dispatchEvent('touchend', { touches: [], changedTouches: [touch] });
    await page.waitForTimeout(330);
  };
  await swipe('up', 20);
  await expect.poll(async () => Math.abs(await top() - boundary), 'User swipes still advance to the directory').toBeLessThan(2);
  await page.getByRole('button', { name: '操作：创建便签', exact: true }).click();
  await root().evaluate(node => { node.scrollTop = 0; });
  await composer().getByRole('button', { name: '关闭编辑', exact: true }).click();
  await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  await expect.poll(async () => Math.abs(await top() - boundary), 'Directory creation returns to its original screen').toBeLessThan(2);
  await page.waitForTimeout(700);
  await swipe('down', boundary - 20);
  await firstScreen();
  await capture().focus(); await displace();
  await capture().evaluate(node => node.blur());
  await firstScreen();
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await composer().getByRole('button', { name: '创建类型：任务', exact: true }).click();
  await composer().getByPlaceholder('准备做什么？').fill('任务继续跳转待办');
  await composer().getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page).toHaveURL(/#\/pages\/todos\/index$/);
  await expect(page.locator('.todo-sheet')).toHaveCount(0);
  await page.evaluate(() => { location.hash = '#/pages/index/index'; });
  await expect(capture()).toBeVisible(); await firstScreen();
  console.log(`${width}: keyboard offsets, repeated memo/progress creation, close, directory origin and bidirectional swipes passed`);
};
