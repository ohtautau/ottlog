// Production website assets, fully intercepted disposable APIs and mocked OS notifications.
import { chromium,expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const origin=process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)||['3000','5229'].includes(new URL(origin).port))throw new Error('Use an isolated QA website.');
const out=path.resolve('test-results/editor-refinements');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),report=[];
try {
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
  const stamp=new Date().toISOString(),states={
   todos:{version:1,tasks:[],categories:[{id:'fun',name:'娱乐',iconId:'game',color:'#b9dbca'}],sort:'created'},
   memos:{version:1,notes:[1,2,3].map(i=>({id:`memo-${i}`,title:`便签${i}`,body:'**正文**',color:'blue',iconId:'game',tags:[],pinned:false,createdAt:stamp,updatedAt:stamp}))},
   domains:{version:1,domains:[{id:'other',name:'其它',iconId:'notes',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[],negativeRecords:[]}],completedGoals:[]},
   reminders:{version:1,done:{},items:Array.from({length:12},(_,i)=>({id:`habit-${i}`,title:`网页习惯${i}`,group:'其它',kind:'plant',note:'',minutes:0,enabled:true,timePeriod:'free'}))},
   mottos:{version:1,mottos:['原格言'],rotationSeconds:16},
   pomodoro:{version:1,settings:{focus:1,shortBreak:2,longBreak:7,longEvery:4,transitionMode:'autoBreak'},mode:'focus',selection:{title:'通知测试',taskId:null},active:null,sessions:[],completedFocusCount:0},
  };
  const errors=[],notices=[],page=await browser.newPage({viewport,reducedMotion:'reduce',timezoneId:'Asia/Singapore'});page.setDefaultTimeout(12000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.exposeFunction('__recordDesktopNotification',event=>notices.push(event));
  await page.addInitScript(()=>{
   window.__notificationPermissions=0;
   class FakeNotification {static permission=localStorage.getItem('__notificationsGranted')?'granted':'default';static requestPermission(){window.__notificationPermissions++;this.permission='granted';localStorage.setItem('__notificationsGranted','1');return Promise.resolve('granted');}constructor(title,options){window.__recordDesktopNotification({title,...options});}close(){}}
   window.Notification=FakeNotification;
  });
  await page.route('**/api/**',async route=>{
   const request=route.request(),pathname=new URL(request.url()).pathname,key=pathname.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
   if(pathname.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'refinement-fixture',isAdmin:false,csrfToken:'isolated'}});
   if(key){if(request.method()==='PUT')states[key]=request.postDataJSON().data;return route.fulfill({json:{data:states[key]??null}});}
   return route.fulfill({json:{enabled:false,reminders:[],mottos:[]}});
  });
  const button=name=>page.getByRole('button',{name,exact:true}),entry=()=>page.locator('.entry-composer');
  const close=async()=>{await page.keyboard.press('Escape');await expect(page.locator('.task-detail-panel,.document-editor-sheet,.entry-composer')).toHaveCount(0);};
  try {
  await page.goto(origin+'/today');await button('创建记录').click();await expect(entry()).toBeVisible();
  const frame=await entry().boundingBox();
  for(const mode of ['便签','记录','任务']) {
   await button(`创建类型：${mode}`).click();await expect(entry()).toBeVisible();
   const rect=await entry().boundingBox();expect(rect.width).toBeCloseTo(frame.width,0);expect(rect.height).toBeCloseTo(frame.height,0);
   const insets=await entry().evaluate(node=>{const body=node.querySelector('.task-detail-body,.todo-sheet-fields'),style=getComputedStyle(body);return [parseFloat(style.paddingLeft),parseFloat(style.paddingRight)];});expect(insets).toEqual([24,24]);
   if(mode==='便签'){const edges=await entry().evaluate(node=>['.memo-title-input','.memo-body-input'].map(selector=>{const n=node.querySelector(selector),s=getComputedStyle(n),r=n.getBoundingClientRect();return r.x+parseFloat(s.paddingLeft)+parseFloat(s.borderLeftWidth);}));expect(edges[0]).toBeCloseTo(edges[1],0);await expect(button('便签 Markdown 预览')).toHaveText('MD');const modes=await entry().locator('.entry-type-heading').boundingBox(),menu=await button('更多编辑操作').boundingBox();expect(menu.y).toBeGreaterThanOrEqual(modes.y+modes.height);await expect(button('选择便签图标')).toHaveCount(0);await expect(page.getByRole('textbox',{name:'便签标题',exact:true})).toHaveCSS('font-size','22px');await expect(entry().locator('.memo-body-input')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');}
   if(mode==='记录'){await expect(entry().locator('.progress-record-attachment')).toHaveCount(2);await expect(entry().locator('.progress-record-heading')).toHaveText(['负记录','正记录']);expect(await entry().locator('.progress-record-column').nth(1).evaluate(node=>getComputedStyle(node,'::before').borderLeftWidth)).toBe('1px');}
  }
  await button('创建类型：便签').click();await close();await button('创建记录').click();await expect(button('创建类型：便签')).toHaveAttribute('aria-pressed','true');await close();
  await page.goto(origin+'/memos');await button('编辑便签：便签1').click();await expect(page.locator('.memo-reader')).toHaveCount(0);await expect(button('选择便签图标')).toHaveCount(0);
  await button('便签 Markdown 预览').click();await expect(page.locator('.memo-body-preview strong')).toHaveText('正文');await expect(button('便签 Markdown 预览')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.memo-body-preview')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await close();
  await button('多选便签').click();await button('选择便签：便签1').click();await button('选择便签：便签2').click();await expect(page.locator('.memo-note.is-selected')).toHaveCount(2);await button('批量置顶便签').click();await expect.poll(()=>states.memos.notes.filter(note=>note.pinned).length).toBe(2);
  await button('选择便签：便签1').click();await button('选择便签：便签2').click();await button('批量删除便签').click();await page.getByRole('dialog',{name:'删除便签确认'}).getByRole('button',{name:'删除',exact:true}).click();await expect.poll(()=>states.memos.notes.map(note=>note.id)).toEqual(['memo-3']);
  await page.goto(origin+'/mottos');await button('编辑第 1 句格言').click();await page.getByRole('textbox',{name:'格言内容',exact:true}).fill('关窗保存格言');await close();await expect.poll(()=>states.mottos.mottos).toEqual(['关窗保存格言']);
  await button('编辑第 1 句格言').click();await button('格言更多操作').click();await expect(page.locator('.action-menu-option')).toHaveCount(1);await expect(page.locator('.form-popover-panel.is-action-menu')).toBeVisible();await page.screenshot({path:path.join(out,`motto-menu-${viewport.width}.png`)});await page.keyboard.press('Escape');await close();
  await button('编辑第 1 句格言').click();await button('格言更多操作').click();await button('删除格言').click();await page.getByRole('dialog',{name:'删除这句格言？',exact:true}).getByRole('button',{name:'删除',exact:true}).click();await expect.poll(()=>states.mottos.mottos).toEqual([]);
  await button('格言页面更多操作').click();await button('设置').click();await expect(page.locator('.mottos-rotation-popover')).toBeVisible();await button('关闭轮播设置').click();
  await page.goto(origin+'/daily');const free=page.locator('.daily-time-period-section[data-time-period=free]');await expect(free.locator('.daily-suggestion')).toHaveCount(12);const a=await free.boundingBox(),g=await free.locator('.habit-card-grid').boundingBox();expect(g.x-a.x).toBeGreaterThanOrEqual(15);expect(a.x+a.width-g.x-g.width).toBeCloseTo(g.x-a.x,0);const first=await free.locator('.daily-suggestion').first().boundingBox();await free.getByRole('button',{name:'网页习惯0 今天打卡',exact:true}).click();await expect(button('关闭打卡留言')).toBeVisible();await button('关闭打卡留言').click();await expect(free.locator('.daily-suggestion')).toHaveCount(12);const after=await free.locator('.daily-suggestion').first().boundingBox();expect(after.y).toBeCloseTo(first.y,0);
  await page.goto(origin+'/todos');await expect(page.locator('.todo-quadrant-add')).toHaveCount(4);await expect(page.locator('.todo-filter-toggle,.todo-sort-toggle,.todo-quadrant .todo-panel-source-trigger')).toHaveCount(0);
  const zone=page.locator('#todo-zone-later');
  await zone.evaluate(node=>{for(const [type,x,y] of [['touchstart',200,100],['touchmove',100,104],['touchend',100,104]]){const touches=type==='touchend'?[]:[new Touch({identifier:1,target:node,clientX:x,clientY:y})];node.dispatchEvent(new TouchEvent(type,{bubbles:true,touches,changedTouches:touches}));}});
  await expect.poll(()=>states.todos.panelSources?.later).toEqual({kind:'category',categoryId:''});await expect(page.locator('.operation-toast')).toHaveCount(0);
  await button('在收集箱中添加任务').click();await expect(button('任务分类')).toContainText('收集箱');await close();
  await button('在高优先级中添加任务').click();await page.getByRole('textbox',{name:'任务名称',exact:true}).fill('网页日期和提醒');await button('设置日期、提醒和重复').click();
  const calendar=page.getByRole('dialog',{name:'日期、提醒和重复',exact:true});
  const pick=async(label,value)=>{const column=calendar.getByRole('listbox',{name:label,exact:true});await column.focus();await column.press('Home');for(let i=0;i<value;i++)await column.press('ArrowDown');};
  await expect(calendar.locator('.time-wheel')).toHaveCount(1);await expect(calendar.locator('.time-wheel-stage')).toHaveCSS('height','84px');await expect(calendar.locator('.choice-shortcut-track').first().getByRole('button')).toHaveText(['无日期','今天','明天','下周','下个月']);await button('选择下周').click();await pick('任务小时',10);await pick('任务分钟',15);await expect(button('编辑提醒日期')).toBeEnabled();
  await button('编辑提醒日期').click();await button('选择提醒前一天').click();await pick('提醒小时',8);await pick('提醒分钟',30);await expect(button('每天')).toBeEnabled();
  await button('每天').click();await expect(calendar.locator('.has-reminder')).toHaveCount(1);await expect(calendar.locator('.has-due .due-time')).toHaveText('10:15');await expect(calendar.locator('.has-reminder .reminder-time')).toHaveText('08:30');expect(await calendar.locator('.has-repeat').count()).toBeGreaterThan(0);
  await page.screenshot({path:path.join(out,`shared-calendar-${viewport.width}.png`)});await button('确认日期设置').click();await close();await expect.poll(()=>states.todos.tasks.find(task=>task.title==='网页日期和提醒')?.dueTime).toBe('10:15');
  const savedSchedule=JSON.stringify(states.todos.tasks.find(task=>task.title==='网页日期和提醒'));await button('编辑任务：网页日期和提醒').first().click();await button('设置日期、提醒和重复').click();await button('日期更多操作').click();await button('清除日期设置').click();await button('关闭日期设置').click();await page.getByRole('dialog',{name:'保存修改？',exact:true}).getByRole('button',{name:'不保存',exact:true}).click();await close();expect(JSON.stringify(states.todos.tasks.find(task=>task.title==='网页日期和提醒'))).toBe(savedSchedule);
  // Permission is requested only by the explicit start action, never by expiry.
  await page.goto(origin+'/pomodoro');await button('开始专注').click();await expect.poll(()=>states.pomodoro.active?.mode).toBe('focus');expect(await page.evaluate(()=>window.__notificationPermissions)).toBe(1);
  for(const [index,mode,seconds] of [[0,'longBreak',420],[1,'shortBreak',120]]) {
   if(index){states.pomodoro.active=null;states.pomodoro.mode='focus';await page.goto(origin+'/pomodoro');await button('开始专注').click();await expect.poll(()=>states.pomodoro.active?.mode).toBe('focus');}
   if(index===0){
    states.pomodoro.active.deadline=Date.now()+42000;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(page.locator('.focus-progress-fill').first()).toHaveAttribute('style',/width: 100%/);
    const fills=await page.locator('.focus-progress-fill').evaluateAll(nodes=>nodes.map(node=>parseFloat(node.style.width)));expect(fills).toHaveLength(5);expect(fills[1]).toBeGreaterThan(0);expect(fills[1]).toBeLessThan(100);expect(fills.slice(2)).toEqual([0,0,0]);
    const modes=await page.locator('.focus-toolbar').boundingBox(),bar=await page.locator('.focus-progress').boundingBox(),clock=await page.locator('.focus-clock-card').boundingBox();expect(bar.y).toBeGreaterThanOrEqual(modes.y+modes.height);expect(clock.y).toBeGreaterThanOrEqual(bar.y+bar.height);
   }
   const focusId=states.pomodoro.active.id;states.pomodoro.active.deadline=Date.now()+(index===0?1200:-1);states.pomodoro.active.remainingSeconds=60;
   if(index===0){await page.goto(origin+'/memos');await expect(button('多选便签')).toBeVisible();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>"hidden"});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>states.pomodoro.active,{timeout:12000}).toBeNull();await expect.poll(()=>notices.length).toBe(1);await page.goto(origin+'/pomodoro');}
   await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await expect(button('开始短休息')).toBeVisible();await expect(button('开始长休息')).toBeVisible();await expect.poll(()=>states.pomodoro.active).toBeNull();
   await expect.poll(()=>notices.length).toBe(index+1);expect(notices[index].title).toBe('专注已完成');
   if(viewport.width>=900)await expect.poll(async()=>(await page.locator('.focus-tomato-scene').boundingBox()).width).toBeGreaterThan(300);
   await page.screenshot({path:path.join(out,`focus-completed-${mode}-${viewport.width}.png`)});
   await page.reload();await expect(button('开始短休息')).toBeVisible();expect(notices.length).toBe(index+1);
   await button(mode==='longBreak'?'开始长休息':'开始短休息').click();await expect.poll(()=>states.pomodoro.active?.mode).toBe(mode);expect(states.pomodoro.active.totalSeconds).toBe(seconds);expect(states.pomodoro.active.originFocusId).toBe(focusId);
  }
  expect(errors).toEqual([]);report.push({viewport,frame,notifications:notices.length,businessApi:'intercepted'});await page.close();console.log(`PASS editor refinements ${viewport.width}: shared frames/insets, transparent Markdown, no note icons, bulk pin/delete, motto autosave, swipe/quick-add, completion notifications and explicit rests.`);
  } catch(error) {await page.screenshot({path:path.join(out,`failed-${viewport.width}.png`)});await fs.writeFile(path.join(out,`failed-${viewport.width}.html`),await page.content());throw error;}
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
}finally{await browser.close();}
