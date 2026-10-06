const {chromium, expect} = require('@playwright/test');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch();
 try {
  const {origin} = JSON.parse(fs.readFileSync('test-results/productivity-runtime.json'));
  const page = await browser.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for(const [width,height] of [[1440,900],[2560,1080],[390,844],[320,740],[1280,600]]) {
   await page.setViewportSize({width,height}); await page.goto(origin);
   const viewport = page.getByLabel('首页分屏内容');
   await expect(page.locator('#welcome')).toHaveAttribute('data-active','true');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   await page.screenshot({path:`test-results/home-${width}-welcome.png`});
   if(width>=1280&&height>=900) {
    const box=await page.getByRole('region',{name:'生活格言'}).boundingBox();
    assert(box.y+box.height<=height,'motto fits first screen');
   }
   await page.getByRole('button',{name:'展开分屏导航'}).click();
   await page.getByRole('button',{name:/02.*记录与分类/}).click();
   await expect(page.locator('#recent')).toHaveAttribute('data-active','true');
   await expect.poll(async()=>Math.abs(await page.locator('#recent').evaluate(el=>el.getBoundingClientRect().top-el.parentElement.getBoundingClientRect().top))).toBeLessThan(3);
   await expect(page.locator('[data-journal-card]')).toHaveCount(3);
   await page.screenshot({path:`test-results/home-${width}-recent.png`});
   await page.getByRole('button',{name:/01.*标题与格言/}).click();
   await expect.poll(()=>viewport.evaluate(el=>el.scrollTop)).toBeLessThan(3);
   if(width===1440) {
    await page.mouse.move(500,450); await page.mouse.wheel(0,450);
    await expect(page.locator('#recent')).toHaveAttribute('data-active','true');
    await expect.poll(async()=>Math.abs(await page.locator('#recent').evaluate(el=>el.getBoundingClientRect().top-el.parentElement.getBoundingClientRect().top))).toBeLessThan(3);
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(origin);
  await page.getByRole('button',{name:'向下浏览'}).click();
  await expect(page.locator('#recent')).toHaveAttribute('data-active','true');
  await page.locator('[data-journal-card] a').first().click();
  await expect(page).toHaveURL(/\/posts\//);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'visible');
  const session=await (await page.request.get(origin+'/api/auth/session')).json();
  const auth=await page.request.post(origin+'/api/auth/login',{headers:{'X-CSRF-TOKEN':session.csrfToken},data:{userName:'homepage_preview',password:'test-personal-tools-only-123'}});
  assert.equal(auth.status(),200);
  for(const width of [1440,390]) {
   await page.setViewportSize({width,height:900}); await page.goto(origin);
   await page.getByRole('button',{name:'快速添加格言',exact:true}).click();
   const form=page.getByRole('region',{name:'快速添加格言'});
   const box=await form.boundingBox();
   assert(box.y>=0&&box.y+box.height<=900,'motto editor fits viewport');
   await form.getByLabel('新增格言',{exact:true}).fill('首页分屏编辑测试');
   await page.screenshot({path:`test-results/home-${width}-motto-editor.png`});
   await form.getByLabel('新增格言',{exact:true}).press('Escape');
   await expect(form).toHaveCount(0);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: homepage snapping, progress navigation, responsive layouts, reduced motion and article navigation');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

