const confirmUnsavedClose = require('./confirm-unsaved-close.cjs');
const path = require('node:path');
const sharp = require('../../web/node_modules/sharp');
const domainChoice = require('./check-progress-domain-choice.cjs');
const { swipeMode } = require('./entry-swipe-test-helpers.cjs');

module.exports = async function checkProgressCreation({ page, origin, out, width, expect, checkButtonAppearance }) {
  const photo = (await sharp({ create: { width: 320, height: 200, channels: 3, background: '#b9dbca' } }).png().toBuffer()).toString('base64');
  const seed = {
    todos: { version: 1, tasks: [], categories: [] }, memos: { version: 1, notes: [] },
    domains: { version: 1, domains: [{ id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] },
  };
  const composer = () => page.locator('.entry-composer');
  const mode = name => composer().getByRole('button', { name: `创建类型：${name}`, exact: true });
  const swipe = (name, gesture, target, context) => swipeMode({ page, composer: composer(), expect, name, gesture, target, context });
  const field = (slot = 'positive') => composer().locator(`.progress-record-field[data-progress-slot="${slot}"]`);
  const input = (slot = 'positive') => field(slot).getByRole('textbox', { name: slot === 'positive' ? '记录内容' : '第二条记录内容', exact: true });
  const save = () => composer().getByRole('button', { name: '保存记录', exact: true });
  const kind = (slot, sign) => field(slot).getByRole('button', { name: `${slot === 'positive' ? '第一' : '第二'}条记录类型：${sign === 'positive' ? '正' : '负'}记录`, exact: true });
  const domain = () => composer().getByRole('button', { name: '选择记录领域', exact: true });
  const read = (tool, owner = 'guest') => page.evaluate(({ tool, owner }) => window.__miniPreviewControl.readStorage(`ottlog-mini-tool-v1:${owner}:${tool}`)?.data || window.__miniFixture.guestToolStates?.[tool], { tool, owner });
  const close = async () => { await composer().getByRole('button', { name: '关闭编辑', exact: true }).click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0); };
  async function fresh(suffix, source = seed) {
    await page.goto(`${origin}/?progress-${suffix}-${width}#/pages/posts/index`);
    await page.evaluate(({ seed, photo }) => { localStorage.clear(); window.__miniFixture.guestToolStates = seed; for (const [tool, data] of Object.entries(seed)) localStorage.setItem(`ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 })); window.__miniFixture.memoImageBase64 = photo; location.hash = '#/pages/index/index'; }, { seed: source, photo });
    await expect(page.locator('.today-capture')).toBeVisible();
  }
  async function openProgress() {
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await mode('进展').click();
    await expect(mode('进展')).toHaveAttribute('aria-pressed', 'true');
    await expect(composer().locator('.memo-insert-image')).toHaveCount(0);
    await page.waitForTimeout(200);
    await expect(input(), 'Switching to progress does not automatically reopen the keyboard').not.toBeFocused();
  }
  async function restoreLegacyImage(slot) {
    await close();
    await page.evaluate(({ slot, photo }) => {
      const key = 'ottlog-mini-entry-draft-v1:guest', draft = window.__miniPreviewControl.readStorage(key);
      draft.progress[slot].images = [{ id: `legacy-${slot}-image`, dataUrl: `data:image/png;base64,${photo}` }];
      localStorage.setItem(key, JSON.stringify(draft));
    }, { slot, photo });
    await page.reload(); await openProgress();
    await expect(field(slot).locator('.memo-image')).toHaveCount(1);
  }
  async function chooseDomain(label) {
    await domain().click();
    await composer().locator('.form-popover-panel').getByRole('button', { name: `记录到${label}`, exact: true }).click();
    await expect(composer().locator('.form-popover-panel')).toHaveCount(0);
    await expect(domain()).toHaveAttribute('aria-expanded', 'false');
    await expect(domain().locator('.select-chevron.is-expanded')).toHaveCount(0);
    await expect(domain()).toHaveText(label);
  }
  await fresh('switch');
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await composer().locator('.todo-title-input').fill('切换前的任务标题');
  await composer().locator('.todo-description').fill('**共用备注**');
  await composer().getByRole('textbox', { name: '下一步任务 1', exact: true }).fill('保留下一步');
  await swipe('备忘', {}, undefined, 'The progress workflow advances through memo with a left swipe');
  await swipe('进展', {}, undefined, 'The next left swipe opens the independent progress fields');
  await expect(composer().getByRole('button', { name: '选择记录类型', exact: true })).toHaveCount(0);
  await expect(input()).toHaveValue('切换前的任务标题');
  await expect(input()).toHaveCount(1); await expect(save()).toBeEnabled();
  await expect(composer().locator('.progress-record-field')).toHaveCount(2);
  await expect(composer().locator('.entry-footer button')).toHaveText(['', '保存记录']);
  for (const slot of ['positive', 'negative']) {
    await expect(kind(slot, slot)).toHaveAttribute('aria-pressed', 'true');
    await expect(kind(slot, slot === 'positive' ? 'negative' : 'positive')).toHaveAttribute('aria-pressed', 'false');
    const choices = await field(slot).locator('button[aria-label*="条记录类型"]').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; }));
    expect(choices).toHaveLength(2); expect(choices[0].left).toBeLessThan(choices[1].left);
    expect(choices[0].width).toBeCloseTo(choices[1].width, 1);
    for (const choice of choices) expect(choice.height).toBeGreaterThanOrEqual(40);
  }
  const geometry = await composer().evaluate(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
    const scroll = node.querySelector('.entry-scroll');
    return { viewport: box(document.querySelector('.preview-content')), box: box(node), footer: box(node.querySelector('.entry-footer')),
      scroll: box(scroll), scrollTop: scroll.scrollTop, overflowY: scroll.scrollHeight - scroll.clientHeight, overflowX: node.scrollWidth - node.clientWidth,
      fields: [...node.querySelectorAll('.progress-domain-row,.progress-record-field')].map(box), modes: [...node.querySelectorAll('.entry-mode')].map(box) };
  });
  expect(geometry.overflowX).toBeLessThanOrEqual(2); expect(geometry.overflowY, 'Both empty record boxes and their controls fit initially').toBeLessThanOrEqual(2);
  expect(geometry.scrollTop).toBe(0); expect(geometry.modes).toHaveLength(3);
  for (const box of [geometry.box, ...geometry.modes]) { expect(box.top).toBeGreaterThanOrEqual(geometry.viewport.top - 1); expect(box.bottom).toBeLessThanOrEqual(geometry.viewport.bottom + 1); }
  for (const box of geometry.fields) { expect(box.top).toBeGreaterThanOrEqual(geometry.scroll.top - 1); expect(box.bottom).toBeLessThanOrEqual(geometry.footer.top + 1); }
  expect(geometry.fields).toHaveLength(3);
  const actions = await composer().locator('.entry-footer button').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(node); return { x: r.x, width: r.width, height: r.height, lines: range.getClientRects().length }; }));
  expect(actions).toHaveLength(2);
  expect(actions[0].width).toBe(40); expect(actions[0].height).toBe(40);
  expect(actions[1].x - actions[0].x - actions[0].width).toBe(8);
  expect(actions[0].width + 8 + actions[1].width).toBeCloseTo(geometry.fields[0].right - geometry.fields[0].left, 1);
  expect(actions[1].height).toBe(48); expect(actions[1].lines).toBe(1);
  await checkButtonAppearance(save(), { kind: 'primary', size: 'large' }, expect);
  for (const name of ['任务', '备忘', '进展']) await checkButtonAppearance(mode(name), { kind: 'choice', selected: name === '进展' }, expect);
  await domainChoice.checkTrigger({ composer: composer(), expect, label: '未分类', asset: '/assets/habits/notes.png', out, width, scenario: 'default' });
  await domainChoice.checkMenu({ composer: composer(), expect, options: [['工作', '/assets/icons/work.png'], ['未分类', '/assets/habits/notes.png']], selected: '未分类' });
  await swipe('进展', { dx: 96 }, composer().locator('.form-popover-panel'), 'Domain options do not switch the creation type');
  await expect(composer().locator('.form-popover-panel')).toBeVisible();
  await page.screenshot({ path: path.join(out, `progress-domain-options-${width}.png`) });
  await domainChoice.dismissOutside({ composer: composer(), expect, label: '未分类' });
  await page.screenshot({ path: path.join(out, `progress-default-${width}.png`) });
  await chooseDomain('工作');
  await domainChoice.checkTrigger({ composer: composer(), expect, label: '工作', asset: '/assets/icons/work.png', out, width, scenario: 'work' });
  await input().fill('# 新进展\n\n**完成了一步**');
  await input('negative').fill('下框独立保留的问题');
  await swipe('进展', { dx: 96 }, input('positive'), 'The positive record input protects text-selection gestures');
  await swipe('进展', { dx: 96 }, input('negative'), 'The negative record input protects text-selection gestures');
  await expect(composer().locator('.memo-editor-modes,.memo-body-preview')).toHaveCount(0);
  await expect(input()).toHaveValue('# 新进展\n\n**完成了一步**');
  await restoreLegacyImage('positive');
  await swipe('备忘', { dx: 96, moveSteps: [12, 36, 96], onStep: async () => {
    const snapshot = composer().locator('.swipe-panel-current');
    await expect(snapshot.locator('input,textarea')).toHaveCount(0);
    await expect(snapshot.locator('.progress-record-field')).toHaveCount(2);
    await expect(snapshot.locator('.memo-editor-modes')).toHaveCount(0);
    await expect(snapshot.locator('.memo-insert-image')).toHaveCount(0);
    await expect(snapshot.locator('[data-progress-slot="positive"]')).toContainText('完成了一步');
    await expect(snapshot.locator('[data-progress-slot="negative"]')).toContainText('下框独立保留的问题');
  } }, undefined, 'A right swipe preserves both signed fields in a native-input-free snapshot');
  await expect(composer().locator('.memo-title-input')).toHaveValue('# 新进展**完成了一步**');
  expect((await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'))).memo.title).toBe('# 新进展\n\n**完成了一步**');
  await expect(composer().locator('.memo-body-input')).toHaveValue('**共用备注**');
  await composer().locator('.memo-body-input').fill('备忘录内修改的正文');
  await swipe('任务', { dx: 96 }, undefined, 'A right swipe restores task-only fields and the latest common note'); await expect(composer().locator('.todo-description')).toHaveValue('备忘录内修改的正文');
  await expect(composer().getByRole('textbox', { name: '下一步任务 1', exact: true })).toHaveValue('保留下一步');
  await swipe('备忘', {}, undefined, 'The common draft survives another forward swipe');
  await swipe('进展', {}, undefined, 'Forward swiping restores the untouched independent progress pair'); await expect(input('positive')).toHaveValue('# 新进展\n\n**完成了一步**');
  await expect(input('negative')).toHaveValue('下框独立保留的问题');
  await expect(domain()).toHaveText('工作');
  await expect(field('positive').locator('.memo-image img')).toHaveAttribute('src', `data:image/png;base64,${photo}`);
  expect(await read('domains'), 'Swiping across creation types does not submit progress').toEqual(seed.domains);
  expect(await read('todos'), 'Swiping across creation types does not submit a task').toEqual(seed.todos);
  expect(await read('memos'), 'Swiping across creation types does not submit a memo').toEqual(seed.memos);
  await page.screenshot({ path: path.join(out, `entry-swipe-progress-${width}.png`) });
  await close();
  expect(await read('domains')).toEqual(seed.domains); expect(await read('todos')).toEqual(seed.todos); expect(await read('memos')).toEqual(seed.memos);
  await page.reload(); await openProgress();
  await expect(input()).toHaveValue('# 新进展\n\n**完成了一步**');
  await expect(field('positive').locator('.memo-image img')).toHaveAttribute('src', `data:image/png;base64,${photo}`);
  await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  const work = (await read('domains')).domains[0];
  expect(work.positiveRecords).toHaveLength(1); expect(work.negativeRecords).toHaveLength(1);
  expect(work.negativeRecords[0].content).toBe('下框独立保留的问题');
  expect(work.positiveRecords[0]).toMatchObject({ content: '# 新进展\n\n**完成了一步**', images: [{ dataUrl: `data:image/png;base64,${photo}` }] });
  expect(await read('todos')).toEqual(seed.todos); expect(await read('memos')).toEqual(seed.memos);
  await page.evaluate(() => { location.hash = '#/pages/domain-detail/index?id=work'; });
  await expect(page.locator('.domain-record-plain').filter({ hasText: '完成了一步' })).toHaveText('# 新进展\n\n**完成了一步**');
  await expect(page.locator('.domain-record-content strong,.domain-record-content h1')).toHaveCount(0);
  await expect(page.locator('.domain-record-plain').first()).toHaveCSS('white-space', 'pre-wrap');
  await expect(page.locator('.domain-record-images img')).toHaveCount(1);
  await page.locator('.domain-record-images img').click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  await expect(page.locator('.domain-record-add')).toHaveCount(0);
  const createRecord = page.getByRole('button', { name: '创建记录', exact: true });
  await expect(createRecord.locator('.button-add-symbol')).toHaveCount(1);
  const toolbar = await page.locator('.domain-detail-toolbar').evaluate(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, height: r.height }; };
    return { outer: box(node), buttons: [...node.querySelectorAll('button')].map(box), overflow: node.scrollWidth - node.clientWidth };
  });
  expect(toolbar.overflow).toBeLessThanOrEqual(1);
  for (const button of toolbar.buttons) { expect(button.height).toBeGreaterThanOrEqual(40); expect(button.left).toBeGreaterThanOrEqual(toolbar.outer.left - 1); expect(button.right).toBeLessThanOrEqual(toolbar.outer.right + 1); }
  expect(toolbar.buttons.at(-1).top).toBeCloseTo(toolbar.buttons[0].top, 1);
  await createRecord.click();
  await expect(domain()).toHaveText('工作'); await expect(composer().locator('.progress-record-field')).toHaveCount(2);
  await input().fill('只记录问题'); await kind('positive', 'negative').click(); await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  expect((await read('domains')).domains[0].positiveRecords).toHaveLength(1); expect((await read('domains')).domains[0].negativeRecords).toHaveLength(2);

  await fresh('uncategorized'); await openProgress(); await expect(domain()).toHaveText('未分类');
  await expect(save()).toBeDisabled();
  await input().fill('尚未分类的进展'); await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  let fallback = (await read('domains')).domains.find(domain => domain.name === '未分类');
  expect(fallback.positiveRecords).toHaveLength(1); expect(fallback.negativeRecords).toHaveLength(0);
  await openProgress(); await restoreLegacyImage('negative');
  await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  fallback = (await read('domains')).domains.find(domain => domain.name === '未分类');
  expect(fallback.positiveRecords).toHaveLength(1); expect(fallback.negativeRecords).toHaveLength(1);
  expect(fallback.negativeRecords[0].content).toBe(''); expect(fallback.negativeRecords[0].images).toHaveLength(1);

  for (const sign of ['positive', 'negative']) {
    await fresh(`same-${sign}`); await openProgress(); await chooseDomain('工作');
    await input().fill(`第一条同${sign}记录`); await input('negative').fill(`第二条同${sign}记录`);
    const footer = await save().boundingBox();
    for (const slot of ['positive', 'negative']) {
      await kind(slot, sign).click(); await expect(kind(slot, sign)).toHaveAttribute('aria-pressed', 'true');
      await expect(kind(slot, sign === 'positive' ? 'negative' : 'positive')).toHaveAttribute('aria-pressed', 'false');
    }
    expect(await save().boundingBox(), 'Selecting signs does not move the common save action').toEqual(footer);
    const signedDraft = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
    await close(); await page.reload(); await openProgress();
    for (const slot of ['positive', 'negative']) await expect(kind(slot, sign)).toHaveAttribute('aria-pressed', 'true');
    await expect(input('negative')).toHaveValue(`第二条同${sign}记录`);
    await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
    const target = (await read('domains')).domains[0];
    expect(target[sign === 'positive' ? 'positiveRecords' : 'negativeRecords'].map(record => record.id)).toEqual([signedDraft.progress.positive.id, signedDraft.progress.negative.id]);
    expect(target[sign === 'positive' ? 'negativeRecords' : 'positiveRecords']).toEqual([]);
  }
  await fresh('empty-frames'); await openProgress();
  await input().fill('   '); await input('negative').fill('\n  '); await expect(save()).toBeDisabled();
  await input('negative').fill('只有第二框有内容'); await expect(save()).toBeEnabled();
  await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  const secondOnly = (await read('domains')).domains.find(item => item.name === '未分类');
  expect(secondOnly.positiveRecords).toEqual([]); expect(secondOnly.negativeRecords.map(record => record.content)).toEqual(['只有第二框有内容']);

  // Real custom domain data exercises complete names, adaptive height and a
  // scrollable 24-item selector without creating or changing business records.
  const longName = '旅行摄影与户外探索年度计划持续记录分类';
  const customDomains = Array.from({ length: 23 }, (_, index) => ({ ...seed.domains.domains[0], id: `custom-${index}`, name: index === 22 ? longName : `自定义分类${index + 1}`, iconId: index === 22 ? 'travel' : index % 2 ? 'work' : 'camera' }));
  customDomains.push({ ...seed.domains.domains[0], id: 'uncategorized', name: '未分类', iconId: 'notes' });
  const customSeed = { ...seed, domains: { ...seed.domains, domains: customDomains } };
  const customOptions = customDomains.map(domain => [domain.name, domain.iconId === 'camera' ? '/assets/habits/camera.png' : domain.iconId === 'notes' ? '/assets/habits/notes.png' : `/assets/icons/${domain.iconId}.png`]);
  await fresh('long-domain', customSeed); await openProgress();
  await domainChoice.checkMenu({ composer: composer(), expect, options: customOptions, selected: '未分类' });
  const longOption = composer().locator('.form-popover-panel').getByRole('button', { name: `记录到${longName}`, exact: true });
  await longOption.scrollIntoViewIfNeeded();
  const scroll = await composer().locator('.form-popover-scroll').evaluate(node => ({ top: node.scrollTop,
    viewportHeight: node.getBoundingClientRect().height, choicesHeight: node.querySelector('.form-option-grid').getBoundingClientRect().height,
    overflowY: getComputedStyle(node).overflowY }));
  expect(['auto', 'scroll'], 'Choices use the real vertical scroll area').toContain(scroll.overflowY);
  if (scroll.choicesHeight > scroll.viewportHeight) expect(scroll.top, 'Choices taller than the viewport can reach the last row by scrolling').toBeGreaterThan(0);
  await expect(longOption).toBeInViewport({ ratio: .999 });
  await page.screenshot({ path: path.join(out, `progress-domain-many-options-${width}.png`) });
  await longOption.click();
  await expect(composer().locator('.form-popover-panel')).toHaveCount(0);
  await domainChoice.checkTrigger({ composer: composer(), expect, label: longName, asset: '/assets/icons/travel.png', out, width, scenario: 'long-name' });
  await domain().click();
  await expect(composer().locator('.form-popover-panel').getByRole('button', { name: `记录到${longName}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await domainChoice.dismissOutside({ composer: composer(), expect, label: longName });
  await input('positive').fill('保留自定义领域的进展草稿');
  await page.screenshot({ path: path.join(out, `progress-domain-long-name-${width}.png`) });
  await close(); expect(await read('domains')).toEqual(customSeed.domains);
  await page.reload(); await openProgress();
  await expect(input('positive')).toHaveValue('保留自定义领域的进展草稿');
  await domainChoice.checkTrigger({ composer: composer(), expect, label: longName, asset: '/assets/icons/travel.png', out, width, scenario: 'long-name-restored' });
  await close(); expect(await read('domains')).toEqual(customSeed.domains);
  if (width !== 360) return;

  const contextSeed = structuredClone(seed);
  contextSeed.domains.domains.push({ ...seed.domains.domains[0], id: 'life', name: '生活', iconId: 'home' });
  await fresh('domain-context', contextSeed); await openProgress(); await chooseDomain('工作');
  await input().fill('跨领域保留上框'); await input('negative').fill('跨领域保留下框'); await kind('positive', 'negative').click(); await close();
  const contextDraft = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  await page.evaluate(() => { location.hash = '#/pages/domain-detail/index?id=life'; });
  await page.getByRole('button', { name: '创建记录', exact: true }).click();
  await expect(domain()).toHaveText('生活'); await expect(input()).toHaveValue('跨领域保留上框'); await expect(input('negative')).toHaveValue('跨领域保留下框');
  await expect(kind('positive', 'negative')).toHaveAttribute('aria-pressed', 'true');
  expect((await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'))).progress.positive.id).toBe(contextDraft.progress.positive.id);
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; });
  await save().click(); await expect(composer().getByRole('alert')).toContainText('本机存储不可用'); await close();
  await page.evaluate(() => { location.hash = '#/pages/domain-detail/index?id=work'; });
  await page.getByRole('button', { name: '创建记录', exact: true }).click();
  await expect(domain()).toHaveText('生活'); await expect(input()).toBeDisabled();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  const contextSaved = (await read('domains')).domains;
  expect(contextSaved[0].negativeRecords).toHaveLength(0); expect(contextSaved[1].negativeRecords.map(record => record.id)).toEqual([contextDraft.progress.positive.id, contextDraft.progress.negative.id]);

  await fresh('legacy'); await openProgress(); await close();
  const oldDraft = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  delete oldDraft.progress.single; delete oldDraft.progress.kind; delete oldDraft.progress.pair; delete oldDraft.progress.kinds;
  oldDraft.progress.domainId = 'work'; oldDraft.progress.positive.content = '旧正记录草稿'; oldDraft.progress.negative.content = '旧负记录草稿';
  await page.evaluate(oldDraft => localStorage.setItem('ottlog-mini-entry-draft-v1:guest', JSON.stringify(oldDraft)), oldDraft);
  await page.reload();
  await page.evaluate(() => { location.hash = '#/pages/domains/index'; });
  await page.getByRole('button', { name: '记录进展', exact: true }).click();
  await expect(input()).toHaveValue('旧正记录草稿'); await expect(input('negative')).toHaveValue('旧负记录草稿'); await expect(composer().locator('.progress-record-field')).toHaveCount(2);
  await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  const recovered = (await read('domains')).domains[0];
  expect(recovered.positiveRecords.map(record => record.id)).toEqual([oldDraft.progress.positive.id]);
  expect(recovered.negativeRecords.map(record => record.id)).toEqual([oldDraft.progress.negative.id]);

  await fresh('legacy-single'); await openProgress(); await chooseDomain('工作');
  await input().fill('旧单框原负记录'); await input('negative').fill('恢复队列中的正记录'); await close();
  const oldSingle = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  delete oldSingle.progress.pair; delete oldSingle.progress.kinds; oldSingle.progress.single = true; oldSingle.progress.kind = 'negative';
  oldSingle.progress.legacy = [{ kind: 'negative', record: oldSingle.progress.positive }, { kind: 'positive', record: { ...oldSingle.progress.negative, images: [{ id: 'old-single-photo', dataUrl: `data:image/png;base64,${photo}` }] } }];
  oldSingle.progress.negative = { ...oldSingle.progress.negative, content: '', images: [] };
  await page.evaluate(draft => localStorage.setItem('ottlog-mini-entry-draft-v1:guest', JSON.stringify(draft)), oldSingle);
  await page.reload(); await openProgress();
  await expect(input()).toHaveValue('旧单框原负记录'); await expect(input('negative')).toHaveValue('恢复队列中的正记录');
  await expect(kind('positive', 'negative')).toHaveAttribute('aria-pressed', 'true'); await expect(kind('negative', 'positive')).toHaveAttribute('aria-pressed', 'true');
  await expect(field('negative').locator('.memo-image img')).toHaveAttribute('src', `data:image/png;base64,${photo}`);
  await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  const migrated = (await read('domains')).domains[0];
  expect(migrated.negativeRecords.map(record => record.id)).toEqual([oldSingle.progress.positive.id]);
  expect(migrated.positiveRecords.map(record => record.id)).toEqual([oldSingle.progress.legacy[1].record.id]);
  expect(await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'))).toBeUndefined();

  for (const savedMode of ['task', 'memo']) {
    await fresh(`legacy-saved-${savedMode}`); await openProgress();
    await input().fill('非本次提交的旧进展'); await input('negative').fill('非本次提交的恢复队列'); await close();
    const already = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
    already.mode = savedMode; already[savedMode].title = `已保存的${savedMode}主实体`;
    delete already.progress.pair; delete already.progress.kinds; already.progress.single = true; already.progress.kind = 'positive';
    already.progress.legacy = [{ kind: 'positive', record: already.progress.positive }, { kind: 'negative', record: already.progress.negative }];
    const persisted = structuredClone(seed);
    if (savedMode === 'task') persisted.todos.tasks.push(already.task);
    else persisted.memos.notes.push(already.memo);
    await fresh(`legacy-saved-${savedMode}-restore`, persisted);
    await page.evaluate(draft => localStorage.setItem('ottlog-mini-entry-draft-v1:guest', JSON.stringify(draft)), already);
    await page.reload(); await openProgress();
    await expect(input(), 'A saved task or memo does not revive a progress recovery batch').toHaveValue(''); await expect(input('negative')).toHaveValue('');
    expect(await read('domains')).toEqual(seed.domains);
    expect(await read(savedMode === 'task' ? 'todos' : 'memos')).toEqual(persisted[savedMode === 'task' ? 'todos' : 'memos']);
    await close();
  }

  // The old signed single-box retry must never adopt a new second record.
  await fresh('legacy-pending'); await openProgress(); await chooseDomain('工作'); await input().fill('旧单框负记录待重试'); await close();
  const oldPending = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  delete oldPending.progress.pair; delete oldPending.progress.kinds;
  oldPending.progress.single = true; oldPending.progress.kind = 'negative'; oldPending.pendingSave = 'progress';
  oldPending.progress.negative.content = '';
  await page.evaluate(draft => localStorage.setItem('ottlog-mini-entry-draft-v1:guest', JSON.stringify(draft)), oldPending);
  await page.reload(); await openProgress();
  await expect(input()).toHaveValue('旧单框负记录待重试'); await expect(input('negative')).toHaveValue('');
  for (const slot of ['positive', 'negative']) { await expect(input(slot)).toBeDisabled(); for (const sign of ['positive', 'negative']) await expect(kind(slot, sign)).toBeDisabled(); }
  expect((await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'))).progress).toEqual(oldPending.progress);
  await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  const singleRetry = (await read('domains')).domains[0];
  expect(singleRetry.positiveRecords).toEqual([]); expect(singleRetry.negativeRecords.map(record => record.id)).toEqual([oldPending.progress.positive.id]);

  // Validate the full two-item batch before any first record or fallback domain commits.
  const full = structuredClone(seed);
  full.domains.domains[0].positiveRecords = Array.from({ length: 4999 }, (_, index) => ({ id: `cap-${index}`, content: '原记录', createdAt: '2026-10-07T08:00:00.000Z' }));
  await fresh('capacity', full); await openProgress();
  expect(await read('domains')).toEqual(full.domains);
  await input().fill('容量边界的第一条'); await input('negative').fill('容量边界的第二条');
  await save().click();
  expect(await read('domains'), 'A rejected batch neither saves its first item nor creates uncategorized').toEqual(full.domains);
  await expect(composer().getByRole('alert')).toContainText('最多保存 5000 条记录');
  await expect(input()).toHaveValue('容量边界的第一条'); await expect(input('negative')).toHaveValue('容量边界的第二条'); await close();

  await fresh('conflict'); await openProgress(); await chooseDomain('工作');
  await input().fill('冲突前不可部分保存'); await input('negative').fill('第二条与旧ID冲突'); await close();
  const conflictDraft = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  const conflicted = structuredClone(seed.domains);
  conflicted.domains[0].negativeRecords.push({ ...conflictDraft.progress.negative, content: '同ID已有内容' });
  await page.evaluate(state => { window.__miniFixture.guestToolStates.domains = state; localStorage.setItem('ottlog-mini-tool-v1:guest:domains', JSON.stringify({ data: state, pending: false, revision: 0 })); }, conflicted);
  await page.reload(); await openProgress(); await save().click();
  expect(await read('domains'), 'An ID conflict in the second item leaves both columns unchanged').toEqual(conflicted);
  await expect(composer().getByRole('alert')).toContainText('记录已存在或发生变化');
  await expect(input()).toHaveValue('冲突前不可部分保存'); await expect(input('negative')).toHaveValue('第二条与旧ID冲突'); await close();

  await fresh('failure'); await openProgress(); await chooseDomain('工作');
  await input().fill('重试的上框'); await input('negative').fill('重试的下框');
  await kind('positive', 'negative').click(); await kind('negative', 'positive').click();
  const retryDraft = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; });
  await save().click(); await expect(composer().getByRole('alert')).toContainText('本机存储不可用');
  await expect(input()).toHaveValue('重试的上框'); await expect(input('negative')).toHaveValue('重试的下框');
  for (const slot of ['positive', 'negative']) {
    await expect(input(slot)).toBeDisabled();
    for (const sign of ['positive', 'negative']) await expect(kind(slot, sign)).toBeDisabled();
  }
  await kind('positive', 'positive').evaluate(node => node.click());
  const pending = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  expect(pending.pendingSave).toBe('progress'); expect(pending.progress).toEqual(retryDraft.progress);
  await expect(mode('任务')).toBeDisabled(); await expect(domain()).toBeDisabled();
  await expect(composer().getByRole('button', { name: '清空所有输入', exact: true })).toBeDisabled();
  await composer().getByRole('button', { name: '清空所有输入', exact: true }).evaluate(node => node.click());
  await expect(input()).toHaveValue('重试的上框'); await expect(input('negative')).toHaveValue('重试的下框');
  await swipe('进展', { dx: 96 }, undefined, 'A pending same-ID progress retry cannot swipe into memo');
  expect(await read('domains')).toEqual(seed.domains);
  await close(); await openProgress();
  await expect(save()).toBeEnabled(); await expect(input()).toBeDisabled(); await expect(input('negative')).toBeDisabled();
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
  await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  const retried = (await read('domains')).domains[0];
  expect(retried.positiveRecords).toHaveLength(1); expect(retried.negativeRecords).toHaveLength(1);
  expect(retried.positiveRecords[0].id).toBe(retryDraft.progress.negative.id);
  expect(retried.negativeRecords[0].id).toBe(retryDraft.progress.positive.id);

  // A same-account refresh may persist volatile data before the form's retry.
  await openProgress(); await chooseDomain('工作'); await input('positive').fill('恢复读取后的进展');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['domains']; });
  await save().click(); await expect(composer().getByRole('alert')).toContainText('本机存储不可用');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; window.__miniPreviewControl.emit('ottlog-session'); });
  await expect(save()).toBeEnabled(); await save().click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  expect((await read('domains')).domains[0].positiveRecords).toHaveLength(2);
  expect((await read('domains')).domains[0].negativeRecords).toHaveLength(1);

  await fresh('picture-account'); await openProgress(); await input('positive').fill('旧账号进展草稿'); await input('negative').fill('旧账号下框草稿');
  await kind('positive', 'negative').click(); await kind('negative', 'positive').click();
  await expect(composer().getByRole('button', { name: '插入图片', exact: true })).toHaveCount(0);
  await expect(input('positive')).toHaveValue('旧账号进展草稿'); await expect(input('negative')).toHaveValue('旧账号下框草稿'); await expect(composer().locator('.memo-image')).toHaveCount(0);
  await page.evaluate(seed => { window.__miniFixture.accountToolStates = { 'progress-reader': seed }; window.__miniFixture.sessionProfile = { authenticated: true, userName: 'progress-reader', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); }, seed);
  await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  await openProgress(); await expect(input('positive')).toHaveValue(''); await expect(input('negative')).toHaveValue(''); await expect(composer().locator('.memo-image')).toHaveCount(0); await close();
  const guest = await page.evaluate(() => window.__miniPreviewControl.readStorage('ottlog-mini-entry-draft-v1:guest'));
  expect(guest.progress.positive.content).toBe('旧账号进展草稿'); expect(guest.progress.positive.images).toHaveLength(0);
  expect(guest.progress.negative.content).toBe('旧账号下框草稿'); expect(guest.progress.negative.images).toHaveLength(0); expect(guest.progress.kinds).toEqual(['negative', 'positive']);
  expect((await read('domains', 'reader:progress-reader')).domains[0].positiveRecords).toHaveLength(0);
};
