const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const { origin } = JSON.parse(fs.readFileSync('test-results/productivity-runtime.json'));
    const mottos = async () => {
      const response = await context.request.get(origin + '/api/mottos');
      assert.equal(response.status(), 200);
      return (await response.json()).mottos;
    };
    await page.goto(origin + '/');
    await expect(page.getByRole('region', { name: '生活格言' })).toBeVisible();
    await expect(page.getByRole('button', { name: '快速添加格言', exact: true })).toHaveCount(0);
    await expect(page.getByRole('region', { name: '快速添加格言' })).toHaveCount(0);

    const session = await (await context.request.get(origin + '/api/auth/session')).json();
    const authResponse = await context.request.post(origin + (session.needsSetup ? '/api/auth/setup' : '/api/auth/login'), {
      headers: { 'X-CSRF-TOKEN': session.csrfToken },
      data: { userName: 'quick_motto_admin', password: 'Quick-motto-test-2026!' },
    });
    assert.equal(authResponse.status(), 200, 'Use a fresh isolated preview or the quick_motto_admin fixture');
    const beforeMottos = await mottos();
    const beforeMemos = await (await context.request.get(origin + '/api/personal-tools/memos')).json();
    await page.reload();
    const banner = page.getByRole('region', { name: '生活格言' });
    const toggle = banner.getByRole('button', { name: '快速添加格言', exact: true });
    const form = page.getByRole('region', { name: '快速添加格言' });
    const input = form.getByLabel('新增格言', { exact: true });
    const add = form.getByRole('button', { name: '添加格言', exact: true });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(form).toHaveCount(0);
    assert(await toggle.evaluate(node => Boolean(node.closest('.motto-banner'))));
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(form).toBeVisible();
    await expect(add).toBeDisabled();

    const draft = '折叠后还在的格言草稿';
    await input.fill(draft);
    await form.getByRole('button', { name: '收起格言输入', exact: true }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(form).toHaveCount(0);
    await toggle.click();
    await expect(input).toHaveValue(draft);
    await input.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(form).toHaveCount(0);
    await toggle.click();
    await expect(input).toHaveValue(draft);
    await toggle.click();
    await expect(form).toHaveCount(0);
    await toggle.click();
    await expect(input).toHaveValue(draft);
    await banner.locator('.motto-label').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(form).toHaveCount(0);
    await toggle.click();
    await expect(input).toHaveValue(draft);

    const imePrevented = await input.evaluate(node => {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, isComposing: true,
      });
      node.dispatchEvent(event);
      return event.defaultPrevented;
    });
    assert(imePrevented, 'Confirming Chinese input must not submit the form');
    assert.deepEqual(await mottos(), beforeMottos);
    const text = `紧凑入口新增的格言 ${Date.now()}`;
    await input.fill('  ' + text + '  ');
    await input.press('Enter');
    await expect(form.getByRole('status')).toContainText('已加入自定义格言');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toHaveValue('');
    const afterMottos = await mottos();
    assert.deepEqual(afterMottos, [...beforeMottos, text]);
    await expect(banner.locator('.motto-controls')).toContainText('/ ' + String(afterMottos.length).padStart(2, '0'));
    await input.fill(text);
    await add.click();
    await expect(form.getByRole('status')).toContainText('这句格言已经存在');
    await expect(input).toHaveValue(text);
    assert.deepEqual(await mottos(), afterMottos);

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await input.fill('写一句想反复看到的话');
      await expect(form).toBeVisible();
      const metrics = await page.evaluate(() => ({
        viewport: window.innerWidth,
        width: document.documentElement.scrollWidth,
      }));
      assert(metrics.width <= metrics.viewport + 1, `${width}px: horizontal page overflow`);
      for (const control of [toggle, input, add, form.getByRole('button', { name: '收起格言输入' })]) {
        const box = await control.boundingBox();
        assert(box && box.x >= -1 && box.x + box.width <= width + 1, `${width}px: quick motto control outside viewport`);
      }
      await banner.screenshot({ path: `test-results/compact-motto-${width}.png` });
    }
    await banner.screenshot({ path: 'test-results/compact-motto-mobile.png' });
    await form.getByRole('link', { name: '管理格言', exact: true }).click();
    await expect(page.getByRole('region', { name: '首页格言管理' })).toContainText(text);
    assert.deepEqual(await (await context.request.get(origin + '/api/personal-tools/memos')).json(), beforeMemos);
    await page.goto(origin + '/');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(banner.locator('.motto-controls')).toContainText('/ ' + String(afterMottos.length).padStart(2, '0'));
    assert.deepEqual(errors, []);
    console.log('PASS compact admin entry inside motto banner, guest hidden, collapsed by default, toggle/close/Escape/outside dismissal with draft retention, IME, Enter save, duplicate rejection, live rotation, management persistence, no memo write, 390/320px layouts');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
