// Disposable business APIs only. Run on the coordinator's 3017 candidate.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
await fs.mkdir('test-results/focus-layout-spacing',{recursive:true});
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use the isolated 3017 candidate');
const browser=await chromium.launch({headless:true});
const activities=['拉伸','准备补剂','准备蛋白粉','喝咖啡','整理房间','洗衣服','看风景','听音乐','洗澡','散步','切水果'];
try{for(const viewport of [{width:2412,height:1080},{width:1440,height:900},{width:840,height:900},{width:768,height:900},{width:390,height:844},{width:375,height:667}]){
 const page=await browser.newPage({viewport,hasTouch:true}),stamp=new Date().toISOString(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const states={pomodoro:{version:1,settings:{focus:25,shortBreak:5,longBreak:15,longEvery:4},mode:'focus',selection:{title:'隔离事项',taskId:null},active:null,completedFocusCount:4,sessions:[{id:'finished',taskId:null,title:'隔离事项',mode:'focus',completed:true,durationSeconds:1500,plannedSeconds:1500,startedAt:stamp,endedAt:stamp}]},todos:{version:1,tasks:[],categories:[],sort:'created'},memos:{version:1,notes:[1,2].map(i=>({id:`memo-${i}`,title:`几何便签${i}`,body:'正文摘要与标题分隔',tags:['标签'],images:[{id:'pixel',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII='}],pinned:i===1,color:'blue',createdAt:stamp,updatedAt:stamp}))}};
 await page.route('**/api/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,key=p.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];if(p.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'layout-fixture',csrfToken:'isolated'}});if(key){if(req.method()==='PUT'){if(key==='pomodoro')await new Promise(resolve=>setTimeout(resolve,800));states[key]=req.postDataJSON().data;}return route.fulfill({json:{data:states[key]??null}});}return route.fulfill({json:{enabled:false,reminders:[]}});});
 states.reminders={version:1,items:[{id:'habit-fixture',title:'隔离习惯',group:'其它',kind:'walk',note:'',minutes:5,enabled:true}],done:{},reflections:[]};
 const button=name=>page.getByRole('button',{name,exact:true});
 const geometry=async()=>{await expect.poll(()=>page.locator('.focus-timer-stage').evaluate(stage=>{const s=stage.getBoundingClientRect(),t=stage.querySelector('.focus-tomato-scene').getBoundingClientRect();return t.height>0&&t.top>=s.top-1&&t.bottom<=s.bottom+1&&t.left>=s.left-1&&t.right<=s.right+1&&Math.abs((t.top+t.bottom-s.top-s.bottom)/2)<2;})).toBe(true);if(viewport.width===375&&page.viewportSize().height===667)expect((await page.locator('.focus-tomato-scene').boundingBox()).width).toBeGreaterThanOrEqual(110);const actions=await page.locator('.focus-action-area').boundingBox();expect(actions.y+actions.height).toBeLessThanOrEqual(viewport.height);};
 const rail=async()=>{await expect(page.locator('.focus-activity-rail')).toHaveCount(0);};
 const suggestions=async()=>{const dialog=page.getByRole('dialog',{name:'休息建议',exact:true});await expect(dialog).toBeVisible();await expect(dialog.locator('.focus-suggestion-card')).toHaveText(activities);for(const card of await dialog.locator('.focus-suggestion-card').all()){await card.scrollIntoViewIfNeeded();await expect(card).toBeInViewport();}const box=await dialog.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);await button('关闭休息建议').click();};
 await page.goto(origin+'/pomodoro');await suggestions();await expect(page.locator('.focus-completion-row')).toBeVisible();await geometry();await rail();await page.screenshot({path:'test-results/focus-layout-spacing/completed-'+viewport.width+'.png'});await button('开始短休息').click();await expect(button('暂停')).toBeVisible();await geometry();await rail();await page.screenshot({path:'test-results/focus-layout-spacing/rest-'+viewport.width+'.png'});await button('暂停').click();await expect(button('结束')).toBeInViewport();await expect(button('继续')).toBeInViewport();await button('继续').click();await expect.poll(()=>states.pomodoro.active?.running).toBe(true);await expect(button('暂停')).toBeEnabled();states.pomodoro.active.deadline=Date.now()-1;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>states.pomodoro.active).toBeNull();await expect(button('开始专注')).toBeVisible();
 // Same completion never reopens after mode changes, monitor refresh or route remount.
 await button('专注更多操作').click();await button('休息建议').click();await suggestions();
 await button('专注更多操作').click();await button('调整时长').click();
 const settings=page.getByRole('dialog',{name:'调整时长',exact:true});await expect(settings).toBeVisible();
 const sample=()=>page.evaluate(()=>Object.fromEntries(['.focus-page-toolbar','.focus-clock-card','.focus-timer-stage','.focus-toolbar','.focus-feedback-slot','.focus-tomato-scene','.focus-action-area'].map(selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return [selector,[r.x,r.y,r.width,r.height,n.scrollTop]];})));
 const before=await sample(),old=states.pomodoro.settings.focus,deadline=states.pomodoro.active?.deadline;
 const samples=[];
 await expect(settings.locator('.browser-wheel-scroll')).toHaveCount(4);
 for(const wheel of await settings.locator('.browser-wheel-scroll').all()){
  await wheel.hover();
  const sampling=page.evaluate(async()=>{const frames=[];for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);frames.push(Object.fromEntries(['.focus-page-toolbar','.focus-clock-card','.focus-timer-stage','.focus-toolbar','.focus-feedback-slot','.focus-tomato-scene','.focus-action-area'].map(selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return [selector,[r.x,r.y,r.width,r.height,n.scrollTop]];})));}return frames;});
  await page.mouse.wheel(0,84);samples.push(...await sampling);
 }
 await expect.poll(()=>states.pomodoro.settings.focus).not.toBe(old);
 for(const result of samples)for(const key of Object.keys(before))for(let i=0;i<5;i++)expect(Math.abs(result[key][i]-before[key][i])).toBeLessThanOrEqual(1);
 expect(states.pomodoro.active?.deadline).toBe(deadline);
 await expect(button('关闭节奏设置')).toBeEnabled();await button('关闭节奏设置').click();await geometry();
 expect((await page.locator('.focus-feedback-slot').boundingBox()).height).toBe(40);
 await page.waitForTimeout(5500);await expect(page.getByRole('dialog',{name:'休息建议',exact:true})).toHaveCount(0);
 await page.goto(origin+'/memos');await page.goto(origin+'/pomodoro');await expect(page.getByRole('dialog',{name:'休息建议',exact:true})).toHaveCount(0);
 await page.goto(origin+'/daily');
 await button('隔离习惯 今天打卡').click();
 await expect.poll(()=>Object.values(states.reminders.done).some(ids=>ids.includes('habit-fixture'))).toBe(true);
 await expect(page.locator('.daily-reflection-overlay')).toHaveCount(0);
 await button('查看习惯：隔离习惯').click();await button('记录').click();await expect(page.locator('.daily-reflection-overlay')).toBeVisible();await button('关闭打卡留言').click();
 expect(errors).toEqual([]);await page.close();console.log(`PASS activity/settings ${viewport.width}x${viewport.height}`);
}}finally{await browser.close();}
