const path = require('node:path');
const sharp = require('../../web/node_modules/sharp');
const { expectReadableText } = require('./memo-readability.cjs');

module.exports = async function checkMemoList({ page, origin, out, width, expect }) {
  const photo = (await sharp({ create: { width: 240, height: 240, channels: 3, background: '#a9c4e8' } }).png().toBuffer()).toString('base64');
  const titles = ['这一周，想慢慢做好三件事', '周末的散步路线，以及河边慢慢发现的小事', '读书时记下的一句话', '新项目的几个想法', '下次想做的晚餐', '给未来的自己', '出门前的小清单', '把阳台整理成喜欢的样子', ...Array.from({ length: 12 }, (_, i) => `生活里的第 ${i + 1} 个小发现`)];
  const filter = () => page.getByRole('button', { name: '筛选便签', exact: true });
  const create = () => page.locator('.memo-toolbar').getByRole('button', { name: '创建便签', exact: true });
  const rows = () => page.locator('.memo-note');
  const filters = () => page.locator('.memo-filter-sheet');
  const rowTitles = () => page.locator('.memo-note-title').allTextContents();
  async function filterExpanded(expanded) {
    await expect(filter()).toHaveAttribute('aria-expanded', String(expanded));
    await expect(filter().locator('.select-chevron')).toHaveCount(0);
    await expect(filter().locator('.filter-symbol')).toHaveCount(1);
    const geometry = await filter().evaluate(node => {
      const button = node.getBoundingClientRect(), icon = node.querySelector('.filter-symbol').getBoundingClientRect();
      return { width: button.width, height: button.height, x: (icon.left + icon.right - button.left - button.right) / 2, y: (icon.top + icon.bottom - button.top - button.bottom) / 2 };
    });
    expect(geometry.width).toBe(40); expect(geometry.height).toBe(40);
    expect(Math.abs(geometry.x)).toBeLessThanOrEqual(.5); expect(Math.abs(geometry.y)).toBeLessThanOrEqual(.5);
  }
  async function filterLayout() {
    const layout = await filters().evaluate(node => {
      const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
      const scroll = node.querySelector('.form-popover-scroll');
      return { panel: box(node), anchor: box(document.querySelector('.memo-filter-toggle')), viewport: box(document.querySelector('.preview-content')),
        heading: box(node.querySelector('.memo-filter-heading')), scroll: box(scroll), footer: box(node.querySelector('.memo-filter-footer')),
        actions: [...node.querySelectorAll('.memo-filter-footer button')].map(box),
        overflow: Math.max(node.scrollWidth - node.clientWidth, scroll.scrollWidth - scroll.clientWidth) };
    });
    const { panel, anchor, viewport, heading, scroll, footer } = layout;
    const below = panel.top >= anchor.bottom - 1, above = panel.bottom <= anchor.top + 1;
    expect(below || above, `${width}: memo filters stay on one side of their trigger`).toBe(true);
    expect(Math.abs((below ? panel.top - anchor.bottom : anchor.top - panel.bottom) - 8), `${width}: memo filter popover is adjacent to its trigger`).toBeLessThanOrEqual(2);
    expect(panel.left).toBeLessThan(anchor.right);
    expect(panel.right).toBeGreaterThan(anchor.left);
    expect(panel.left).toBeGreaterThanOrEqual(viewport.left - 1);
    expect(panel.right).toBeLessThanOrEqual(viewport.right + 1);
    expect(panel.top).toBeGreaterThanOrEqual(viewport.top - 1);
    expect(panel.bottom).toBeLessThanOrEqual(viewport.bottom + 1);
    expect(heading.top).toBeGreaterThanOrEqual(panel.top - 1);
    expect(scroll.top).toBeGreaterThanOrEqual(heading.bottom - 1);
    expect(scroll.bottom).toBeLessThanOrEqual(footer.top + 1);
    expect(footer.bottom).toBeLessThanOrEqual(panel.bottom + 1);
    expect(layout.overflow).toBeLessThanOrEqual(2);
    expect(layout.actions).toHaveLength(2);
    expect(layout.actions[0].right).toBeLessThanOrEqual(layout.actions[1].left + 1);
    expect(layout.actions[0].right - layout.actions[0].left).toBe(40);
    expect(layout.actions[0].bottom - layout.actions[0].top).toBe(40);
    expect(layout.actions[1].left - layout.actions[0].right).toBe(6);
    expect(layout.actions[0].top).toBe(layout.actions[1].top);
    expect(layout.actions[1].right).toBeCloseTo(footer.right - 12, 0);
    const reset = filters().getByRole('button', { name: '重置便签筛选', exact: true });
    await expect(reset).toHaveText('');
    await expect(reset.locator('.reset-symbol')).toHaveCount(1);
    for (const action of layout.actions) {
      expect(action.top).toBeGreaterThanOrEqual(footer.top - 1);
      expect(action.bottom).toBeLessThanOrEqual(panel.bottom + 1);
    }
    return layout;
  }
  async function apply() {
    await filters().getByRole('button', { name: /^查看 \d+ 张便签$/ }).click();
    await expect(filters()).toHaveCount(0);
    await filterExpanded(false);
  }
  await page.goto(`${origin}/?memo-list-${width}#/pages/index/index`);
  await page.evaluate(({ titles, photo }) => {
    window.__miniFixture.guestToolStates = { memos: { version: 1, notes: titles.map((title, index) => ({
      id: `memo-${index}`, title, body: ['整理工作笔记，给运动留一点时间，认真吃饭。', '沿着河边走走，带上相机和一杯热咖啡。', '不必急着抵达，沿途也有值得记下的风景。', '把复杂的想法，拆成现在就能开始的一小步。'][index % 4],
      color: ['sand', 'blue', 'sage', 'violet', 'rose', 'mint'][index % 6], priority: ['high', 'medium', 'low', 'none', undefined][index % 5], tags: [index % 2 ? '灵感' : '生活'], pinned: index === 0 || index === 6,
      images: index === 1 ? [{ id: 'photo', dataUrl: `data:image/png;base64,${photo}` }] : [],
      createdAt: new Date(Date.parse('2026-09-16T03:00:00Z') - index * 3600000).toISOString(),
      updatedAt: new Date(Date.parse('2026-09-16T03:00:00Z') - index * 3600000).toISOString(),
    })) } };
    location.hash = '#/pages/memos/index';
  }, { titles, photo });
  await expect(rows()).toHaveCount(titles.length);
  expect(await rows().evaluateAll(nodes => new Set(nodes.map(node => getComputedStyle(node).backgroundColor)).size), 'All six saved memo colors appear in the list').toBe(6);
  for (const [selector, name] of [['.memo-note-title', 'titles'], ['.memo-note-body', 'body excerpts'], ['.memo-note-date', 'dates'], ['.memo-note-tag', 'tags']]) {
    const readability = await expectReadableText(rows().locator(selector), `${width}: six-color list ${name}`, expect, 7);
    console.log(`${width}: six-color memo ${name} minimum contrast ${Math.min(...readability.map(item => item.contrast)).toFixed(2)}:1`);
  }
  await expect(rows().locator('.memo-note-meta .memo-note-date')).toHaveCount(titles.length);
  await expect(rows().locator('.memo-note-title-row .memo-note-date')).toHaveCount(0);
  const metadata = await rows().evaluateAll(nodes => nodes.map(node => {
    const card = node.getBoundingClientRect(), meta = node.querySelector('.memo-note-meta').getBoundingClientRect(), date = node.querySelector('.memo-note-date'), rect = date.getBoundingClientRect();
    return { inside: rect.left >= card.left && rect.right <= card.right && rect.top >= meta.top && rect.bottom <= meta.bottom, overflow: date.scrollWidth - date.clientWidth };
  }));
  for (const item of metadata) { expect(item.inside, 'Every date remains in its card auxiliary line').toBe(true); expect(item.overflow, 'Date text is fully readable').toBeLessThanOrEqual(1); }
  const taskPriorityColors = { high: 'rgb(231, 160, 151)', medium: 'rgb(228, 206, 133)', low: 'rgb(153, 184, 236)', none: 'rgb(171, 208, 178)' };
  for (let index = 0; index < titles.length; index++) {
    const priority = ['high', 'medium', 'low', 'none', 'none'][index % 5];
    const note = rows().filter({ has: page.getByRole('button', { name: `查看便签：${titles[index]}`, exact: true }) });
    await expect(note.locator('.habit-priority'), 'Memo corners follow task colors, including legacy records with no priority').toHaveCSS('border-top-color', taskPriorityColors[priority]);
  }
  expect((await rowTitles()).slice(0, 3)).toEqual([titles[0], titles[6], titles[1]]);
  const geometry = await page.evaluate(() => {
    const box = node => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width }; };
    const scroll = document.querySelector('.memo-list-scroll');
    return { viewport: box(document.querySelector('.preview-content')), filter: box(document.querySelector('.memo-filter-toggle')), create: box(document.querySelector('.memo-create')), list: box(scroll),
      rows: [...document.querySelectorAll('.memo-note')].map(box), overflow: scroll.scrollWidth - scroll.clientWidth, scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight };
  });
  expect(Math.abs(geometry.filter.top - geometry.create.top)).toBeLessThanOrEqual(1);
  expect(geometry.filter.right).toBeLessThan(geometry.create.left);
  expect(geometry.list.top).toBeGreaterThanOrEqual(geometry.filter.bottom);
  expect(geometry.list.bottom).toBeLessThanOrEqual(geometry.viewport.bottom);
  expect(geometry.overflow).toBeLessThanOrEqual(2);
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
  await expect(create()).toHaveClass(/create-button/);
  await expect(create().locator('.create-button-label')).toHaveText('创建便签');
  await expect(create().locator('.button-add-symbol')).toHaveAttribute('aria-hidden', 'true');
  const createLayout = await create().evaluate(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height }; };
    const label = node.querySelector('.create-button-label');
    return { button: box(node), symbol: box(node.querySelector('.button-add-symbol')), label: box(label), clipped: label.scrollWidth - label.clientWidth };
  });
  expect(createLayout.button.height, 'The memo creation entry retains a 40px touch target').toBeGreaterThanOrEqual(40);
  expect(createLayout.symbol.right).toBeLessThanOrEqual(createLayout.label.left);
  expect(createLayout.symbol.height).toBeGreaterThan(0);
  expect(createLayout.clipped).toBeLessThanOrEqual(1);
  for (const part of [createLayout.symbol, createLayout.label]) {
    expect(part.left).toBeGreaterThanOrEqual(createLayout.button.left - 1);
    expect(part.right).toBeLessThanOrEqual(createLayout.button.right + 1);
    expect(part.top).toBeGreaterThanOrEqual(createLayout.button.top - 1);
    expect(part.bottom).toBeLessThanOrEqual(createLayout.button.bottom + 1);
  }
  for (let i = 1; i < geometry.rows.length; i++) {
    expect(geometry.rows[i].left).toBeCloseTo(geometry.rows[0].left, 0);
    expect(geometry.rows[i].width).toBeCloseTo(geometry.rows[0].width, 0);
    expect(geometry.rows[i].top).toBeGreaterThanOrEqual(geometry.rows[i - 1].bottom - 1);
  }
  await page.screenshot({ path: path.join(out, `memo-list-${width}.png`) });
  await page.locator('.memo-list-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(page.getByRole('button', { name: `查看便签：${titles.at(-1)}`, exact: true })).toBeInViewport();
  await expect(filter()).toBeInViewport();
  await expect(create()).toBeInViewport();
  expect(await page.locator('.page-scroll').evaluate(node => node.scrollTop)).toBe(0);

  await filterExpanded(false);
  await filter().click();
  await expect(filters()).toBeVisible();
  await filterExpanded(true);
  await filterLayout();
  await page.getByRole('textbox', { name: '搜索便签', exact: true }).fill('河边');
  await apply();
  expect(await rowTitles()).toEqual(titles.filter((_, i) => i % 4 === 1));
  await expect(page.locator('.memo-active-filters')).toContainText('河边');
  const summaryReset = page.locator('.memo-active-filters').getByRole('button', { name: '重置便签筛选', exact: true });
  await expect(summaryReset).toHaveText('');
  await expect(summaryReset.locator('.reset-symbol')).toHaveCount(1);
  const summaryResetBox = await summaryReset.boundingBox();
  expect(summaryResetBox.width).toBe(40); expect(summaryResetBox.height).toBe(40);
  await summaryReset.click();
  await expect(page.locator('.memo-active-filters')).toHaveCount(0);
  await expect(filter()).toHaveAttribute('aria-pressed', 'false');
  await expect(rows()).toHaveCount(titles.length);
  await filter().click();
  await expect(filters()).toBeVisible();
  await filterExpanded(true);
  const layoutBeforeScroll = await filterLayout();
  await page.getByRole('button', { name: '便签标签：灵感', exact: true }).click();
  await page.getByRole('button', { name: '便签颜色：雾蓝', exact: true }).click();
  await expect(filter(), 'Applied filters highlight the shared symbol control').toHaveAttribute('aria-pressed', 'true');
  await filterExpanded(true);
  const scroll = filters().locator('.form-popover-scroll');
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  const scrollState = await scroll.evaluate(node => ({ top: node.scrollTop, excess: node.scrollHeight - node.clientHeight,
    bottom: node.getBoundingClientRect().bottom, lastBottom: node.querySelector('.memo-filter-colors button:last-child').getBoundingClientRect().bottom }));
  if (scrollState.excess > 1) expect(scrollState.top, 'Long filter options can scroll to the final color choice').toBeGreaterThan(0);
  expect(scrollState.lastBottom).toBeLessThanOrEqual(scrollState.bottom + 1);
  const layoutAfterScroll = await filterLayout();
  expect(layoutAfterScroll.heading).toEqual(layoutBeforeScroll.heading);
  expect(layoutAfterScroll.footer).toEqual(layoutBeforeScroll.footer);
  await expect(filters().getByRole('button', { name: /^查看 \d+ 张便签$/ })).toBeInViewport();
  await expect(filters().getByRole('button', { name: '重置便签筛选', exact: true })).toBeInViewport();
  await page.screenshot({ path: path.join(out, `memo-filters-${width}.png`) });
  await apply();
  expect(await rowTitles()).toEqual(titles.filter((_, i) => i % 2 === 1 && i % 6 === 1));
  const expectedMatching = predicate => titles.map((title, index) => ({ title, index })).filter(item => predicate(item.index)).sort((a, b) => Number(b.index === 0 || b.index === 6) - Number(a.index === 0 || a.index === 6) || a.index - b.index).map(item => item.title);
  const beforeMultiselect = await page.evaluate(() => localStorage.getItem('ottlog-mini-tool-v1:guest:memos'));
  await filter().click();
  await page.getByRole('button', { name: '便签标签：生活', exact: true }).click();
  await page.getByRole('button', { name: '便签颜色：麦纸', exact: true }).click();
  for (const name of ['便签标签：生活', '便签标签：灵感', '便签颜色：麦纸', '便签颜色：雾蓝']) await expect(filters().getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['便签标签：全部', '便签颜色：全部']) await expect(filters().getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(filters().getByRole('button', { name: '查看 8 张便签', exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(out, `memo-filter-multiselect-${width}.png`) });
  await apply();
  expect(await rowTitles(), 'Tags use OR, colors use OR, and the groups combine').toEqual(expectedMatching(i => i % 6 === 0 || i % 6 === 1));
  for (const text of ['#生活', '#灵感', '麦纸', '雾蓝']) await expect(page.locator('.memo-active-filters')).toContainText(text);
  await filter().click();
  await expect(filters().getByRole('button', { name: '便签标签：生活', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: '搜索便签', exact: true }).fill('河边');
  await apply();
  expect(await rowTitles(), 'Keyword remains required alongside either selected color').toEqual(expectedMatching(i => i % 4 === 1 && (i % 6 === 0 || i % 6 === 1)));
  await filter().click();
  await page.getByRole('textbox', { name: '搜索便签', exact: true }).fill('');
  await page.getByRole('button', { name: '便签标签：生活', exact: true }).click();
  await apply();
  expect(await rowTitles(), 'Deselecting one tag retains the other tag and both colors').toEqual(expectedMatching(i => i % 2 === 1 && (i % 6 === 0 || i % 6 === 1)));
  await filter().click();
  await page.getByRole('button', { name: '便签颜色：全部', exact: true }).click();
  await expect(filters().getByRole('button', { name: '便签标签：灵感', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await apply();
  expect(await rowTitles()).toEqual(expectedMatching(i => i % 2 === 1));
  await filter().click();
  await page.getByRole('button', { name: '便签标签：全部', exact: true }).click();
  await page.getByRole('button', { name: '便签标签：生活', exact: true }).click();
  await page.getByRole('button', { name: '便签标签：生活', exact: true }).click();
  await page.getByRole('button', { name: '便签颜色：雾蓝', exact: true }).click();
  await page.getByRole('button', { name: '便签颜色：雾蓝', exact: true }).click();
  await expect(filters().getByRole('button', { name: '便签标签：全部', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(filters().getByRole('button', { name: '便签颜色：全部', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '便签标签：生活', exact: true }).click();
  await page.getByRole('button', { name: '便签标签：灵感', exact: true }).click();
  await page.getByRole('button', { name: '便签颜色：麦纸', exact: true }).click();
  await page.getByRole('button', { name: '便签颜色：雾蓝', exact: true }).click();
  await apply();
  await page.getByRole('button', { name: '便签分类：生活', exact: true }).click();
  expect(await rowTitles(), 'The existing category row still chooses a single category').toEqual(expectedMatching(i => i % 2 === 0 && (i % 6 === 0 || i % 6 === 1)));
  expect(await page.evaluate(() => localStorage.getItem('ottlog-mini-tool-v1:guest:memos')), 'Filter changes never write memo records').toBe(beforeMultiselect);
  await filter().click();
  await filters().getByRole('button', { name: '重置便签筛选', exact: true }).click();
  await expect(filters()).toBeVisible();
  await expect(filters().getByRole('textbox', { name: '搜索便签', exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: '便签标签：全部', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '便签颜色：全部', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await apply();
  await expect(filter()).toHaveAttribute('aria-pressed', 'false');
  await filter().click();
  await filters().getByRole('button', { name: '便签颜色：薄荷', exact: true }).click();
  await apply();
  expect(await rowTitles(), 'The sixth color has the same filtering semantics as the existing five').toEqual(expectedMatching(i => i % 6 === 5));
  await expect(page.locator('.memo-active-filters')).toContainText('薄荷');
  await page.screenshot({ path: path.join(out, `memo-list-mint-${width}.png`) });
  await page.locator('.memo-active-filters').getByRole('button', { name: '重置便签筛选', exact: true }).click();
  await expect(rows()).toHaveCount(titles.length);
  await page.getByRole('button', { name: '排序便签', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '排序便签', exact: true })).toBeVisible();
  const sortGeometry = await page.locator('.memo-filter-sort button').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect(), label = node.querySelector('.sort-option-label'), text = label.getBoundingClientRect();
    return { left: rect.left, width: rect.width, top: rect.top, bottom: rect.bottom, height: rect.height, textHeight: text.height, line: parseFloat(getComputedStyle(label).lineHeight), overflow: label.scrollWidth - label.clientWidth };
  }));
  for (let index = 0; index < sortGeometry.length; index++) {
    const button = sortGeometry[index];
    expect(button.width).toBeCloseTo(sortGeometry[0].width, 0); expect(button.left).toBe(sortGeometry[0].left);
    expect(button.height).toBeGreaterThanOrEqual(40); expect(button.textHeight).toBeLessThanOrEqual(button.line + 1); expect(button.overflow).toBeLessThanOrEqual(1);
    if (index) expect(button.top - sortGeometry[index - 1].bottom).toBeCloseTo(6, 0);
  }
  await page.screenshot({ path: path.join(out, `memo-sort-options-${width}.png`) });
  await page.getByRole('button', { name: '便签排序：标题顺序', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '排序便签', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const expected = await page.evaluate(titles => titles.filter((_, i) => i !== 0 && i !== 6).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')), titles);
  expect((await rowTitles()).slice(2)).toEqual(expected);
  await page.getByRole('button', { name: `取消置顶便签：${titles[0]}`, exact: true }).click();
  expect((await rowTitles())[0]).toBe(titles[6]);
  await page.getByRole('button', { name: '管理便签删除', exact: true }).click();
  await page.getByRole('button', { name: `查看便签：${titles[6]}`, exact: true }).click();
  await page.getByRole('button', { name: `编辑便签：${titles[6]}`, exact: true }).click();
  await expect(page.locator('.memo-title-input')).toHaveValue(titles[6]);
  await page.getByRole('button', { name: '关闭便签编辑', exact: true }).click();
  await filter().click();
  await expect(filters()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(filters()).toHaveCount(0);
  await filterExpanded(false);
  await filter().click();
  await page.getByRole('textbox', { name: '搜索便签', exact: true }).fill('找不到的关键词');
  await apply();
  await expect(rows()).toHaveCount(0);
  await expect(page.locator('.memo-list-empty')).toContainText('没有符合条件的便签');
  await create().click();
  await expect(page.locator('.entry-composer')).toBeVisible();
  await expect(page.getByRole('button', { name: '创建类型：备忘', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();

  await page.goto(`${origin}/?memo-empty-${width}#/pages/memos/index`);
  await expect(rows()).toHaveCount(6);
  await page.screenshot({ path: path.join(out, `memo-defaults-${width}.png`) });
  await page.evaluate(() => { location.hash = '#/pages/posts/index'; });
  await page.evaluate(() => { window.__miniFixture.guestToolStates = { memos: { version: 1, notes: [] } }; location.hash = '#/pages/memos/index'; });
  await expect(page.locator('.memo-list-empty')).toContainText('还没有便签');
  await expect(create()).toBeEnabled();
  await page.screenshot({ path: path.join(out, `memo-empty-${width}.png`) });
  await page.getByRole('button', { name: '生成示例便签', exact: true }).click();
  await expect(rows()).toHaveCount(6);
};
