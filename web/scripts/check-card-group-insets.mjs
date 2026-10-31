// Isolated guest fixtures: every API request is intercepted, no account writes.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const origin = 'http://127.0.0.1:3000';
const out = 'web/test-results/card-group-insets';
await fs.mkdir(out, { recursive: true });
const stamp = new Date().toISOString();
const states = {
  todos: { version: 1, categories: [], tasks: Array.from({ length: 4 }, (_, i) => ({ id: `inset-task-${i}`, title: `任务留白${i}`, description: '', categoryId: '', important: i < 2, urgent: i % 2 === 0, dueDate: '', completedAt: null, createdAt: stamp, updatedAt: stamp })) },
  memos: { version: 1, notes: Array.from({ length: 8 }, (_, i) => ({ id: `inset-memo-${i}`, title: `便签留白${i}`, body: '卡片与容器四周保持留白。', color: 'mint', tags: [], pinned: false, createdAt: stamp, updatedAt: stamp })) },
  domains: { version: 1, completedGoals: [], domains: Array.from({ length: 12 }, (_, i) => ({ id: `inset-domain-${i}`, name: `领域留白${i}`, iconId: 'plant', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] })) },
};
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const viewport of [{ width: 375, height: 667 }, { width: 768, height: 768 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport, timezoneId: 'Asia/Singapore' });
    await context.addInitScript(states => { for (const [key, data] of Object.entries(states)) localStorage.setItem(`ottlog-tool-v1:guest:${key}`, JSON.stringify({ data, pending: false })); }, states);
    await context.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(new URL(route.request().url()).pathname.includes('/account/') ? { authenticated: false, csrfToken: 'isolated-inset-test' } : []) }));
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    for (const [route, selector] of [['/today', '.today-grid'], ['/todos', '.todo-quadrant-items'], ['/domains', '.domain-entry-scroll > .card-group-content'], ['/memos', '.memo-list-scroll > .card-group-content']]) {
      await page.goto(origin + route);
      const group = page.locator('.tool-app-root').locator(selector).first();
      await expect(group).toBeVisible();
      if (route === '/memos') await expect(page.locator('.tool-app-root .memo-note')).toHaveCount(8);
      const geometry = await group.evaluate(node => {
        const style = getComputedStyle(node), parent = node.getBoundingClientRect();
        const card = node.querySelector('.domain-entry, .memo-note, .home-shortcut-card') || node.firstElementChild;
        const box = card.getBoundingClientRect();
        return { padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft], left: box.left - parent.left, top: box.top - parent.top, overflow: node.scrollWidth - node.clientWidth };
      });
      expect(geometry.padding, `${route} ${viewport.width}`).toEqual(['8px', '8px', '8px', '8px']);
      expect(geometry.left).toBeGreaterThanOrEqual(7.9); expect(geometry.top).toBeGreaterThanOrEqual(7.9);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      if (route === '/today') {
        await page.screenshot({ path: `${out}/today-${viewport.width}.png` });
        const grid = await group.boundingBox(), heading = await page.locator('.today-shortcut-heading').boundingBox();
        expect(Math.abs(heading.x - grid.x - 8)).toBeLessThan(1);
        for (const selector of ['.today-quote', '.today-capture']) {
          const box = await page.locator(selector).boundingBox();
          expect(Math.abs(box.x - grid.x - 8), `${selector} left inset at ${viewport.width}`).toBeLessThan(1);
          expect(Math.abs(box.x + box.width - grid.x - grid.width + 8), `${selector} right inset at ${viewport.width}`).toBeLessThan(1);
        }
        await expect(page.getByRole('button', { name: '管理格言', exact: true })).toBeInViewport();
        await expect(page.locator('.today-capture .create-button')).toBeInViewport();
      }
      await page.screenshot({ path: `${out}/${route.slice(1)}-${viewport.width}.png` });
    }
    await context.close();
  }
  expect(errors).toEqual([]);
  console.log('PASS home/tasks/domains/memos at 375/768/1024/1440: shared 8px insets, home quote/capture aligned with shortcut cards, action buttons in view, no card-group horizontal overflow.');
} finally { await browser.close(); }
