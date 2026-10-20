const path = require('node:path');

module.exports = async function checkMealEditor({ page, origin, out, width, expect, checkCreateButton }) {
  const sheet = () => page.locator('.meal-sheet');
  const mealCard = name => page.locator('.meal-library-item').filter({ has: page.locator('.meal-entry-top > span').filter({ hasText: name }) });
  const kindPanel = () => page.locator('.meal-kind-options .form-popover-panel');
  const occasionPanel = () => page.locator('.meal-occasion-options .form-popover-panel');
  const prompt = () => page.getByRole('dialog', { name: '保存修改？', exact: true });
  const field = name => sheet().getByLabel(name, { exact: true });
  await page.goto(`${origin}/?meal-editor-${width}#/pages/posts/index`);
  await page.evaluate(() => {
    const now = new Date(), date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const meal = { place: '', note: '已有备注', spicy: false, vegetarian: false, kind: 'rice' };
    window.__miniFixture.guestToolStates = { meals: { version: 1, meals: [
      { ...meal, id: 'common-a', name: '常吃的午餐', price: 20, minutes: 15, occasions: ['lunch'] },
      { ...meal, id: 'common-b', name: '常吃的晚餐', price: 20, minutes: 15, occasions: ['dinner'] },
      { ...meal, id: 'custom-old', name: '原有自定义餐食', price: 88.75, minutes: 1440, occasions: ['breakfast', 'snack'], kind: 'noodles' },
    ], nutrition: [{ id: 'nutrition-old', date, name: '原有营养记录', carbs: 12.3, protein: 4.5, fat: 0 }] } };
    location.hash = '#/pages/meals/index';
  });

  await page.getByRole('button', { name: /^我的餐单/ }).click();
  await expect(page.locator('.meal-library-item')).toHaveCount(3);
  await checkCreateButton(page.getByRole('button', { name: '添加常用餐食', exact: true }), '添加常用餐食', expect);
  await page.getByRole('button', { name: '添加常用餐食', exact: true }).click();
  await expect(sheet()).toBeVisible();
  await expect(sheet().getByRole('button', { name: '取消', exact: true })).toHaveCount(0);
  await sheet().getByRole('button', { name: '关闭餐食编辑', exact: true }).click();
  await expect(sheet()).toHaveCount(0); await expect(prompt()).toHaveCount(0);
  await page.getByRole('button', { name: '添加常用餐食', exact: true }).click();
  await expect(sheet().getByRole('button', { name: '保存常用餐食', exact: true })).toHaveText('保存');
  await expect(field('餐食花费')).toHaveValue('20');
  await expect(field('餐食准备时间')).toHaveValue('15');
  await expect(field('餐食备注')).toBeAttached();
  const noteOrder = await sheet().evaluate(node => {
    const inputs = [...node.querySelectorAll('.meal-sheet-fields input')];
    return inputs.slice(0, 3).map(input => input.getAttribute('aria-label'));
  });
  expect(noteOrder).toEqual(['餐食名称', '餐食备注', '餐食地点']);
  await field('餐食名称').fill('统一表单新餐食');
  await field('餐食备注').fill('备注始终保留');
  await field('餐食地点').fill('测试餐厅');
  await field('餐食花费').fill('99.5');
  await field('餐食准备时间').fill('90');
  await page.getByRole('button', { name: '选择餐食类型', exact: true }).click();
  await expect(kindPanel()).toBeVisible();
  await kindPanel().getByRole('button', { name: '热锅热汤', exact: true }).click();
  await expect(kindPanel()).toHaveCount(0);
  await expect(page.getByRole('button', { name: '选择餐食类型', exact: true })).toContainText('热锅热汤');

  await page.getByRole('button', { name: '选择用餐时段', exact: true }).click();
  await occasionPanel().getByRole('button', { name: '午餐', exact: true }).click();
  await occasionPanel().getByRole('button', { name: '晚餐', exact: true }).click();
  await occasionPanel().getByRole('button', { name: '完成', exact: true }).click();
  await sheet().getByRole('button', { name: '保存常用餐食', exact: true }).click();
  await expect(sheet()).toBeVisible();
  await expect(page.locator('.meal-form-message')).toContainText('至少选一个用餐时段');
  await expect(page.locator('.meal-library-item')).toHaveCount(3);
  await expect(field('餐食备注')).toHaveValue('备注始终保留');
  await page.getByRole('button', { name: '选择用餐时段', exact: true }).click();
  await occasionPanel().getByRole('button', { name: '早餐', exact: true }).click();
  await occasionPanel().getByRole('button', { name: '加餐', exact: true }).click();
  await occasionPanel().getByRole('button', { name: '完成', exact: true }).click();
  await sheet().getByRole('button', { name: '关闭餐食编辑', exact: true }).click();
  await expect(prompt()).toBeVisible();
  await prompt().getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(field('餐食名称')).toHaveValue('统一表单新餐食');
  await sheet().getByRole('button', { name: '关闭餐食编辑', exact: true }).click();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['meals']; });
  await prompt().getByRole('button', { name: '保存', exact: true }).click();
  await expect(prompt()).toHaveCount(0); await expect(sheet()).toBeVisible();
  await expect(page.locator('.meal-form-message')).toContainText('本机存储不可用');
  await expect(field('餐食名称')).toHaveValue('统一表单新餐食'); await expect(field('餐食名称')).toBeDisabled();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await sheet().getByRole('button', { name: '关闭餐食编辑', exact: true }).click();
  await prompt().getByRole('button', { name: '保存', exact: true }).click();
  await expect(sheet()).toHaveCount(0);
  await expect(page.locator('.meal-library-item')).toHaveCount(4);
  await expect(mealCard('统一表单新餐食')).toContainText('备注始终保留');
  await expect(mealCard('统一表单新餐食')).toContainText('¥99.5');
  await expect(mealCard('统一表单新餐食')).toContainText('90 分钟');
  await expect(mealCard('统一表单新餐食')).toContainText('早餐 / 加餐');

  // Returning uses the saved original record rather than a separate form cache.
  await page.evaluate(() => { location.hash = '#/pages/posts/index'; });
  await page.evaluate(() => { location.hash = '#/pages/meals/index'; });
  await page.getByRole('button', { name: /^我的餐单/ }).click();
  await mealCard('原有自定义餐食').getByRole('button', { name: '编辑常吃餐品：原有自定义餐食', exact: true }).click();
  await expect(field('餐食花费')).toHaveValue('88.75');
  await expect(field('餐食准备时间')).toHaveValue('1440');
  await expect(page.getByRole('button', { name: '选择餐食类型', exact: true })).toContainText('面与粉');
  await field('餐食备注').fill('原有餐食修改备注');
  await sheet().locator('.meal-sheet-scroll').evaluate(node => { node.scrollTop = 0; });
  const geometry = await sheet().evaluate(node => {
    const rect = node.getBoundingClientRect(), viewport = document.querySelector('.preview-content').getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewportTop: viewport.top, viewportBottom: viewport.bottom, overflow: node.scrollWidth - node.clientWidth };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewportTop - 1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  expect(geometry.overflow).toBeLessThanOrEqual(2);
  await page.screenshot({ path: path.join(out, `meal-custom-editor-${width}.png`) });
  await sheet().getByRole('button', { name: '保存常用餐食', exact: true }).click();
  await expect(page.locator('.meal-library-item')).toHaveCount(4);
  await expect(mealCard('原有自定义餐食')).toContainText('原有餐食修改备注');
  await expect(mealCard('原有自定义餐食')).toContainText('¥88.75');
  await expect(mealCard('原有自定义餐食')).toContainText('1440 分钟');
  await page.getByRole('button', { name: '添加常用餐食', exact: true }).click();
  await field('餐食名称').fill('取消不创建餐食');
  await sheet().getByRole('button', { name: '关闭餐食编辑', exact: true }).click();
  await expect(prompt()).toBeVisible(); await prompt().getByRole('button', { name: '不保存', exact: true }).click();
  await expect(page.locator('.meal-library-item')).toHaveCount(4);
  await expect(mealCard('取消不创建餐食')).toHaveCount(0);

  // The ordinary nutrition editor keeps real amounts and reuses the saved menu.
  await page.getByRole('button', { name: '饮食记录', exact: true }).click();
  await checkCreateButton(page.getByRole('button', { name: '记录餐单', exact: true }), '记录餐单', expect);
  await expect(page.locator('.meal-entry')).toHaveCount(1);
  await page.locator('.meal-entry').getByRole('button', { name: /^编辑饮食记录：/ }).click();
  await expect(sheet().getByRole('button', { name: '保存餐单记录', exact: true })).toHaveText('保存');
  await expect(page.getByPlaceholder('例如：午餐的鸡肉饭')).toHaveValue('原有营养记录');
  await expect(page.locator('.meal-nutrient-fields input').nth(0)).toHaveValue('12.3');
  await expect(page.locator('.meal-nutrient-fields input').nth(1)).toHaveValue('4.5');
  await expect(page.locator('.meal-nutrient-fields input').nth(2)).toHaveValue('0');
  await page.screenshot({ path: path.join(out, `meal-nutrition-editor-${width}.png`) });
  await page.getByRole('button', { name: '从餐单选择', exact: true }).click();
  await page.locator('.meal-pick-existing .form-popover-panel').getByRole('button', { name: '统一表单新餐食', exact: true }).click();
  await expect(page.getByPlaceholder('例如：午餐的鸡肉饭')).toHaveValue('统一表单新餐食');
  await sheet().getByRole('button', { name: '关闭餐食编辑', exact: true }).click();
  await expect(prompt()).toBeVisible(); await prompt().getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('.meal-entry')).toHaveCount(1);
  await expect(page.locator('.meal-entry')).toContainText('统一表单新餐食');
  await expect(page.locator('.meal-entry')).toContainText('12.3 g');
  await expect(page.locator('.meal-entry')).toContainText('4.5 g');
};
