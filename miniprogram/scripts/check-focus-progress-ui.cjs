const path=require('node:path');
module.exports=async function({page,origin,out,width,expect}){
 const owner='focus-progress-fixture',at=Date.now();
 const state={version:1,settings:{focus:1,shortBreak:1,longBreak:2,longEvery:4,transitionMode:'manual'},mode:'focus',selection:{title:'连续进度',taskId:null,habitId:null},sessions:[],completedFocusCount:0,
  active:{id:'progress-round',rootRunId:'progress-round',mode:'focus',totalSeconds:60,remainingSeconds:60,running:true,deadline:at+60000,startedAt:new Date(at).toISOString(),selection:{title:'连续进度',taskId:null,habitId:null}}};
 await page.clock.install({time:at});
 await page.goto(`${origin}/?focus-progress-${width}#/pages/posts/index`);
 await page.evaluate(({state,owner})=>{localStorage.clear();localStorage.setItem(`ottlog-mini-tool-v1:reader:${owner}:pomodoro`,JSON.stringify({data:state,pending:false,revision:0}));},{state,owner});await page.reload();
 await page.evaluate(({state,owner})=>{window.__miniFixture.sessionProfile={authenticated:true,userName:owner,isAdmin:false};window.__miniFixture.accountToolStates={[owner]:{pomodoro:state}};location.hash='#/pages/pomodoro/index';},{state,owner});
 const bar=page.getByRole('progressbar',{name:'本轮计时进度',exact:true}),fills=()=>page.locator('.focus-progress-fill').evaluateAll(nodes=>nodes.map(node=>parseFloat(node.style.width)));
 await expect(bar).toBeVisible();await expect(bar.locator('.focus-progress-segment')).toHaveCount(5);await expect(page.locator('.focus-tomato-progress')).toHaveCount(0);
 await page.clock.fastForward(18000);await expect.poll(fills).toEqual([100,50,0,0,0]);
 await page.clock.fastForward(3000);await expect.poll(fills).toEqual([100,75,0,0,0]);
 const mode=await page.locator('.focus-toolbar').boundingBox(),progress=await bar.boundingBox(),clock=await page.locator('.focus-clock-card').boundingBox();expect(progress.y).toBeGreaterThanOrEqual(mode.y+mode.height);expect(clock.y).toBeGreaterThanOrEqual(progress.y+progress.height);
 const widths=await bar.locator('.focus-progress-segment').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().width));expect(Math.max(...widths)-Math.min(...widths)).toBeLessThan(1);
 await page.screenshot({path:path.join(out,`focus-progress-${width}.png`)});console.log(`PASS continuous five-segment progress ${width}: 30% and 35% fill, equal widths, below mode switch, no old progress bar.`);
};
