const path = require('node:path');
const checkAppearance = require('./prompt-test-helpers.cjs');

module.exports = async function checkAppPrompts({ page, origin, out, width, expect }) {
  await page.goto(`${origin}/?app-prompts-${width}#/pages/close-guard-fixture/index`);
  const prompt = () => page.locator('.app-dialog-panel');
  const request = options => page.evaluate(options => {
    window.__promptAnswer = null;
    window.__miniAppDialogPreview.requestAppConfirmation(options).then(result => { window.__promptAnswer = result; });
  }, options);
  await request({ title: '确认继续？', content: '正文保留内部换行。\n第二行。\n\n  ', confirmText: '继续', confirmColor: '#ff0000' });
  await checkAppearance(prompt(), expect);
  await expect(prompt().locator('.app-dialog-body')).toHaveText('正文保留内部换行。\n第二行。');
  await expect(prompt().locator('.sheet-actions button')).toHaveCSS('background-color', 'rgb(185, 219, 202)');
  await page.screenshot({ path: path.join(out, `prompt-confirm-${width}.png`) });
  await page.keyboard.press('Escape'); await expect(prompt()).toHaveCount(0);
  expect(await page.evaluate(() => window.__promptAnswer)).toEqual({ confirm: false, cancel: true });
  await expect(page.getByRole('dialog', { name: '延迟保存窗口：account-a:item', exact: true })).toBeVisible();

  const content = Array.from({ length: 100 }, (_, i) => `记录${i + 1}：这段长正文应完整保留并在窗口内部滚动。`).join('\n');
  await request({ title: '删除这些记录？', content, intent: 'danger', confirmText: '删除' });
  await expect(prompt().locator('.app-dialog-scroll')).toHaveAttribute('style', /height:/);
  await checkAppearance(prompt(), expect);
  await expect(prompt().locator('.sheet-actions button')).toHaveCSS('background-color', 'rgb(66, 45, 52)');
  const positions = () => prompt().locator('.editor-heading,.sheet-actions').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  const before = await positions();
  const scrolling = await prompt().locator('.app-dialog-scroll').evaluate(node => {
    const overflow = node.scrollHeight - node.clientHeight;
    node.scrollTop = node.scrollHeight;
    return { overflow, top: node.scrollTop, text: node.textContent };
  });
  expect(scrolling.overflow).toBeGreaterThan(100); expect(scrolling.top).toBeGreaterThan(100);
  expect(scrolling.text).toBe(content);
  expect(await positions(), 'Scrolling long text leaves heading and actions fixed').toEqual(before);
  await page.screenshot({ path: path.join(out, `prompt-long-content-${width}.png`) });
  await page.locator('.app-dialog-layer > .sheet-backdrop').click({ position: { x: 3, y: 3 } });
  expect(await page.evaluate(() => window.__promptAnswer)).toEqual({ confirm: false, cancel: true });

  await page.evaluate(() => {
    window.__promptQueue = [];
    for (const title of ['第一个确认', '第二个确认']) window.__miniAppDialogPreview.requestAppConfirmation({ title }).then(result => window.__promptQueue.push([title, result]));
  });
  await expect(prompt()).toHaveAttribute('aria-label', '第一个确认');
  await prompt().getByRole('button', { name: '确认', exact: true }).click();
  await expect(prompt()).toHaveAttribute('aria-label', '第二个确认');
  await prompt().getByRole('button', { name: '关闭提示', exact: true }).click();
  expect(await page.evaluate(() => window.__promptQueue)).toEqual([
    ['第一个确认', { confirm: true, cancel: false }], ['第二个确认', { confirm: false, cancel: true }],
  ]);

  await page.getByRole('button', { name: '关闭测试编辑', exact: true }).click();
  await checkAppearance(prompt(), expect);
  await expect(prompt().locator('.sheet-actions button')).toHaveText(['不保存', '保存']);
  await prompt().getByRole('button', { name: '保存', exact: true }).click();
  await expect(prompt().getByRole('button', { name: '继续编辑', exact: true })).toBeDisabled();
  for (const button of await prompt().locator('.sheet-actions button').all()) await expect(button).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('.app-dialog-layer > .sheet-backdrop').click({ position: { x: 3, y: 3 } });
  await expect(prompt()).toBeVisible();
  await page.evaluate(() => window.__miniCloseGuardControl.resolve()); await expect(prompt()).toHaveCount(0);

  await page.evaluate(() => {
    window.__miniAppDialogPreview.showAppMessage({ title: '第一条反馈', duration: 10000 });
    window.__miniAppDialogPreview.showAppMessage({ title: '替换后的反馈\n  ', duration: 400 });
  });
  await expect(page.getByRole('status')).toHaveText('替换后的反馈');
  await expect(page.getByRole('status')).toHaveCSS('pointer-events', 'none');
  await expect(page.getByRole('status')).toHaveCSS('border-radius', '12px');
  await expect(page.getByRole('status')).toHaveCount(0);
  await request({ title: '页面隐藏取消确认' });
  await page.evaluate(() => { location.hash = '#/pages/posts/index'; }); await expect(prompt()).toHaveCount(0);
  expect(await page.evaluate(() => window.__promptAnswer)).toEqual({ confirm: false, cancel: true });
};
