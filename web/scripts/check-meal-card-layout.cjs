const { chromium } = require('@playwright/test');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch();
 try {
  const page = await browser.newPage();
  await page.route('**/api/**', route => route.fulfill({ json: { authenticated: false } }));
  fs.mkdirSync('test-results/meal-card-layout', { recursive: true });
  for (const [width,height] of [[1920,1080],[1366,768],[390,844]]) {
   await page.setViewportSize({width,height});
   await page.goto('http://localhost:3000/eat');
   for (const mode of ['左右开饭','猜你想吃']) {
    await page.getByRole('button',{name:mode,exact:false}).click();
    const card = page.locator('[data-meal-card]');
    await card.waitFor(); await page.waitForTimeout(400);
    const box = await card.boundingBox();
    if (Math.abs(box.width-box.height)>2 || box.height<130) throw Error('Card is not square or too small: '+JSON.stringify(box));
    const stage = await page.getByRole('region',{name:'选餐游戏操作区'}).boundingBox();
    const results = await page.getByRole('region',{name:'推荐结果'}).boundingBox();
    if (Math.abs(stage.y+stage.height-results.y)>2 || Math.abs(stage.width-results.width)>2) throw Error('Results are not joined below stage');
    if(results.y+results.height>height+1)throw Error('Results exceed viewport');
    const up=page.getByRole('button',{name:mode==='左右开饭'?'跳过这两道菜':'不确定',exact:true});
    const hit=await up.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))});
    if(!hit)throw Error('Swipe-up control clipped');
    await up.click(); await page.waitForTimeout(400);
    await page.screenshot({path:`test-results/meal-card-layout/${width}-${mode==='左右开饭'?'pair':'quiz'}.png`});
    console.log('PASS',width,mode,Math.round(box.width)+'px square, connected results');
   }
  }
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
