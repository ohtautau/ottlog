const path = require('node:path');

// Real shared pages with disposable account/API/storage fixtures. This certifies
// browser-adapted layout and actions, not native WeChat gestures or rendering.
module.exports = async function checkFloatingCreate({ page, origin, out, width, expect }) {
  const stamp = '2026-10-01T00:00:00.000Z';
  const owner = 'floating-reader';
  const domains = { version: 1, domains: Array.from({ length: 18 }, (_, i) => ({ id: `floating-domain-${i}`, name: `领域${i + 1}`, longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] })), completedGoals: [] };
  const states = {
    todos: { version: 1, categories: [], sort: 'custom', tasks: [] }, domains,
    reminders: { version: 1, items: Array.from({ length: 24 }, (_, i) => ({ id: `floating-habit-${i}`, title: `习惯${i + 1}`, group: '领域1', domainId: 'floating-domain-0', kind: 'plant', iconId: 'plant', note: '', minutes: 0, enabled: true, priority: 'none', timePeriod: 'free', createdAt: Date.parse(stamp) + i })), done: {}, reflections: [] },
    memos: { version: 1, notes: Array.from({ length: 24 }, (_, i) => ({ id: `floating-memo-${i}`, title: `便签${String(i + 1).padStart(2, '0')}`, body: '独立布局回归，不写入真实账号。', color: 'blue', tags: [], pinned: false, priority: 'none', createdAt: stamp, updatedAt: stamp })) },
    mottos: { version: 1, mottos: Array.from({ length: 22 }, (_, i) => `第${i + 1}句独立测试格言。`), rotationSeconds: 15 },
    articles: { version: 1, articles: Array.from({ length: 20 }, (_, i) => ({ id: `floating-article-${i}`, title: `文章${i + 1}`, body: '独立布局回归文章。', category: '', tags: [], createdAt: stamp, updatedAt: stamp })) },
  };
  const button = name => page.getByRole('button', { name, exact: true });
  async function fresh(route, signedIn = true) {
    await page.goto(`${origin}/?floating-create-${route.split('?')[0]}-${width}-${signedIn}#/pages/posts/index`);
    await page.evaluate(({ states, owner }) => {
      localStorage.clear();
      for (const [key, data] of Object.entries(states)) localStorage.setItem(`ottlog-mini-tool-v1:reader:${owner}:${key}`, JSON.stringify({ data, pending: false, revision: 0 }));
    }, { states, owner });
    await page.reload();
    await page.evaluate(({ route, signedIn, states, owner }) => {
      window.__miniFixture.sessionProfile = { authenticated: signedIn, userName: signedIn ? owner : null, isAdmin: false };
      window.__miniFixture.accountToolStates = { [owner]: states };
      location.hash = `#/pages/${route}`;
    }, { route: route.includes('?') ? route : `${route}/index`, signedIn, states, owner });
  }
  async function geometry(label, tab = false, safe = 0) {
    const fab = page.locator('.floating-create-button');
    await expect(fab).toHaveCount(1);
    await expect(fab).toHaveAttribute('aria-label', label);
    await expect(fab).toBeVisible();
    await expect(page.locator('.page-toolbar-create')).toHaveCount(0);
    await expect(fab.locator('.create-button-label')).toHaveCount(0);
    await expect(fab.locator('.button-add-symbol')).toHaveCount(1);
    const result = await fab.evaluate(node => {
      const b = node.getBoundingClientRect(), v = document.querySelector('.preview-content').getBoundingClientRect(), style = getComputedStyle(node);
      return { x: b.x, y: b.y, width: b.width, height: b.height, right: v.right - b.right, bottom: v.bottom - b.bottom, radius: style.borderRadius, color: style.backgroundColor, z: getComputedStyle(node.closest('.floating-create-action')).zIndex };
    });
    expect(result.width).toBe(56); expect(result.height).toBe(56);
    expect(result.right).toBeCloseTo(width / 8, 0); expect(result.bottom).toBeCloseTo(Math.max(width / 8, tab ? 0 : safe), 0);
    expect(result.radius === '50%' || parseFloat(result.radius) >= 28).toBe(true);
    expect(result.color).toBe('rgb(185, 219, 202)');
    return result;
  }
  const layoutOnly = process.env.OTTLOG_FLOATING_LAYOUT_ONLY === '1';
  const cases = [
    {route:'index',label:'创建记录',tab:true},
    { route: 'todos', label: '创建任务', tab: true, editor: '.entry-composer', close: '关闭编辑' },
    { route: 'daily', label: '创建习惯', tab: true, editor: '.daily-editor-sheet', close: '关闭习惯编辑', last: '#daily-reminder-scroll .daily-suggestion' },
    { route: 'memos', label: '创建便签', editor: '.entry-composer', close: '关闭编辑', last: '.memo-note' },
    { route: 'mottos', label: '创建格言', editor: '.mottos-editor-sheet', close: '关闭格言编辑', last: '.mottos-row' },
    { route: 'articles', label: '创建文章', editor: '.document-editor-sheet', close: '关闭创建文章', last: '.article-card' },
    { route: 'domains', label: '添加记录', tab: true, editor: '.entry-composer', close: '关闭编辑', last: '.domain-create-shell' },
    { route: 'domain-detail/index?id=floating-domain-0', label: '创建记录', editor: '.entry-composer', close: '关闭编辑' },
  ];
  for (const item of cases) {
    await fresh(item.route);
    const fab = page.locator('.floating-create-button');
    await expect(fab).toBeEnabled();
    const before = await geometry(item.label, item.tab);
    await fab.focus(); await expect(fab).toHaveCSS('outline-style','none');
    await page.screenshot({ path: path.join(out, `floating-create-${item.route.split('/')[0]}-${width}.png`) });
    // Scrolling the page or an internal list must not move the floating action.
    await page.locator('.page-scroll,.memo-list-scroll,.mottos-list-scroll,.personal-articles-scroll,.domain-entry-scroll,.habit-list-section-scroll').evaluateAll(nodes => nodes.forEach(node => { node.scrollTop = node.scrollHeight; }));
    const after = await geometry(item.label, item.tab);
    expect(after.x).toBe(before.x); expect(after.y).toBe(before.y);
    if (item.last) {
      const last = page.locator(item.last).last();
      await expect(last).toHaveCount(1);
      const box = await last.boundingBox();
      expect(box.y + box.height, `${item.route}: last card is reachable above FAB`).toBeLessThanOrEqual(after.y - 7);
    }
    if (!['todos', 'domain-detail/index?id=floating-domain-0'].includes(item.route)) {
      const clearances = await page.locator('.floating-create-content').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).paddingBottom)));
      expect(clearances.length, `${item.route}: scroll content reserves room for FAB`).toBeGreaterThan(0);
      for (const clearance of clearances) expect(clearance).toBeGreaterThanOrEqual(80);
    }
    if (!layoutOnly) {
    await fab.click();
    await expect(page.locator(item.editor)).toBeVisible();
    // Even on tall screens the backdrop must catch the old FAB hit target.
    const covered = await page.evaluate(({ x, y, width, height }) => {
      const hit = document.elementFromPoint(x + width / 2, y + height / 2);
      return !hit?.closest('.floating-create-action');
    }, before);
    expect(covered, `${item.route}: modal must cover floating create`).toBe(true);
    await button(item.close).click();
    await expect(page.locator(item.editor)).toHaveCount(0);
    await geometry(item.label, item.tab);
    }
    await page.evaluate(() => document.documentElement.style.setProperty('--preview-safe-area-bottom', '34px'));
    const safeGeometry = await geometry(item.label, item.tab, 34);
    if (item.last) {
      await page.locator('.page-scroll,.memo-list-scroll,.mottos-list-scroll,.personal-articles-scroll,.domain-entry-scroll,.habit-list-section-scroll').evaluateAll(nodes => nodes.forEach(node => { node.scrollTop = node.scrollHeight; }));
      const box = await page.locator(item.last).last().boundingBox();
      expect(box.y + box.height, `${item.route}: last card clears safe-area FAB`).toBeLessThanOrEqual(safeGeometry.y - 7);
    }
    await page.evaluate(() => document.documentElement.style.removeProperty('--preview-safe-area-bottom'));
  }

  if (layoutOnly) return;

  // Persistent create behavior still belongs to the old composer, not the FAB.
  await fresh('memos');
  await page.locator('.floating-create-button').click();
  await page.getByRole('textbox', { name: '便签标题', exact: true }).fill('悬浮按钮创建测试');
  await page.locator('.entry-composer').getByRole('button', { name: '创建便签', exact: true }).click();
  await expect(page.locator('.entry-composer')).toHaveCount(0);
  const saved = await page.evaluate(owner => window.__miniPreviewControl.readStorage(`ottlog-mini-tool-v1:reader:${owner}:memos`).data.notes, owner);
  expect(saved.some(note => note.title === '悬浮按钮创建测试')).toBe(true);

  await fresh('mottos', false);
  await expect(page.locator('.floating-create-button')).toBeDisabled();
  await expect(page.locator('.mottos-empty')).toContainText('登录后查看自己的格言');
  await fresh('daily', false);
  await expect(page.locator('.floating-create-button')).toHaveAttribute('aria-label', '登录创建习惯');
  await page.locator('.floating-create-button').click();
  await expect(page.locator('.account-window')).toBeVisible();
  await fresh('articles', false);
  await expect(page.locator('.floating-create-button')).toHaveAttribute('aria-label', '登录创建文章');
  await expect(page.locator('.floating-create-button')).toBeEnabled();
  await page.locator('.floating-create-button').click();
  await expect(page).toHaveURL(/pages\/index\/index/);
  await expect(page.locator('.account-window')).toBeVisible();
};
