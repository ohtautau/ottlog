// Actual Chromium wheel/touch input; all account and business APIs are disposable.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated 3017');
const browser=await chromium.launch(),report=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:true}),page=await context.newPage(),errors=[];
 const stamp=new Date().toISOString(),selection={title:'实际运行夹具',taskId:null},deadline=Date.now()+300000;
 let owner='live-focus-fixture';
 const states={pomodoro:{version:1,settings:{focus:25,shortBreak:5,longBreak:15,longEvery:4,transitionMode:'manual'},mode:'focus',selection,active:{id:'live-run',mode:'focus',totalSeconds:1500,remainingSeconds:300,running:true,deadline,startedAt:stamp,selection},sessions:[],completedFocusCount:0}};
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,key=path.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];if(path.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:owner,csrfToken:'isolated'}});if(key){if(req.method()==='PUT'){states[key]=req.postDataJSON().data;await new Promise(resolve=>setTimeout(resolve,800));}return route.fulfill({json:{data:states[key]??null}});}return route.fulfill({json:{enabled:false,reminders:[]}});});
 const button=name=>page.getByRole('button',{name,exact:true});
 await page.goto(origin+'/pomodoro');await expect(button('暂停')).toBeVisible();
 await button('专注更多操作').click();await button('调整时长').click();const dialog=page.getByRole('dialog',{name:'调整时长',exact:true});await expect(dialog).toBeVisible();
 const geometry=()=>page.evaluate(()=>['.focus-page-toolbar','.focus-clock-card','.focus-timer-stage','.focus-toolbar'].map(s=>{const n=document.querySelector(s),r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height,n.scrollTop];}));
 await page.waitForTimeout(400);const before=await geometry(),settingsBefore={...states.pomodoro.settings},samples=[];
 let sampling=true;const collect=(async()=>{while(sampling){try{samples.push(await geometry());await page.waitForTimeout(40);}catch(error){if(page.isClosed())break;throw error;}}})();
 const cdp=await context.newCDPSession(page),keys=['focus','shortBreak','longBreak','longEvery'];
 for(let i=0;i<4;i++){
  const wheel=dialog.locator('.browser-wheel-scroll').nth(i),box=await wheel.boundingBox(),old=states.pomodoro.settings[keys[i]];
  if(width===1440){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,44);}else{
   const x=box.x+box.width/2,y=box.y+box.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   for(let k=1;k<=5;k++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-k*7,id:1}]});await page.waitForTimeout(45);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await expect.poll(()=>states.pomodoro.settings[keys[i]],{timeout:8000}).not.toBe(old);
  expect(states.pomodoro.active.deadline).toBe(deadline);expect(states.pomodoro.active.totalSeconds).toBe(1500);
 }
 sampling=false;await collect;expect(samples.length).toBeGreaterThan(0);
 for(const sample of samples)for(let i=0;i<before.length;i++)for(let j=0;j<5;j++)expect(Math.abs(sample[i][j]-before[i][j])).toBeLessThanOrEqual(1);
 await expect(button('关闭节奏设置')).toBeEnabled();await button('关闭节奏设置').click();expect(states.pomodoro.active.deadline).toBe(deadline);
 // Expire this actual running session through the normal foreground monitor.
 states.pomodoro.active.deadline=Date.now()-1;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 const suggestions=page.getByRole('dialog',{name:'休息建议',exact:true});await expect(suggestions).toBeVisible({timeout:15000});await expect.poll(()=>states.pomodoro.sessions.filter(s=>s.id==='live-run'&&s.completed).length).toBe(1);await button('关闭休息建议').click();
 for(const name of ['短休息','长休息','专注'])await button(name).click();
 await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});await page.waitForTimeout(5500);await expect(suggestions).toHaveCount(0);
 await page.goto(origin+'/memos');await page.goto(origin+'/pomodoro');await expect(suggestions).toHaveCount(0);
 // An owner change discards the previous owner's pending suggestions and timer.
 owner='live-focus-other';states.pomodoro={...states.pomodoro,active:null,sessions:[],completedFocusCount:0};await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(1000);await expect(suggestions).toHaveCount(0);
 expect(errors).toEqual([]);report.push({width,input:width===1440?'mouse wheel':'CDP touch',samples:samples.length,settingsBefore,settingsAfter:states.pomodoro.settings,status:'passed'});await context.close();console.log('PASS live focus duration '+width);
}}finally{await browser.close();await fs.mkdir('test-results/focus-live-settings',{recursive:true});await fs.writeFile('test-results/focus-live-settings/result.json',JSON.stringify(report,null,2));}
