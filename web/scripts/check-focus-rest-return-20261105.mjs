// Isolated Windows candidate. This script never contacts real account APIs.
import {chromium,expect} from '@playwright/test';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated 3017');
const browser=await chromium.launch();
try{for(const [width,height] of [[1440,900],[390,844],[390,440]])for(const restMode of ['短休息','长休息'])for(const outcome of ['immediate','expiry']){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 const initialCount=restMode==='长休息'?4:1;
 const selection={taskId:null,title:''},stamp=new Date(Date.now()-1500000).toISOString();
 let state={version:1,settings:{focus:25,shortBreak:6,longBreak:15,longEvery:4,transitionMode:'manual'},mode:'focus',selection,active:null,sessions:[{...selection,id:'fixture-focus',mode:'focus',durationSeconds:1500,plannedSeconds:1500,startedAt:stamp,endedAt:new Date().toISOString(),completed:true,unknownSession:'keep'}],completedFocusCount:initialCount,unknown:{keep:true}};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,key=path.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
  if(path.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'rest-return-fixture',csrfToken:'fixture'}});
  if(key){if(req.method()==='PUT'&&key==='pomodoro')state=req.postDataJSON().data;return route.fulfill({json:{data:key==='pomodoro'?state:null}});}
  return route.fulfill({json:{enabled:false,items:[],reminders:[]}});
 });
 const button=name=>page.getByRole('button',{name,exact:true}),dialog=page.getByRole('dialog',{name:'休息建议',exact:true});
 const awayAndBack=async()=>{await page.goto(origin+'/memos');await page.goto(origin+'/pomodoro');};
 const expire=async()=>{state.active.deadline=Date.now()-1;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));};
 await page.goto(origin+'/pomodoro');await expect(dialog).toBeVisible();await button('关闭休息建议').click();
 await expect(page.locator('.focus-completion-label')).toHaveCount(0);
 await expect(page.locator('.focus-completion-actions')).not.toContainText('专注已完成');
 const a=await button('开始短休息').boundingBox(),b=await button('开始长休息').boundingBox();expect(Math.abs(a.width-b.width)).toBeLessThanOrEqual(1);expect(Math.abs(a.height-b.height)).toBeLessThanOrEqual(1);
 // Recommended rest must retain primary styling, the other secondary.
 await expect(button('开始'+restMode)).toHaveClass(/ui-button-primary/);
 expect(await button('开始短休息').getAttribute('class')).not.toEqual(await button('开始长休息').getAttribute('class'));
 for(const mode of ['短休息','长休息','专注'])await button(mode).click();
 expect(state.sessions[0].restStartedId).toBeUndefined();await expect(button('开始'+restMode)).toBeVisible();
 await button('开始'+restMode).click();await expect(button('暂停')).toBeVisible();
 await expect.poll(()=>state.active?.mode).toBe(restMode==='短休息'?'shortBreak':'longBreak');
 const restId=state.active.id;expect(state.sessions.find(s=>s.id==='fixture-focus').restStartedId).toBe(restId);
 const deadline=state.active.deadline;
 if(outcome==='immediate'){await button('暂停').click();await button('结束').click();}
 else{await awayAndBack();await expect(button('暂停')).toBeVisible();expect(state.active.deadline).toBe(deadline);await page.goto(origin+'/memos');await expire();await expect.poll(()=>state.active,{timeout:15000}).toBeNull();await page.goto(origin+'/pomodoro');}
 await expect(button('开始专注')).toBeVisible();await awayAndBack();await page.reload();
 await expect(button('开始专注')).toBeVisible();await expect(page.locator('.focus-completion-actions')).toHaveCount(0);await expect(page.locator('.focus-clock-card')).toContainText('25:00');await expect(dialog).toHaveCount(0);
 expect(state.completedFocusCount).toBe(initialCount);expect(state.unknown).toEqual({keep:true});expect(state.sessions.find(s=>s.id==='fixture-focus').unknownSession).toBe('keep');expect(state.settings.focus).toBe(25);
 await button('开始专注').click();await expect(button('暂停')).toBeVisible();await expire();await expect(dialog).toBeVisible({timeout:15000});await expect.poll(()=>state.completedFocusCount).toBe(initialCount+1);await button('关闭休息建议').click();
 await awayAndBack();await expect(button('开始短休息')).toBeVisible();await expect(dialog).toHaveCount(0);expect(errors).toEqual([]);
 await context.close();console.log('PASS rest return candidate',width,height,restMode,outcome);
}}finally{await browser.close();}
