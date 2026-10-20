const { goToPageSection } = require('./page-section-test-helpers.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(name) {
  const module = { exports: {} };
  const input = fs.readFileSync(path.join(__dirname, `../src/lib/${name}.ts`), 'utf8');
  new Function('module', 'exports', ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(module, module.exports);
  return module.exports;
}
const { makeAlignedChoiceRegions, findAlignedChoiceRegion } = load('choice-aligned-geometry');
const { choiceQuestions } = load('choice-data');
function checkGeometry() {
  for (let count = 2; count <= 9; count += 1) {
    const regions = makeAlignedChoiceRegions(count);
    let area = 0;
    for (const [index, { points, center, copySize }] of regions.entries()) {
      area += Math.abs(points.reduce((sum, [x, y], at) => {
        const next = points[(at + 1) % points.length];
        return sum + x * next[1] - next[0] * y;
      }, 0)) / 2;
      assert.equal(findAlignedChoiceRegion(regions, center), index);
      for (const x of [-1, 1]) for (const y of [-1, 1]) assert.equal(findAlignedChoiceRegion(regions, [center[0] + copySize[0] * x / 2, center[1] + copySize[1] * y / 2]), index, `${count}/${index}: native button must stay inside its color region`);
    }
    assert.ok(Math.abs(area - 1) < 1e-9, `${count}: regions completely fill the board`);
    for (let x = .017; x < 1; x += .031) for (let y = .013; y < 1; y += .037) assert.ok(findAlignedChoiceRegion(regions, [x, y]) >= 0, `${count}: no untappable gap`);
    if (count >= 4) {
      const key = points => points.map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`).sort().join(';');
      const shapes = regions.map(region => key(region.points));
      for (const region of regions) assert.ok(shapes.includes(key(region.points.map(([x, y]) => [1 - x, y]))), `${count}: left and right shapes mirror each other`);
    }
  }
  const four = makeAlignedChoiceRegions(4);
  assert.ok(four.every(region => region.points.length === 3 && region.points.some(([x, y]) => x === .5 && y === .5)), 'Four regions meet at the X center');
}

module.exports = async function checkChooseLayout({ page, origin, out, width, expect }) {
  checkGeometry();
  await page.goto(`${origin}/#/pages/choose/index`);
  for (let step = 0; step < choiceQuestions.length; step += 1) {
    const question = choiceQuestions[step], regions = makeAlignedChoiceRegions(question.options.length);
    await expect(page.locator('.choice-prompt')).toHaveText(question.prompt);
    await expect(page.locator('.choice-aligned-option')).toHaveCount(question.options.length);
    await expect.poll(() => page.locator('.choice-aligned-background').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    const layout = await page.evaluate(() => {
      const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
      return {
        viewport: rect(document.querySelector('.preview-content')), core: rect(document.querySelector('#page-core')),
        board: rect(document.querySelector('.choice-aligned-board')), header: rect(document.querySelector('.choice-plate')), footer: rect(document.querySelector('.choice-bottom')),
        buttons: [...document.querySelectorAll('.choice-aligned-option')].map(node => ({ box: rect(node), text: [...node.children].map(rect) })),
      };
    });
    assert.ok(Math.abs(layout.core.height - layout.viewport.height) < 2, `${width}/${step}: core fills the visible page`);
    assert.ok(layout.header.bottom <= layout.board.y + 1 && layout.board.bottom <= layout.footer.y + 1, `${width}/${step}: board does not overlap header or footer`);
    assert.ok(layout.footer.bottom <= layout.viewport.bottom + 1, `${width}/${step}: footer stays visible`);
    assert.ok(layout.board.x >= layout.viewport.x && layout.board.right <= layout.viewport.right + 1);
    assert.ok(layout.board.height > 260, `${width}/${step}: color choices keep a usable area`);
    for (const [index, { box, text }] of layout.buttons.entries()) for (const bounds of text) assert.ok(bounds.x >= box.x - 1 && bounds.right <= box.right + 1 && bounds.y >= box.y - 1 && bounds.bottom <= box.bottom + 1, `${width}/${step}/${index}: option copy fits its native button`);
    await page.screenshot({ path: path.join(out, `choose-aligned-${step + 1}-${width}.png`) });

    // Exercise every colored area beyond its native text button. The simulated
    // tap carries WeChat's detail.x/y coordinates, avoiding browser clip-path hit tests.
    for (let index = 0; index < question.options.length; index += 1) {
      const { points, center } = regions[index], vertex = points[0];
      const normalized = [center[0] * .24 + vertex[0] * .76, center[1] * .24 + vertex[1] * .76];
      await page.locator('.choice-aligned-board').evaluate((board, position) => {
        const box = board.getBoundingClientRect();
        const event = new Event('click', { bubbles: true });
        Object.defineProperty(event, 'detail', { value: { x: box.left + box.width * position[0], y: box.top + box.height * position[1] } });
        board.dispatchEvent(event);
      }, normalized);
      if (question.options[index].custom) {
        await expect(page.locator('.choice-sheet')).toBeVisible();
        await page.locator('.choice-custom-input').fill('给今天一点空白');
        await page.getByRole('button', { name: '用这句话', exact: true }).click();
      }
      if (step === choiceQuestions.length - 1) {
        await expect(page.locator('.choice-result-page')).toBeVisible();
        await expect(page.locator('.choice-closing')).toContainText(question.options[index].custom ? '给今天一点空白' : question.options[index].label);
        await page.locator('.choice-trail-button').nth(step).click();
      } else {
        await expect(page.locator('.choice-prompt')).toHaveText(choiceQuestions[step + 1].prompt);
        await page.getByRole('button', { name: '上一步', exact: true }).click();
      }
      await expect(page.locator('.choice-prompt')).toHaveText(question.prompt);
      await expect(page.locator('.choice-aligned-option.is-selected .choice-aligned-label')).toHaveText(question.options[index].label);
    }
    // Native label buttons and reading-mode options remain usable too.
    await page.locator('.choice-aligned-option').first().click();
  }
  await expect(page.locator('.choice-result-page')).toBeVisible();
  await page.locator('.choice-trail-button').nth(2).click();
  await expect(page.locator('.choice-aligned-option')).toHaveCount(4);
  await page.locator('.choice-aligned-option').first().click();
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeEnabled();
  await goToPageSection(page, 'page-more');
  await expect(page.locator('#page-more')).toBeInViewport();
  await page.locator('.choice-list-option').first().click();
  await expect(page.locator('.choice-prompt')).toHaveText(choiceQuestions[4].prompt);
  await page.getByRole('button', { name: '重来 ↻', exact: true }).click();
  await expect(page.locator('.choice-prompt')).toHaveText(choiceQuestions[0].prompt);
  console.log(`${width}: symmetric choice boards, all 48 color hit regions, native labels, history editing, custom ending and restart passed.`);
};
if (require.main === module) { checkGeometry(); console.log('Symmetric choice geometry passed: complete coverage, mirrored boundaries, X partition and native button containment.'); }
