/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const { load } = require('./tool-backup-fixtures.cjs');
const { tauFoods, startComparison, advanceComparison, normalizeDiningState } = load('app/eat/food-data.ts');
const { foodIdeas, foodQuestions, rankFoodIdeas } = load('app/eat/food-catalog.ts');
assert.equal(tauFoods.length, 18);
assert(foodIdeas.length >= 100);
assert(foodIdeas.every(f => f.name && f.english && (!f.examples.length || f.examples.length === 3)));
assert.equal(new Set(foodIdeas.map(f => f.id)).size, foodIdeas.length);
let model = startComparison(tauFoods), rounds = 0;
while (model) { model = advanceComparison(model, model.pair[0]); rounds++; }
assert.equal(rounds, 17);
assert.deepEqual(rankFoodIdeas(['sweet-any']), rankFoodIdeas([]));
assert(rankFoodIdeas(['sweet-yes']).slice(0, 3).every(f => f.tags.includes('sweet')));
assert.deepEqual(normalizeDiningState({ customFoods: [{ id: 'broken' }], history: [null] }), { version: 1, customFoods: [], history: [] });
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3037';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const output = path.join(__dirname, '../test-results/food-options'); fs.mkdirSync(output, { recursive: true });
async function pick(page, id) {
  const option = page.locator(`[data-option-id="${id}"]`);
  await expect(option).toHaveAttribute('aria-disabled', 'false');
  const point = await option.evaluate(button => {
    const copy = button.querySelector('[class*="optionLabel"]').getBoundingClientRect();
    const x = copy.x + copy.width / 2, y = copy.y + copy.height / 2;
    return { x, y, hit: document.elementFromPoint(x,y)?.closest('[data-option-id]') === button };
  });
  assert(point.hit, `Option ${id} must be an actual pointer target`);
  await page.mouse.click(point.x, point.y); await page.waitForTimeout(510);
}
async function run() {
  const browser = await chromium.launch();
  try {
    for (const viewport of [{ width:1440,height:1000 },{ width:390,height:844 },{ width:360,height:640 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: viewport.width === 360 ? 'reduce' : 'no-preference' });
      await context.route('**/api/**', route => route.fulfill({ json: { authenticated:false,isAdmin:false,csrfToken:'fixture',data:null } }));
      const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin); await expect(page.getByTestId('field-option')).toHaveCount(8);
      await page.waitForTimeout(800); await page.screenshot({ path:path.join(output,`home-${viewport.width}.png`) });
      await pick(page, '/eat'); await expect(page.getByTestId('field-option')).toHaveCount(2);
      await pick(page, 'compare');
      await page.waitForTimeout(800); await page.screenshot({ path:path.join(output,`compare-${viewport.width}.png`) });
      await pick(page,'tau-1');
      await expect(page.locator('[data-option-id="tau-1"]')).toBeVisible();
      await expect(page.locator('[data-option-id="tau-2"]')).toHaveCount(0);
      await expect(page.locator('[data-option-id="tau-3"]')).toBeVisible();
      await page.getByRole('button',{ name:'就吃这个 · 田鸡粥',exact:true }).click();
      await expect(page.getByRole('heading',{ name:'就吃 田鸡粥。' })).toBeVisible();
      await page.reload(); await page.getByRole('button',{ name:'选择记录',exact:true }).click();
      await expect(page.locator('article')).toHaveCount(1);
      await expect(page.locator('article')).toContainText('提前决定');
      await page.getByRole('button',{name:'返回吃什么',exact:true}).click();
      await pick(page,'questions'); await expect(page.getByTestId('food-candidate')).toHaveCount(3);
      const original = await page.getByTestId('food-candidate').allTextContents();
      await pick(page,'sweet-yes'); assert.notDeepEqual(await page.getByTestId('food-candidate').allTextContents(),original);
      await page.getByRole('button',{name:'↶ 返回',exact:true}).click();
      assert.deepEqual(await page.getByTestId('food-candidate').allTextContents(),original);
      await page.waitForTimeout(800); await page.screenshot({ path:path.join(output,`questions-${viewport.width}.png`) });
      for (const question of foodQuestions) { await pick(page,question.options[2].id); await expect(page.getByTestId('food-candidate')).toHaveCount(3); }
      await expect(page.getByRole('heading',{ name:'这三个，哪个最合心意？' })).toBeVisible();
      await page.getByTestId('food-candidate').first().click();
      await expect(page.getByText('已记录这次选择。',{exact:true})).toBeVisible();
      await page.goto(`${origin}/tasks/new`);
      await page.getByRole('textbox',{ name:'任务名称',exact:true }).fill('测试象限任务');
      await page.getByRole('button',{name:'写好了，选四象限 →'}).click();
      await expect(page.getByTestId('field-option')).toHaveCount(4);
      await page.waitForTimeout(800); await page.screenshot({ path:path.join(output,`quadrants-${viewport.width}.png`) });
      await pick(page,'plan'); await expect(page.getByRole('heading',{name:'安排好了。'})).toBeVisible();
      const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-tool-v1:guest:todos')).data.tasks);
      assert.equal(tasks.length,1); assert.equal(tasks[0].important,true); assert.equal(tasks[0].urgent,false);
      await page.getByRole('link',{name:'查看四象限'}).click(); await expect(page.getByText('测试象限任务',{exact:true}).first()).toBeVisible();
      assert.deepEqual(errors,[]); await context.close();
      console.log(`PASS ${viewport.width}: navigation, comparison survival, early record/reload, live top three, backtracking, eight questions, task quadrant persistence`);
    }
    // Full elimination run and Tau-only addition with isolated account API responses.
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    const remote = {};
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/personal-tools/')) {
        const key = url.pathname.split('/').at(-1);
        if (route.request().method() === 'PUT') remote[key] = route.request().postDataJSON().data;
        return route.fulfill({json:{data:remote[key] || null}});
      }
      return route.fulfill({json:{authenticated:true,isAdmin:true,userName:'Tau',csrfToken:'fixture'}});
    });
    const page = await context.newPage(); await page.goto(`${origin}/eat`);
    await pick(page,'compare');
    for(let round=0;round<17;round++) await pick(page,'tau-1');
    await expect(page.getByRole('heading',{name:'就吃 田鸡粥。'})).toBeVisible();
    await expect.poll(()=>remote.dining?.history.length).toBe(1);
    assert.equal(remote.dining.history[0].early,false);
    await page.getByRole('button',{name:'返回吃什么',exact:true}).click();
    await page.getByRole('button',{name:'Tau 的餐单',exact:true}).click();
    await expect(page.locator('article')).toHaveCount(18);
    await page.getByText('添加一个食物',{exact:true}).click();
    await page.getByRole('textbox',{name:'中文名称',exact:true}).fill('Tau 自添菜');
    await page.getByRole('textbox',{name:'英文名称',exact:true}).fill('Tau custom dish');
    await page.getByRole('textbox',{name:'代表菜',exact:true}).fill('测试菜');
    await page.getByRole('button',{name:'添加到比较餐单'}).click();
    await expect(page.locator('article')).toHaveCount(19);
    await expect.poll(()=>remote.dining?.customFoods.length).toBe(1);
    await context.close(); console.log(`PASS model + full 17-round comparison + admin addition + cloud writes; ${foodIdeas.length} bilingual catalog entries`);
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
