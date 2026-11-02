// Run against the local test API (Sqlite with a separate Data__Directory), never production.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const origin = process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3100';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Use an isolated local server.');
const out = path.resolve('test-results/web-parity'); await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [], observations = [];
try {
  for (const width of [375, 768, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 1000 } });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(`${width}: ${error.message}`));
    for (const [route, name] of [['/today', '今日'], ['/todos', '任务'], ['/memos', '便签'], ['/domains', '领域'], ['/daily', '习惯'], ['/pomodoro', '专注'], ['/statistics', '统计'], ['/mottos', '格言']]) {
      await page.goto(`${origin}${route}`);
      const app = page;
      await expect(app.locator('[data-tool-workspace]')).toHaveAttribute('aria-label', name);
      await expect(app.locator('.tool-workspace-heading')).toHaveCount(0);
      await expect(app.locator('.tool-app-root')).toBeVisible();
      await expect(app.locator('iframe')).toHaveCount(0);
      await expect(app.locator('.browser-navigation,.browser-workspace,.browser-heading')).toHaveCount(0);
      await expect(app.locator('body > header.header')).toBeVisible();
      await expect(app.getByRole('link', { name: 'Ottlog 首页', exact: true })).toBeVisible();
      await expect(app.locator('.browser-error')).toHaveCount(0);
      await expect(app.locator('.shared-app-content button:visible').first()).toBeVisible();
      await expect(app.locator('.shared-app-content')).not.toContainText('正在读取…', { timeout: 15000 });
      const geometry = await app.locator('.tool-app-root').evaluate(node => ({
        width: node.getBoundingClientRect().width,
        fontSize: getComputedStyle(node).fontSize,
        contentOverflow: node.scrollWidth - node.clientWidth,
        documentOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      }));
      observations.push({ width, route, geometry, buttons: await app.locator('.shared-app-content button').allTextContents(), inputs: await app.locator('.shared-app-content input').evaluateAll(nodes => nodes.map(n => ({ label: n.getAttribute('aria-label'), placeholder: n.placeholder }))) });
      expect(geometry.contentOverflow, `${route} no horizontal tool overflow at ${width}`).toBeLessThanOrEqual(1);
      expect(geometry.documentOverflow, `${route} no horizontal document overflow at ${width}`).toBeLessThanOrEqual(1);
      if (width >= 1440) {
        expect(geometry.width, `${route} uses desktop page width at ${width}`).toBeGreaterThan(1000);
        expect(geometry.fontSize, 'Desktop text stays at a fixed reading size').toBe('16px');
        if (route === '/todos') {
          const board = app.locator('.todo-quadrants');
          await expect(board).toBeVisible();
          expect((await board.boundingBox()).width).toBeGreaterThan(1000);
          expect((await board.boundingBox()).height).toBeGreaterThanOrEqual(600);
          await expect(board.locator('.todo-quadrant')).toHaveCount(4);
        }
        if (route === '/memos' && await app.locator('.memo-list').count()) {
          const columns = await app.locator('.memo-list').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
          expect(columns, 'Notes use the desktop card grid').toBeGreaterThanOrEqual(3);
        }
      }
      await page.screenshot({ path: path.join(out, `${name}-${width}.png`) });
    }
    // The optional directory retains its shared geometry; root opens today.
    await page.goto(`${origin}/options`);
    await expect(page.locator('[data-option-field]')).toBeVisible();
    await expect(page.locator('.tool-app-root,iframe,.browser-navigation')).toHaveCount(0);
    await expect(page.locator('[data-option-id="/eat"],[data-option-id="/eat/legacy"]')).toHaveCount(0);
    await expect(page.locator('[data-option-id="/meals"]')).toHaveCount(0);
    const today = page.locator('[data-option-id="/today"]');
    await expect(today).toBeVisible();
    await today.focus(); await today.press('Enter');
    await expect(page).toHaveURL(`${origin}/today`);
    await expect(page.locator('[data-tool-workspace]')).toHaveAttribute('aria-label', '今日');
    await expect(page.locator('.tool-app-root .today-grid')).toBeVisible();
    await expect(page.getByRole('button', { name: '打开饮食记录', exact: true })).toHaveCount(0);
    await expect(page.locator('header a[href="/meals"]')).toHaveCount(0);
    if (width === 1440) {
      const nav = page.getByRole('navigation', { name: '日常工具', exact: true });
      for (const [title, route, tool] of [['任务', 'todos', 'todos'], ['便签', 'memos', 'memos'], ['领域', 'domains', 'domains'], ['今日', 'today', 'index']]) {
        await nav.getByRole('link', { name: title, exact: true }).click();
        await expect(page).toHaveURL(`${origin}/${route}`);
        await expect(page.locator(`[data-tool-workspace="${tool}"] .shared-app-content`)).toBeVisible();
        await expect(page.locator('.tool-app-root')).toHaveCount(1);
      }
      await page.goBack(); await expect(page.locator('.domain-first-grid')).toBeVisible();
      await page.goBack(); await expect(page.locator('.memo-note').first()).toBeVisible();
      await page.goForward(); await expect(page.locator('.domain-first-grid')).toBeVisible();
      await nav.getByRole('link', { name: '任务', exact: true }).click();
      await page.locator('.floating-create-button').click();
      await expect(page.locator('body > header')).toHaveAttribute('inert', '');
      await page.keyboard.press('Escape');
      await expect(page.locator('.entry-composer')).toHaveCount(0);
      await expect(page.locator('body > header')).not.toHaveAttribute('inert', '');
    }
    await context.close();
  }
} finally { await browser.close(); await fs.writeFile(path.join(out, 'smoke.json'), JSON.stringify({ failures, observations }, null, 2)); }
expect(failures).toEqual([]);
console.log('PASS original website integration: eight native-DOM routes at 375/768/1440/1920, original Choice Field entry, desktop geometry, no iframe/sidebar/overflow or page errors.');
