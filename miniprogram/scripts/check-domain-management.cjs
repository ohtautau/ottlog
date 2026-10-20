const path = require('node:path');

module.exports = async function checkDomainManagement({ page, origin, out, width, expect }) {
  await page.goto(`${origin}/?domain-management-${width}#/pages/posts/index`);
  const original = await page.evaluate(() => {
    const names = ['成长', '工作', '英语', '健身', '生活', '心理', '摄影', '未分类'];
    const ids = ['growth', 'work', 'english', 'fitness', 'life', 'mind', 'photo', 'uncategorized'];
    const data = { version: 1, domains: names.map((name, index) => ({ id: ids[index], name, iconId: 'plant', longTermGoal: index === 1 ? { id: 'manage-long', content: '主卡隐藏长期目标', status: 'active', createdAt: '2026-10-01T00:00:00Z' } : null, shortTermGoal: index === 1 ? { id: 'manage-short', content: '写测试', status: 'active', createdAt: '2026-10-01T00:00:00Z' } : null, habits: [], positiveRecords: index === 1 ? [{ id: 'keep-record', content: '原进展内容', createdAt: '2026-10-06T00:00:00Z' }] : [], negativeRecords: [] })), completedGoals: [] };
    const reminders = { version: 1, items: [{ id: 'shared-habit', title: '管理共享习惯', note: '', group: '工作', domainId: 'work', kind: 'plant', minutes: 0, enabled: true, priority: 'none' }, { id: 'legacy-habit', title: '旧名称共享习惯', note: '', group: '工作', kind: 'plant', minutes: 0, enabled: true, priority: 'none' }], done: {}, reflections: [] };
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    window.__miniFixture.guestToolStates = { domains: data, reminders };
    for (const [tool, value] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data: value, pending: false, revision: 0 }));
    window.__miniNotices.length = 0;
    location.hash = '#/pages/domains/index';
    return data;
  });
  const sort = () => page.getByRole('button', { name: '排序领域', exact: true });
  const create = () => page.locator('.domain-create-card');
  const cards = () => page.locator('.domain-entry-shell:not(.domain-create-shell)');
  const firstGrid = () => page.locator('.domain-first-grid');
  const editor = () => page.locator('.domain-definition-sheet');
  const deletion = () => page.locator('.domain-delete-sheet');
  const read = (tool = 'domains') => page.evaluate(tool => JSON.parse(localStorage.getItem(`ottlog-mini-tool-v1:guest:${tool}`)).data, tool);
  const boxes = () => cards().evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { id: node.id, left: box.left, top: box.top, width: box.width, height: box.height }; }));
  const headings = () => cards().evaluateAll(nodes => nodes.map(node => ({ id: node.id, parts: ['.domain-progress-icon', '.domain-progress-name', '.domain-progress-card-goal'].map(selector => { const box = node.querySelector(selector).getBoundingClientRect(); return { left: box.left, top: box.top, width: box.width, height: box.height }; }) })));
  async function openDetail(name) {
    await page.getByRole('button', { name: `打开${name}领域`, exact: true }).click();
    await expect(page.locator('.domain-card')).toHaveCount(1);
    await expect(page.getByRole('button', { name: `编辑${name}领域`, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `删除${name}领域`, exact: true })).toBeVisible();
  }
  async function back() {
    await page.getByRole('button', { name: '返回领域列表', exact: true }).click();
    await expect(sort()).toBeVisible();
  }
  async function exitSorting() {
    if (await sort().getAttribute('aria-pressed') === 'true') await sort().click();
  }
  async function checkDetailActions(name) {
    const edit = page.getByRole('button', { name: `编辑${name}领域`, exact: true });
    const remove = page.getByRole('button', { name: `删除${name}领域`, exact: true });
    const header = page.locator('.domain-detail-toolbar');
    const headerBox = await header.boundingBox(), editBox = await edit.boundingBox(), removeBox = await remove.boundingBox();
    for (const [button, box, symbol] of [[edit, editBox, '.edit-symbol'], [remove, removeBox, '.delete-symbol']]) {
      await expect(button).toHaveText(''); await expect(button.locator(symbol)).toHaveCount(1);
      expect(box.width).toBe(40); expect(box.height).toBe(40);
      expect(box.x).toBeGreaterThanOrEqual(headerBox.x); expect(box.x + box.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 1);
      expect(box.y).toBeGreaterThanOrEqual(headerBox.y); expect(box.y + box.height).toBeLessThanOrEqual(headerBox.y + headerBox.height + 1);
    }
    expect(editBox.x + editBox.width).toBeLessThanOrEqual(removeBox.x);
    expect(editBox.y).toBeCloseTo(removeBox.y, 1);
    const createBox = await page.getByRole('button', { name: '创建记录', exact: true }).boundingBox();
    expect(removeBox.x + removeBox.width).toBeLessThanOrEqual(createBox.x);
    expect(headerBox.x + headerBox.width - createBox.x - createBox.width, 'Creation follows entity actions at the detail header right edge').toBeLessThanOrEqual(2);
    const overlaps = await header.evaluate(node => {
      const back = node.querySelector('[aria-label="返回领域列表"]').getBoundingClientRect();
      return [...node.querySelectorAll('.domain-detail-actions button')].some(button => { const r = button.getBoundingClientRect(); return Math.min(r.right, back.right) - Math.max(r.left, back.left) > .5 && Math.min(r.bottom, back.bottom) - Math.max(r.top, back.top) > .5; });
    });
    expect(overlaps, 'Detail actions do not overlap the return control').toBe(false);
  }
  await expect(cards()).toHaveCount(8);
  const before = await boxes(), headingsBefore = await headings(), controls = await page.locator('.domains-page-toolbar button').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { left: box.left, top: box.top, width: box.width, height: box.height }; }));
  const initialViewport = await firstGrid().evaluate(node => {
    const viewport = node.getBoundingClientRect(), outer = node.closest('.page-scroll'), recent = document.querySelector('.domains-recent-records').getBoundingClientRect();
    return { top: viewport.top, bottom: viewport.bottom, height: viewport.height, recentBottom: recent.bottom, recentHeight: recent.height, outerOverflow: outer.scrollHeight - outer.clientHeight, outerTop: outer.scrollTop };
  });
  expect(initialViewport.recentBottom, 'Recent content is above the card area').toBeLessThanOrEqual(initialViewport.top);
  expect(initialViewport.outerOverflow, 'The domain page remains fixed').toBeLessThanOrEqual(1); expect(initialViewport.outerTop).toBe(0);
  expect(await page.locator('.domain-entry-scroll').evaluate(node => node.scrollHeight - node.clientHeight), 'The system and creation cards remain reachable in the card window').toBeGreaterThan(40);
  const firstCards = before.filter(card => card.id !== 'domain-entry-uncategorized');
  for (const card of firstCards) { expect(card.top).toBeGreaterThanOrEqual(initialViewport.top - 1); expect(card.top + card.height).toBeLessThanOrEqual(initialViewport.bottom + 1); }
  expect(new Set(firstCards.map(card => Math.round(card.top))).size, 'Ordinary domains retain four rows; the system card is on the second screen').toBe(4);
  const remindersBefore = await read('reminders');
  await expect(page.getByRole('button', { name: '管理领域', exact: true }), 'The removed settings mode has no toolbar entry').toHaveCount(0);
  await expect(sort()).toHaveText(''); await expect(sort().locator('.sort-symbol')).toHaveCount(1);
  await expect(sort()).toHaveAttribute('aria-pressed', 'false');
  await expect(create()).toHaveCount(1);
  await expect(page.locator('.domains-page-toolbar button')).toHaveCount(2);
  await expect(page.locator('.domains-page-toolbar').getByRole('button', { name: '创建领域', exact: true })).toHaveCount(0);
  await expect(page.locator('.domains-quick-button')).toHaveCount(0);
  await expect(page.locator('.domains-page-toolbar').getByRole('button', { name: '记录进展', exact: true })).toBeVisible();
  expect(controls[0].left).toBeLessThan(controls[1].left);
  expect(controls[0].width).toBe(40); expect(controls[0].height).toBe(40);
  await expect(page.locator('#domain-entry-work .domain-progress-card-goal')).toContainText('写测试');
  await expect(page.locator('#domain-entry-work .domain-progress-card-goal')).toBeVisible();
  await expect(page.locator('.domain-entry .domain-progress-long-goal,.domain-entry .domain-progress-goals')).toHaveCount(0);
  await sort().click(); await expect(sort()).toHaveAttribute('aria-pressed', 'true');
  expect(await boxes(), 'Entering sorting preserves the adaptive four-row card boundaries').toEqual(before);
  expect(await headings(), 'Entering sorting preserves each icon and title position and size').toEqual(headingsBefore);
  expect(await read(), 'Entering sorting changes no records').toEqual(original);
  await expect(page.locator('#domain-entry-work .domain-progress-card-goal')).toBeHidden();
  await expect(create()).toHaveCount(1); await expect(create()).toBeDisabled();
  await expect(page.locator('.domain-action-options,.domain-move-options')).toHaveCount(0);
  for (const card of await cards().filter({ hasNot: page.locator('.domain-progress-name', { hasText: /^未分类$/ }) }).all()) {
    const box = await card.boundingBox();
    await expect(card.locator('.domain-entry-actions button'), 'Each sorting card has only up and down actions').toHaveCount(2);
    await expect(card.locator('.more-symbol,.edit-symbol,.delete-symbol')).toHaveCount(0);
    const content = await card.locator('.domain-progress-icon,.domain-progress-name').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; }));
    for (const button of await card.locator('.domain-entry-actions button').all()) {
      const control = await button.boundingBox();
      expect(control.width).toBe(40); expect(control.height).toBe(40); await expect(button).toHaveText('');
      expect(control.x).toBeGreaterThanOrEqual(box.x); expect(control.x + control.width).toBeLessThanOrEqual(box.x + box.width);
      expect(control.y).toBeGreaterThanOrEqual(box.y); expect(control.y + control.height).toBeLessThanOrEqual(box.y + box.height);
      for (const part of content) {
        const overlapWidth = Math.min(control.x + control.width, part.x + part.width) - Math.max(control.x, part.x);
        const overlapHeight = Math.min(control.y + control.height, part.y + part.height) - Math.max(control.y, part.y);
        expect(overlapWidth > .5 && overlapHeight > .5, 'Sorting touch areas do not overlap icon or title').toBe(false);
      }
    }
    const buttons = await card.locator('.domain-entry-actions button').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
    expect(buttons[0].y).toBe(buttons[1].y); expect(buttons[1].x - buttons[0].right).toBeCloseTo(2, 0);
    expect(box.x + box.width - buttons[1].right).toBeCloseTo(5, 0); expect(box.y + box.height - buttons[1].bottom).toBeCloseTo(5, 0);
    await expect(card.locator('.sort-symbol-up')).toHaveCount(1); await expect(card.locator('.sort-symbol-down')).toHaveCount(1);
  }
  await expect(page.getByRole('button', { name: '上移成长领域', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '下移摄影领域', exact: true })).toBeDisabled();
  await expect(page.locator('.domain-uncategorized-shell .domain-entry-actions')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '编辑工作领域', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '删除工作领域', exact: true })).toHaveCount(0);
  await page.screenshot({ path: path.join(out, `domain-sorting-${width}.png`) });
  await page.getByRole('button', { name: '上移工作领域', exact: true }).click();
  await expect.poll(async () => (await read()).domains[0].id).toBe('work');
  await expect(page.getByRole('button', { name: '上移工作领域', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '下移工作领域', exact: true }).click(); expect(await read()).toEqual(original);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; });
  await page.getByRole('button', { name: '上移工作领域', exact: true }).click();
  await expect(page.getByRole('button', { name: '重试领域排序', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '上移工作领域', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '下移工作领域', exact: true })).toBeDisabled();
  expect(await cards().evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))).toEqual(before.map(box => box.height));
  expect(await read()).toEqual(original);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await page.getByRole('button', { name: '重试领域排序', exact: true }).click();
  expect((await read()).domains.slice(0, 2).map(item => item.id)).toEqual(['work', 'growth']);
  await page.getByRole('button', { name: '下移工作领域', exact: true }).click(); expect(await read()).toEqual(original);
  await page.locator('.page-scroll').evaluate(node => { node.scrollTop = 0; });
  await sort().click(); await expect(sort()).toHaveAttribute('aria-pressed', 'false');
  expect(await boxes()).toEqual(before); expect(await headings()).toEqual(headingsBefore);
  await expect(page.locator('#domain-entry-work .domain-progress-card-goal')).toBeVisible();
  await expect(page.locator('.domain-progress-track')).toHaveCount(8);
  await expect(sort()).toHaveAttribute('aria-pressed', 'false');
  expect(await boxes(), 'Returning to browse preserves card boundaries').toEqual(before);
  expect(await headings(), 'Returning to browse preserves icon and name geometry').toEqual(headingsBefore);
  await expect(create()).toHaveCount(1); await expect(create()).toHaveText(''); await expect(create().locator('.button-add-symbol')).toHaveCount(1);
  const creationBounds = await create().boundingBox();
  expect(creationBounds.y, 'Seven ordinary domains leave the eighth first-screen slot for creation').toBeGreaterThanOrEqual(initialViewport.top);
  expect(creationBounds.y + creationBounds.height).toBeLessThanOrEqual(initialViewport.bottom + 1);
  expect((await page.locator('.domains-recent-records').boundingBox()).height, 'Modes do not resize the recent panel').toBe(initialViewport.recentHeight);
  await expect(page.locator('.domain-entry-actions,.domain-action-options,.domain-move-options')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '打开工作领域', exact: true }), 'Browse keeps the detail entry usable').toBeEnabled();
  expect(await page.locator('.domains-page-toolbar button').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { left: box.left, top: box.top, width: box.width, height: box.height }; }))).toEqual(controls);
  await sort().click(); await expect(sort()).toHaveAttribute('aria-pressed', 'true'); await expect(create()).toHaveCount(1); await expect(create()).toBeDisabled();
  await sort().click(); await expect(sort()).toHaveAttribute('aria-pressed', 'false');
  await page.screenshot({ path: path.join(out, `domain-management-${width}.png`) });
  await openDetail('未分类'); await checkDetailActions('未分类');
  await expect(page.getByRole('button', { name: '编辑未分类领域', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '删除未分类领域', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '删除未分类领域', exact: true }).evaluate(node => node.click()); await expect(deletion()).toHaveCount(0);
  await back(); await openDetail('工作'); await checkDetailActions('工作');
  await page.screenshot({ path: path.join(out, `domain-detail-actions-${width}.png`) });
  await page.getByRole('button', { name: '编辑工作领域', exact: true }).click(); await expect(editor()).toBeVisible();
  await editor().getByRole('textbox', { name: '领域名称', exact: true }).fill('取消的领域改名');
  await editor().getByRole('button', { name: '关闭编辑', exact: true }).click();
  await require('./confirm-unsaved-close.cjs')(page);
  expect(await read(), 'Cancelling detail editing leaves original records intact').toEqual(original);
  await page.getByRole('button', { name: '编辑工作领域', exact: true }).click(); await editor().getByRole('textbox', { name: '领域名称', exact: true }).fill('外部关闭改名');
  await page.locator('.domain-definition-root .sheet-backdrop').click({ position: { x: 4, y: 4 } });
  await require('./confirm-unsaved-close.cjs')(page);
  await expect(editor()).toHaveCount(0); expect(await read()).toEqual(original);
  await page.getByRole('button', { name: '编辑工作领域', exact: true }).click();
  await editor().getByRole('textbox', { name: '领域名称', exact: true }).fill('工作改名');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; });
  await editor().getByRole('button', { name: '保存', exact: true }).click(); await expect(editor().getByRole('alert')).toContainText('尚未保存');
  expect(await read()).toEqual(original); await expect(editor().getByRole('textbox', { name: '领域名称', exact: true })).toHaveValue('工作改名');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; }); await editor().getByRole('button', { name: '保存', exact: true }).click(); await expect(editor()).toHaveCount(0);
  const renamed = await read(); expect(renamed.domains.find(row => row.id === 'work')).toEqual({ ...original.domains[1], name: '工作改名' });
  const alignedHabits = await read('reminders'); expect(alignedHabits.items.map(item => item.domainId)).toEqual(['work', 'work']);
  await expect(page.getByRole('button', { name: '查看习惯：管理共享习惯', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: '查看习惯：旧名称共享习惯', exact: true })).toHaveCount(1);
  await page.reload(); await expect(page.getByRole('button', { name: '编辑工作改名领域', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '编辑工作改名领域', exact: true }).click(); await editor().getByRole('textbox', { name: '领域名称', exact: true }).fill('工作'); await editor().getByRole('button', { name: '保存', exact: true }).click(); await expect(editor()).toHaveCount(0); expect(await read()).toEqual(original);
  const restoredHabits = await read('reminders');
  expect(restoredHabits.items.map(item => item.domainId), 'Both stable and former name-only habits retain the same domain binding after a second rename').toEqual(['work', 'work']);
  expect(restoredHabits.items.map(item => item.id)).toEqual(remindersBefore.items.map(item => item.id));
  await back(); await exitSorting();
  await create().scrollIntoViewIfNeeded();
  expect(await firstGrid().evaluate(node => node.scrollTop), 'The first grid delegates scrolling to its containing card window').toBe(0);
  expect(await page.locator('.page-scroll').evaluate(node => node.scrollTop), 'Creation remains in the unused first-screen slot').toBe(0);
  const createBox = await create().boundingBox(), plus = await create().locator('.button-add-symbol').boundingBox();
  expect(createBox.height + 2).toBeCloseTo(before[0].height, 0);
  expect(Math.abs(plus.x + plus.width / 2 - createBox.x - createBox.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(plus.y + plus.height / 2 - createBox.y - createBox.height / 2)).toBeLessThanOrEqual(1);
  await create().click(); await expect(editor()).toBeVisible();
  await editor().getByRole('textbox', { name: '领域名称', exact: true }).fill('旅行');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; });
  await editor().getByRole('button', { name: '创建领域', exact: true }).click();
  await expect(editor().getByRole('alert')).toContainText('尚未保存'); expect(await read()).toEqual(original);
  const pendingId = await cards().filter({ has: page.locator('.domain-progress-name', { hasText: /^旅行$/ }) }).getAttribute('id');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; }); await editor().getByRole('button', { name: '创建领域', exact: true }).click(); await expect(editor()).toHaveCount(0);
  const added = await read(), travel = added.domains.find(item => item.name === '旅行');
  expect(`domain-entry-${travel.id}`).toBe(pendingId); expect(added.domains).toHaveLength(9); expect(added.domains.slice(0, 8)).toEqual(original.domains);
  await expect(create()).toHaveCount(1); await openDetail('旅行');
  await page.getByRole('button', { name: '删除旅行领域', exact: true }).click(); await expect(deletion()).toContainText('共享习惯保留为未分类');
  await require('./prompt-test-helpers.cjs')(deletion(), expect);
  await deletion().getByRole('button', { name: '关闭删除确认', exact: true }).click(); expect(await read()).toEqual(added);
  await page.getByRole('button', { name: '删除旅行领域', exact: true }).click();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; });
  await deletion().getByRole('button', { name: '删除', exact: true }).click();
  await expect(deletion().getByRole('alert')).toContainText('尚未保存'); expect(await read()).toEqual(added);
  await expect(page, 'A failed detail delete must not navigate before durable persistence').toHaveURL(/pages\/domain-detail\/index/);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; }); await deletion().getByRole('button', { name: '删除', exact: true }).click();
  await expect(deletion()).toHaveCount(0); await expect(sort()).toBeVisible(); expect(await read()).toEqual(original);
  expect(await read('reminders')).toEqual(restoredHabits); expect(await page.evaluate(() => window.__miniNotices)).toEqual([]);
  if (width === 360) {
    await exitSorting(); await create().scrollIntoViewIfNeeded(); await create().click(); await editor().getByRole('textbox', { name: '领域名称', exact: true }).fill('不应跨账号保存');
    await page.evaluate(({ original, reminders }) => {
      window.__miniFixture.accountToolStates = { 'domain-manager': { domains: original, reminders } };
      window.__miniFixture.sessionProfile = { authenticated: true, userName: 'domain-manager', isAdmin: false };
      window.__miniPreviewControl.emit('ottlog-session');
    }, { original, reminders: restoredHabits });
    await expect(editor()).toHaveCount(0); await expect(sort()).toBeEnabled(); await expect(sort()).toHaveAttribute('aria-pressed', 'false'); await expect(create()).toHaveCount(1);
    await create().scrollIntoViewIfNeeded(); await create().click(); await expect(editor().getByRole('textbox', { name: '领域名称', exact: true })).toHaveValue('');
    await editor().getByRole('textbox', { name: '领域名称', exact: true }).fill('账号领域'); await editor().getByRole('button', { name: '创建领域', exact: true }).click(); await expect(editor()).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__miniFixture.accountToolStates['domain-manager'].domains.domains.length)).toBe(9); expect(await read()).toEqual(original);
    await openDetail('工作'); await page.getByRole('button', { name: '编辑工作领域', exact: true }).click();
    await editor().getByRole('textbox', { name: '领域名称', exact: true }).fill('不能串入游客的编辑');
    await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
    await expect(editor()).toHaveCount(0); await expect(page.getByRole('button', { name: '编辑工作领域', exact: true })).toBeEnabled();
    expect(await read(), 'Detail draft is discarded when the owner changes even if the domain ID exists in both accounts').toEqual(original);
    await page.getByRole('button', { name: '编辑工作领域', exact: true }).click(); await expect(editor().getByRole('textbox', { name: '领域名称', exact: true })).toHaveValue('工作');
    await editor().getByRole('button', { name: '关闭编辑', exact: true }).click(); await require('./confirm-unsaved-close.cjs')(page); await back();
  }
  await page.goto(`${origin}/?domain-management-limit-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    const data = { version: 1, completedGoals: [], domains: Array.from({ length: 24 }, (_, index) => ({ id: `limit-${index}`, name: `领域${index}`, iconId: 'star', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] })) };
    localStorage.setItem('ottlog-mini-tool-v1:guest:domains', JSON.stringify({ data, pending: false, revision: 0 })); window.__miniFixture.guestToolStates = { domains: data }; location.hash = '#/pages/domains/index';
  });
  await expect(create()).toBeDisabled(); await create().evaluate(node => node.click()); await expect(editor()).toHaveCount(0);
  await page.goto(`${origin}/?domain-management-empty-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    const data = { version: 1, completedGoals: [], domains: [] }; localStorage.setItem('ottlog-mini-tool-v1:guest:domains', JSON.stringify({ data, pending: false, revision: 0 })); window.__miniFixture.guestToolStates = { domains: data }; location.hash = '#/pages/domains/index';
  });
  await expect(sort()).toBeEnabled(); await expect(create()).toHaveCount(1);
  await sort().click(); await expect(sort()).toHaveAttribute('aria-pressed', 'true'); await expect(cards()).toHaveCount(1); expect((await read()).domains).toEqual([]);
  await expect(page.locator('.domain-uncategorized-shell')).toHaveCount(1);
  await exitSorting(); await expect(cards()).toHaveCount(1); await expect(create()).toHaveCount(1); await create().click(); await expect(editor()).toBeVisible();
  await editor().getByRole('button', { name: '关闭编辑', exact: true }).click(); await require('./confirm-unsaved-close.cjs')(page); expect((await read()).domains).toEqual([]);
  // The moved detail delete entry must preserve the original reminders payload,
  // including explicit IDs, old name-only associations and existing histories.
  await page.goto(`${origin}/?domain-detail-delete-habits-${width}#/pages/posts/index`);
  await page.evaluate(({ domains, reminders }) => {
    window.__miniFixture.guestToolStates = { domains, reminders };
    for (const [tool, data] of Object.entries(window.__miniFixture.guestToolStates)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    location.hash = '#/pages/domains/index';
  }, { domains: original, reminders: remindersBefore });
  await openDetail('工作'); await page.getByRole('button', { name: '删除工作领域', exact: true }).click();
  await deletion().getByRole('button', { name: '删除', exact: true }).click(); await expect(sort()).toBeVisible();
  expect((await read()).domains.map(row => row.id)).toEqual(original.domains.filter(row => row.id !== 'work').map(row => row.id));
  expect(await read('reminders'), 'Domain deletion preserves the original shared reminders instead of deleting habits').toEqual(remindersBefore);
  await page.evaluate(() => { for (const tool of ['domains', 'reminders']) localStorage.removeItem(`ottlog-mini-tool-v1:guest:${tool}`); });
};

