// Disposable business APIs only. Run on the coordinator's 3017 candidate.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
await fs.mkdir('test-results/focus-layout-spacing',{recursive:true});
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use the isolated 3017 candidate');
const browser=await chromium.launch({headless:true});
const activities=['拉伸','准备补剂','准备蛋白粉','喝咖啡','整理房间','洗衣服','看风景','听音乐','洗澡','散步','切水果'];
try{for(const viewport of [{width:2412,height:1080},{width:1440,height:900},{width:840,height:900},{width:768,height:900},{width:390,height:844},{width:375,height:667}]){
 const page=await browser.newPage({viewport}),stamp=new Date().toISOString(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const states={pomodoro:{version:1,settings:{focus:25,shortBreak:5,longBreak:15,longEvery:4},mode:'focus',selection:{title:'隔离事项',taskId:null},active:null,completedFocusCount:4,sessions:[{id:'finished',taskId:null,title:'隔离事项',mode:'focus',completed:true,durationSeconds:1500,plannedSeconds:1500,startedAt:stamp,endedAt:stamp}]},todos:{version:1,tasks:[],categories:[],sort:'created'},memos:{version:1,notes:[1,2].map(i=>({id:`memo-${i}`,title:`几何便签${i}`,body:'正文摘要与标题分隔',tags:['标签'],images:[{id:'pixel',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII='}],pinned:i===1,color:'blue',createdAt:stamp,updatedAt:stamp}))}};
 await page.route('**/api/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,key=p.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];if(p.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'layout-fixture',csrfToken:'isolated'}});if(key){if(req.method()==='PUT')states[key]=req.postDataJSON().data;return route.fulfill({json:{data:states[key]??null}});}return route.fulfill({json:{enabled:false,reminders:[]}});});
 const button=name=>page.getByRole('button',{name,exact:true});
 const geometry=async()=>{await expect.poll(()=>page.locator('.focus-timer-stage').evaluate(stage=>{const s=stage.getBoundingClientRect(),t=stage.querySelector('.focus-tomato-scene').getBoundingClientRect();return t.height>0&&t.top>=s.top-1&&t.bottom<=s.bottom+1&&t.left>=s.left-1&&t.right<=s.right+1&&Math.abs((t.top+t.bottom-s.top-s.bottom)/2)<2;})).toBe(true);if(viewport.width===375&&page.viewportSize().height===667)expect((await page.locator('.focus-tomato-scene').boundingBox()).width).toBeGreaterThanOrEqual(110);const actions=await page.locator('.focus-action-area').boundingBox();expect(actions.y+actions.height).toBeLessThanOrEqual(viewport.height);};
 const rail=async()=>{await expect(page.locator('.focus-activity-rail')).toHaveCount(0);};
 const suggestions=async()=>{const dialog=page.getByRole('dialog',{name:'休息建议',exact:true});await expect(dialog).toBeVisible();await expect(dialog.locator('.focus-suggestion-card')).toHaveText(activities);for(const card of await dialog.locator('.focus-suggestion-card').all()){await card.scrollIntoViewIfNeeded();await expect(card).toBeInViewport();}const box=await dialog.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);await button('关闭休息建议').click();};
 await page.goto(origin+'/pomodoro');await suggestions();await expect(page.locator('.focus-completion-row')).toBeVisible();await geometry();await rail();await page.screenshot({path:'test-results/focus-layout-spacing/completed-'+viewport.width+'.png'});await button('开始短休息').click();await expect(button('暂停')).toBeVisible();await geometry();await rail();await page.screenshot({path:'test-results/focus-layout-spacing/rest-'+viewport.width+'.png'});await button('暂停').click();await expect(button('结束')).toBeInViewport();await expect(button('继续')).toBeInViewport();await button('继续').click();await expect.poll(()=>states.pomodoro.active?.running).toBe(true);await expect(button('暂停')).toBeEnabled();states.pomodoro.active.deadline=Date.now()-1;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>states.pomodoro.active).toBeNull();await expect(button('开始专注')).toBeVisible();
 const savedSettings=JSON.stringify(states.pomodoro.settings);
 await button('长休息').click();await expect(button('开始长休息')).toBeVisible();await geometry();await rail();
 await button('专注').click();await expect(page.getByRole('textbox',{name:'正在做什么',exact:true})).toBeVisible();await expect(page.locator('.focus-activity')).toHaveCount(0);await geometry();expect(JSON.stringify(states.pomodoro.settings)).toBe(savedSettings);
 await page.setViewportSize({width:viewport.width,height:viewport.height-40});await geometry();await page.setViewportSize(viewport);await geometry();
 // Exercise the real shared toast through persisted completion and actual undo.
 for(const title of ['短提示','长任务名称用于验证换行后按提示条实际高度向下移动且撤销按钮完整可点'.repeat(4)]){
  states.todos.tasks=[{id:'toast-fixture',title,description:'',categoryId:'',important:true,urgent:true,dueDate:'',tags:[],nextTasks:[],subtasks:[],completedAt:null,createdAt:stamp,updatedAt:stamp}];
  await page.goto(origin+'/todos');await button(`完成：${title}`).click();
  const toast=page.locator('.operation-toast');await expect(toast).toContainText(`已完成：${title}`);
  const checkToast=async()=>{
   const g=await toast.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n),baseline=parseFloat(s.bottom),shift=new DOMMatrixReadOnly(s.transform).m42;return {height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right,baseline,shift,viewport:innerHeight,width:innerWidth};});
   // Computed bottom is the untransformed original baseline (or safe minimum).
   const safe=await toast.evaluate(n=>{const probe=document.createElement('div');probe.style.position='absolute';probe.style.width='0';probe.style.height=getComputedStyle(n).getPropertyValue('--operation-toast-safe-bottom');n.append(probe);const h=probe.getBoundingClientRect().height;probe.remove();return h;});
   expect(Math.abs(g.shift-Math.min(g.height,Math.max(0,g.baseline-safe)))).toBeLessThan(1);
   expect(g.top).toBeGreaterThanOrEqual(0);expect(g.bottom).toBeLessThanOrEqual(g.viewport-safe+1);expect(g.left).toBeGreaterThanOrEqual(0);expect(g.right).toBeLessThanOrEqual(g.width);
   await expect(button('撤销最近一次操作')).toBeInViewport();await button('撤销最近一次操作').click({trial:true});return g;
  };
  await checkToast();await page.setViewportSize({width:viewport.height,height:viewport.width});await checkToast();await page.setViewportSize(viewport);await checkToast();
  // Emulate 34px bottom inset plus the shared 16px margin, then force a clamp.
  await toast.evaluate(n=>{n.style.setProperty('--operation-toast-safe-bottom','50px');n.style.setProperty('--operation-toast-bottom','80px');});
  const clamped=await checkToast();expect(clamped.shift).toBeLessThan(clamped.height);
  await button('撤销最近一次操作').click();await expect.poll(()=>states.todos.tasks[0].completedAt).toBe(null);
 }
 states.todos.tasks=[];
 await page.goto(origin+'/todos');await button('在高优先级中添加任务').click();await page.getByRole('textbox',{name:'任务名称',exact:true}).fill('隔离日期');await button('设置日期、提醒和重复').click();await button('选择今天').click();
 const cal=page.locator('.todo-schedule-sheet'),day=cal.locator('.todo-schedule-day.is-selected');
 const appearance=n=>{const c=n.querySelector('.calendar-date-circle');return {opacity:getComputedStyle(n).opacity,color:getComputedStyle(c).color,background:getComputedStyle(c).backgroundColor};};
 const color=await day.evaluate(appearance);
 await button('编辑重复').click();await expect(cal.locator('.todo-schedule-repeat-heading')).toHaveCount(0);
 const positions=await cal.evaluate(n=>{const rect=s=>n.querySelector(s).getBoundingClientRect();return {tabs:rect('.todo-schedule-modes').bottom,rail:rect('.choice-shortcut-rail').top,railBottom:rect('.choice-shortcut-rail').bottom,calendar:rect('.todo-schedule-calendar').top};});expect(positions.rail).toBeGreaterThanOrEqual(positions.tabs);expect(positions.calendar).toBeGreaterThan(positions.railBottom);
 expect(await day.evaluate(appearance)).toEqual(color);await expect(day).toBeEnabled();const selected=await day.getAttribute('aria-label');await cal.locator('.todo-schedule-day:not(.is-selected)').first().click();expect(await day.getAttribute('aria-label')).toBe(selected);await button('每天').click();await expect.poll(()=>cal.locator('.has-repeat').count()).toBeGreaterThan(0);
 await button('关闭日期设置').click();await page.goto(origin+'/memos');await expect(page.locator('.memo-note')).toHaveCount(2);
 const checkCards=async()=>{for(const card of await page.locator('.memo-note').all()){const result=await card.evaluate(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],inside:[...n.querySelectorAll('.memo-note-copy,.memo-note-images,.memo-note-actions')].every(c=>{const b=c.getBoundingClientRect();return b.left>=r.left+20&&b.right<=r.right-20&&b.top>=r.top+20&&b.bottom<=r.bottom-20;})};});expect(result.padding).toEqual(['20px','20px','20px','20px']);expect(result.inside).toBe(true);}};
 await checkCards();await page.screenshot({path:'test-results/focus-layout-spacing/memos-'+viewport.width+'.png'});await button('多选便签').click();await page.locator('.memo-selection-toggle').first().click();await expect(page.locator('.memo-note.is-selected')).toHaveCount(1);await checkCards();await button('批量置顶便签').click();await expect(page.locator('.memo-note.is-selected')).toHaveCount(1);expect(errors).toEqual([]);await page.close();console.log(`PASS layout ${viewport.width}x${viewport.height}`);
}}finally{await browser.close();}
