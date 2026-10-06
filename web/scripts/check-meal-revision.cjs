const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const Module = require('node:module');
const { origin } = JSON.parse(fs.readFileSync('test-results/productivity-runtime.json', 'utf8'));
const dataModule = new Module('meal-game-data');
dataModule._compile(ts.transpileModule(fs.readFileSync('src/app/eat/meal-game-data.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, 'meal-game-data.js');
const { pairMeals, rankMeals } = dataModule.exports;
const meals = ['番茄鸡蛋面', '青菜饭', '鸡肉三明治', '菌菇火锅', '牛肉粉', '牛油果沙拉'].map((name, i) => ({ id: `test-meal-${i}`, name, place: `测试餐厅${i + 1}`, note: '', price: 15 + i * 4, minutes: 10 + i * 3, spicy: i % 2 === 0, vegetarian: i === 1 || i === 5, occasions: ['lunch', 'dinner'], kind: ['noodles', 'rice', 'bread', 'hotpot', 'noodles', 'light'][i] }));
const nutrition = [{ id: 'test-nutrition', name: '测试午餐', date: '2026-09-10', carbs: 55, protein: 25, fat: 15 }];
const seed = { version: 1, meals, nutrition };
assert.equal(pairMeals([]).length, 0); assert.equal(pairMeals(meals.slice(0, 1)).length, 0);
const oddPairs = pairMeals(meals.slice(0, 5)); assert.equal(oddPairs.length, 3); assert(oddPairs.every(p => p[0].id !== p[1].id));
assert.equal(rankMeals(meals, [-1], 'swipe', pairMeals(meals))[0].meal.id, meals[0].id);
assert.equal(rankMeals(meals, [1], 'swipe', pairMeals(meals))[0].meal.id, meals[1].id);
assert.deepEqual(rankMeals(meals, [], 'swipe', pairMeals(meals)), rankMeals(meals, [0], 'swipe', pairMeals(meals)));

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await context.addInitScript(data => localStorage.setItem('ottlog-tool-v1:guest:meals', JSON.stringify({ data, pending: false })), seed);
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/eat');
    const game = page.getByRole('region', { name: '开饭小游戏' });
    const stage = page.getByRole('region', { name: '选餐游戏操作区' });
    const card = stage.locator('[data-meal-card]');
    await expect(card.locator('[data-meal-option]')).toHaveCount(2);
    await expect(card).toContainText(meals[0].name); await expect(card).toContainText(meals[1].name);
    await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    const bounds = await card.boundingBox();
    const lb = await stage.getByRole('button', { name: /^选择左侧菜品/ }).boundingBox();
    const rb = await stage.getByRole('button', { name: /^选择右侧菜品/ }).boundingBox();
    const ub = await stage.getByRole('button', { name: '跳过这两道菜' }).boundingBox();
    assert(lb.x + lb.width <= bounds.x); assert(rb.x >= bounds.x + bounds.width); assert(ub.y >= bounds.y + bounds.height);
    await page.screenshot({ path: 'test-results/meal-revision-wide.png' });
    async function drag(dx, dy, finish = true) {
      await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(350);
      const r = await card.boundingBox(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 8 }); if (finish) await page.mouse.up();
    }
    await drag(20, 9); await expect(card).toContainText(meals[0].name);
    await expect.poll(() => card.evaluate(e => Math.abs(new DOMMatrix(getComputedStyle(e).transform).m41))).toBeLessThan(1);
    await drag(-100, 8, false); await expect(card).toHaveAttribute('data-phase', 'dragging'); await expect(card).toHaveAttribute('data-choice', 'left');
    await page.mouse.up(); await expect(card).toHaveAttribute('data-phase', 'exiting'); await expect(card).toContainText(meals[2].name);
    await expect(game.locator('ol li')).toHaveCount(3); await expect(game.locator('ol li').first()).toContainText(meals[0].name);
    const beforeSkip = await game.locator('ol').innerText(); await drag(2, -100); await expect(card).toContainText(meals[4].name); assert.equal(await game.locator('ol').innerText(), beforeSkip);
    await stage.getByRole('button', { name: '撤回上一步' }).click(); await expect(card).toContainText(meals[2].name);
    await drag(100, -5); await expect(card).toContainText(meals[4].name); await expect(game.locator('ol')).toContainText(meals[3].name);
    await game.getByRole('button', { name: '猜你想吃' }).click(); await expect(card).toHaveAttribute('data-mode', 'quiz'); await expect(card).toContainText('这一顿，想吃点辣的吗？');
    await expect(stage.getByRole('group', { name: '回答问题' }).getByRole('button')).toHaveCount(3);
    await drag(100, 2); await expect(card).toContainText('想把预算控制在 20 元以内吗？');
    await stage.focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight'); await expect(card).toContainText('希望 15 分钟内就能开饭吗？'); await page.waitForTimeout(400); await expect(card).toContainText('希望 15 分钟内就能开饭吗？');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const beforeUnsure = await game.locator('ol').innerText(); await stage.getByRole('button', { name: '不确定', exact: true }).click(); assert.equal(await game.locator('ol').innerText(), beforeUnsure);
    for (let i = 0; i < 5; i++) await stage.getByRole('button', { name: '是', exact: true }).click();
    await expect(stage.getByRole('heading')).toHaveText('这一餐，答案更近了。');
    await expect(card).toHaveCount(0); await game.getByRole('button', { name: '就吃这个', exact: true }).first().click(); await expect(game.getByRole('status')).toContainText('今天就吃');
    await expect(page.getByRole('button', { name: /数据导入 \/ 导出/ })).toHaveCount(1);
    await page.getByRole('button', { name: /数据导入 \/ 导出/ }).click();
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: /导出 JSON/ }).click(); const backup = JSON.parse(fs.readFileSync(await (await downloadPromise).path(), 'utf8'));
    assert.deepEqual(backup.data, seed);
    backup.data.meals = [{ ...meals[0], id: 'imported-meal', name: '新导入的菜品' }]; backup.data.nutrition = [{ ...nutrition[0], id: 'imported-nutrition', name: '新导入的饮食记录' }];
    await page.getByLabel('选择备份文件').setInputFiles({ name: 'meal-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.getByRole('button', { name: '确认导入', exact: true }).click(); await expect(page.getByRole('dialog').getByRole('status').first()).toContainText('导入已应用');
    const merged = await page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-tool-v1:guest:meals')).data); assert.equal(merged.meals.length, 7); assert.equal(merged.nutrition.length, 2);
    await page.getByRole('button', { name: '关闭数据备份' }).click();
    assert.deepEqual(errors, []);

    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await touchContext.addInitScript(data => localStorage.setItem('ottlog-tool-v1:guest:meals', JSON.stringify({ data, pending: false })), seed);
    const touchPage = await touchContext.newPage(); await touchPage.goto(origin + '/eat');
    const touchGame = touchPage.getByRole('region', { name: '开饭小游戏' }), touchStage = touchPage.getByRole('region', { name: '选餐游戏操作区' }), touchCard = touchStage.locator('[data-meal-card]');
    const client = await touchContext.newCDPSession(touchPage);
    for (const mode of ['左右开饭', '猜你想吃']) {
      await touchGame.getByRole('button', { name: mode }).click(); await touchCard.scrollIntoViewIfNeeded(); await touchPage.waitForTimeout(400);
      const r = await touchCard.boundingBox(), x = r.x + r.width / 2, y = r.y + r.height / 2; const scroll = await touchPage.evaluate(() => scrollY);
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 3, y: y - 50 }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 3, y: y - 105 }] });
      await expect(touchCard).toHaveAttribute('data-choice', 'up'); assert.equal(await touchPage.evaluate(() => scrollY), scroll);
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(touchCard).toContainText(mode === '左右开饭' ? meals[2].name : '想把预算控制在 20 元以内吗？');
    }
    await touchGame.getByRole('button', { name: '左右开饭' }).click();
    for (const width of [390, 320]) {
      await touchPage.setViewportSize({ width, height: 844 }); await touchCard.scrollIntoViewIfNeeded(); await touchPage.waitForTimeout(350);
      assert(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at ' + width);
      const c = await touchCard.boundingBox(), l = await touchStage.getByRole('button', { name: /^选择左侧菜品/ }).boundingBox(), r = await touchStage.getByRole('button', { name: /^选择右侧菜品/ }).boundingBox();
      assert(l.x + l.width <= c.x + 1 && r.x >= c.x + c.width - 1, 'Directions remain beside card');
      await touchPage.screenshot({ path: `test-results/meal-revision-${width}.png` });
    }
    console.log('PASS distinct meal pair and question modes; left/right/up gestures; rail placement; rollback; ranking; real mobile touch; reduce-motion; single complete backup export + meal/nutrition merge; 1920/390/320 layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });