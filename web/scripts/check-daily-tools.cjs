// Run against the local web/API: node scripts/check-daily-tools.cjs
// Uses fresh guest browser contexts; never changes account or blog data.
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const origin = process.env.TEST_ORIGIN || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.goto(`${origin}/daily`);
    await expect(page.getByRole('button', { name: '今天做过了', exact: true })).toBeEnabled();
    await expect(page.locator('article')).toHaveCount(24);
    console.log('daily loaded');
    await page.getByRole('button', { name: '今天做过了', exact: true }).click();
    await expect(page.getByRole('button', { name: '已做过 · 撤销', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: '已做过 · 撤销', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '已做过 · 撤销', exact: true }).click();
    await expect(page.getByRole('button', { name: '今天做过了', exact: true })).toBeVisible();
    for (const [name, count] of [['健康', 9], ['精神', 3], ['学习', 6], ['健身', 4], ['饮食', 2]]) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('article')).toHaveCount(count);
      assert.equal(await page.locator('section[aria-label="当前提醒"]').getAttribute('data-group'), name);
    }
    await page.getByRole('button', { name: '随便刷刷', exact: true }).click();
    console.log('daily completion persistence and groups passed');
    const seen = new Set();
    for (let i = 0; i < 24; i++) {
      const title = await page.locator('section[aria-label="当前提醒"] h2').innerText();
      assert(!seen.has(title), `Repeated before completing deck: ${title}`);
      seen.add(title);
      if (i < 23) await page.getByRole('button', { name: '换一张', exact: true }).click();
    }
    const sceneKinds = new Set();
    console.log('daily non-repeating deck passed');
    const cards = page.locator('article');
    for (let i = 0; i < 24; i++) {
      await cards.nth(i).getByRole('button').first().click();
      sceneKinds.add(await page.locator('svg[data-scene]').getAttribute('data-scene'));
    }
    assert.equal(sceneKinds.size, 22);
    console.log('daily scenes passed');
    await page.getByRole('button', { name: '管理提醒 +', exact: true }).click();
    await page.getByLabel('名称', { exact: true }).fill('测试一分钟小事');
    await page.getByLabel('提醒自己的话').fill('先打开一页笔记。');
    await page.locator('select[name="group"]').selectOption('学习');
    await page.locator('select[name="kind"]').selectOption('notes');
    await page.getByLabel('专注分钟（0 为关闭）').fill('1');
    await page.getByRole('button', { name: '保存提醒', exact: true }).click();
    await expect(page.locator('article')).toHaveCount(25);
    await expect(page.locator('section[aria-label="当前提醒"] h2')).toHaveText('测试一分钟小事');
    await page.getByRole('button', { name: /1 分钟，从现在开始/ }).click();
    await page.clock.fastForward(61000);
    await expect(page.getByRole('timer')).toHaveText('00:00');
    await page.getByRole('button', { name: '结束计时', exact: true }).click();
    const custom = page.locator('article').filter({ hasText: '测试一分钟小事' });
    await custom.getByRole('button', { name: '停用', exact: true }).click();
    await expect(custom).toHaveAttribute('data-disabled', 'true');
    await custom.getByRole('button', { name: '启用', exact: true }).click();
    await page.reload();
    await expect(page.locator('article')).toHaveCount(25);
    await page.getByRole('button', { name: '今天做过了', exact: true }).click();
    await page.clock.fastForward(86400000);
    await expect(page.getByRole('button', { name: '今天做过了', exact: true })).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `Daily overflow ${width}`);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('svg[data-scene]').evaluate(svg => svg.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length), 0);
    console.log('PASS daily: 24 defaults / five groups / 22 scenes / no-repeat deck / records / custom reminders / timer / mobile / reduced motion');

    const mealContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const meals = await mealContext.newPage();
    meals.on('pageerror', error => errors.push(error.message));
    await meals.goto(`${origin}/eat`);
    await meals.getByRole('button', { name: '帮我想一想', exact: true }).click();
    await meals.getByRole('button', { name: /午餐 给下午/ }).click();
    await meals.getByRole('button', { name: '下一步', exact: true }).click();
    await meals.getByRole('button', { name: /不吃辣 温和/ }).click();
    await meals.getByRole('button', { name: '下一步', exact: true }).click();
    await meals.getByRole('button', { name: /20 元以内 简单/ }).click();
    await meals.getByRole('button', { name: '下一步', exact: true }).click();
    await meals.getByRole('button', { name: /15 分钟以内 现在/ }).click();
    await meals.getByRole('checkbox', { name: /这次只想吃无肉餐食/ }).check();
    await meals.getByRole('button', { name: '看看开饭建议', exact: true }).click();
    const result = meals.getByRole('region', { name: '选餐结果' });
    await expect(result).toContainText('符合午餐、不辣、20 元以内、15 分钟以内、无肉的选择');
    const first = await result.locator('h3').innerText();
    await meals.getByRole('button', { name: '换一道', exact: true }).click();
    assert.notEqual(await result.locator('h3').innerText(), first);
    await meals.getByRole('button', { name: '就吃这个', exact: true }).click();
    await expect(meals.getByRole('button', { name: '已经决定', exact: true })).toBeDisabled();
    await meals.locator('details').filter({ hasText: '我的餐单' }).locator('summary').click();
    await meals.getByRole('button', { name: /加一道常吃的/ }).click();
    await meals.getByLabel('餐食名称').fill('测试常吃面');
    await meals.getByLabel('店名 / 地点').fill('测试面馆');
    await meals.getByRole('button', { name: '保存到餐单', exact: true }).click();
    await meals.reload();
    const library = meals.locator('details').filter({ hasText: '我的餐单' });
    await library.locator('summary').click();
    await expect(meals.getByRole('heading', { name: '测试常吃面', exact: true })).toBeVisible();
    await meals.getByRole('button', { name: '移除测试常吃面', exact: true }).click();
    await expect(meals.getByRole('heading', { name: '测试常吃面', exact: true })).toHaveCount(0);
    await meals.getByRole('button', { name: /撤销/ }).click();
    await expect(meals.getByRole('heading', { name: '测试常吃面', exact: true })).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await meals.setViewportSize({ width, height: 900 });
      assert(!(await meals.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `Eat overflow ${width}`);
    }
    await meals.getByRole('navigation', { name: '日常工具导航', exact: true }).getByRole('link', { name: '习惯养成', exact: false }).click();
    await expect(meals).toHaveURL(`${origin}/daily`);
    const emptyContext = await browser.newContext({ reducedMotion: 'reduce' });
    await emptyContext.addInitScript(() => localStorage.setItem('ottlog-tool-v1:guest:meals', JSON.stringify({ data: { version: 1, meals: [] }, pending: false })));
    const emptyPage = await emptyContext.newPage();
    await emptyPage.goto(`${origin}/eat`);
    await emptyPage.getByRole('button', { name: '帮我想一想', exact: true }).click();
    for (let i = 0; i < 3; i++) await emptyPage.getByRole('button', { name: '下一步', exact: true }).click();
    await emptyPage.getByRole('button', { name: '看看开饭建议', exact: true }).click();
    await expect(emptyPage.getByRole('heading', { name: '你的餐单还是空的。' })).toBeVisible();
    assert.deepEqual(errors, []);
    console.log('PASS meals: compound preferences / reroll / confirm / add / reload / remove / undo / mobile / links');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
