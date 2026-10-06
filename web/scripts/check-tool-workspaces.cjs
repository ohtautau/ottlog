const { chromium } = require('@playwright/test');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.route('**/api/**', async route=>route.fulfill({json:route.request().url().includes('/account/session')?{authenticated:false,csrfToken:'preview'}:[]}));
 fs.mkdirSync('test-results/workspaces',{recursive:true});
 async function visibleWithoutScroll(locator) {
  const hit=await locator.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit && el.contains(hit)});
  if(!hit) throw Error('Primary action is clipped: '+await locator.textContent());
 }
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of (process.env.SECONDARY_ONLY ? [] : [1920,1440,1366,390])) {
  await page.goto("http://127.0.0.1:3107/eat"); await page.evaluate(()=>localStorage.clear());
  await page.setViewportSize({width,height:width===1920?1080:width===1366?768:900});
  for(const tool of ['todos','pomodoro','memos','eat','daily']) {
   await page.goto('http://127.0.0.1:3107/'+tool);
   await page.locator('[data-tool-workspace]').waitFor();await page.waitForTimeout(900);
   const result=await page.evaluate(()=>({body:document.body.scrollHeight,window:innerHeight,width:document.documentElement.scrollWidth,viewport:innerWidth,panels:[...document.querySelectorAll('.tool-workspace-panel')].filter(e=>!e.hidden).map(e=>({height:e.clientHeight,scroll:e.scrollHeight})),bottom:document.querySelector('[data-tool-workspace]').getBoundingClientRect().bottom}));
   console.log(width,tool,JSON.stringify(result));
   if(result.body>result.window+1||result.width>result.viewport+1||result.bottom>result.window+1)throw Error('Document overflow: '+tool);
   if(width >= 1300 && tool==='pomodoro') {
    const start=page.getByRole('button',{name:'开始专注',exact:false});
    await visibleWithoutScroll(start);
    await start.click();
    await page.getByRole('button',{name:'专注统计',exact:true}).click();
    await page.getByRole('button',{name:'日历与记录',exact:true}).click();
    await page.getByRole('button',{name:'专注计时',exact:true}).click();
    await visibleWithoutScroll(page.getByRole('button',{name:'暂停一下',exact:false}));
   }
   if(width >= 1300 && tool==='eat') {
    await visibleWithoutScroll(page.getByRole('button',{name:'跳过这两道菜',exact:true}));
    await page.getByRole('button',{name:'饮食记录',exact:true}).click();
    await page.getByRole('button',{name:'我的餐单',exact:true}).click();
    await page.getByRole('button',{name:'选这一餐',exact:true}).click();
   }
   if(width >= 1300 && tool==='memos') {
    await visibleWithoutScroll(page.getByRole('button',{name:'保存备忘',exact:true}));
    await page.getByRole('textbox',{name:'备忘正文',exact:true}).fill('单屏布局测试');
   }
   await page.waitForTimeout(400);
   await page.screenshot({path:`test-results/workspaces/${tool}-${width}.png`});
  }
 }
 for(const [tool, label, name] of [['pomodoro','专注统计','statistics'],['pomodoro','日历与记录','records'],['eat','饮食记录','nutrition'],['eat','我的餐单','library'],['todos','日历','calendar']]) {
  await page.setViewportSize({width:1366,height:768}); await page.goto('http://127.0.0.1:3107/'+tool);
  await page.getByRole('button',{name:label,exact:true}).click(); await page.waitForTimeout(500);
  if(name === 'calendar' || name === 'records') {
   await visibleWithoutScroll(page.getByRole('button',{name:/2026-09-30，/}));
   await page.getByRole('button',{name:'下个月',exact:true}).click();
   await page.getByRole('button',{name:'下个月',exact:true}).click();
   await visibleWithoutScroll(page.getByRole('button',{name:/2026-11-30，/}));
  }
  await page.screenshot({path:`test-results/workspaces/${tool}-${name}-1366.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
