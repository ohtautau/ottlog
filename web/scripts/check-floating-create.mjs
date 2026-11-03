// Exercise the actual production assets. All account/API responses are local
// disposable fixtures. Assets are unmodified; real business APIs are not used.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const origin = process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3017';
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Use the isolated loopback QA website.');
if (['3000', '5229'].includes(new URL(origin).port)) throw new Error('Use a separate QA website, not the normal local website/API.');
const out = path.resolve('test-results/floating-create'); await fs.mkdir(out, { recursive: true });
const stamp = '2026-10-01T00:00:00.000Z';
const fixtures = {
  todos: { version: 1, categories: [], sort: 'custom', tasks: [] },
  domains: { version: 1, domains: Array.from({ length: 18 }, (_, i) => ({ id: `floating-domain-${i}`, name: `领域${i + 1}`, longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] })), completedGoals: [] },
  reminders: { version: 1, items: Array.from({ length: 24 }, (_, i) => ({ id: `floating-habit-${i}`, title: `习惯${i + 1}`, group: '领域1', domainId: 'floating-domain-0', kind: 'plant', iconId: 'plant', note: '', minutes: 0, enabled: true, priority: 'none', timePeriod: 'free', createdAt: Date.parse(stamp) + i })), done: {}, reflections: [] },
  memos: { version: 1, notes: Array.from({ length: 24 }, (_, i) => ({ id: `floating-memo-${i}`, title: `便签${i + 1}`, body: '隔离布局测试。', color: 'blue', tags: [], pinned: false, priority: 'none', createdAt: stamp, updatedAt: stamp })) },
  mottos: { version: 1, mottos: Array.from({ length: 22 }, (_, i) => `第${i + 1}句测试格言。`), rotationSeconds: 15 },
  articles: { version: 1, articles: Array.from({ length: 20 }, (_, i) => ({ id: `floating-article-${i}`, title: `文章${i + 1}`, body: '隔离布局测试文章。', category: '', tags: [], createdAt: stamp, updatedAt: stamp })) },
};
const cases = [
  ['/todos', '创建任务', '.entry-composer', '关闭编辑'],
  ['/daily', '创建习惯', '.daily-editor-sheet', '关闭习惯编辑'],
  ['/memos', '创建便签', '.entry-composer', '关闭编辑'],
  ['/mottos', '创建格言', '.mottos-editor-sheet', '关闭格言编辑'],
  ['/articles', '创建文章', '.document-editor-sheet', '关闭创建文章'],
  ['/domains', '记录进展', '.entry-composer', '关闭编辑'],
  ['/domains/floating-domain-0', '创建记录', '.entry-composer', '关闭编辑'],
];
const browser = await chromium.launch({ headless: true });
const observations = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const state = structuredClone(fixtures), errors = [], writes = [];
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', timezoneId: 'Asia/Singapore' });
    page.setDefaultTimeout(12000); page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), key = url.pathname.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
      if (url.pathname.startsWith('/api/account/')) return route.fulfill({ json: { authenticated: true, userName: 'floating-reader', isAdmin: false, csrfToken: 'isolated' } });
      if (key) {
        if (request.method() === 'PUT') { state[key] = request.postDataJSON().data; writes.push(key); }
        return route.fulfill({ json: { data: state[key] ?? null } });
      }
      return route.fulfill({ json: { enabled: false, reminders: [], mottos: state.mottos.mottos } });
    });
    async function go(route) {
      await page.goto(origin + route); await expect(page.locator('.shared-app-content')).toBeVisible();
      await expect(page.locator('.floating-create-button')).toBeEnabled();
      await expect(page.locator('.browser-error')).toHaveCount(0);
    }
    async function geometry(label) {
      const fab = page.locator('.floating-create-button'); await expect(fab).toHaveCount(1);
      await expect(fab).toHaveAttribute('aria-label', label); await expect(fab.locator('.create-button-label')).toHaveCount(0);
      await expect(page.locator('.page-toolbar-create,.todo-quadrant-add')).toHaveCount(0);
      const box = await fab.boundingBox(); expect(box.width).toBe(56); expect(box.height).toBe(56);
      expect(viewport.width - box.x - box.width).toBeCloseTo(24, 0); expect(viewport.height - box.y - box.height).toBeCloseTo(24, 0);
      return box;
    }
    for (const [route, label, editor, close] of cases) {
      await go(route); const before = await geometry(label);
      await page.locator('.page-scroll,.memo-list-scroll,.mottos-list-scroll,.personal-articles-scroll,.domain-entry-scroll,.habit-list-section-scroll').evaluateAll(nodes => nodes.forEach(node => { node.scrollTop = node.scrollHeight; }));
      const after = await geometry(label); expect(after).toEqual(before);
      await page.screenshot({ path: path.join(out, `${route.slice(1).replaceAll('/', '-')}-${viewport.width}.png`) });
      await page.locator('.floating-create-button').click(); await expect(page.locator(editor)).toBeVisible();
      expect(await page.evaluate(box => !document.elementFromPoint(box.x + 28, box.y + 28)?.closest('.floating-create-action'), before)).toBe(true);
      await page.getByRole('button', { name: close, exact: true }).click(); await expect(page.locator(editor)).toHaveCount(0);
      await geometry(label);
      const overflow = await page.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight }));
      expect(overflow.x).toBeLessThanOrEqual(1); expect(overflow.y).toBeLessThanOrEqual(1);
      observations.push({ route, viewport, box: before });
    }
    await go('/todos'); await page.locator('.floating-create-button').click();
    await page.getByRole('textbox', { name: '任务名称', exact: true }).fill(`悬浮按钮测试${viewport.width}`);
    await page.locator('.entry-composer').getByRole('button', { name: '创建任务', exact: true }).click();
    await expect(page.locator('.entry-composer')).toHaveCount(0); await expect(page.locator('.operation-toast')).toBeVisible();
    expect(state.todos.tasks.some(task => task.title === `悬浮按钮测试${viewport.width}`)).toBe(true);
    const fab = await geometry('创建任务'), toast = await page.locator('.operation-toast').boundingBox();
    expect(toast.y + toast.height).toBeLessThanOrEqual(fab.y - 8);
    await page.locator('.operation-toast').getByRole('button', { name: '撤销最近一次操作', exact: true }).click();
    await expect.poll(() => state.todos.tasks.length).toBe(0); expect(writes).toEqual(['todos', 'todos']);
    expect(errors).toEqual([]); await page.close();
    console.log(`PASS production floating create ${viewport.width}: seven pages, geometry, scroll, modals, task save/undo, toast clearance; API fully intercepted.`);
  }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ origin, observations }, null, 2));
} finally { await browser.close(); }
