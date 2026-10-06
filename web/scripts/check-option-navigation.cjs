/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, expect } = require('@playwright/test');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3037';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));

async function run() {
  const browser = await chromium.launch();
  fs.mkdirSync('test-results/option-navigation', { recursive: true });
  try {
    for (const viewport of [{ width:1440, height:1000 }, { width:390, height:844 }, { width:360, height:640 }]) {
      const context = await browser.newContext({ viewport, reducedMotion:'reduce' });
      await context.route('**/api/**', route => route.fulfill({ json:{ authenticated:false, isAdmin:false, csrfToken:'fixture', data:null } }));
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const next = page.getByRole('button', { name:'下一步', exact:true });
      const previous = page.getByRole('button', { name:'上一步', exact:true });
      const jumps = page.getByRole('navigation', { name:'进度跳转' }).getByRole('button');
      const at = step => expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(step));
      async function pick(id) {
        const button = page.locator(`[data-option-id="${id}"]`);
        await expect(button).toHaveAttribute('aria-disabled', 'false');
        await button.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(380);
      }
      await page.goto(`${origin}/eat`); await pick('questions'); await at(0);
      await expect(next).toBeDisabled(); await expect(jumps.nth(3)).toBeDisabled();
      await pick('sweet-yes'); await pick('spicy-no'); await pick('staple-rice'); await at(3);
      const recommendations = await page.getByTestId('food-candidate').allTextContents();
      await jumps.nth(0).click(); await at(0);
      await next.click(); await at(1); await next.click(); await at(2); await next.click(); await at(3);
      assert.deepEqual(await page.getByTestId('food-candidate').allTextContents(), recommendations);
      await previous.click(); await at(2); await jumps.nth(0).click(); await at(0);
      await pick('sweet-yes'); await at(1); await expect(jumps.nth(3)).toBeEnabled();
      await jumps.nth(0).click(); await pick('sweet-no'); await at(1);
      await expect(next).toBeDisabled(); await expect(jumps.nth(3)).toBeDisabled();
      await previous.click(); await at(0); await next.click(); await at(1);
      await page.screenshot({ path:`test-results/option-navigation/questions-${viewport.width}.png` });

      await page.goto(`${origin}/eat`); await pick('compare');
      for (let i=0; i<6; i++) await pick('tau-1');
      await at(6); const pair = await page.getByTestId('field-option').evaluateAll(nodes => nodes.map(node => node.dataset.optionId));
      await jumps.nth(1).click(); await at(2); // The 10% segment starts at ceil(17 * .1).
      await jumps.nth(0).click(); await at(0);
      await next.click(); await at(1); await previous.click(); await at(0);
      await pick('tau-1'); await at(1); await expect(jumps.nth(3)).toBeEnabled();
      await jumps.nth(3).click(); await at(6);
      assert.deepEqual(await page.getByTestId('field-option').evaluateAll(nodes => nodes.map(node => node.dataset.optionId)), pair);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-tool-v1:guest:dining') || 'null')?.data?.history?.length || 0), 0);
      await jumps.nth(0).click(); await pick('tau-2'); await at(1);
      await expect(next).toBeDisabled(); await expect(jumps.nth(3)).toBeDisabled();
      await expect(page.locator('[data-option-id="tau-1"]')).toHaveCount(0);
      await expect(page.locator('[data-option-id="tau-2"]')).toBeVisible();
      await page.screenshot({ path:`test-results/option-navigation/compare-${viewport.width}.png` });

      await page.goto(`${origin}/tasks/new`);
      await page.getByRole('textbox', { name:'任务名称', exact:true }).fill('保留任务草稿');
      await page.getByRole('textbox', { name:'补充说明（可选）', exact:true }).fill('保留补充说明');
      await page.locator('form button[type="submit"]').click(); await at(1);
      await jumps.first().click(); await expect(page.getByRole('textbox', { name:'任务名称', exact:true })).toHaveValue('保留任务草稿');
      await page.locator('form button[type="submit"]').click(); await previous.click();
      await expect(page.getByRole('textbox', { name:'补充说明（可选）', exact:true })).toHaveValue('保留补充说明');

      await page.goto(`${origin}/choose`);
      async function choose() { await page.getByTestId('choice-option').first().focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(380); }
      await choose(); await choose(); await choose();
      const choiceAt = step => expect(page.getByTestId('choice-experience')).toHaveAttribute('data-step', String(step));
      await choiceAt(3); await page.getByRole('button', { name:'回到第 1 题', exact:true }).click(); await choiceAt(0);
      await next.click(); await choiceAt(1); await next.click(); await choiceAt(2); await next.click(); await choiceAt(3);
      await page.getByRole('button', { name:'回到第 1 题', exact:true }).click();
      await page.getByTestId('choice-option').nth(1).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(380);
      await choiceAt(1); await expect(next).toBeDisabled(); await expect(page.getByRole('button', { name:'回到第 4 题', exact:true })).toBeDisabled();
      await page.screenshot({ path:`test-results/option-navigation/choice-${viewport.width}.png` });
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}: step/percentage jumps; back/forward history; identical answer preserves future; changed answer invalidates future; no duplicate records; task drafts; original Choice Field`);
      await context.close();
    }
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
