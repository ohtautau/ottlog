const { goToPageSection } = require('./page-section-test-helpers.cjs');
const path = require('node:path');
const fs = require('node:fs');
const { defaultNames, fixtureNames: legacyNames, legacyLayout, fixtureLayout, writeLayout, seedCustomLegacyLayout, assertDefaultCards, checkDefaultEntrances } = require('./home-shortcut-test-helpers.cjs');
module.exports = async function ({ page, origin, out, width, expect, checkButtonSpacing, checkCardLayout, checkCreateButton, checkButtonAppearance, failures }) {
  const home = `${origin}/#/pages/index/index`;
  const key = 'ottlog.home-shortcuts.v1';
  const setting = () => page.getByRole('button', { name: '设置快捷方式', exact: true });
  const edit = async () => { if (await setting().getAttribute('aria-pressed') !== 'true') await setting().click(); await page.locator('.today-shortcut-toolbar').getByRole('button', { name: '添加快捷方式', exact: true }).click(); };
  const save = async () => { await page.getByRole('button', { name: '保存快捷方式', exact: true }).click(); if (!await page.locator('.home-editor-sheet').count() && await setting().getAttribute('aria-pressed') === 'true') await setting().click(); };
  const cancel = async () => { await page.getByRole('button', { name: '取消', exact: true }).click(); if (await setting().getAttribute('aria-pressed') === 'true') await setting().click(); };
  const cardEdit = async shortcutKey => { if (await setting().getAttribute('aria-pressed') !== 'true') await setting().click(); await page.locator(`#home-sort-${shortcutKey} .home-shortcut-edit`).click(); };
  async function geometry(label) {
    await expect(page.locator('.today-grid .shortcut-icon:not(.is-background),.today-grid .today-entry-note,.today-grid .today-entry-en,.today-grid .today-symbol')).toHaveCount(0);
    await expect(page.locator('button button')).toHaveCount(0);
    await expect(page.locator('.today-grid > .today-entry > .shortcut-background')).toHaveCount(await page.locator('.today-grid > .today-entry').count());
    await checkButtonSpacing(page, `${width} shortcuts ${label}`, failures);
    await checkCardLayout(page, `${width} shortcuts ${label}`, failures);
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, ...[...document.querySelectorAll('.today-page,.home-editor-sheet,.home-editor-scroll,.home-editor-row')].map(node => node.scrollWidth - node.clientWidth)));
    expect(overflow).toBeLessThanOrEqual(2);
    const sheet = await page.locator('.home-editor-sheet').count() ? await page.locator('.home-editor-sheet').boundingBox() : null;
    if (sheet) { expect(sheet.y).toBeGreaterThanOrEqual(40); expect(sheet.y + sheet.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight - 60)); }
  }


  await page.goto(home);
  await assertDefaultCards(page, expect);
  await checkDefaultEntrances({ page, expect, out, width });
  await require('./section-title-checks.cjs')(page, expect);
  const creatingShortcuts = page.locator('.today-grid,.today-all-tools').getByRole('button', { name: /^(?:操作：)?创建(?:任务|便签)$/ });
  async function checkCreationShortcuts(count) {
    await expect(creatingShortcuts).toHaveCount(count);
    for (const shortcut of await creatingShortcuts.all()) {
      await expect(shortcut.locator('.button-add-symbol'), 'Home task/memo shortcut titles do not repeat the add symbol').toHaveCount(0);
      await expect(shortcut.locator('.shortcut-icon'), 'Fixed directory icons stay while personalized cards use backgrounds').toHaveCount(await shortcut.evaluate(node => node.classList.contains('today-all-tool')) ? 1 : 0);
      const layout = await shortcut.evaluate(node => {
        const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height }; };
        const text = node.querySelector('.today-entry-name') || [...node.children].find(child => child.textContent.trim().startsWith('创建'));
        return { button: box(node), text: box(text), clipped: text.scrollWidth - text.clientWidth };
      });
      expect(layout.button.height).toBeGreaterThanOrEqual(40);
      expect(layout.text.left).toBeGreaterThanOrEqual(layout.button.left - 1);
      expect(layout.text.right).toBeLessThanOrEqual(layout.button.right + 1);
      expect(layout.clipped, `${width}: creation shortcut keeps its full name`).toBeLessThanOrEqual(1);
    }
  }
  await checkCreationShortcuts(2);
  await expect(page.locator('.today-capture .button-add-symbol'), 'The inline create action retains its shared add symbol').toHaveAttribute('aria-hidden', 'true');
  await checkButtonAppearance(page.locator('.today-capture .create-button'), { kind: 'primary', compact: true }, expect);
  await expect(page.locator('.today-capture button')).toHaveCount(1);
  await expect(page.locator('.today-capture .create-button-label')).toHaveCount(0);
  await expect(page.locator('.today-shortcut-toolbar .page-toolbar-sort')).toHaveCount(1);
  const manage = setting();
  await expect(manage).toHaveText('');
  const iconLayout = await manage.evaluate(node => {
    const button = node.getBoundingClientRect(), icon = node.querySelector('.manage-symbol').getBoundingClientRect();
    return { width: icon.width, height: icon.height, x: icon.left + icon.width / 2 - button.left - button.width / 2, y: icon.top + icon.height / 2 - button.top - button.height / 2 };
  });
  expect(iconLayout.width).toBe(20); expect(iconLayout.height).toBe(16);
  expect(Math.abs(iconLayout.x)).toBeLessThanOrEqual(1); expect(Math.abs(iconLayout.y)).toBeLessThanOrEqual(1);
  async function checkCapturePosition() {
    await expect(page.locator('.today-capture')).toBeInViewport({ ratio: 1 });
    const capturePosition = await page.evaluate(() => {
      const content = document.querySelector('#page-core .core-content');
      const capture = content.querySelector('.today-capture');
      const rect = capture.getBoundingClientRect(), bounds = content.getBoundingClientRect();
      const last = content.lastElementChild;
      const shortcuts = content.querySelector('.today-shortcut-scroll,.today-shortcuts');
      return { last: last.contains(capture), gap: bounds.bottom - rect.bottom, shortcutBottom: shortcuts?.getBoundingClientRect().bottom, top: rect.top };
    });
    expect(capturePosition.last, 'Capture is the last module of the first home screen').toBe(true);
    expect(Math.abs(capturePosition.gap), 'Capture sits at the bottom of core content').toBeLessThanOrEqual(1);
    if (capturePosition.shortcutBottom != null) expect(capturePosition.top - capturePosition.shortcutBottom).toBeGreaterThanOrEqual(11);
  }
  await checkCapturePosition();
  for (let visit = 0; visit < 2; visit++) {
    await page.getByRole('button', { name: '领域', exact: true }).click();
    await expect(page).toHaveURL(/pages\/domains\/index$/);
    await expect(page.locator('.domain-entry')).toHaveCount(8);
    await page.locator('.preview-native-tabs a[href="#/pages/index/index"]').click();
    await expect(page).toHaveURL(/pages\/index\/index$/);
    await expect(page.locator('#page-third,.home-domain-overview')).toHaveCount(0);
  }
  const navigation = page.locator('.preview-native-tabs');
  await expect(navigation.locator('a')).toHaveText([/今日$/, /待办$/, /领域$/, /习惯$/, /我的$/]);
  expect(await navigation.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual([
    '#/pages/index/index', '#/pages/todos/index', '#/pages/domains/index', '#/pages/daily/index', '#/pages/favorites/index',
  ]);
  await expect(navigation.locator('a.active')).toHaveAttribute('href', '#/pages/index/index');
  await navigation.locator('a[href="#/pages/domains/index"]').click();
  await expect(page).toHaveURL(/pages\/domains\/index$/);
  await expect(navigation.locator('a.active')).toHaveAttribute('href', '#/pages/domains/index');
  await expect(page.locator('.domain-entry')).toHaveCount(8);
  await navigation.locator('a[href="#/pages/daily/index"]').click();
  await expect(page).toHaveURL(/pages\/daily\/index$/);
  await expect(navigation.locator('a.active')).toHaveAttribute('href', '#/pages/daily/index');
  await navigation.locator('a[href="#/pages/index/index"]').click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await expect(navigation.locator('a.active')).toHaveAttribute('href', '#/pages/index/index');
  const quote = page.locator('.today-quote');
  await expect(quote).toBeVisible();
  await expect(quote.getByRole('button')).toHaveCount(1);
  await expect(quote.locator('.today-quote-like')).toHaveCount(0);
  await expect(quote.locator('.today-quote-manage .edit-symbol')).toBeVisible();
  await page.evaluate(() => { location.hash = '#/pages/memos/index'; });
  await expect(quote).toHaveCount(0);
  await page.evaluate(() => { location.hash = '#/pages/index/index'; });
  await expect(quote.locator('.today-quote-like')).toHaveCount(0);
  await expect(quote.locator('.today-quote-controls')).toHaveCount(0);
  await expect(page.locator('.today-entry')).toHaveCount(6);
  await expect(page.getByRole('button', { name: '自定义', exact: true })).toHaveCount(0);
  await expect(setting()).toBeVisible();
  await checkButtonAppearance(setting(), { kind: 'icon' }, expect);
  await require('./check-home-editor-order.cjs')({ page, origin, out, width, expect });

  // Both previously untouched six-card representations upgrade in the real page.
  for (const ranked of [false, true]) {
    const old = legacyLayout();
    if (!ranked) old.items = old.items.map(({ rank, ...item }) => item);
    await writeLayout(page, old);
    await assertDefaultCards(page, expect);
  }
  const chooseIcon = async label => {
    await page.getByRole('button',{name:'选择快捷方式背景',exact:true}).click();
    await page.getByRole('button',{name:'选择背景图标：'+label,exact:true}).click();
    await expect(page.getByRole('dialog',{name:'选择快捷方式背景图标',exact:true})).toHaveCount(0);
  };
  const cardReplace = async shortcutKey => { if (await setting().getAttribute('aria-pressed') !== 'true') await setting().click(); await page.locator('#home-sort-'+shortcutKey+' .home-shortcut-replace').click(); };
  const beforeAppearance = await page.evaluate(key => localStorage.getItem(key), key);
  await cardEdit('memo-list');
  await expect(page.locator('.home-editor-title')).toHaveText('编辑快捷方式');
  await expect(page.locator('.home-editor-selection,.home-editor-backgrounds,.home-editor-details-toggle')).toHaveCount(0);
  await expect(page.locator('.home-editor-fields .home-editor-field-label')).toHaveCount(0);
  await expect(page.locator('.home-editor-name-row .entity-title-input')).toHaveCount(1);
  await expect(page.locator('.home-editor-icon-trigger')).toHaveCount(1);
  if (width === 375) for (const safeArea of [0, 34]) {
    await page.evaluate(inset => document.documentElement.style.setProperty('--preview-safe-area-bottom', inset + 'px'), safeArea);
    for (const control of await page.locator('.home-editor-name-row,.home-editor-icon-trigger,.home-editor-color,.home-editor-footer button').all()) await expect(control, 'Default single-card editing exposes name, icon background, colors and both footer actions').toBeInViewport({ ratio: 1 });
    const layout = await page.locator('.home-editor-sheet').evaluate(node => {
      const box = element => { const r = element.getBoundingClientRect(); return { top:r.top,bottom:r.bottom,height:r.height }; };
      const scroll=node.querySelector('.home-editor-scroll');
      return { sheet:box(node), scroll:box(scroll), scrollHeight:scroll.scrollHeight, scrollTop:scroll.scrollTop,
        controls:[...node.querySelectorAll('.home-editor-name-row,.home-editor-icon-trigger,.home-editor-color,.home-editor-footer button')].map(element=>({label:element.getAttribute('aria-label')||element.textContent,...box(element)})) };
    });
    expect(layout.scrollTop).toBe(0);
    for (const control of layout.controls.filter(control => !['取消','保存快捷方式'].includes(control.label))) { expect(control.top).toBeGreaterThanOrEqual(layout.scroll.top-1);expect(control.bottom).toBeLessThanOrEqual(layout.scroll.bottom+1); }
    fs.writeFileSync(path.join(out,'home-single-default-'+width+'-safe-'+safeArea+'.json'),JSON.stringify(layout,null,2));
    await page.screenshot({path:path.join(out,'home-single-default-'+width+'-safe-'+safeArea+'.png')});
  }
  await page.evaluate(() => document.documentElement.style.removeProperty('--preview-safe-area-bottom'));
  await page.getByRole('textbox',{name:'快捷方式名称：便签',exact:true}).fill('便签小册');
  await page.getByRole('button',{name:'选择快捷方式背景',exact:true}).click();
  const picker = page.getByRole('dialog',{name:'选择快捷方式背景图标',exact:true});
  await expect(picker).toBeVisible(); await expect(picker.locator('.icon-library-option')).toHaveCount(64);
  await expect(picker.locator('.icon-library-option[aria-pressed="true"]')).toHaveCount(1);
  const iconCells = await picker.locator('.icon-library-option').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect(); return {width:r.width,height:r.height,src:node.querySelector('.library-icon').getAttribute('src')};}));
  expect(new Set(iconCells.map(cell=>cell.src)).size,'The picker uses all 64 original colored artworks').toBe(64);
  for(const cell of iconCells) { expect(cell.width).toBeGreaterThanOrEqual(40);expect(cell.height).toBeGreaterThanOrEqual(40);expect(cell.src).not.toContain('outline-sheet');expect(cell.src).toMatch(/\/assets\/(?:habits|icons)\/[a-z]+\.png$/); }
  await expect(page.getByRole('button',{name:'保存快捷方式',exact:true})).toBeDisabled();
  await picker.getByRole('textbox',{name:'搜索图标',exact:true}).fill('摄影');
  await expect(picker.locator('.icon-library-option')).toHaveCount(1);
  await expect(picker.getByRole('button',{name:'选择背景图标：摄影',exact:true}).locator('.library-icon')).toHaveAttribute('src','/assets/habits/camera.png');
  await picker.getByRole('button',{name:'清空图标搜索',exact:true}).click();
  await picker.getByRole('button',{name:'图标分类：运动健康',exact:true}).click();
  await expect(picker.locator('.icon-library-option')).toHaveCount(14);
  await expect(picker.getByRole('button',{name:'选择背景图标：摄影',exact:true})).toHaveCount(0);
  await picker.getByRole('textbox',{name:'搜索图标',exact:true}).fill('骑行');
  await expect(picker.locator('.icon-library-option')).toHaveCount(1);
  await expect(picker.getByRole('button',{name:'选择背景图标：骑行',exact:true})).toBeVisible();
  await picker.getByRole('button',{name:'清空图标搜索',exact:true}).click();
  await picker.getByRole('button',{name:'图标分类：全部',exact:true}).click();
  await expect(picker.locator('.icon-library-option')).toHaveCount(64);
  await page.screenshot({path:path.join(out,'home-icon-picker-'+width+'.png')});
  await page.locator('.icon-library-backdrop').click({position:{x:2,y:2}});
  await expect(picker).toHaveCount(0);
  await expect(page.locator('.home-editor-fields')).toBeVisible();
  await expect(page.getByRole('textbox',{name:'快捷方式名称：便签',exact:true})).toHaveValue('便签小册');
  await expect(page.locator('.home-editor-preview .shortcut-background')).toHaveAttribute('data-background-icon','library:notes');
  expect(await page.evaluate(key=>localStorage.getItem(key),key),'Closing the top icon picker preserves the underlying unsaved appearance draft').toBe(beforeAppearance);
  await page.getByRole('button',{name:'选择快捷方式背景',exact:true}).click();
  await page.getByRole('button',{name:'关闭背景图标选择',exact:true}).click(); await expect(page.locator('.home-editor-fields')).toBeVisible();
  for (const [label,icon] of [['摄影','library:camera'],['目标','library:goal'],['理财','library:money']]) {
    await chooseIcon(label); await expect(page.locator('.home-editor-preview .shortcut-background')).toHaveAttribute('data-background-icon',icon);
    await expect(page.locator('.home-editor-preview .today-entry-name')).toHaveText('便签小册');
    await page.getByRole('button',{name:'选择快捷方式背景',exact:true}).click();
    await expect(picker.locator('.icon-library-option[aria-pressed="true"]')).toHaveCount(1);
    await expect(picker.getByRole('button',{name:'选择背景图标：'+label,exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'关闭背景图标选择',exact:true}).click();
  }
  const lineArt = await page.locator('.home-editor-preview .shortcut-background-icon').evaluate(node=>{const s=getComputedStyle(node);return {width:parseFloat(s.width),height:parseFloat(s.height),opacity:parseFloat(s.opacity),src:node.querySelector('img').getAttribute('src')};});
  expect(lineArt.width).toBeGreaterThanOrEqual(100);expect(lineArt.height).toBeGreaterThanOrEqual(100);expect(lineArt.opacity).toBeGreaterThan(0);expect(lineArt.opacity).toBeLessThanOrEqual(.3);expect(lineArt.src).toContain('/assets/icons/outline-sheet.png');
  await page.getByRole('button',{name:'使用玫瑰色',exact:true}).click();
  await expect(page.locator('.home-editor-preview .shortcut-background')).toHaveAttribute('data-background-icon','library:money');
  await expect(page.locator('.home-editor-preview .home-shortcut-card')).toHaveClass(/shortcut-color-rose/);
  await cancel(); expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(beforeAppearance);
  await expect(page.locator('#home-sort-memo-list .shortcut-background')).toHaveAttribute('data-background-icon','library:notes');
  await cardEdit('memo-list'); await page.getByRole('textbox',{name:'快捷方式名称：便签',exact:true}).fill('便签小册');
  await chooseIcon('摄影'); await page.getByRole('button',{name:'使用玫瑰色',exact:true}).click(); await save(); await page.reload();
  expect(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key)).items.find(item=>item.key==='memo-list')).toMatchObject({name:'便签小册',icon:'library:camera',color:'rose',rank:1});
  await expect(page.locator('#home-sort-memo-list.shortcut-color-rose .shortcut-background')).toHaveAttribute('data-background-icon','library:camera');
  const savedAppearance=await page.evaluate(key=>localStorage.getItem(key),key);
  await cardEdit('memo-list'); await chooseIcon('心愿'); await page.getByRole('textbox',{name:'快捷方式名称：便签',exact:true}).fill('未保存'); await cancel();
  expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(savedAppearance); await expect(page.locator('#home-sort-memo-list .today-entry-name')).toHaveText('便签小册');
  await cardEdit('memo-list'); await page.getByRole('button',{name:'移除快捷方式：便签',exact:true}).click(); await expect(page.locator('.home-editor-fields')).toHaveCount(0);
  await page.getByRole('button',{name:'恢复快捷方式',exact:true}).click(); await expect(page.locator('.home-editor-preview .today-entry-name')).toHaveText('便签小册'); await cancel();
  await cardReplace('memo-list'); await expect(page.locator('.home-editor-title')).toHaveText('替换快捷方式');
  await expect(page.locator('.home-editor-option')).toHaveCount(16); await expect(page.locator('.home-editor-fields,.home-editor-preview')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'替换为：开始番茄钟',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'替换为：创建任务',exact:true}).click(); expect(await page.evaluate(key=>localStorage.getItem(key),key),'Replacement only changes the local picker until saved').toBe(savedAppearance);
  await cancel(); await expect(page.locator('#home-sort-memo-list .today-entry-name')).toHaveText('便签小册');
  await cardReplace('memo-list'); await page.getByRole('button',{name:'替换为：创建任务',exact:true}).click();
  await page.evaluate(()=>{window.__miniFixture.failHomeShortcutWrites=true;}); await save(); await expect(page.locator('.home-editor-sheet')).toBeVisible(); expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(savedAppearance);
  await page.evaluate(()=>{window.__miniFixture.failHomeShortcutWrites=false;}); await save(); await page.reload();
  const replaced=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key));
  expect(replaced.items[0]).toMatchObject({key:'create',rank:1,name:'便签小册',icon:'library:camera',color:'rose'});
  await expect(page.locator('#home-sort-memo-list')).toHaveCount(0); await expect(page.locator('#home-sort-create .shortcut-background')).toHaveAttribute('data-background-icon','library:camera');
  await page.locator('#home-sort-create').click(); await expect(page.locator('.entry-composer')).toBeVisible(); await expect(page.getByRole('button',{name:'创建类型：任务',exact:true})).toHaveAttribute('aria-pressed','true'); await page.getByRole('button',{name:'关闭编辑',exact:true}).click();
  await page.screenshot({path:path.join(out,'home-replacement-saved-'+width+'.png')});
  await seedCustomLegacyLayout(page); await expect(page.locator('.today-entry-name')).toHaveText(legacyNames); await checkCreationShortcuts(4);
  await edit(); await expect(page.locator('.home-editor-option')).toHaveCount(16); await expect(page.locator('.home-editor-option.is-selected')).toHaveCount(6);
  await expect(page.locator('.home-editor-fields,.home-editor-preview,.home-editor-colors,.home-editor-icon-trigger')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'恢复默认布局',exact:true})).toHaveCount(0); await expect(page.getByRole('button',{name:'选择外观设置的快捷方式',exact:true})).toHaveCount(0);
  await checkButtonAppearance(page.getByRole('button',{name:'保存快捷方式',exact:true}),{kind:'primary'},expect);
  await checkButtonAppearance(page.locator('.home-editor-footer button').first(),{kind:'secondary',size:'large'},expect);
  await checkButtonAppearance(page.getByRole('button',{name:'取消修改快捷方式',exact:true}),{kind:'icon'},expect);
  await geometry('picker'); await page.screenshot({path:path.join(out,'home-shortcuts-picker-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'移除快捷方式：领域',exact:true}).click(); await page.getByRole('button',{name:'添加快捷方式：饮食记录',exact:true}).click(); await save();
  await cardEdit('meals'); await page.getByRole('textbox',{name:'快捷方式名称：饮食记录',exact:true}).fill('我的午餐灵感计划');
  await page.getByRole('button',{name:'使用玫瑰色',exact:true}).click(); await chooseIcon('咖啡');
  const fields=page.locator('.home-editor-fields'); await fields.scrollIntoViewIfNeeded();
  const layout=await fields.evaluate(node=>{const box=element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};return {field:box(node),input:box(node.querySelector('input')),frame:box(node.querySelector('.single-line-field')),colors:[...node.querySelectorAll('.home-editor-color')].map(box),dots:[...node.querySelectorAll('.home-editor-color-dot')].map(box),scrollWidth:node.scrollWidth,clientWidth:node.clientWidth};});
  expect(layout.scrollWidth-layout.clientWidth).toBeLessThanOrEqual(1); expect(Math.abs((layout.input.top+layout.input.bottom-layout.frame.top-layout.frame.bottom)/2)).toBeLessThanOrEqual(1);
  for(const color of layout.colors){expect(color.width).toBeGreaterThanOrEqual(40);expect(color.height).toBeGreaterThanOrEqual(40);expect(color.left).toBeGreaterThanOrEqual(layout.field.left);expect(color.right).toBeLessThanOrEqual(layout.field.right);}for(const dot of layout.dots){expect(dot.width).toBe(20);expect(dot.height).toBe(20);}
  await geometry('rename'); await page.screenshot({path:path.join(out,'home-shortcuts-edit-'+width+'.png'),fullPage:true}); await save();
  await expect(page.locator('.today-entry')).toHaveCount(6); await expect(page.locator('.today-merged-shortcut')).toHaveCount(0);
  await expect(page.locator('#home-sort-meals.shortcut-color-rose')).toContainText('我的午餐灵感计划');
  expect(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key)).items.find(item=>item.key==='meals')).toMatchObject({name:'我的午餐灵感计划',color:'rose',icon:'library:coffee',kind:'card'});
  await page.reload(); await expect(page.locator('#home-sort-meals .shortcut-background')).toHaveAttribute('data-background-icon','library:coffee'); await expect(page.locator('#home-sort-meals .today-entry-name')).toHaveText('我的午餐灵感计划');
  await geometry('saved'); await page.screenshot({path:path.join(out,'home-shortcuts-saved-'+width+'.png'),fullPage:true});
  const savedPreferences=await page.evaluate(key=>localStorage.getItem(key),key); await cardEdit('meals'); await chooseIcon('植物'); await cancel();
  expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(savedPreferences); await expect(page.locator('#home-sort-meals .shortcut-background')).toHaveAttribute('data-background-icon','library:coffee');
  await page.getByRole('button', { name: '打开待办', exact: true }).click();
  await expect(page).toHaveURL(/pages\/todos\/index$/);
  await page.goto(home);
  await page.locator('#home-sort-create').click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await expect(page.locator('.entry-composer')).toBeVisible();
  await expect(page.getByRole('button', { name: '创建类型：任务', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.todo-sheet')).toBeVisible();
  await page.getByRole('button', { name: '关闭编辑', exact: true }).click();
  await expect(page.locator('.entry-composer')).toHaveCount(0);
  await navigation.locator('a[href="#/pages/domains/index"]').click();
  await expect(page).toHaveURL(/pages\/domains\/index$/);
  await navigation.locator('a[href="#/pages/index/index"]').click();
  await expect(page).toHaveURL(/pages\/index\/index$/);
  await expect(page.locator('.today-recent')).toContainText('创建任务');
  await expect(page.locator('.today-recent .button-add-symbol'), 'Recent task creation uses the same title exception').toHaveCount(0);
  await page.goto(home);
  await page.getByRole('button', { name: '开始番茄钟', exact: true }).click();
  await expect(page).toHaveURL(/pages\/pomodoro\/index$/);
  await expect(page.locator('.focus-live')).toContainText('正在计时');
  await page.goto(home);
  await page.getByRole('button', { name: '饮食记录', exact: true }).click();
  await expect(page).toHaveURL(/pages\/meals\/index$/);
  await page.goto(home);
  await writeLayout(page,null);
  const beforeSelection=await page.evaluate(key=>localStorage.getItem(key),key);
  await edit(); await page.getByRole('button',{name:'移除快捷方式：个人空间',exact:true}).click(); await page.getByRole('button',{name:'添加快捷方式：饮食记录',exact:true}).click(); await cancel();
  expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(beforeSelection); await expect(page.locator('.today-entry-name')).toHaveText(defaultNames);
  await edit(); await page.getByRole('button',{name:'移除快捷方式：个人空间',exact:true}).click(); await page.getByRole('button',{name:'添加快捷方式：饮食记录',exact:true}).click();
  await page.evaluate(() => { window.__miniFixture.failHomeShortcutWrites = true; });
  await save(); await expect(page.locator('.home-editor-sheet')).toBeVisible();
  expect(await page.evaluate(() => window.__miniNotices.at(-1))).toContain('保存失败'); expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(beforeSelection);
  await page.evaluate(() => { window.__miniFixture.failHomeShortcutWrites = false; });
  await save(); await page.reload(); await expect(page.locator('.today-entry-name')).toHaveText(['便签','开始番茄钟','习惯','统计','领域','饮食记录']);
  await writeLayout(page,null); await expect(page.locator('.today-entry-name')).toHaveText(defaultNames);  // Extra cards scroll in their middle region while capture remains in the first viewport.
  await edit();
  for (const name of ['饮食记录', '文章分类', '收藏', '创建习惯']) await page.getByRole('button', { name: `添加快捷方式：${name}`, exact: true }).click();
  await save();
  await expect(page.locator('.today-entry')).toHaveCount(10);
  await checkCapturePosition();
  const shortcutScroll = page.locator('.today-shortcut-scroll');
  await shortcutScroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(page.locator('#home-sort-posts')).toBeInViewport({ ratio: 1 });
  const visibleCard = await page.locator('#home-sort-posts').evaluate(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
    return { card: box(node), viewport: box(node.closest('.preview-content')), content: [...node.querySelectorAll('.today-entry-name,.today-entry-note,.today-entry-en,.today-symbol')].map(box) };
  });
  for (const r of [visibleCard.card, ...visibleCard.content]) {
    expect(r.top).toBeGreaterThanOrEqual(visibleCard.viewport.top - 1); expect(r.bottom).toBeLessThanOrEqual(visibleCard.viewport.bottom + 1);
    expect(r.left).toBeGreaterThanOrEqual(visibleCard.viewport.left - 1); expect(r.right).toBeLessThanOrEqual(visibleCard.viewport.right + 1);
  }
  await page.screenshot({ path: path.join(out, `home-many-cards-${width}.png`) });
  const longScroll = page.locator('.page-scroll');
  expect(await longScroll.evaluate(node => node.scrollTop), 'Reading extra shortcuts does not move the whole home screen').toBe(0);
  await expect(page.locator('.today-capture')).toBeInViewport({ ratio: 1 });
  const readingOffset = await shortcutScroll.evaluate(node => node.scrollTop);
  const point = { identifier: 1, clientX: 100, clientY: 300 };
  expect(readingOffset, 'All selected cards remain reachable by scrolling').toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('.today-entry')).toHaveCount(10);
  await checkCapturePosition();
  await expect(page.locator('.today-shortcuts')).toHaveCount(0);
  const groupTitles = await require('./section-title-checks.cjs')(page, expect);
  expect(groupTitles.map(title => title.label), 'The complete independent directory keeps its sections').toEqual(['我的快捷方式', '快捷操作', '功能界面', '阅读与空间']);
  await goToPageSection(page, 'page-more');
  await expect(page.locator('#page-more .today-all-tool')).toHaveCount(16);
  await expect(page.locator('#page-more .today-all-tool[data-feature-key="posts"]')).toHaveText('文章↗');
  await longScroll.dispatchEvent('touchstart', { touches: [point] });
  await longScroll.dispatchEvent('touchmove', { touches: [{ ...point, clientY: 370 }] });
  await longScroll.dispatchEvent('touchend', { touches: [] });
  await expect.poll(() => longScroll.evaluate(node => node.scrollTop), 'Swipe from the directory still returns to the first page').toBeLessThan(2);
  await expect(page.locator('.today-more-shortcuts')).toHaveCount(0);
  // A saved empty layout remains intentional and offers a working add action.
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, items: [] })), key);
  await page.reload();
  await expect(page.locator('.today-entry')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '排序快捷方式', exact: true })).toBeDisabled();
  await checkCapturePosition();
  const emptyCreate = page.getByRole('button', { name: '添加快捷方式', exact: true });
  await checkCreateButton(emptyCreate, '添加快捷方式', expect);
  await emptyCreate.click();
  await page.getByRole('button', { name: '添加快捷方式：收藏', exact: true }).click();
  await save();
  await goToPageSection(page, 'page-core');
  await checkCapturePosition();
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  await expect(page).toHaveURL(/pages\/favorites\/index$/);
  await page.evaluate(key => localStorage.removeItem(key), key);
  await page.goto(home);
  await page.reload();
  await expect(page.locator('.today-entry')).toHaveCount(6);

  // Old user-named compact links migrate into cards without losing preferences.
  const defaultLayout = await page.evaluate(key => localStorage.getItem(key), key);
  const oldLinks = fixtureLayout(true);
  oldLinks.items = oldLinks.items.map(item => item.key === 'create' || item.key === 'memos' ? { ...item, kind: 'link', name: item.key === 'create' ? '我的任务' : '我的便签' } : item);
  await writeLayout(page, oldLinks);
  for (const [id, name] of [['create', '我的任务'], ['memos', '我的便签']]) {
    const link = page.locator(`#home-sort-${id}`);
    await expect(link.locator('.today-entry-name')).toHaveText(name);
    await expect(link.locator('.button-add-symbol')).toHaveCount(0);
    await expect(link.locator('.shortcut-icon.is-background')).toHaveCount(1);
    expect(await link.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
    expect(await link.locator('.today-entry-name').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  }
  await geometry('creation links');
  await page.evaluate(({ key, value }) => { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }, { key, value: defaultLayout });
  await page.reload();

  // A fresh document isolates task/habit entry from the earlier running timer.
  // Dedicated focus pages still receive task/habit intent exactly once.
  if (process.argv.includes('--home-shortcut-layout')) return;
  await page.goto(`${origin}/?tab-focus-links-${width}#/pages/index/index`);
  await page.evaluate(() => {
    const createdAt = new Date().toISOString();
    window.__miniFixture.guestToolStates = {
      todos: { version: 1, categories: [], tasks: [{
        id: 'tab-focus-task', title: '任务专注 / 草稿 50% & 校对', description: '', categoryId: '',
        important: true, urgent: true, dueDate: '', tags: [], completedAt: null, createdAt, updatedAt: createdAt,
      }] },
      reminders: { version: 1, items: [{
        id: 'tab-focus-habit', title: '习惯专注 / 阅读 20% & 摘录', note: '', kind: 'notes', group: '学习', minutes: 17, enabled: true,
      }], done: {} },
    };
    location.hash = '#/pages/todos/index';
  });
  await page.getByRole('button', { name: '编辑任务：任务专注 / 草稿 50% & 校对', exact: true }).click();
  await page.getByRole('button', { name: /为任务专注/ }).click();
  await expect(page).toHaveURL(/pages\/pomodoro\/index$/);
  await expect(page.locator('.preview-native-tabs')).toHaveCount(0);
  await expect(page.locator('.focus-purpose-input')).toHaveValue('任务专注 / 草稿 50% & 校对');
  const focusSource = require('./pomodoro-source-controls.cjs')({ page, expect });
  await focusSource.open();
  await expect(page.getByRole('button', { name: '从待办选择专注事项', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await focusSource.close();
  await expect(page.locator('.focus-time')).toHaveText('25:00');
  await expect(page.locator('.focus-live')).toContainText('准备就绪');
  await expect.poll(() => page.evaluate(() => window.__miniFixture.pomodoroLocalState?.selection)).toEqual({
    taskId: 'tab-focus-task', habitId: null, title: '任务专注 / 草稿 50% & 校对',
  });
  expect(await page.evaluate(() => window.__miniFixture.pomodoroLocalState.active)).toBeNull();

  await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
  await page.locator('#page-core .daily-habit-scroll').getByRole('button', { name: '查看习惯：习惯专注 / 阅读 20% & 摘录', exact: true }).click();
  // C94 removed habit-detail focus actions; old minutes remain compatibility data.
  await expect(page.getByRole('button', { name: /^专注 17 分钟/ })).toHaveCount(0);
  await expect(page).toHaveURL(/pages\/daily\/index$/);
  await page.goto(home);
};

