// All browser API requests are intercepted; no real accounts/storage are changed.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const origin = process.env.OTTLOG_HABIT_ORIGIN || 'http://127.0.0.1:3000';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Local website required');
const out = 'web/test-results/habit-sections'; await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const viewport of [{ width: 375, height: 667 }, { width: 768, height: 768 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport, timezoneId: 'Asia/Singapore' });
    const states = { reminders: { version: 1, done: {}, items: Array.from({ length: 30 }, (_, index) => ({ id: `layout-${index}`, title: `留白与滚动习惯${index}`, group: '未分类', kind: 'plant', note: '', minutes: 0, enabled: true, timePeriod: index < 15 ? 'free' : 'morning' })) } };
    await context.addInitScript(states => { for (const [key, data] of Object.entries(states)) localStorage.setItem(`ottlog-tool-v1:guest:${key}`, JSON.stringify({ data, pending: false })); }, states);
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const data = path.includes('/account/') ? { authenticated: false, csrfToken: 'isolated-ui-check' } : path === '/api/mottos' ? { mottos: ['测试格言'] } : [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/daily');
    const root = page.locator('.tool-app-root'); const free = root.locator('.daily-time-period-section[data-time-period=free]');
    await expect(free.locator('.daily-suggestion')).toHaveCount(15);
    const heading = await free.locator('.section-title').boundingBox(), card = await free.locator('.daily-suggestion').first().boundingBox(), section = await free.boundingBox();
    expect(card.x - section.x).toBeGreaterThanOrEqual(7.9); expect(Math.abs(heading.x - card.x)).toBeLessThanOrEqual(1);
    expect(await free.locator('.habit-card-grid').evaluate(node => [getComputedStyle(node).columnGap, getComputedStyle(node).rowGap])).toEqual(['8px', '8px']);
    // Ordinary horizontal movement must never expose another status panel.
    const freeScroll = free.locator('.habit-list-section-scroll');
    expect(await freeScroll.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await expect(root.locator('.daily-habit-pages .swipe-panels')).toHaveCount(0);
    const boxBefore = await free.locator('.daily-suggestion').first().boundingBox();
    await page.mouse.move(card.x + card.width * .8, card.y + card.height / 2);
    await page.mouse.down();
    await page.mouse.move(card.x + 10, card.y + card.height / 2, { steps: 6 });
    await page.mouse.up();
    expect(Math.abs((await free.locator('.daily-suggestion').first().boundingBox()).x - boxBefore.x)).toBeLessThan(1);
    await expect(free.locator('.daily-suggestion')).toHaveCount(15);
    const reminders = root.locator('.daily-neglected'), scroll = reminders.locator('.habit-list-section-scroll');
    expect(await scroll.evaluate(node => getComputedStyle(node).scrollbarWidth)).toBe('none');
    await expect(reminders.locator('.daily-suggestion')).toHaveCount(30);
    await expect(reminders.locator('.habit-list-scroll-hint')).toHaveCount(0);
    const start = await reminders.locator('.habit-list-section-heading').boundingBox();
    const box = await scroll.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 800);
    await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
    await expect(reminders.locator('.daily-suggestion').last()).toBeInViewport();
    await expect(reminders.locator('.habit-list-scroll-hint')).toHaveCount(0);
    expect((await reminders.locator('.habit-list-section-heading').boundingBox()).y).toBe(start.y);
    const frame = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
    expect(frame.scrollWidth).toBeLessThanOrEqual(frame.width + 1); expect(frame.scrollHeight).toBeLessThanOrEqual(frame.height + 1);
    await page.screenshot({ path: `${out}/habits-${viewport.width}.png` });
    await context.close();
  }
  expect(errors).toEqual([]); console.log('PASS real website 375/768/1024/1440: 8px insets, horizontal gestures do not move cards, vertical reminders reachable, fixed heading, hidden scrollbar, no hint or document overflow.');
} finally { await browser.close(); }
