const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const {origin}=JSON.parse(fs.readFileSync('test-results/productivity-runtime.json'));
 const browser=await chromium.launch();
 try {
  const context=await browser.newContext({viewport:{width:2560,height:1440}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/memos');
  await expect(page.getByLabel('备忘正文',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'写一条备忘',exact:true})).toHaveCount(0);
  await page.getByLabel('备忘标题',{exact:true}).fill('可以直接写的备忘');
  await page.getByLabel('备忘正文',{exact:true}).fill('## 今天的念头\n\n**直接编辑**，不用先点新建。');
  await page.getByRole('button',{name:'保存备忘',exact:true}).click();
  await expect(page.getByLabel('备忘目录').getByRole('button',{name:/可以直接写的备忘/})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('备忘正文',{exact:true})).toHaveValue(/今天的念头/, {timeout:15000});
  await page.getByRole('button',{name:'预览',exact:true}).click();
  await expect(page.getByRole('heading',{name:'今天的念头',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'编辑',exact:true}).click();
  await page.getByLabel('备忘正文',{exact:true}).fill('刷新也不会丢的草稿');
  await page.reload();
  await expect(page.getByLabel('备忘正文',{exact:true})).toHaveValue('刷新也不会丢的草稿');
  await page.getByRole('button',{name:'新建备忘',exact:true}).click();
  await expect(page.getByLabel('备忘正文',{exact:true})).toHaveValue('');
  await page.getByRole('button',{name:'展开网站导航'}).hover();
  await expect(page.getByRole('navigation',{name:'主导航',exact:true})).toBeVisible();
  await page.mouse.move(500,400);
  await expect(page.getByRole('button',{name:'展开网站导航'})).toHaveAttribute('aria-expanded','false');
  await page.getByRole('button',{name:'展开网站导航'}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'收起网站导航'})).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'展开网站导航'})).toHaveAttribute('aria-expanded','false');
  for(const route of ['eat','daily','todos','pomodoro','memos']) {
   await page.goto(origin+'/'+route);
   const box=await page.locator('[data-tool-page]').boundingBox();
   assert(box.width>=2100,`${route} should fill wide workspace, got ${box.width}`);
   await page.screenshot({path:`test-results/wide-${route}.png`});
  }
  await page.goto(origin);
  const logo=await page.locator('.hero-art').boundingBox();assert(Math.abs(logo.width-logo.height)<2,'square homepage logo');
  await page.screenshot({path:'test-results/wide-home-square.png'});
  for(const width of [390,320]) {
   await page.setViewportSize({width,height:844}); await page.goto(origin+'/memos');
   await expect(page.getByLabel('备忘正文',{exact:true})).toBeVisible();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile overflow');
   const editor=await page.getByLabel('备忘编辑器').boundingBox(),list=await page.getByLabel('备忘目录').boundingBox();
   assert(editor.y<list.y,'mobile editor before library');
   await page.screenshot({path:`test-results/memo-direct-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('PASS direct memo edit/save/recovery/preview; auto-hiding navigation; all tools wide; square logo; mobile editor layout');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
