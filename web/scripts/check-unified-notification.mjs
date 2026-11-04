// Candidate-only QA. No real account, API or subscription request is allowed.
import {chromium,expect} from '@playwright/test';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated candidate port 3017');
const browser=await chromium.launch({headless:true});
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
try{for(const [width,height] of [[1440,900],[390,844],[375,667]]){
 const page=await browser.newPage({viewport:{width,height},timezoneId:'Asia/Shanghai'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const stamp=new Date().toISOString(),date=new Date();date.setDate(date.getDate()-2);
 const due=key(date),before=new Date(date);before.setDate(before.getDate()-1);const reminderDay=key(before);
 const task={id:'recurring',title:'隔离重复提醒',description:'',categoryId:'',important:true,urgent:true,dueDate:due,dueTime:'18:00',reminderAt:new Date(`${due}T17:30:00+08:00`).toISOString(),recurrence:{unit:'day',interval:1},tags:[],subtasks:[],nextTasks:[],completedAt:null,createdAt:stamp,updatedAt:stamp};
 const states={todos:{version:1,tasks:[task],categories:[],sort:'custom'},pomodoro:{version:1,settings:{focus:25,shortBreak:5,longBreak:15,longEvery:4},mode:'focus',selection:{title:'',taskId:null},active:null,completedFocusCount:0,sessions:[]}};
 const unexpected=[],cancelled=[];
 await page.route('**/api/**',route=>{const req=route.request(),path=new URL(req.url()).pathname,k=path.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
  if(path.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'reminder-layout-fixture',csrfToken:'isolated'}});
  if(k){if(req.method()==='PUT')states[k]=req.postDataJSON().data;return route.fulfill({json:{data:states[k]??null}});}
  if(req.method()==='DELETE'&&path==='/api/wechat/reminders/with-reminder'){cancelled.push(path);return route.fulfill({status:503,json:{message:'isolated cancellation failure'}});}if(req.method()!=='GET')unexpected.push(`${req.method()} ${path}`);
  return route.fulfill({json:{enabled:false,reminders:[]}});
 });
 const button=name=>page.getByRole('button',{name,exact:true});
 // An ordinary task with no reminder: real date UI creates a validation error.
 states.todos.tasks=[{...task,id:'ordinary',title:'通知夹具任务',recurrence:undefined,reminderAt:undefined}];
 await page.goto(origin+'/todos');await page.locator('.todo-task-content').filter({hasText:'通知夹具任务'}).click();
 await button('设置日期、提醒和重复').click();await button('编辑提醒日期').click();
 const sheet=page.locator('.todo-schedule-sheet'),toast=page.locator('.operation-toast');
 const beforeBox=await sheet.boundingBox();
 await button(`选择提醒日期${due}`).click();
 await expect(toast).toHaveCount(1);await expect(toast).toHaveAttribute('role','alert');await expect(toast).toContainText('请选择未来的提醒时间');
 await expect(toast.getByRole('button')).toHaveCount(0);await expect(sheet.getByText('请选择未来的提醒时间',{exact:true})).toHaveCount(0);
 const afterBox=await sheet.boundingBox();expect(afterBox.x).toBeCloseTo(beforeBox.x,0);expect(afterBox.y).toBeCloseTo(beforeBox.y,0);
 const box=await toast.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(height-15);
 expect(await toast.evaluate(n=>getComputedStyle(n).position)).toBe('fixed');
 // Unchanged error cannot continually refresh the 5s timer.
 await expect(toast).toHaveCount(0,{timeout:6500});await page.waitForTimeout(600);await expect(toast).toHaveCount(0);
 await button('清除提醒日期').click();await button(`选择提醒日期${due}`).click();await expect(toast).toContainText('请选择未来的提醒时间');
 // Preserve the original editor guard: an invalid schedule cannot close.
 await button('关闭日期设置').click();await expect(sheet).toBeVisible();
 expect(states.todos.tasks[0].reminderAt).toBeUndefined();
 // A genuine cancellation failure while completing a task produces a normal
 // page notification together with a real actionable undo. Editors intentionally
 // hide undo while blocked; do not make the test bypass that protection.
 states.todos.tasks.push({...task,id:'with-reminder',title:'合并通知夹具',recurrence:undefined});
 await page.goto(origin+'/todos');await expect(toast).toHaveCount(0);
 await button('完成：合并通知夹具').click();
 await expect(toast).toHaveCount(1);await expect(toast).toContainText('提醒取消失败');await expect(toast).toContainText('已完成：合并通知夹具');await expect(button('撤销最近一次操作')).toBeVisible();expect(cancelled).toEqual(['/api/wechat/reminders/with-reminder']);
 await button('撤销最近一次操作').click();await expect.poll(()=>states.todos.tasks.find(t=>t.id==='with-reminder').completedAt).toBeNull();
 await expect(toast).toHaveCount(1);await expect(toast).toContainText('已撤销此操作');
 await page.goto(origin+'/todos');
 // Real local failure retains the original draft and exposes the same retry.
 await page.locator('.todo-task-content').filter({hasText:'通知夹具任务'}).click();
 await page.evaluate(()=>{window.__originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.includes(':todos'))throw Error('isolated quota');return window.__originalSetItem.call(this,k,v);};});
 await page.getByRole('textbox',{name:'任务名称',exact:true}).fill('通知重试保留原值');
 await expect(toast).toContainText('本机存储不可用');await expect(toast).toHaveCount(1);await expect(page.getByRole('textbox',{name:'任务名称',exact:true})).toHaveValue('通知重试保留原值');
 await expect(page.locator('.task-detail-panel').getByRole('alert')).toHaveCount(0);
 await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSetItem;});await page.locator('.task-detail-save-state').getByRole('button',{name:'重试',exact:true}).click();
 await expect.poll(()=>states.todos.tasks.find(t=>t.id==='ordinary').title).toBe('通知重试保留原值');
 expect(unexpected).toEqual([]);expect(errors).toEqual([]);await page.close();console.log(`PASS unified notification ${width}x${height}`);
}}finally{await browser.close();}
