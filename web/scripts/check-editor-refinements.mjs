// Production website assets, fully intercepted disposable APIs and mocked OS notifications.
import { chromium,expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assertPopupSpacing from '../../miniprogram/scripts/check-layout-spacing.cjs';
const origin=process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)||['3000','5229'].includes(new URL(origin).port))throw new Error('Use an isolated QA website.');
const out=path.resolve('test-results/editor-refinements');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),report=[];
try {
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:375,height:667}].filter(v=>!process.env.OTTLOG_REFINEMENT_WIDTH||v.width===Number(process.env.OTTLOG_REFINEMENT_WIDTH))) {
  const stamp=new Date().toISOString(),states={
   todos:{version:1,tasks:[],categories:[{id:'fun',name:'娱乐',iconId:'game',color:'#b9dbca'}],sort:'created'},
   memos:{version:1,notes:[1,2,3].map(i=>({id:`memo-${i}`,title:`便签${i}`,body:'**正文**',color:'blue',iconId:'game',tags:[],pinned:false,createdAt:stamp,updatedAt:stamp}))},
   domains:{version:1,domains:[{id:'other',name:'其它',iconId:'notes',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[],negativeRecords:[]}],completedGoals:[]},
   reminders:{version:1,done:{},items:Array.from({length:12},(_,i)=>({id:`habit-${i}`,title:`网页习惯${i}`,group:'其它',kind:'plant',note:'',minutes:0,enabled:true,timePeriod:'free'}))},
   mottos:{version:1,mottos:['原格言'],rotationSeconds:16},
   pomodoro:{version:1,settings:{focus:30,shortBreak:2,longBreak:7,longEvery:4,transitionMode:'autoBreak'},mode:'focus',selection:{title:'通知测试',taskId:null},active:null,sessions:[],completedFocusCount:0},
  };
  const writes={todos:0,memos:0,pomodoro:0},errors=[],notices=[],page=await browser.newPage({viewport,reducedMotion:'reduce',timezoneId:'Asia/Singapore'});page.setDefaultTimeout(12000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.exposeFunction('__recordDesktopNotification',event=>notices.push(event));
  await page.addInitScript(()=>{
   window.__notificationPermissions=0;
   const write=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(window.__failToolStorage && key.startsWith('ottlog-tool-v1:') && key.endsWith(':'+window.__failToolStorage))throw new Error('isolated storage failure');return write.call(this,key,value);};
   class FakeNotification {static permission=localStorage.getItem('__notificationsGranted')?'granted':'default';static requestPermission(){window.__notificationPermissions++;this.permission='granted';localStorage.setItem('__notificationsGranted','1');return Promise.resolve('granted');}constructor(title,options){window.__recordDesktopNotification({title,...options});}close(){}}
   window.Notification=FakeNotification;
  });
  await page.route('**/api/**',async route=>{
   const request=route.request(),pathname=new URL(request.url()).pathname,key=pathname.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
   if(pathname.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'refinement-fixture',isAdmin:false,csrfToken:'isolated'}});
   if(key){if(request.method()==='PUT'){writes[key]=(writes[key]||0)+1;states[key]=request.postDataJSON().data;}return route.fulfill({json:{data:states[key]??null}});}
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
   if(mode!=='任务'){await expect(page.locator('.entry-overlay')).toHaveCSS('position','fixed');const mask=await page.locator('.entry-overlay>.todo-backdrop').boundingBox();expect(mask.x).toBe(0);expect(mask.y).toBe(0);expect(mask.width).toBe(viewport.width);expect(mask.height).toBe(viewport.height);}
   const insets=await entry().evaluate(node=>{const body=node.querySelector('.task-detail-body,.todo-sheet-fields'),style=getComputedStyle(body);return [parseFloat(style.paddingLeft),parseFloat(style.paddingRight)];});expect(insets).toEqual([24,24]);
   if(mode==='便签'){const edges=await entry().evaluate(node=>['.memo-title-input','.memo-body-input'].map(selector=>{const n=node.querySelector(selector),s=getComputedStyle(n),r=n.getBoundingClientRect();return r.x+parseFloat(s.paddingLeft)+parseFloat(s.borderLeftWidth);}));expect(edges[0]).toBeCloseTo(edges[1],0);await expect(button('便签 Markdown 预览').locator('.editor-preview-symbol')).toHaveCount(1);const modes=await entry().locator('.entry-type-heading').boundingBox(),menu=await button('更多编辑操作').boundingBox();expect(menu.y).toBeGreaterThanOrEqual(modes.y+modes.height);await expect(button('选择便签图标')).toHaveCount(0);await expect(page.getByRole('textbox',{name:'便签标题',exact:true})).toHaveCSS('font-size','22px');await expect(entry().locator('.memo-body-input')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');}
   if(mode==='记录'){await expect(entry().locator('.progress-column-tools button')).toHaveCount(2);await expect(entry().locator('.progress-record-heading')).toHaveText(['负记录','正记录']);expect(await entry().locator('.progress-record-column').nth(1).evaluate(node=>getComputedStyle(node,'::before').borderLeftWidth)).toBe('1px');}
  }
  await button('创建类型：便签').click();await close();await button('创建记录').click();await expect(button('创建类型：便签')).toHaveAttribute('aria-pressed','true');await close();
  await page.goto(origin+'/memos');await button('编辑便签：便签1').click();await expect(page.locator('.memo-reader')).toHaveCount(0);await expect(button('选择便签图标')).toHaveCount(0);
  await button('便签 Markdown 预览').click();await expect(page.locator('.memo-body-preview strong')).toHaveText('正文');await expect(button('便签 Markdown 预览')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.memo-body-preview')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await close();
  await button('多选便签').click();await button('选择圆圈：便签1').click();await button('选择便签：便签2').click();await expect(page.locator('.memo-note.is-selected')).toHaveCount(2);await expect(page.locator('.document-editor-sheet')).toHaveCount(0);
  let pinWrites=writes.memos;await button('批量置顶便签').click();await expect.poll(()=>states.memos.notes.filter(note=>note.pinned).length).toBe(2);await expect(page.locator('.memo-note.is-selected')).toHaveCount(2);expect(writes.memos-pinWrites).toBe(1);
  await expect(button('批量置顶便签')).toBeEnabled();pinWrites=writes.memos;await button('批量置顶便签').click();await expect.poll(()=>states.memos.notes.filter(note=>note.pinned).length).toBe(0);await expect(page.locator('.memo-note.is-selected')).toHaveCount(2);expect(writes.memos-pinWrites).toBe(1);
  await button('选择圆圈：便签1').click();await expect(page.locator('.memo-note.is-selected')).toHaveCount(1);await button('选择便签：便签1').click();await expect(page.locator('.memo-note.is-selected')).toHaveCount(2);
  await button('批量删除便签').click();await page.getByRole('dialog',{name:'删除便签确认'}).getByRole('button',{name:'删除',exact:true}).click();await expect.poll(()=>states.memos.notes.map(note=>note.id)).toEqual(['memo-3']);
  await page.goto(origin+'/mottos');await button('编辑第 1 句格言').click();await expect(page.locator('.motto-editor-heading')).toContainText('编辑格言');await page.getByRole('textbox',{name:'格言内容',exact:true}).fill('中文多行\n'+ '长内容'.repeat(35));await expect.poll(()=>states.mottos.mottos[0]).toBe('中文多行\n'+'长内容'.repeat(35));await page.getByRole('textbox',{name:'格言内容',exact:true}).fill('关窗保存格言');await close();await expect.poll(()=>states.mottos.mottos).toEqual(['关窗保存格言']);
  await button('编辑第 1 句格言').click();await button('格言更多操作').click();await expect(page.locator('.action-menu-option')).toHaveCount(1);await expect(page.locator('.form-popover-panel.is-action-menu')).toBeVisible();await page.screenshot({path:path.join(out,`motto-menu-${viewport.width}.png`)});await page.keyboard.press('Escape');await close();
  await button('编辑第 1 句格言').click();await button('格言更多操作').click();await button('删除格言').click();await page.getByRole('dialog',{name:'删除这句格言？',exact:true}).getByRole('button',{name:'删除',exact:true}).click();await expect.poll(()=>states.mottos.mottos).toEqual([]);
  await button('创建格言').click();await expect(page.locator('.motto-editor-heading')).toContainText('新建格言');await page.getByRole('textbox',{name:'格言内容',exact:true}).fill('新建中文\n第二行');await close();await expect.poll(()=>states.mottos.mottos).toEqual(['新建中文\n第二行']);
  await button('格言页面更多操作').click();await button('设置').click();await expect(page.locator('.mottos-rotation-popover')).toBeVisible();await button('关闭轮播设置').click();
  await page.goto(origin+'/domains/uncategorized');await expect(page.locator('.domain-card')).toBeVisible();
  if(viewport.width>=900){const goals=await page.locator('.domain-goal-card').all();const first=await goals[0].boundingBox(),second=await goals[1].boundingBox(),habits=page.locator('.domain-habit-scroll');expect(first.y).toBeCloseTo(second.y,0);expect(second.x).toBeGreaterThan(first.x);expect((await habits.boundingBox()).y).toBeGreaterThanOrEqual(first.y+first.height);const cards=await habits.locator('.daily-suggestion').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(Math.max(...cards)-Math.min(...cards)).toBeLessThan(1);expect(await habits.evaluate(n=>n.scrollWidth>n.clientWidth)).toBe(true);await habits.evaluate(n=>{n.scrollLeft=n.scrollWidth;});await expect(habits.locator('.daily-suggestion').last()).toBeInViewport();}
  await page.screenshot({path:path.join(out,`domain-detail-row-${viewport.width}.png`)});
  await page.goto(origin+'/daily');const free=page.locator('.daily-time-period-section[data-time-period=free]');await expect(free.locator('.daily-suggestion')).toHaveCount(12);const a=await free.boundingBox(),g=await free.locator('.habit-card-grid').boundingBox();expect(g.x-a.x).toBeGreaterThanOrEqual(15);expect(a.x+a.width-g.x-g.width).toBeCloseTo(g.x-a.x,0);
  const first=await free.locator('.daily-suggestion').first().boundingBox(),toggle=await free.getByRole('button',{name:'网页习惯0 今天打卡',exact:true}).boundingBox(),list=await free.locator('.habit-list-section-scroll').boundingBox();
  // Click its actually visible part; locator.click would first scroll the whole
  // clipped control into view on a short screen, before the action being tested.
  await page.mouse.click(toggle.x+toggle.width/2,(Math.max(toggle.y,list.y)+Math.min(toggle.y+toggle.height,list.y+list.height))/2);await expect(button('关闭打卡留言')).toBeVisible();await button('关闭打卡留言').click();await expect(free.locator('.daily-suggestion')).toHaveCount(12);const after=await free.locator('.daily-suggestion').first().boundingBox();expect(after.y).toBeCloseTo(first.y,0);
  await page.goto(origin+'/todos');await expect(page.locator('.todo-quadrant-add')).toHaveCount(4);await expect(page.locator('.todo-filter-toggle,.todo-sort-toggle,.todo-quadrant .todo-panel-source-trigger')).toHaveCount(0);
  await button('待办更多操作').click();await button('编辑').click();await button('更换无优先级区域显示').click();await button('显示分类：收集箱').click();await button('关闭区域显示选择').click();await button('关闭象限显示编辑').click();
  const zone=page.locator('#todo-zone-later');
  await zone.evaluate(node=>{for(const [type,x,y] of [['touchstart',200,100],['touchmove',100,104],['touchend',100,104]]){const touches=type==='touchend'?[]:[new Touch({identifier:1,target:node,clientX:x,clientY:y})];node.dispatchEvent(new TouchEvent(type,{bubbles:true,touches,changedTouches:touches}));}});
  await expect.poll(()=>states.todos.panelSources?.later).toEqual({kind:'category',categoryId:''});await expect(page.locator('.operation-toast')).toHaveCount(0);
  await button('在收集箱中添加任务').click();await expect(button('任务分类')).toContainText('收集箱');await button('任务分类').click();await assertPopupSpacing(page.locator('.todo-category-panel'),expect);const categoryPanel=page.locator('.todo-category-panel');
  const assertTitle=async panel=>{const geometry=await panel.evaluate(node=>{const heading=node.querySelector('.editor-heading'),title=heading.querySelector('.editor-heading-title'),r=node.getBoundingClientRect(),t=title.getBoundingClientRect();return {top:t.top-r.top,padding:parseFloat(getComputedStyle(heading).paddingTop)};});expect(geometry.padding).toBe(16);expect(geometry.top).toBeGreaterThanOrEqual(16);};
  await assertTitle(categoryPanel);
  const selected=categoryPanel.locator('.todo-category-option.is-selected');
  await expect(selected.locator('.todo-category-selected')).toBeVisible();
  expect(await selected.evaluate(node=>{const r=node.getBoundingClientRect(),c=node.querySelector('.todo-category-selected').getBoundingClientRect(),s=getComputedStyle(node);return c.right<=r.right-9 && c.left>=r.left+9 && s.backgroundColor!=='rgba(0, 0, 0, 0)';})).toBe(true);
  await button('分类更多操作').click();
  const menu=page.getByRole('dialog',{name:'分类更多操作',exact:true});await expect(menu.getByRole('button',{name:'编辑',exact:true})).toBeVisible();
  await expect(menu.locator('.action-menu-option')).toHaveCount(2);
  const mb=await menu.boundingBox(),triggerBox=await button('分类更多操作').boundingBox();expect(mb.width).toBeGreaterThan(90);expect(mb.x).toBeGreaterThanOrEqual(0);expect(mb.x+mb.width).toBeLessThanOrEqual(viewport.width);expect(mb.y+mb.height).toBeLessThanOrEqual(viewport.height);expect(Math.min(Math.abs(mb.y-triggerBox.y-triggerBox.height),Math.abs(mb.y+mb.height-triggerBox.y))).toBeLessThanOrEqual(9);
  await menu.getByRole('button',{name:'编辑',exact:true}).click();await expect(categoryPanel.locator('.editor-heading-title')).toHaveText('编辑分类');
  await button('新建任务分类').click();const definition=page.getByRole('dialog',{name:'新建任务分类',exact:true});await assertTitle(definition);await button('关闭分类编辑').click();
  await button('分类更多操作').click();await button('关闭').click();await close();
  await button('在高优先级中添加任务').click();await page.getByRole('textbox',{name:'任务名称',exact:true}).fill('网页日期和提醒');await button('设置日期、提醒和重复').click();
  const calendar=page.getByRole('dialog',{name:'日期、提醒和重复',exact:true});
  const pick=async(label,value)=>{const column=calendar.getByRole('listbox',{name:label,exact:true});await column.focus();await column.press('Home');for(let i=0;i<value;i++)await column.press('ArrowDown');};
  await expect(calendar.locator('.time-wheel')).toHaveCount(1);await expect(calendar.locator('.time-wheel-stage')).toHaveCSS('height','84px');await expect(calendar.locator('.choice-shortcut-track').first().getByRole('button')).toHaveText(['无日期','今天','明天','下周','下个月']);await button('选择下周').click();await pick('任务小时',10);await pick('任务分钟',15);await expect(button('编辑提醒日期')).toBeEnabled();
  await button('编辑提醒日期').click();await button('选择提醒前一天').click();await pick('提醒小时',8);await pick('提醒分钟',30);await button('编辑重复').click();await expect(button('每天')).toBeEnabled();await expect(calendar.locator('.time-wheel')).toHaveCount(0);
  await button('每天').click();await expect(calendar.locator('.has-reminder')).toHaveCount(1);await expect(calendar.locator('.has-due .due-time')).toHaveText('10:15');await expect(calendar.locator('.has-reminder .reminder-time')).toHaveText('08:30');expect(await calendar.locator('.has-repeat').count()).toBeGreaterThan(0);
  await expect.poll(()=>states.todos.tasks.find(task=>task.title==='网页日期和提醒')?.dueTime).toBe('10:15');await expect(calendar).toBeVisible();
  const legendGeometry=await calendar.evaluate(node=>{const grid=node.querySelector('.todo-schedule-calendar').getBoundingClientRect(),circle=node.querySelectorAll('.calendar-date-circle')[6].getBoundingClientRect(),legend=node.querySelector('.todo-schedule-legend'),text=legend.lastElementChild.getBoundingClientRect(),r=legend.getBoundingClientRect();return {right:text.right,circleRight:circle.right,gap:r.top-grid.bottom};});expect(legendGeometry.right).toBeCloseTo(legendGeometry.circleRight,0);expect(legendGeometry.gap).toBe(12);
  const tabs=await calendar.locator('.todo-schedule-modes button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));expect(Math.max(...tabs)-Math.min(...tabs)).toBeLessThan(1);
  const scheduleWrites=writes.todos;await button('编辑任务日期').click();await button('编辑提醒日期').click();await button('编辑重复').click();await page.waitForTimeout(500);expect(writes.todos).toBe(scheduleWrites);
  await page.screenshot({path:path.join(out,`shared-calendar-${viewport.width}.png`)});await button('关闭日期设置').click();await close();await expect.poll(()=>states.todos.tasks.find(task=>task.title==='网页日期和提醒')?.dueTime).toBe('10:15');
  await button('编辑任务：网页日期和提醒').first().click();await button('设置日期、提醒和重复').click();await button('日期更多操作').click();await button('清除日期设置').click();await expect.poll(()=>states.todos.tasks.find(task=>task.title==='网页日期和提醒')?.dueDate).toBe('');await expect(page.getByRole('dialog',{name:'日期、提醒和重复',exact:true})).toBeVisible();await expect(button('确认日期设置')).toHaveCount(0);await expect(page.locator('.todo-schedule-reminder-preview-value,.todo-schedule-reminder-description,.todo-schedule-reminder-status')).toHaveCount(0);await button('关闭日期设置').click();await close();
  // Real keyboard focus, stable row IDs, invisible cleanup and composition guards.
  await button('编辑任务：网页日期和提醒').first().click();await button('添加子任务').click();
  const subtask=index=>page.getByRole('textbox',{name:`子任务 ${index}`,exact:true});
  await expect(subtask(1)).toBeFocused();await subtask(1).fill('子项甲');const firstId=await subtask(1).getAttribute('data-subtask-id');await subtask(1).press('Enter');await expect(subtask(2)).toBeFocused();await subtask(2).fill('子项乙');
  await subtask(2).press('ArrowUp');await expect(subtask(1)).toBeFocused();await subtask(1).press('ArrowDown');await expect(subtask(2)).toBeFocused();await subtask(2).press('Enter');await expect(subtask(3)).toBeFocused();
  await subtask(3).evaluate(node=>{node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));for(const key of ['Enter','ArrowUp','ArrowDown'])node.dispatchEvent(new KeyboardEvent('keydown',{key,isComposing:true,bubbles:true}));node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));});await expect(subtask(3)).toBeFocused();
  await subtask(3).press('ArrowUp');await subtask(2).fill('\u200b\u2060');await subtask(2).press('ArrowUp');await expect(subtask(1)).toBeFocused();await expect(subtask(1)).toHaveAttribute('data-subtask-id',firstId);await expect(page.locator('.task-detail-subtask-input')).toHaveCount(2);
  await expect.poll(()=>states.todos.tasks.find(t=>t.title==='网页日期和提醒')?.subtasks?.length).toBe(1);await button('更多任务操作').click();await expect(page.getByRole('button',{name:'后续任务',exact:true})).toHaveCount(0);await page.keyboard.press('Escape');await close();
  // Failed local schedule persistence retains the current date; explicit retry keeps task ID.
  await button('编辑任务：网页日期和提醒').first().click();await button('设置日期、提醒和重复').click();const scheduledId=states.todos.tasks.find(t=>t.title==='网页日期和提醒').id;
  await page.evaluate(()=>window.__failToolStorage='todos');await button('选择明天').click();await expect(page.locator('.operation-toast[role=alert]')).toBeVisible();await expect(calendar.locator('.has-due')).toHaveCount(1);await page.evaluate(()=>window.__failToolStorage='');await calendar.getByRole('button',{name:'重试',exact:true}).click();await expect(calendar.getByRole('alert')).toHaveCount(0);await expect.poll(()=>states.todos.tasks.find(t=>t.id===scheduledId)?.dueDate).not.toBe('');await button('关闭日期设置').click();await close();
  // Disposable 30-minute rhythm regression; every API is intercepted above.
  await page.goto(origin+'/pomodoro');
  const openRhythm=async()=>{await button('专注更多操作').click();await button('设置').click();};
  await openRhythm();
  const minutes=()=>page.locator('.focus-settings').getByRole('listbox',{name:'专注时长',exact:true});
  const assert30=async()=>{await expect(minutes().getByRole('option',{selected:true})).toHaveText('30');expect(states.pomodoro.settings.focus).toBe(30);};
  await assert30();let rhythmWrites=writes.pomodoro;await page.waitForTimeout(400);expect(writes.pomodoro).toBe(rhythmWrites);
  await minutes().getByRole('option',{name:'30',exact:true}).click();await page.waitForTimeout(350);await assert30();expect(writes.pomodoro).toBe(rhythmWrites);
  await page.setViewportSize({...viewport,width:viewport.width+15});await page.waitForTimeout(350);await assert30();expect(writes.pomodoro).toBe(rhythmWrites);await page.setViewportSize(viewport);
  await page.locator('.focus-settings').getByRole('listbox',{name:'短休息时长',exact:true}).press('ArrowDown');await expect.poll(()=>states.pomodoro.settings.shortBreak).toBe(3);await assert30();
  await button('关闭节奏设置').click();await openRhythm();await assert30();
  await minutes().hover();await page.mouse.wheel(0,28);await expect.poll(()=>states.pomodoro.settings.focus).toBe(31);await page.mouse.wheel(0,-28);await expect.poll(()=>states.pomodoro.settings.focus).toBe(30);await assert30();
  // The user's intended 25-minute setting survives real scrolling, passive layout
  // events, closing/reopening and a full page reload without an extra write.
  await page.mouse.wheel(0,-140);await expect.poll(()=>states.pomodoro.settings.focus).toBe(25);await expect(minutes().getByRole('option',{selected:true})).toHaveText('25');
  await button('关闭节奏设置').click();await openRhythm();await expect(minutes().getByRole('option',{selected:true})).toHaveText('25');await button('关闭节奏设置').click();
  await page.reload();await openRhythm();await expect(minutes().getByRole('option',{selected:true})).toHaveText('25');rhythmWrites=writes.pomodoro;
  await minutes().evaluate(node=>{node.scrollTop=23*28;node.dispatchEvent(new Event('scroll',{bubbles:true}));});await page.waitForTimeout(400);expect(states.pomodoro.settings.focus).toBe(25);expect(writes.pomodoro).toBe(rhythmWrites);await expect.poll(()=>minutes().evaluate(node=>node.scrollTop)).toBe(24*28);
  await minutes().hover();await page.mouse.wheel(0,140);await expect.poll(()=>states.pomodoro.settings.focus).toBe(30);await assert30();
  const rect=await minutes().boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2-28,{steps:4});await page.waitForTimeout(200);await expect(button('关闭节奏设置')).toBeDisabled();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2,{steps:4});await page.mouse.up();await expect(button('关闭节奏设置')).toBeEnabled();await assert30();
  await minutes().press('End');await expect.poll(()=>states.pomodoro.settings.focus).toBe(120);await minutes().press('Home');await expect.poll(()=>states.pomodoro.settings.focus).toBe(1);
  // Restore this fixture's break length for the completion scenarios below.
  await page.locator('.focus-settings').getByRole('listbox',{name:'短休息时长',exact:true}).press('ArrowUp');await expect.poll(()=>states.pomodoro.settings.shortBreak).toBe(2);await button('关闭节奏设置').click();
  // Permission is requested only by the explicit start action, never by expiry.
  await page.goto(origin+'/pomodoro');await button('开始专注').click();await expect.poll(()=>states.pomodoro.active?.mode).toBe('focus');expect(await page.evaluate(()=>window.__notificationPermissions)).toBe(1);
  const deadline=states.pomodoro.active.deadline,transition=states.pomodoro.settings.transitionMode;
  await button('专注更多操作').click();await button('设置').click();const rhythm=page.locator('.focus-settings');await expect(button('保存节奏')).toHaveCount(0);await expect(rhythm.locator('.focus-transition-picker')).toHaveCount(0);
  const focusColumn=rhythm.getByRole('listbox',{name:'专注时长',exact:true});await focusColumn.focus();await focusColumn.press('ArrowDown');await expect.poll(()=>states.pomodoro.settings.focus).toBe(2);expect(states.pomodoro.active.deadline).toBe(deadline);expect(states.pomodoro.settings.transitionMode).toBe(transition);
  await focusColumn.evaluate(node=>{node.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:28}));node.scrollTop+=28;node.dispatchEvent(new Event('scroll',{bubbles:true}));});await expect(button('关闭节奏设置')).toBeDisabled();await expect(button('关闭节奏设置')).toBeEnabled();
  await page.evaluate(()=>window.__failToolStorage='pomodoro');await focusColumn.press('End');await expect(page.locator('.operation-toast[role=alert]')).toBeVisible();await page.evaluate(()=>window.__failToolStorage='');await rhythm.getByRole('button',{name:'重试',exact:true}).click();await expect.poll(()=>states.pomodoro.settings.focus).toBe(120);await expect(rhythm.getByRole('alert')).toHaveCount(0);expect(states.pomodoro.active.deadline).toBe(deadline);
  await focusColumn.press('Home');await expect.poll(()=>states.pomodoro.settings.focus).toBe(1);await button('关闭节奏设置').click();await expect(rhythm).toHaveCount(0);
  for(const [index,mode,seconds] of [[0,'longBreak',420],[1,'shortBreak',120]]) {
   if(index){states.pomodoro.active.deadline=Date.now()-1;states.pomodoro.active.remainingSeconds=0;await page.goto(origin+'/pomodoro');await expect.poll(()=>states.pomodoro.sessions[0]?.mode).toBe('longBreak');await expect.poll(()=>states.pomodoro.active).toBeNull();await button('开始专注').click();await expect.poll(()=>states.pomodoro.active?.mode).toBe('focus');}
   if(index===0){
    states.pomodoro.active.deadline=Date.now()+42000;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(page.locator('.focus-progress-fill').first()).toHaveAttribute('style',/width: 100%/);
    const fills=await page.locator('.focus-progress-fill').evaluateAll(nodes=>nodes.map(node=>parseFloat(node.style.width)));expect(fills).toHaveLength(5);expect(fills[1]).toBeGreaterThan(0);expect(fills[1]).toBeLessThan(100);expect(fills.slice(2)).toEqual([0,0,0]);
    const modes=await page.locator('.focus-toolbar').boundingBox(),bar=await page.locator('.focus-progress').boundingBox(),clock=await page.locator('.focus-clock-card').boundingBox();expect(bar.y).toBeGreaterThanOrEqual(modes.y+modes.height);expect(clock.y).toBeGreaterThanOrEqual(bar.y+bar.height);
   }
   const focusId=states.pomodoro.active.id;states.pomodoro.active.deadline=Date.now()+(index===0?1200:-1);states.pomodoro.active.remainingSeconds=60;
   if(index===0){await page.goto(origin+'/memos');await expect(button('多选便签')).toBeVisible();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>"hidden"});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>states.pomodoro.active,{timeout:12000}).toBeNull();await expect.poll(()=>notices.length).toBe(1);await page.goto(origin+'/pomodoro');}
   await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await expect(button('开始短休息')).toBeVisible();await expect(button('开始长休息')).toBeVisible();await expect.poll(()=>states.pomodoro.active).toBeNull();expect(states.pomodoro.mode).toBe('focus');
   await expect.poll(()=>notices.length).toBe(index+1);expect(notices[index].title).toBe('专注已完成');
   if(viewport.width>=900)await expect.poll(async()=>(await page.locator('.focus-tomato-scene').boundingBox()).width).toBeGreaterThan(300);
   await page.screenshot({path:path.join(out,`focus-completed-${mode}-${viewport.width}.png`)});
   const row=page.locator('.focus-completion-row'),buttons=row.getByRole('button');
   const boxes=await buttons.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}));
   expect(boxes[0].width).toBeCloseTo(boxes[1].width,0);expect(boxes[0].height).toBeCloseTo(boxes[1].height,0);expect(boxes[0].y).toBeCloseTo(boxes[1].y,0);
   const rb=await row.boundingBox();expect(boxes[0].x).toBeCloseTo(rb.x,0);expect(boxes[1].right).toBeCloseTo(rb.x+rb.width,0);expect(boxes[1].right).toBeLessThanOrEqual(viewport.width);expect(boxes[1].bottom).toBeLessThanOrEqual(viewport.height);
   for(const label of ['短休息','长休息']){await button(label).click();await expect(page.locator('.focus-completion-actions')).toHaveCount(0);await expect(button('开始'+label)).toBeVisible();await expect(page.locator('.focus-clock-card')).not.toContainText('专注已完成');await expect(page.locator('.focus-clock-card')).not.toContainText('00:00');}
   await button('专注').click();await page.reload();await expect(button('开始短休息')).toBeVisible();expect(notices.length).toBe(index+1);
   // A fresh client's legacy completion parked on a rest tab is read unchanged.
   // Remove fixture tool caches so an earlier locally queued mode cannot win.
   await page.waitForTimeout(250);states.pomodoro.mode='shortBreak';await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key!=='__notificationsGranted'&&!key.startsWith('ottlog.focus-notified:'))localStorage.removeItem(key);});await page.reload();await expect(button('开始短休息')).toBeVisible();await expect(page.locator('.focus-completion-actions')).toHaveCount(0);expect(states.pomodoro.mode).toBe('shortBreak');await button('专注').click();await expect(page.locator('.focus-completion-actions')).toBeVisible();
   await button(mode==='longBreak'?'开始长休息':'开始短休息').click();await expect.poll(()=>states.pomodoro.active?.mode).toBe(mode);expect(states.pomodoro.active.totalSeconds).toBe(seconds);expect(states.pomodoro.active.originFocusId).toBe(focusId);
  }
  expect(errors).toEqual([]);report.push({viewport,frame,notifications:notices.length,businessApi:'intercepted'});await page.close();console.log(`PASS editor refinements ${viewport.width}: shared frames/insets, transparent Markdown, no note icons, bulk pin/delete, motto autosave, swipe/quick-add, completion notifications and explicit rests.`);
  } catch(error) {await page.screenshot({path:path.join(out,`failed-${viewport.width}.png`)});await fs.writeFile(path.join(out,`failed-${viewport.width}.html`),await page.content());throw error;}
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
}finally{await browser.close();}
