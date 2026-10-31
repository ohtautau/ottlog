import { chromium, expect } from '@playwright/test';
const origin = process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3100';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Use isolated local API.');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await page.goto(`${origin}/mottos`);
  const frame = page; await frame.getByRole('button', { name: '格言轮播设置', exact: true }).click();
  const column = frame.getByRole('listbox', { name: '格言轮播间隔秒', exact: true }), box = await column.boundingBox();
  const cdp = await context.newCDPSession(page), x = box.x + box.width / 2, y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 5 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(column.locator('[aria-selected=true]')).not.toHaveText('15'); await expect(column).toHaveAttribute('data-moving', 'false');
  const chosen = Number(await column.locator('[aria-selected=true]').textContent());
  await frame.getByRole('dialog', { name: '格言轮播设置', exact: true }).getByRole('button', { name: '保存', exact: true }).click();
  await frame.getByRole('button', { name: '格言轮播设置', exact: true }).click();
  await expect(column.locator('[aria-selected=true]')).toHaveText(String(chosen).padStart(2, '0'));
  await page.screenshot({ path: 'test-results/web-parity/touch-wheel-375.png' });
  console.log(`PASS browser touch events: native scroll-snap gesture changed 15 to ${chosen}, saved and reopened consistently. This is Chromium touch emulation, not a phone hardware test.`);
} finally { await browser.close(); }
