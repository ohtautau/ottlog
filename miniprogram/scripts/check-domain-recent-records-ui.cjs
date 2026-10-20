const path = require('node:path');
const { png } = require('./toolbar-summary-fixtures.cjs');

module.exports = async function checkDomainRecentRecords({ page, origin, out, width, expect }) {
  await require('./check-domain-uncategorized-ui.cjs')({ page, origin, out, width, expect });
  const stamp = new Date(2026, 9, 7, 12), start = new Date(2026, 9, 6, 8).getTime();
  await page.clock.install({ time: stamp });
  const makeDomain = (id, name) => ({ id, name, iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] });
  const seed = { version: 1, domains: [makeDomain('work', '工作'), makeDomain('life', '生活'), makeDomain('mind', '心理'), ...Array.from({ length: 7 }, (_, index) => makeDomain(`extra-${index}`, `附加领域${index + 1}`))], completedGoals: [] };
  const activeGoal = (id, content) => ({ id, content, status: 'active', createdAt: new Date(start).toISOString() });
  seed.domains[0].shortTermGoal = activeGoal('active-short', '完成主卡的短期工作目标');
  seed.domains[0].longTermGoal = activeGoal('active-long', '这个长期目标只应在详情显示');
  seed.completedGoals = [{ ...activeGoal('completed-short', '生活历史短期目标'), status: 'completed', domainId: 'life', kind: 'shortTerm', completedAt: new Date(start + 1000).toISOString() }];
  for (let index = 0; index < 16; index++) {
    const domain = seed.domains[index % 3], kind = index % 2 ? 'negative' : 'positive';
    const record = { id: `r${String(index).padStart(2, '0')}`, content: index === 14 ? `**最近正记录**\n\n${'完整长文与 Markdown 段落。'.repeat(120)}` : index === 15 ? '' : `混合记录${index}`, createdAt: new Date(index === 15 ? stamp.getTime() + 86400000 : start + Math.floor(index / 2) * 60000).toISOString(), ...(index === 15 ? { images: [{ id: 'image-only', dataUrl: png }] } : {}) };
    domain[`${kind}Records`].push(record);
  }
  seed.domains[0].positiveRecords.find(record => record.id === 'r12').content = '第一行\n第二行';
  seed.domains[1].positiveRecords.find(record => record.id === 'r10').content = '随可用宽度自然换行的完整记录。'.repeat(12);
  const expected = ['r15', 'r13', 'r11', 'r09', 'r07', 'r14', 'r12', 'r10', 'r08', 'r06'];
  const panel = () => page.locator('.domains-recent-records');
  const scroll = (kind = 'positive') => panel().locator(`.is-${kind} .domain-record-scroll`);
  const rows = () => panel().locator('.domains-recent-record');
  const row = id => panel().locator(`#domain-recent-${id}`);
  const order = () => rows().evaluateAll(nodes => nodes.map(node => node.dataset.recordId));
  const firstGrid = () => page.locator('.domain-first-grid');
  const outerScroll = () => page.locator('.page-scroll');
  const cardScroll = () => page.locator('.domain-entry-scroll');
  const fixedBounds = () => page.locator('.domains-page-toolbar,.domains-recent-records').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
  const saved = () => page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-tool-v1:guest:domains').data);
  async function fresh(suffix, state = seed) {
    await page.goto(`${origin}/?domain-recent-${suffix}-${width}#/pages/posts/index`);
    await page.evaluate(state => {
      localStorage.clear(); window.__miniFixture.persistEntryTools = true;
      window.__miniFixture.guestToolStates = { domains: state, reminders: { version: 1, items: [], done: {} } };
      for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
      location.hash = '#/pages/domains/index';
    }, state);
  }
  async function cardGeometry() {
    return page.locator('.domain-entry-shell:not(.domain-create-shell)').evaluateAll(nodes => nodes.map(node => {
      const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
      return { id: node.id, card: box(node), innerHeight: box(node.querySelector('.domain-entry')).height, parts: ['.domain-progress-icon', '.domain-progress-name', '.domain-progress-card-goal'].map(selector => box(node.querySelector(selector))) };
    }));
  }
  await fresh('mixed');
  await expect(rows()).toHaveCount(10); expect(await order()).toEqual(expected);
  await require('./check-domain-record-height.cjs')({ rows: rows(), expect });
  expect(await saved(), 'Reading the combined history leaves both original signed arrays intact').toEqual(seed);
  await expect(page.locator('#domain-entry-work .domain-progress-card-goal .domain-progress-goal-content')).toHaveText(seed.domains[0].shortTermGoal.content);
  await expect(page.locator('#domain-entry-life .domain-progress-card-goal')).toContainText('生活历史短期目标');
  await expect(page.locator('#domain-entry-life .domain-progress-card-goal .domain-progress-goal-status')).toHaveText('已完成');
  await expect(page.locator('#domain-entry-mind .domain-progress-card-goal .domain-progress-goal-content')).toHaveText('未设置');
  await expect(page.locator('.domain-entry .domain-progress-long-goal,.domain-entry .domain-progress-goals')).toHaveCount(0);
  const goalSpacing = await page.locator('#domain-entry-work .domain-progress-card-goal').evaluate(node => {
    const goal = node.getBoundingClientRect(), text = node.querySelector('.domain-progress-goal-content').getBoundingClientRect(), style = getComputedStyle(node);
    return { textTop: text.top - goal.top, textBottom: goal.bottom - text.bottom, lines: text.height / parseFloat(getComputedStyle(node.querySelector('.domain-progress-goal-content')).lineHeight), borderWidth: parseFloat(style.borderTopWidth) };
  });
  expect(goalSpacing.textTop, 'The short goal leaves a little more breathing room below its divider').toBeGreaterThanOrEqual(8);
  expect(goalSpacing.textBottom, 'The short goal includes a small bottom inset').toBeGreaterThanOrEqual(2);
  expect(goalSpacing.lines, 'The added spacing keeps the short goal on a single line').toBeLessThanOrEqual(1.05);
  expect(goalSpacing.borderWidth).toBe(1);
  const before = await cardGeometry();
  for (const item of before) { expect(item.innerHeight).toBeGreaterThanOrEqual(40); expect(item.card.height).toBeCloseTo(item.innerHeight + 2, 1); }
  await expect(panel().locator('.section-title,.domain-record-add,.domains-recent-meta'), 'Recent records show content without headings or domain metadata').toHaveCount(0);
  const panelHeight = (await panel().boundingBox()).height;
  const checkViewport = async ({ safeArea = 0 } = {}) => {
    const geometry = await page.locator('.domains-index').evaluate((node, safeArea) => {
      const bounds = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const viewport = document.querySelector('.preview-content').getBoundingClientRect(), recent = node.querySelector('.domains-recent-records'), grid = node.querySelector('.domain-first-grid'), gridBounds = bounds(grid), outer = node.closest('.page-scroll');
      const cards = [...outer.querySelectorAll('.domain-entry-shell:not(.domain-create-shell)')].map(card => ({ ...bounds(card), id: card.id }));
      const fullyVisible = cards.filter(card => card.top >= gridBounds.top - .5 && card.bottom <= gridBounds.bottom + .5);
      const partiallyVisible = cards.filter(card => card.bottom > gridBounds.top + .5 && card.top < gridBounds.bottom - .5 && !fullyVisible.includes(card));
      const first = bounds(node), extra = outer.querySelector('.domain-continuation-grid'), cardWindow = node.querySelector('.domain-entry-scroll');
      return { recent: bounds(recent), grid: gridBounds, first, extra: extra ? bounds(extra) : null, cards, fullyVisible, partiallyVisible, viewportBottom: viewport.bottom - safeArea, outerOverflow: outer.scrollHeight - outer.clientHeight, outerTop: outer.scrollTop, gridTop: grid.scrollTop, bottomPadding: parseFloat(getComputedStyle(node).paddingBottom), cardWindow: bounds(cardWindow), cardOverflow: cardWindow.scrollHeight - cardWindow.clientHeight, cardTop: cardWindow.scrollTop };
    }, safeArea);
    expect(geometry.outerOverflow, 'The domain page has no outer scrolling').toBeLessThanOrEqual(1);
    expect(geometry.cardOverflow, 'Additional domains remain in the independent card window').toBeGreaterThan(40);
    expect(geometry.cardTop).toBe(0);
    expect(geometry.outerTop).toBe(0); expect(geometry.gridTop).toBe(0);
    expect(geometry.recent.bottom, 'Recent content stays above the first domain row').toBeLessThanOrEqual(geometry.grid.top);
    expect(geometry.grid.bottom, 'The full card area avoids the bottom safe area').toBeLessThanOrEqual(geometry.viewportBottom + 1);
    expect(geometry.first.bottom - geometry.grid.bottom, 'Four rows fill the first screen down to the normal bottom inset').toBeCloseTo(geometry.bottomPadding, 0);
    expect(geometry.extra.top, 'Continuation starts below the card window').toBeGreaterThanOrEqual(geometry.cardWindow.bottom - 1);
    expect(geometry.extra.top - geometry.grid.bottom, 'The next row uses the same six-pixel card gap').toBeCloseTo(6, 0);
    expect(geometry.fullyVisible.map(card => card.id), 'Exactly the first eight real domains are fully visible').toEqual(seed.domains.slice(0, 8).map(domain => `domain-entry-${domain.id}`));
    expect(geometry.partiallyVisible, 'The ninth row is completely outside the card viewport').toEqual([]);
    expect(new Set(geometry.fullyVisible.map(card => Math.round(card.left))).size).toBe(2);
    expect(new Set(geometry.fullyVisible.map(card => Math.round(card.top))).size).toBe(4);
    if (!safeArea) expect(geometry.recent.height, 'Recent card height is stable for this viewport').toBeCloseTo(panelHeight, 1);
    expect(geometry.recent.height, 'The recent card is larger than the former compact panel').toBeGreaterThan(width === 375 ? 64 : 96);
    return geometry;
  };
  await checkViewport();
  await page.screenshot({ path: path.join(out, `domain-short-card-goals-${width}.png`) });
  await page.getByRole('button', { name: '排序领域', exact: true }).click();
  expect(await cardGeometry(), 'Sorting preserves card/icon/title/short-goal bounds').toEqual(before);
  await expect(page.locator('#domain-entry-work .domain-progress-card-goal')).toBeHidden();
  for (const button of await page.locator('.domain-entry-actions button').all()) {
    const box = await button.boundingBox(); expect(box.width).toBe(40); expect(box.height).toBe(40);
  }
  await checkViewport();
  await page.getByRole('button', { name: '下移工作领域', exact: true }).click();
  await expect.poll(async () => (await saved()).domains[0].id).toBe('life');
  expect(await order()).toEqual(expected);
  await page.getByRole('button', { name: '上移工作领域', exact: true }).click();
  await expect.poll(async () => (await saved()).domains[0].id).toBe('work');
  await page.getByRole('button', { name: '上移附加领域6领域', exact: true }).scrollIntoViewIfNeeded();
  expect(await cardScroll().evaluate(node => node.scrollTop), 'Sorting actions on the ninth card are reached inside the card window').toBeGreaterThan(0);
  expect(await outerScroll().evaluate(node => node.scrollTop)).toBe(0);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; });
  await page.getByRole('button', { name: '上移附加领域6领域', exact: true }).click();
  const retryMove = page.getByRole('button', { name: '重试领域排序', exact: true });
  await expect(retryMove, 'A failed move below the first screen keeps the retry action visible').toBeInViewport({ ratio: 1 });
  const retryBox = await retryMove.boundingBox();
  expect(retryBox.height).toBe(40); expect(retryBox.width).toBeGreaterThanOrEqual(40);
  expect((await saved()).domains.map(domain => domain.id), 'A failed continuation move has not written a different saved order').toEqual(seed.domains.map(domain => domain.id));
  await expect(page.getByRole('button', { name: '下移附加领域6领域', exact: true }), 'The volatile target prevents a second movement').toBeDisabled();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await retryMove.click();
  await expect.poll(async () => (await saved()).domains[7].id).toBe('extra-5');
  expect((await saved()).domains.map(domain => domain.id), 'Retry persists the same absolute boundary-crossing target exactly once').toEqual([...seed.domains.slice(0, 7).map(domain => domain.id), 'extra-5', 'extra-4', 'extra-6']);
  expect(await firstGrid().locator('.domain-entry-shell:not(.domain-create-shell)').evaluateAll(nodes => nodes.map(node => node.id)), 'A move across the eight-card boundary updates the same visible ordered list').toEqual([...seed.domains.slice(0, 7).map(domain => `domain-entry-${domain.id}`), 'domain-entry-extra-5']);
  expect(await order(), 'Moving a continuation card does not change the combined record history').toEqual(expected);
  await page.getByRole('button', { name: '下移附加领域6领域', exact: true }).click();
  await expect.poll(async () => (await saved()).domains.map(domain => domain.id)).toEqual(seed.domains.map(domain => domain.id));
  await cardScroll().evaluate(node => { node.scrollTop = 0; });
  await page.getByRole('button', { name: '排序领域', exact: true }).click();
  expect(await cardGeometry()).toEqual(before);
  await expect(page.getByRole('button', { name: '管理领域', exact: true })).toHaveCount(0);
  expect(await cardGeometry(), 'Returning to browse keeps the card geometry and visible goals').toEqual(before);
  await expect(page.locator('#domain-entry-work .domain-progress-card-goal')).toBeVisible();
  await expect(page.locator('.domain-entry-actions')).toHaveCount(0);
  await checkViewport();
  const fixedBefore = await fixedBounds();
  const recordPositions = await panel().locator('.domain-record-scroll').evaluateAll(nodes => nodes.map(node => node.scrollTop));
  await cardScroll().hover(); await page.mouse.wheel(0, 320); await page.waitForTimeout(200);
  expect(await cardScroll().evaluate(node => node.scrollTop), 'Wheel gestures move the card window').toBeGreaterThan(0);
  expect(await fixedBounds(), 'Card scrolling keeps the toolbar and recent window fixed').toEqual(fixedBefore);
  expect(await panel().locator('.domain-record-scroll').evaluateAll(nodes => nodes.map(node => node.scrollTop)), 'Card scrolling does not move either recent-record column').toEqual(recordPositions);
  await cardScroll().evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(page.locator('#domain-entry-extra-6')).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: '创建领域', exact: true })).toBeInViewport({ ratio: 1 });
  expect(await cardScroll().evaluate(node => node.scrollTop), 'Additional domains and creation use independent card scrolling').toBeGreaterThan(0);
  await cardScroll().hover(); await page.mouse.wheel(0, 500); await page.waitForTimeout(200);
  expect(await outerScroll().evaluate(node => node.scrollTop), 'The card scroll boundary cannot move the outer page').toBe(0);
  expect(await fixedBounds()).toEqual(fixedBefore);
  expect(await firstGrid().evaluate(node => node.scrollTop), 'The initial eight-card grid is not a nested scroll window').toBe(0);
  await expect(cardScroll()).toHaveCount(1);
  await page.screenshot({ path: path.join(out, `domain-cards-scrolled-${width}.png`) });
  await cardScroll().evaluate(node => { node.scrollTop = 0; });
  if (width === 375) {
    await page.locator('.preview-device').evaluate(node => node.style.setProperty('--preview-safe-area-bottom', '34px'));
    await checkViewport({ safeArea: 34 });
    await page.screenshot({ path: path.join(out, `domain-recent-top-safe-area-${width}.png`) });
    await page.locator('.preview-device').evaluate(node => node.style.removeProperty('--preview-safe-area-bottom'));
  }
  await expect(scroll()).toBeInViewport({ ratio: 1 });
  await expect(panel().locator('.domain-record-scroll')).toHaveCount(2);
  const range = await scroll().evaluate(node => ({ max: node.scrollHeight - node.clientHeight, height: node.clientHeight, overflow: getComputedStyle(node).overflowY }));
  expect(range.height).toBeGreaterThanOrEqual(40); expect(range.height).toBeLessThan(panelHeight); expect(range.max).toBeGreaterThan(300);
  expect(range.overflow).toMatch(/auto|scroll/);
  const outer = page.locator('.page-scroll'), outerBefore = await outer.evaluate(node => node.scrollTop);
  const negativeBefore = await scroll('negative').evaluate(node => node.scrollTop);
  await scroll().evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(row('r06')).toBeInViewport({ ratio: .99 });
  const lastBounds = await row('r06').evaluate(node => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom, scrollTop: node.closest('.domain-record-scroll').getBoundingClientRect().top, scrollBottom: node.closest('.domain-record-scroll').getBoundingClientRect().bottom }));
  expect(lastBounds.top).toBeGreaterThanOrEqual(lastBounds.scrollTop - 1); expect(lastBounds.bottom).toBeLessThanOrEqual(lastBounds.scrollBottom + 1);
  expect(await scroll().evaluate(node => node.scrollTop)).toBeGreaterThan(300);
  expect(await outer.evaluate(node => node.scrollTop), 'Reading older records scrolls inside the window').toBe(outerBefore);
  expect(await cardScroll().evaluate(node => node.scrollTop), 'Reading recent records does not move the domain cards').toBe(0);
  expect(await scroll('negative').evaluate(node => node.scrollTop), 'Positive reading does not move the negative column').toBe(negativeBefore);
  await scroll().hover(); await page.mouse.wheel(0, 500);
  await page.waitForTimeout(200);
  expect(await outer.evaluate(node => node.scrollTop), 'Wheel at the positive boundary does not move the outer continuation').toBe(outerBefore);
  await scroll('negative').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(row('r07')).toBeInViewport({ ratio: .99 });
  expect(await scroll().evaluate(node => node.scrollTop)).toBeGreaterThan(300);
  await scroll('negative').evaluate(node => { node.scrollTop = 0; });
  await scroll().evaluate(node => { node.scrollTop = 0; });
  for (const [id, domainId, kind] of [['r15', 'work', 'negative'], ['r14', 'mind', 'positive'], ['r13', 'life', 'negative']]) {
    await expect(row(id)).toHaveAttribute('data-domain-id', domainId); await expect(row(id)).toHaveAttribute('data-record-kind', kind);
    await expect(row(id).locator('.domains-recent-meta')).toHaveCount(0);
  }
  for (const box of await rows().evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, nestedButtons: node.querySelectorAll('button').length })))) {
    expect(box.width).toBeGreaterThanOrEqual(40); expect(box.nestedButtons).toBe(0);
  }
  await expect(row('r14').locator('.domain-record-plain')).toContainText('**最近正记录**');
  await expect(row('r14').locator('strong')).toHaveCount(0);
  await expect(row('r14').locator('.domain-record-plain')).toHaveCSS('white-space', 'pre-wrap');
  await expect(row('r14').locator('.domain-record-content')).toContainText('完整长文与 Markdown 段落。'.repeat(120));
  const typography = await row('r14').evaluate(node => ({ body: getComputedStyle(node.querySelector('.domain-record-plain')).fontSize, sign: getComputedStyle(node.querySelector('.domain-record-sign')).fontSize, bodyColor: getComputedStyle(node.querySelector('.domain-record-plain')).color, signColor: getComputedStyle(node.querySelector('.domain-record-sign')).color }));
  expect(typography.body).toBe(typography.sign); expect(typography.bodyColor).toBe(typography.signColor);
  const domainName = page.locator('#domain-entry-work .domain-progress-name');
  const outsideFont = await domainName.evaluate(node => getComputedStyle(node).fontSize);
  await panel().locator('.domains-recent-list').evaluate(node => node.style.setProperty('--domain-record-font-size', '15px'));
  expect(await panel().locator('.domain-record-add > span,.domain-record-sign,.domain-record-plain').evaluateAll(nodes => [...new Set(nodes.map(node => getComputedStyle(node).fontSize))]), 'A scene font token applies to both signed columns and plain text').toEqual(['15px']);
  expect(await domainName.evaluate(node => getComputedStyle(node).fontSize), 'A local override leaves the surrounding domain cards unchanged').toBe(outsideFont);
  await panel().locator('.domains-recent-list').evaluate(node => node.style.removeProperty('--domain-record-font-size'));
  expect(await row('r14').locator('.domain-record-plain').evaluate(node => getComputedStyle(node).fontSize), 'Removing the override restores the component default').toBe(typography.body);
  await row('r15').locator('.domain-record-images img').click();
  await expect.poll(() => page.evaluate(() => {
    const preview = window.__miniFixture.imagePreview;
    return preview && { count: preview.urls.length, currentIsFirst: preview.current === preview.urls[0], bytes: window.__miniFixture.previewFiles[preview.current] };
  })).toEqual({ count: 1, currentIsFirst: true, bytes: png.split(',')[1] });
  await expect(page.locator('.domain-sheet-record-edit,.entry-composer')).toHaveCount(0);
  await page.screenshot({ path: path.join(out, `domain-recent-records-${width}.png`) });
  await row('r14').locator('.domain-record-plain').click();
  const editor = page.locator('.domain-sheet-record-edit');
  await expect(editor).toBeVisible();
  await expect(editor.locator('.record-edit-meta')).toContainText('创建日期：2026.10.06');
  await expect(editor.getByRole('textbox', { name: '记录内容', exact: true })).toHaveValue(seed.domains[2].positiveRecords.find(record => record.id === 'r14').content);
  for (const button of [editor.getByRole('button', { name: '保存', exact: true }), editor.locator('.record-edit-delete'), editor.getByRole('button', { name: '关闭记录编辑', exact: true })]) {
    const box = await button.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(40); expect(box.height).toBeGreaterThanOrEqual(40);
  }
  await editor.getByRole('textbox', { name: '记录内容', exact: true }).fill('**更新后的最近记录**\n\n原 ID 和创建日期保留');
  await editor.getByRole('button', { name: '保存', exact: true }).click();
  await expect(editor).toHaveCount(0); await expect(row('r14').locator('.domain-record-plain')).toHaveText('**更新后的最近记录**\n\n原 ID 和创建日期保留');
  expect(await order()).toEqual(expected);
  const edited = await saved(), originalRecord = seed.domains[2].positiveRecords.find(record => record.id === 'r14');
  const actualRecord = edited.domains[2].positiveRecords.find(record => record.id === 'r14');
  expect(actualRecord).toEqual({ ...originalRecord, content: '**更新后的最近记录**\n\n原 ID 和创建日期保留' });
  expect(edited.domains[0]).toEqual(seed.domains[0]); expect(edited.domains[1]).toEqual(seed.domains[1]);
  await scroll().evaluate(node => { node.scrollTop = 0; });
  await row('r15').locator('.domain-record-sign').click();
  await expect(editor).toBeVisible(); await expect(editor.locator('.memo-image')).toHaveCount(1);
  await editor.locator('.record-edit-delete').click(); await expect(editor).toHaveCount(0);
  await expect(rows()).toHaveCount(10); expect(await order()).toEqual(['r13', 'r11', 'r09', 'r07', 'r05', 'r14', 'r12', 'r10', 'r08', 'r06']);
  await page.reload(); await expect(rows()).toHaveCount(10); await expect(row('r14').locator('.domain-record-plain')).toHaveText('**更新后的最近记录**\n\n原 ID 和创建日期保留');
  expect((await saved()).domains[0].negativeRecords.some(record => record.id === 'r15')).toBe(false);

  await fresh('empty', { version: 1, domains: [makeDomain('work', '工作')], completedGoals: [] });
  await expect(panel()).toBeVisible(); await expect(panel().locator('.domains-recent-empty')).toHaveText('暂无记录'); await expect(panel().locator('.domain-record-scroll')).toHaveCount(0);
  expect((await panel().boundingBox()).height, 'Empty recent content does not resize the panel').toBeCloseTo(panelHeight, 1);
  await expect(page.locator('.domain-entry-shell:not(.domain-create-shell):not(.domain-uncategorized-shell)'), 'A short domain list does not fabricate ordinary placeholders').toHaveCount(1);
  await expect(page.locator('.domain-continuation-grid .domain-uncategorized-shell')).toHaveCount(1);
  await fresh('accounts');
  const account = (id, text) => ({ version: 1, domains: [{ ...makeDomain('work', '工作'), positiveRecords: [{ id, content: text, createdAt: new Date(start).toISOString() }] }], completedGoals: [] });
  await page.evaluate(({ a, b }) => {
    window.__miniFixture.accountToolStates = { 'recent-a': { domains: a }, 'recent-b': { domains: b }, 'recent-invalid': { domains: { version: 99, domains: [], completedGoals: [] } } };
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'recent-a', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session');
  }, { a: account('a-private', '账号甲私密正记录'), b: account('b-private', '账号乙私密正记录') });
  await expect(rows()).toHaveCount(1); await expect(row('a-private')).toContainText('账号甲私密正记录');
  await row('a-private').locator('.domain-record-content').click(); await expect(editor).toBeVisible();
  await editor.getByRole('textbox', { name: '记录内容', exact: true }).fill('账号甲未保存的编辑');
  await page.evaluate(() => {
    window.__miniFixture.deferToolReads = ['domains']; window.__miniFixture.pendingToolReads = [];
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'recent-b', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session');
  });
  await expect.poll(() => page.evaluate(() => window.__miniFixture.pendingToolReads.length)).toBeGreaterThan(0);
  await expect(panel()).toHaveCount(0); await expect(editor).toHaveCount(0);
  await page.evaluate(() => { window.__miniFixture.deferToolReads = []; for (const read of window.__miniFixture.pendingToolReads.splice(0)) read.resolve(); });
  await expect(rows()).toHaveCount(1); await expect(row('b-private')).toContainText('账号乙私密正记录'); await expect(row('a-private')).toHaveCount(0);
  await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: true, userName: 'recent-invalid', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
  await expect(page.locator('.notice')).toContainText('领域数据暂不可用'); await expect(panel()).toHaveCount(0);
  await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
  await expect(rows()).toHaveCount(10); expect(await order()).toEqual(expected); expect(await saved()).toEqual(seed);
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method === 'PUT'))).toEqual([]);
  await require('./check-domain-detail-scroll-ui.cjs')({ page, origin, out, width, expect });
};
