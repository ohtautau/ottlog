// Real browser lifecycle checks. All API requests use disposable per-owner fixtures.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated 3017');
const browser=await chromium.launch();
const output='test-results/rest-activity-lifecycle';
await fs.mkdir(output,{recursive:true});
try{for(const viewport of [{width:1440,height:900},{width:390,height:440}]){
 const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage(),errors=[],writes=[];
 let owner='rest-owner-a',holdPut=false,putRelease,holdGet=false,getRelease,getCaptured=false;
 const initial=(title)=>({version:1,settings:{focus:25,shortBreak:6,longBreak:15,longEvery:4,transitionMode:'manual'},mode:'focus',selection:{title:'',taskId:null},active:null,sessions:[],completedFocusCount:0,restActivities:[{id:'one',title,iconId:'walk'}],unknown:{keep:true}});
 const states={'rest-owner-a':initial('账号甲建议'),'rest-owner-b':initial('账号乙建议'),'rest-owner-c':initial('账号丙建议')};
 states[owner].active={id:'expiry-draft',mode:'focus',totalSeconds:1500,remainingSeconds:300,running:true,deadline:Date.now()+300000,startedAt:new Date().toISOString(),selection:{title:'',taskId:null}};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,key=path.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1],capturedOwner=owner;
  if(path.startsWith('/api/account/'))return route.fulfill({json:{authenticated:!!owner,userName:owner??undefined,csrfToken:'fixture'}});
  if(key){let response=key==='pomodoro'?structuredClone(states[capturedOwner]??null):null;
   if(req.method()==='PUT'){const data=req.postDataJSON().data;writes.push({owner:capturedOwner,key,data:structuredClone(data)});if(key==='pomodoro'&&holdPut)await new Promise(resolve=>putRelease=resolve);if(key==='pomodoro')states[capturedOwner]=data;response=data;}
   else if(key==='pomodoro'&&holdGet){holdGet=false;getCaptured=true;await new Promise(resolve=>getRelease=resolve);}
   return route.fulfill({json:{data:response}});
  }
  return route.fulfill({json:{enabled:false,items:[],reminders:[]}});
 });
 const button=name=>page.getByRole('button',{name,exact:true});
 const open=async()=>{await button('专注更多操作').click();await button('休息建议').click();};
 const manage=async()=>{await button('休息建议更多操作').click();await button('编辑').click();};
 const add=async title=>{await button('添加休息建议').click();await page.getByRole('textbox',{name:'建议名称',exact:true}).fill(title);};
 await page.goto(origin+'/pomodoro');await expect(button('暂停')).toBeVisible();await open();await manage();await add('到期时保留草稿');
 states[owner].active.deadline=Date.now()-1;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect.poll(()=>states['rest-owner-a'].sessions.some(s=>s.id==='expiry-draft'&&s.completed),{timeout:15000}).toBe(true);
 await expect(page.getByRole('textbox',{name:'建议名称',exact:true})).toHaveValue('到期时保留草稿');
 await page.screenshot({path:`${output}/${viewport.width}-draft-at-expiry.png`});
 await button('添加').click();await expect(page.locator('.entity-choice-row')).toHaveCount(2);
 expect(states['rest-owner-a'].active).toBeNull();expect(states['rest-owner-a'].settings).toEqual({focus:25,shortBreak:6,longBreak:15,longEvery:4,transitionMode:'manual'});expect(states['rest-owner-a'].unknown).toEqual({keep:true});
 await button('返回休息建议').click();await expect(page.locator('.focus-suggestion-card')).toHaveCount(2);
 await page.screenshot({path:`${output}/${viewport.width}-two-suggestions.png`});
 await manage();await add('迟到保存仅属于甲');holdPut=true;await button('添加').click();await expect.poll(()=>!!putRelease).toBe(true);
 const otherBefore=structuredClone(states['rest-owner-b']);owner='rest-owner-b';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.getByRole('dialog',{name:'休息建议',exact:true})).toHaveCount(0,{timeout:15000});holdPut=false;putRelease();await page.waitForTimeout(700);
 expect(states['rest-owner-b']).toEqual(otherBefore);expect(writes.filter(w=>w.owner==='rest-owner-b')).toHaveLength(0);
 await open();await expect(page.locator('.focus-suggestion-card')).toHaveCount(1);await expect(page.locator('.focus-suggestion-card')).toContainText('账号乙建议');await manage();await expect(page.locator('.entity-choice-row')).toHaveCount(1);await expect(page.locator('.entity-choice-row')).toContainText('账号乙建议');await button('返回休息建议').click();await button('关闭休息建议').click();
 // A late GET captured for B must not attach its pool to C after identity changes.
 holdGet=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>getCaptured).toBe(true);owner='rest-owner-c';getRelease();await page.waitForTimeout(500);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(600);await open();await expect(page.locator('.focus-suggestion-card')).toContainText('账号丙建议');expect(writes.filter(w=>w.owner==='rest-owner-c')).toHaveLength(0);
 owner=null;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByRole('dialog',{name:'休息建议',exact:true})).toHaveCount(0,{timeout:15000});expect(writes.filter(w=>w.owner===null)).toHaveLength(0);
 expect(errors).toEqual([]);await context.close();console.log('PASS custom rest expiry/draft/late PUT/late GET/owner/logout '+viewport.width);
}}finally{await browser.close();}
