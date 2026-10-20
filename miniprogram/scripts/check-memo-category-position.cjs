const path = require('node:path');

module.exports = async function checkMemoCategoryPosition({ page, origin, out, width, expect }) {
  await page.goto(`${origin}/?memo-category-position-${width}#/pages/posts/index`);
  const tags = Array.from({ length: 24 }, (_, index) => index === 12 ? '长期计划与日常生活记录分类' : `分类${String(index + 1).padStart(2, '0')}`);
  const original = await page.evaluate(tags => {
    const stamp = '2026-10-11T00:00:00Z';
    const state = { version: 1, notes: tags.map((tag, index) => ({ id: `category-${index}`, title: `便签${index + 1}`, body: '分类定位回归', color: 'sage', tags: [tag], pinned: false, createdAt: stamp, updatedAt: stamp })) };
    localStorage.clear(); window.__miniFixture.persistEntryTools = true;
    window.__miniFixture.guestToolStates = { memos: state };
    localStorage.setItem('ottlog-mini-tool-v1:guest:memos', JSON.stringify({ data: state, pending: false, revision: 0 }));
    location.hash = '#/pages/memos/index'; return state;
  }, tags);
  const category = page.getByRole('group', { name: '便签分类', exact: true });
  const scroll = category.locator('.page-category-scroll');
  const all = category.getByRole('button', { name: '便签分类：全部', exact: true });
  const option = tag => category.getByRole('button', { name: `便签分类：${tag}`, exact: true });
  const rows = page.locator('.memo-note');
  await expect(category.locator('button')).toHaveCount(25);
  const fixed = await all.boundingBox();
  async function select(tag) {
    await option(tag).evaluate(node => {
      const scroll = node.closest('.page-category-scroll');
      scroll.scrollLeft += node.getBoundingClientRect().left - scroll.getBoundingClientRect().left;
    });
    await option(tag).click();
    await expect(option(tag)).toHaveAttribute('aria-pressed', 'true');
    await expect(rows).toHaveCount(1);
  }
  const contextOffset = () => scroll.evaluate(node => {
    const buttons = [...node.querySelectorAll('button')].map(button => button.getBoundingClientRect());
    return (buttons[4].left + buttons[5].left) / 2 - node.getBoundingClientRect().left;
  });
  await select(tags[6]);
  await expect.poll(async () => Math.abs(await contextOffset()), 'Memo selection uses the habit row\'s one-and-a-half preceding categories').toBeLessThanOrEqual(1);
  await expect(option(tags[6])).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: path.join(out, `memo-category-position-${width}.png`) });
  await scroll.evaluate(node => { node.scrollLeft = node.scrollWidth; });
  await all.click();
  await expect.poll(() => scroll.evaluate(node => node.scrollLeft)).toBeLessThanOrEqual(1);
  await expect(rows).toHaveCount(24);
  await select(tags[6]);
  await expect.poll(async () => Math.abs(await contextOffset()), 'Returning to the same target after a manual swipe re-arms native scrollLeft').toBeLessThanOrEqual(1);
  await select(tags[12]);
  await expect(option(tags[12])).toBeInViewport({ ratio: 1 });
  await expect(option(tags[12])).toHaveText(`#${tags[12]}`);
  await select(tags[23]);
  await expect.poll(() => scroll.evaluate(node => Math.abs(node.scrollWidth - node.clientWidth - node.scrollLeft))).toBeLessThanOrEqual(1);
  await expect(option(tags[23])).toBeInViewport({ ratio: 1 });
  await expect(all).toBeInViewport({ ratio: 1 }); expect(await all.boundingBox()).toEqual(fixed);
  await all.click(); await expect.poll(() => scroll.evaluate(node => node.scrollLeft)).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: '筛选便签', exact: true }).click();
  await page.getByRole('button', { name: `便签标签：${tags[2]}`, exact: true }).click();
  await page.getByRole('button', { name: `便签标签：${tags[18]}`, exact: true }).click();
  await page.getByRole('button', { name: '查看 2 张便签', exact: true }).click();
  for (const tag of [tags[2], tags[18]]) await expect(option(tag)).toHaveAttribute('aria-pressed', 'true');
  await expect(option(tags[18]), 'Multiple filters keep all highlights and reveal the last selected tag').toBeInViewport({ ratio: 1 });
  await expect(rows).toHaveCount(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:memos')).data), 'Category movement is read only').toEqual(original);
  await page.evaluate(original => {
    window.__miniFixture.accountToolStates = { 'category-account': { memos: { ...original, notes: [{ ...original.notes[0], id: 'account-memo', title: '账号便签', tags: ['账号标签'] }] } } };
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'category-account', isAdmin: false };
    window.__miniPreviewControl.emit('ottlog-session');
  }, original);
  await expect(category.locator('button')).toHaveCount(2);
  await expect(option('账号标签')).toBeVisible();
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => scroll.evaluate(node => node.scrollLeft)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method !== 'GET'))).toEqual([]);
};
