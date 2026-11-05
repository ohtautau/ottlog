// Windows coordinator: existing browser only; all business requests intercepted.
import {chromium,expect} from '@playwright/test';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(localhost|127\.0\.0\.1):3017$/.test(origin))throw Error('Use isolated 3017');
const browser=await chromium.launch();
try {for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:375,height:667},{width:390,height:440}]){
 const context=await browser.newContext({viewport}),page=await context.newPage();
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__calendarFailLocal&&k.startsWith('ottlog-tool-v1:')&&k.endsWith(':reminders'))throw Error('isolated calendar quota');return original.call(this,k,v);};});
 await page.clock.install({time:new Date('2026-11-05T12:00:00')});
 const item=(id,title,enabled=true)=>({id,title,note:'长备注\n'.repeat(30),group:'工作',domainId:'work',kind:'plant',iconId:'water',minutes:0,priority:'high',timePeriod:'free',enabled,createdAt:1});
 const done={},reflections=[];for(let d=1;d<=20;d++){const day=`2026-10-${String(d).padStart(2,'0')}`;done[day]=['h'];reflections.push({id:`r${d}`,habitId:'h',day,text:`日志${d}`,createdAt:1});}
 const states={reminders:{version:1,items:[item('h','布局检查习惯'),item('archived','归档夹具',false)],done,reflections},domains:{version:1,domains:[{id:'work',name:'工作',iconId:'work',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[],negativeRecords:[]}],completedGoals:[]}};
 states.todos={version:1,categories:[],tasks:[{id:'t',title:'日历回归任务',description:'',categoryId:'',important:true,urgent:true,dueDate:'2026-11-06',dueTime:'09:00',reminderAt:'2026-11-05T08:00:00+08:00',recurrence:{unit:'day',interval:1},completedAt:null,createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z'}]};
 let delay=false,hold=false,writes=0;const held=[];
 await page.route('**/api/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,key=path.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];if(path.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'calendar-fixture',csrfToken:'isolated'}});if(key){if(req.method()==='PUT'){writes++;if(hold&&key==='reminders')await new Promise(resolve=>held.push(resolve));if(delay)await new Promise(r=>setTimeout(r,800));states[key]=req.postDataJSON().data;}return route.fulfill({json:{data:states[key]??null}});}return route.fulfill({json:{items:[],posts:[],enabled:false}});});
 const button=name=>page.getByRole('button',{name,exact:true});
 for(const host of ['/daily','/domains/work']){
  await page.goto(origin+host);if(host==='/daily')await page.locator('.daily-core-filter').filter({hasText:/^全部$/}).click();
  await button('查看习惯：布局检查习惯').first().click();const sheet=page.locator('.habit-calendar-editor');
  await expect(sheet.locator('.habit-detail-header')).toContainText('布局检查习惯');await expect(sheet.locator('.habit-detail-domain-field')).toContainText('工作');await expect(sheet.locator('.habit-detail-header .priority-flag')).toBeVisible();await expect(button('选择习惯图标')).toBeVisible();await expect(sheet.locator('.habit-detail-note')).toContainText('长备注');
  expect((await sheet.boundingBox()).width).toBeLessThanOrEqual(680);
  await expect(sheet.locator('.calendar-month-day')).toHaveCount(42);await expect(sheet.locator('.habit-calendar-stats > div')).toHaveCount(4);
  const footer=sheet.locator('.sheet-actions');await expect.poll(async()=>{const fb=await footer.boundingBox();return fb.y+fb.height;}).toBeLessThanOrEqual(viewport.height);
  await sheet.locator('.habit-calendar').evaluate(n=>n.scrollIntoView({block:'start'}));
  const date=sheet.getByRole('button',{name:/^2026-11-04 /});const gap=()=>date.evaluate(n=>{const c=n.querySelector('.calendar-date-circle').getBoundingClientRect(),t=n.querySelector('.calendar-date-note').getBoundingClientRect();return t.top-c.bottom;});
  expect(await gap()).toBeCloseTo(4,1);hold=true;await page.evaluate(()=>window.__calendarFailLocal=true);await date.click();await expect(page.locator('.operation-toast[role=alert]')).toBeVisible();await page.evaluate(()=>window.__calendarFailLocal=false);delay=true;await date.click();await expect(date).toHaveAttribute('aria-pressed','true');hold=false;held.splice(0).forEach(resolve=>resolve());await expect.poll(()=>states.reminders.done['2026-11-04']?.includes('h')).toBe(true);delay=false;expect(await gap()).toBeCloseTo(4,1);
  await button('关闭习惯详情').click();await page.reload();if(host==='/daily')await page.locator('.daily-core-filter').filter({hasText:/^全部$/}).click();await button('查看习惯：布局检查习惯').first().click();await expect(date).toHaveAttribute('aria-pressed','true');await date.click();await expect.poll(()=>states.reminders.done['2026-11-04']?.includes('h')??false).toBe(false);
  await expect(sheet.getByRole('button',{name:/^2026-11-06 /})).toBeDisabled();
  await button('查看上个月打卡').click();await expect(sheet.locator('.calendar-month-day')).toHaveCount(42);await expect(sheet.locator('.habit-calendar-log-row')).toHaveCount(10);await sheet.getByRole('button',{name:'更多',exact:true}).click();await expect(sheet.locator('.habit-calendar-log-row')).toHaveCount(20);await button('回到本月打卡').click();await button('关闭习惯详情').click();
 }
 await page.goto(origin+'/daily');await button('筛选习惯').click();await button('习惯完成状态：已归档').click();await button('关闭习惯筛选').click();await button('查看习惯：归档夹具').first().click();await expect(page.locator('.habit-calendar-editor button.calendar-month-day:not([disabled])')).toHaveCount(0);await button('关闭习惯详情').click();
 await page.goto(origin+'/todos');await button('编辑任务：日历回归任务').first().click();await button('设置日期、提醒和重复').click();
 const schedule=page.locator('.todo-schedule-sheet');
 for(const mode of ['编辑任务日期','编辑提醒日期','编辑重复']){
  await button(mode).click();await expect(schedule.locator('.calendar-month-grid .calendar-month-day')).toHaveCount(42);await expect(schedule.locator('.calendar-month-weekdays > span')).toHaveCount(7);await expect(schedule.locator('.choice-shortcut-rail')).toBeVisible();
  const sizes=await schedule.locator('.calendar-date-circle').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect(),t=n.parentElement.querySelector('.calendar-date-note').getBoundingClientRect();return {w:b.width,h:b.height,gap:t.top-b.bottom};}));for(const size of sizes){expect(size.w).toBe(28);expect(size.h).toBe(28);expect(size.gap).toBeCloseTo(4,1);}
  await expect(schedule.locator('.todo-schedule-day-times').filter({hasText:'09:00'}).first()).toBeVisible();if(mode==='编辑重复')await expect(schedule.locator('.todo-schedule-day.has-repeat').first()).toHaveAttribute('aria-readonly','true');
 }
 await button('关闭日期设置').click();
 expect(writes).toBeGreaterThanOrEqual(4);await context.close();
}}finally{await browser.close();}
console.log('PASS isolated habit hosts and calendar persistence/undo/layout/archive; task/reminder/repeat shared grid, time badges and shortcut rails');
