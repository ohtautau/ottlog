const path = require('node:path');

module.exports = async function checkDomainRecordEdit({ page, origin, out, width, expect }) {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1cAAAAASUVORK5CYII=';
  const seed = { version: 1, completedGoals: [], domains: [
    { id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [],
      positiveRecords: [
        { id: 'old-positive', content: '**早期正记录**\n\n第二段', createdAt: '2026-10-02T00:00:00.000Z', images: [{ id: 'original-image', dataUrl: png }] },
        { id: 'latest-positive', content: '最新正记录', createdAt: '2026-10-06T00:00:00.000Z' },
        { id: 'oldest-positive', content: '最早正记录', createdAt: '2026-10-01T00:00:00.000Z' },
      ], negativeRecords: [{ id: 'negative-a', content: '负记录A', createdAt: '2026-10-04T00:00:00.000Z' }, { id: 'negative-b', content: '负记录B', createdAt: '2026-10-03T00:00:00.000Z' }] },
    { id: 'life', name: '生活', iconId: 'home', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] },
  ] };
  async function fresh(suffix) {
    await page.goto(`${origin}/?record-edit-${width}-${suffix}#/pages/posts/index`);
    await page.evaluate(seed => {
      localStorage.clear(); window.__miniFixture.guestToolStates = { domains: seed };
      localStorage.setItem('ottlog-mini-tool-v1:guest:domains', JSON.stringify({ data: seed, revision: 0, pending: false }));
      localStorage.setItem('ottlog-mini-domain-record-edit-v1:reader:other-owner:latest-positive', '"其他账号草稿"');
      window.__miniNotices.length = 0; location.hash = '#/pages/domain-detail/index?id=work';
    }, seed);
    await expect(page.getByRole('button', { name: '编辑正记录：最新正记录', exact: true })).toBeVisible();
  }
  const editor = () => page.locator('.domain-sheet-record-edit');
  const input = () => editor().getByRole('textbox', { name: '记录内容', exact: true });
  const column = kind => page.locator(`.domain-record-column.is-${kind}`);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:domains')).data);
  // Compact image cards can place their center inside the preview image.
  // Open editing from the card's signed text edge; images keep their own action.
  const open = (sign, content) => page.getByRole('button', { name: `编辑${sign}记录：${content}`, exact: true }).click({ position: { x: 3, y: 3 } });
  const save = () => editor().getByRole('button', { name: '保存', exact: true });
  const remove = () => editor().locator('.record-edit-delete');
  const close = async () => {
    await editor().getByRole('button', { name: '关闭记录编辑', exact: true }).click();
    const prompt = page.getByRole('dialog', { name: '保存修改？', exact: true });
    await expect.poll(async () => !await editor().count() || await prompt.isVisible()).toBe(true);
    if (await prompt.isVisible()) await prompt.getByRole('button', { name: '不保存', exact: true }).click();
    await expect(editor()).toHaveCount(0);
  };
  await fresh('basic');
  await expect(page.locator('.domain-record-add')).toHaveCount(0);
  await expect(page.locator('.domain-record .domain-delete')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^删除[正负]记录/ })).toHaveCount(0);
  await expect(column('positive').locator('.domain-record-content')).toHaveText(['最新正记录', '**早期正记录**\n\n第二段', '最早正记录']);
  await expect(column('positive').locator('strong')).toHaveCount(0);
  await expect(column('positive').locator('.domain-record-plain').nth(1)).toHaveCSS('white-space', 'pre-wrap');
  const geometry = await page.locator('.domain-record').evaluateAll(nodes => nodes.map(node => ({ height: node.getBoundingClientRect().height, padding: getComputedStyle(node).paddingTop, contentPadding: getComputedStyle(node.querySelector('.domain-record-content')).paddingTop, nestedButtons: node.querySelectorAll('button').length })));
  for (const box of geometry) { expect(box.height).toBeGreaterThanOrEqual(40); expect(box.padding).toBe('2px'); expect(box.contentPadding).toBe('0px'); expect(box.nestedButtons).toBe(0); }
  await page.screenshot({ path: path.join(out, `record-list-${width}.png`) });
  await column('positive').locator('.domain-record-images img').click(); await expect(editor()).toHaveCount(0); await expect(page.locator('.entry-composer')).toHaveCount(0);
  await column('positive').locator('.domain-record-plain').nth(1).click(); await expect(editor()).toBeVisible();
  await expect(page.locator('.entry-composer')).toHaveCount(0);
  await expect(editor().locator('.record-edit-meta')).toContainText('创建日期：2026.10.02');
  await expect(input()).toHaveValue('**早期正记录**\n\n第二段'); await expect(editor().locator('.memo-image')).toHaveCount(1);
  const deletion = await remove().boundingBox(); expect(deletion.width).toBe(40); expect(deletion.height).toBe(40); await expect(remove()).toHaveText(''); await expect(remove().locator('.delete-symbol')).toHaveCount(1);
  await expect(editor().locator('.memo-editor-modes,.memo-body-preview')).toHaveCount(0);
  await expect(editor().getByRole('button', { name: '插入图片', exact: true })).toHaveCount(0);
  await input().fill('**编辑后的正记录**');
  await page.screenshot({ path: path.join(out, `record-editor-${width}.png`) });
  for (const button of [save(), remove()]) await expect(button).toBeInViewport();
  await expect(editor().locator('.record-edit-meta button')).toHaveCount(0);
  const saveBox = await save().boundingBox();
  expect(saveBox.x - deletion.x - deletion.width).toBeCloseTo(8, 0);
  expect(saveBox.y + saveBox.height / 2).toBeCloseTo(deletion.y + deletion.height / 2, 0);
  await page.locator('.domain-backdrop').click({ position: { x: 3, y: 3 } });
  await page.getByRole('dialog', { name: '保存修改？', exact: true }).getByRole('button', { name: '不保存', exact: true }).click();
  await expect(editor()).toHaveCount(0); expect(await saved()).toEqual(seed);
  const draftKey = 'ottlog-mini-domain-record-edit-v1:guest:old-positive';
  const storedDraft = await page.evaluate(key => localStorage.getItem(key), draftKey);
  expect(storedDraft.split(png).length - 1, 'Original and editing images are stored once').toBe(1);
  await page.reload(); await open('正', '**早期正记录**\n\n第二段'); await expect(input()).toHaveValue('**编辑后的正记录**');
  await expect(editor().locator('.memo-image')).toHaveCount(1);
  await expect(editor().locator('.memo-insert-image')).toHaveCount(0);
  await save().click(); await expect(editor()).toHaveCount(0);
  const edited = await saved(), changed = edited.domains[0].positiveRecords[0];
  expect(changed).toMatchObject({ id: 'old-positive', createdAt: seed.domains[0].positiveRecords[0].createdAt, content: '**编辑后的正记录**' });
  expect(changed.images).toEqual(seed.domains[0].positiveRecords[0].images);
  expect(edited.domains[1]).toEqual(seed.domains[1]); expect(edited.domains[0].negativeRecords).toEqual(seed.domains[0].negativeRecords);
  expect(edited.domains[0].positiveRecords.slice(1)).toEqual(seed.domains[0].positiveRecords.slice(1));
  await expect(column('positive').locator('.domain-record-content').first()).toHaveText('最新正记录');
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
  await page.reload(); expect(await saved()).toEqual(edited);
  await open('负', '负记录A'); await expect(editor().locator('.record-edit-meta')).toContainText('创建日期：2026.10.04'); await input().fill('取消的负记录编辑');
  await close(); expect(await saved()).toEqual(edited);
  await open('负', '负记录A'); await expect(input()).toHaveValue('取消的负记录编辑'); await remove().click(); await expect(editor()).toHaveCount(0);
  await expect(column('negative').locator('.domain-record')).toHaveCount(1); await expect(page.locator('.entry-composer')).toHaveCount(0);
  await page.reload(); expect((await saved()).domains[0].negativeRecords).toEqual([seed.domains[0].negativeRecords[1]]);
  expect(await page.evaluate(() => localStorage.getItem('ottlog-mini-domain-record-edit-v1:reader:other-owner:latest-positive'))).toBe('"其他账号草稿"');
  if (width !== 360) return;
  await fresh('empty-and-retry'); await open('正', '最新正记录'); await input().fill(''); await expect(save()).toBeDisabled(); await close();
  await page.reload(); await open('正', '最新正记录'); await expect(input()).toHaveValue(''); await input().fill('失败后的正记录');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; }); await save().click();
  await expect(editor().getByRole('alert')).toContainText('本机存储不可用'); await expect(input()).toHaveValue('失败后的正记录'); await expect(input()).toBeDisabled(); await expect(remove()).toBeDisabled();
  expect(await saved()).toEqual(seed);
  await close(); await open('正', '失败后的正记录'); await expect(input()).toHaveValue('失败后的正记录'); await expect(remove()).toBeDisabled();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; }); await save().click(); await expect(editor()).toHaveCount(0);
  const retried = (await saved()).domains[0].positiveRecords.find(record => record.id === 'latest-positive');
  expect(retried).toMatchObject({ content: '失败后的正记录', createdAt: seed.domains[0].positiveRecords[1].createdAt });
  await open('负', '负记录B'); await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; }); await remove().click();
  await expect(editor().getByRole('alert')).toContainText('本机存储不可用'); await expect(save()).toBeDisabled();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; }); await remove().click(); await expect(editor()).toHaveCount(0);
  expect((await saved()).domains[0].negativeRecords.map(record => record.id)).toEqual(['negative-a']);
  await fresh('draft-write-failure'); await open('正', '最新正记录');
  await page.evaluate(() => {
    window.__recordEditSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('ottlog-mini-domain-record-edit-v1:')) throw new Error('编辑草稿暂时无法写入');
      return window.__recordEditSetItem.call(this, key, value);
    };
  });
  await input().fill('草稿写入失败也不能丢失');
  await expect(editor().getByRole('alert')).toContainText('编辑草稿暂时无法写入');
  await editor().getByRole('button', { name: '关闭记录编辑', exact: true }).click();
  await page.getByRole('dialog', { name: '保存修改？', exact: true }).getByRole('button', { name: '不保存', exact: true }).click();
  await expect(editor()).toBeVisible(); await expect(input()).toHaveValue('草稿写入失败也不能丢失');
  await page.evaluate(() => { Storage.prototype.setItem = window.__recordEditSetItem; delete window.__recordEditSetItem; });
  await close(); await page.reload(); await open('正', '最新正记录'); await expect(input()).toHaveValue('草稿写入失败也不能丢失'); expect(await saved()).toEqual(seed); await close();
  await fresh('account-picture'); await open('正', '最新正记录'); await input().fill('旧账号编辑草稿');
  await expect(editor().locator('.memo-insert-image')).toHaveCount(0);
  await page.evaluate(seed => {
    window.__miniFixture.accountToolStates = { 'record-reader': { domains: seed } };
    window.__miniFixture.sessionProfile = { authenticated: true, userName: 'record-reader', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session');
  }, seed);
  await expect(editor()).toHaveCount(0);
  const guestDraft = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-domain-record-edit-v1:guest:latest-positive'));
  expect(guestDraft.record.content).toBe('旧账号编辑草稿'); expect(guestDraft.images).toEqual([]);
  await open('正', '最新正记录'); await expect(input()).toHaveValue('最新正记录'); await close();
  expect(await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-tool-v1:reader:record-reader:domains').data)).toEqual(seed);
};
