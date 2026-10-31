const path = require('node:path');
module.exports = async ({page,origin,out,width,expect}) => {
  await page.goto(`${origin}/?empty-state=${width}#/pages/posts/index`);
  await page.evaluate(() => {
    window.__miniFixture.sessionProfile = {authenticated:true,userName:'empty-check',isAdmin:false};
    window.__miniFixture.accountToolStates = {'empty-check':{}};
    window.__miniPreviewControl.emit('ottlog-session');
  });
  for (const [route,empty] of [['memos','memos'],['daily','habits'],['mottos','mottos']]) {
    await page.evaluate(route=>{location.hash=`#/pages/${route}/index`;},route);
    await expect(page.locator(`.empty-state.is-${empty}`).first()).toBeVisible();
    await expect(page.locator('.empty-data-preview,.empty-data-preview-badge,.data-preview-item')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('预览数据');
  }
  await page.evaluate(()=>{location.hash='#/pages/domains/index';});
  await expect(page.locator('.domain-entry-shell')).toHaveCount(2);
  await page.evaluate(()=>{location.hash='#/pages/todos/index';});
  await expect(page.locator('.todo-quadrant')).toHaveCount(4);
  await expect(page.locator('.todo-task')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__miniRequests.filter(request=>request.method==='PUT'))).toEqual([]);
  await page.evaluate(()=>{location.hash='#/pages/memos/index';});
  await page.getByRole('button',{name:'创建便签',exact:true}).click();
  await page.getByLabel('便签标题',{exact:true}).fill('从空白开始记录');
  await page.locator('.entry-composer .sheet-actions').getByRole('button',{name:'创建便签',exact:true}).click();
  await expect(page.locator('.memo-note')).toHaveCount(1);
  await expect(page.locator('.empty-state.is-memos')).toHaveCount(0);
  await page.screenshot({path:path.join(out,`real-empty-state-${width}.png`)});
};
