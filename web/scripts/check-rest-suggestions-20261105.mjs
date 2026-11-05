// Coordinator only: isolated 3017, all APIs intercepted. No real account writes.
import {chromium,expect} from '@playwright/test';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated 3017');
const browser=await chromium.launch();
try{for(const [width,height] of [[1440,900],[375,667],[390,844],[390,440]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage();
 const stamp=new Date().toISOString(),writes=[],errors=[];
 const task={id:'schedule',title:'日程夹具',description:'',categoryId:'',important:true,urgent:true,tags:[],subtasks:[],completedAt:null,createdAt:stamp,updatedAt:stamp};
 const states={todos:{version:1,tasks:[task],categories:[],sort:'custom'},pomodoro:{version:1,settings:{focus:25,shortBreak:5,longBreak:15,longEvery:4},mode:'focus',selection:{title:'',taskId:null},active:null,sessions:[],completedFocusCount:0}};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{
  const req=route.request(),path=new URL(req.url()).pathname,key=path.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
  if(path.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'rest-fixture',csrfToken:'isolated'}});
  if(key){if(req.method()==='PUT'){writes.push(key);states[key]=req.postDataJSON().data;}return route.fulfill({json:{data:states[key]??null}});}
  return route.fulfill({json:{enabled:false,reminders:[]}});
 });
 const button=name=>page.getByRole('button',{name,exact:true});
 await page.goto(origin+'/pomodoro');await button('专注更多操作').click();await button('休息建议').click();
 const dialog=page.getByRole('dialog',{name:'休息建议',exact:true}),cards=dialog.locator('.focus-suggestion-card');
 await expect(cards).toHaveCount(3);const previous=await cards.allTextContents(),count=writes.length;
 const refresh=button('换一组休息建议'),r=await refresh.boundingBox(),d=await dialog.boundingBox();
 expect(r.width).toBeCloseTo(56,0);expect(r.height).toBeCloseTo(56,0);expect(d.y+d.height-r.y-r.height).toBeGreaterThanOrEqual(15.5);expect(d.x+d.width-r.x-r.width).toBeGreaterThanOrEqual(15.5);
 await dialog.locator('.focus-suggestions-scroll').evaluate(n=>n.scrollTop=n.scrollHeight);
 await expect(cards.last()).toBeInViewport({ratio:1});
 expect(await cards.last().evaluate(n=>{const r=n.getBoundingClientRect(),s=n.closest('.focus-suggestions-scroll').getBoundingClientRect();return r.bottom<=s.bottom+1&&r.top>=s.top-1;})).toBe(true);
 await expect(refresh).toBeInViewport({ratio:1});await refresh.click();
 const next=await cards.allTextContents();expect(new Set(next).size).toBe(3);expect(next.every(x=>!previous.includes(x))).toBe(true);
 await page.waitForTimeout(600);expect(writes.length).toBe(count);await button('关闭休息建议').click();
 // No-motion mouse/touch and resize must keep 25; explicit keyboard can select/save 26.
 await button('专注更多操作').click();await button('调整时长').click();
 const settings=page.getByRole('dialog',{name:'调整时长',exact:true}),wheel=settings.locator('.browser-wheel-scroll').first();
 await expect(wheel).toBeVisible();await page.waitForTimeout(300);
 const selected=wheel.getByRole('option',{selected:true});await expect(selected).toHaveText('25');
 await selected.click();await selected.tap();
 const cdp=await context.newCDPSession(page),box=await selected.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-2,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.evaluate(()=>document.documentElement.style.zoom='0.9');await page.waitForTimeout(200);await page.evaluate(()=>document.documentElement.style.zoom='');
await page.setViewportSize({width:width+1,height});await page.setViewportSize({width,height});
 await page.waitForTimeout(500);expect(states.pomodoro.settings.focus).toBe(25);
 await settings.locator('.browser-wheel-scroll').nth(1).press('ArrowDown');await page.waitForTimeout(500);expect(states.pomodoro.settings.focus).toBe(25);
 await page.keyboard.press('Escape');await button('专注更多操作').click();await button('调整时长').click();
 await expect(wheel.getByRole('option',{selected:true})).toHaveText('25');
 await wheel.press('ArrowDown');await expect.poll(()=>states.pomodoro.settings.focus).toBe(26);
 await page.keyboard.press('Escape');await button('专注更多操作').click();await button('调整时长').click();
 await expect(wheel.getByRole('option',{selected:true})).toHaveText('26');await page.keyboard.press('Escape');
 await page.goto(origin+'/todos');await page.locator('.todo-task-content').filter({hasText:'日程夹具'}).click();await button('设置日期、提醒和重复').click();
 const scheduleWrites=writes.length;
 for(const [name,kind] of [['编辑任务日期','date'],['编辑提醒日期','reminder'],['编辑重复','repeat']]){
  await button(name).click();
  const row=page.locator('.choice-shortcut-row').first(),icon=row.locator('.choice-shortcut-leading'),rail=row.locator('.choice-shortcut-rail');
  await expect(icon.locator('.is-'+kind)).toBeVisible();const before=await icon.boundingBox();
  await rail.evaluate(n=>n.scrollLeft=n.scrollWidth);const after=await icon.boundingBox();
  if(width<500)expect(await rail.evaluate(n=>n.scrollLeft)).toBeGreaterThan(0);
  expect(after.x).toBeCloseTo(before.x,1);expect(after.y).toBeCloseTo(before.y,1);
  expect(await row.evaluate(n=>{const a=n.querySelector('.choice-shortcut-leading').getBoundingClientRect(),b=n.querySelector('button').getBoundingClientRect();return Math.abs((a.top+a.bottom-b.top-b.bottom)/2)<2;})).toBe(true);
 }
 expect(writes.length).toBe(scheduleWrites);expect(errors).toEqual([]);await context.close();
}}finally{await browser.close();}
console.log('PASS isolated rest suggestions, footer, wheel and fixed shortcut icons');
