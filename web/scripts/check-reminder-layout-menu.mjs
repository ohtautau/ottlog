// Candidate-only QA. No real account, API or subscription request is allowed.
import {chromium,expect} from '@playwright/test';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated candidate port 3017');
const browser=await chromium.launch({headless:true});
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
try{for(const [width,height] of [[1440,900],[2412,1051],[840,900],[390,844],[375,667]]){
 const page=await browser.newPage({viewport:{width,height},timezoneId:'Asia/Shanghai'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const stamp=new Date().toISOString(),date=new Date();date.setDate(date.getDate()-2);
 const due=key(date),before=new Date(date);before.setDate(before.getDate()-1);const reminderDay=key(before);
 const task={id:'recurring',title:'隔离重复提醒',description:'',categoryId:'',important:true,urgent:true,dueDate:due,dueTime:'18:00',reminderAt:new Date(`${due}T17:30:00+08:00`).toISOString(),recurrence:{unit:'day',interval:1},tags:[],subtasks:[],nextTasks:[],completedAt:null,createdAt:stamp,updatedAt:stamp};
 const states={todos:{version:1,tasks:[task],categories:[],sort:'custom'},pomodoro:{version:1,settings:{focus:25,shortBreak:5,longBreak:15,longEvery:4},mode:'focus',selection:{title:'',taskId:null},active:null,completedFocusCount:0,sessions:[]}};
 const unexpected=[];
 await page.route('**/api/**',route=>{const req=route.request(),path=new URL(req.url()).pathname,k=path.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
  if(path.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'reminder-layout-fixture',csrfToken:'isolated'}});
  if(k){if(req.method()==='PUT')states[k]=req.postDataJSON().data;return route.fulfill({json:{data:states[k]??null}});}
  if(req.method()!=='GET')unexpected.push(`${req.method()} ${path}`);
  return route.fulfill({json:{enabled:false,reminders:[]}});
 });
 const button=name=>page.getByRole('button',{name,exact:true});
 const menuGeometry=async()=>{
  const rows=page.locator('.form-popover-panel.is-action-menu .action-menu-option');await expect(rows.first()).toBeVisible();
  const geometry=await rows.evaluateAll(ns=>ns.map(n=>{const a=n.firstElementChild.getBoundingClientRect(),b=n.lastElementChild.getBoundingClientRect(),r=n.getBoundingClientRect(),row=n.closest('button').getBoundingClientRect();return {gap:b.left-a.right,icon:a.width,text:b.left-r.left,align:getComputedStyle(n.lastElementChild).textAlign,height:row.height,label:n.textContent};}));
  for(const g of geometry){expect(g.gap).toBeCloseTo(10,0);expect(g.icon).toBeCloseTo(20,0);expect(g.text).toBeCloseTo(30,0);expect(g.align).toBe('left');expect(g.height).toBeGreaterThanOrEqual(40);expect(['关闭','收起']).not.toContain(g.label);}
 };
 await page.goto(origin+'/pomodoro');await expect(button('开始专注')).toBeVisible();
 await expect.poll(()=>page.locator('.focus-timer-stage').evaluate(n=>{const s=n.getBoundingClientRect(),t=n.querySelector('.focus-tomato-scene').getBoundingClientRect();return t.width>0&&t.left>=s.left-1&&t.right<=s.right+1&&t.top>=s.top-1&&t.bottom<=s.bottom+1&&Math.abs(t.top+t.bottom-s.top-s.bottom)<4;})).toBe(true);
 const bounds=await page.locator('.focus-page').evaluate(n=>{const r=n.getBoundingClientRect(),m=document.querySelector('main.shell'),s=getComputedStyle(m),b=m.getBoundingClientRect();return {left:r.left,right:r.right,expectedLeft:b.left+parseFloat(s.paddingLeft),expectedRight:b.right-parseFloat(s.paddingRight),bottom:r.bottom,view:innerHeight,overflow:document.documentElement.scrollHeight-innerHeight};});
 expect(bounds.left).toBeCloseTo(bounds.expectedLeft,0);expect(bounds.right).toBeCloseTo(bounds.expectedRight,0);expect(bounds.bottom).toBeLessThanOrEqual(bounds.view-15);expect(bounds.overflow).toBeLessThanOrEqual(1);
 await button('专注更多操作').click();await menuGeometry();await page.keyboard.press('Escape');await expect(page.locator('.action-menu-option')).toHaveCount(0);
 await button('专注更多操作').click();await button('专注更多操作').click();await expect(page.locator('.action-menu-option')).toHaveCount(0);
 await page.goto(origin+'/todos');await page.locator('.todo-task-content').filter({hasText:task.title}).click();
 await page.locator('.todo-category-trigger').click();await button('分类更多操作').click();await menuGeometry();await expect(button('关闭')).toHaveCount(0);await button('编辑').click();await button('分类更多操作').click();await menuGeometry();await button('完成编辑').click();await page.keyboard.press('Escape');
 await button('设置日期、提醒和重复').click();
 const sheet=page.locator('.todo-schedule-sheet');await button('编辑提醒日期').click();await button('选择提醒前一天').click();
 await expect(sheet.getByRole('alert')).toHaveCount(0);await button('关闭日期设置').click();await expect(sheet).toHaveCount(0);
 await expect.poll(()=>states.todos.tasks.find(t=>t.id==='recurring').reminderAt).toBe(new Date(`${reminderDay}T17:30:00+08:00`).toISOString());
 await page.goto(origin+'/todos');await button(`完成：${task.title}`).click();
 await expect.poll(()=>states.todos.tasks.length).toBe(2);
 const successor=states.todos.tasks.find(t=>t.generatedFrom==='recurring');expect(Date.parse(successor.reminderAt)-Date.parse(`${successor.dueDate}T18:00:00+08:00`)).toBe(-1470*60000);
 await button('撤销最近一次操作').click();await expect.poll(()=>states.todos.tasks.length).toBe(1);
 // The same newly selected past reminder is still invalid for an ordinary task.
 states.todos.tasks=[{...task,id:'ordinary',title:'隔离普通提醒',recurrence:undefined,reminderAt:undefined}];
 await page.goto(origin+'/todos');await page.locator('.todo-task-content').filter({hasText:'隔离普通提醒'}).click();await button('设置日期、提醒和重复').click();await button('编辑提醒日期').click();await button(`选择提醒日期${due}`).click();await expect(page.locator('.operation-toast[role=alert]')).toContainText('请选择未来的提醒时间');await expect(sheet.getByRole('alert')).toHaveCount(0);
 expect(states.todos.tasks[0].reminderAt).toBeUndefined();expect(unexpected).toEqual([]);expect(errors).toEqual([]);await page.close();console.log(`PASS reminder/layout/menu ${width}x${height}`);
}}finally{await browser.close();}
