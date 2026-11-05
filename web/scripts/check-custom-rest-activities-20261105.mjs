// Windows coordinator candidate. Every API intercepted; isolated 3017 only.
import {chromium,expect} from '@playwright/test';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated 3017');
const browser=await chromium.launch();
try{for(const [width,height] of [[1440,900],[390,440],[375,667]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
 const writes=[];let fail=false,failedId;
 const now=Date.now(),deadline=now+1500000;
 let state={version:1,settings:{focus:25,shortBreak:5,longBreak:15,longEvery:4},mode:'focus',selection:{title:'',taskId:null},active:{id:'running',mode:'focus',totalSeconds:1500,remainingSeconds:1500,running:true,deadline,startedAt:new Date(now).toISOString(),selection:{title:'',taskId:null}},sessions:[],completedFocusCount:0,unknown:{keep:true}};
 await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url()),key=url.pathname.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
  if(url.pathname.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'custom-rest-fixture',csrfToken:'fixture'}});
  if(key){if(req.method()==='PUT'){const data=req.postDataJSON().data;writes.push(structuredClone(data));if(key==='pomodoro'&&fail){failedId=data.restActivities?.at(-1)?.id;return route.fulfill({status:503,json:{message:'fixture failure'}});}if(key==='pomodoro')state=data;}return route.fulfill({json:{data:key==='pomodoro'?state:null}});}
  return route.fulfill({json:{enabled:false,reminders:[]}});
 });
 const button=name=>page.getByRole('button',{name,exact:true});
 async function open(){await button('专注更多操作').click();await button('休息建议').click();}
 async function manage(){await button('休息建议更多操作').click();await button('编辑').click();}
 await page.goto(origin+'/pomodoro');await open();const count=writes.length;
 await expect(page.locator('.focus-suggestion-card')).toHaveCount(3);await button('换一组休息建议').click();await page.waitForTimeout(300);expect(writes.length).toBe(count);
 await manage();await expect(page.locator('.entity-choice-row')).toHaveCount(15);
 const footer=page.locator('.focus-suggestions-window > .sheet-actions');
 const padding=await footer.evaluate(node=>parseFloat(getComputedStyle(node).paddingBottom));expect(padding).toBeGreaterThanOrEqual(16);
 const geometry=await page.locator('.focus-suggestions-window').evaluate(node=>{const r=node.getBoundingClientRect();return {bottom:r.bottom,height:innerHeight};});expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);
 await button('添加休息建议').click();await page.getByRole('textbox',{name:'建议名称',exact:true}).fill('浏览器建议');
 await button('选择建议图标').click();await expect(page.getByRole('dialog',{name:'建议图标库',exact:true})).toBeVisible();await button('选择图标：阅读').click();
 fail=true;await button('添加').click();await expect(button('重试添加')).toBeVisible();expect(failedId).toBeTruthy();fail=false;await button('重试添加').click();await expect(page.locator('.entity-choice-row')).toHaveCount(16);expect(state.restActivities.at(-1).id).toBe(failedId);
 expect(state.active.deadline).toBe(deadline);expect(state.unknown).toEqual({keep:true});
 await button('删除建议：浏览器建议').click();await page.getByRole('dialog',{name:'删除休息建议',exact:true}).getByRole('button',{name:'删除',exact:true}).click();await expect(page.locator('.entity-choice-row')).toHaveCount(15);
 // Delete defaults until explicit empty, then add back with same UI.
 while(state.restActivities.length){const title=state.restActivities[0].title;await button(`删除建议：${title}`).click();await page.getByRole('dialog',{name:'删除休息建议',exact:true}).getByRole('button',{name:'删除',exact:true}).click();await expect.poll(()=>state.restActivities.some(x=>x.title===title)).toBe(false);}
 await expect(page.getByText('暂无休息建议',{exact:true})).toBeVisible();await button('返回休息建议').click();await expect(page.locator('.focus-suggestion-card')).toHaveCount(0);
 await button('关闭休息建议').click();await page.reload();await open();await expect(page.locator('.focus-suggestion-card')).toHaveCount(0);await manage();await button('添加休息建议').click();await page.getByRole('textbox',{name:'建议名称',exact:true}).fill('仅一项');await button('添加').click();await expect.poll(()=>state.restActivities.length).toBe(1);await button('返回休息建议').click();await expect(page.locator('.focus-suggestion-card')).toHaveCount(1);expect(state.active.deadline).toBe(deadline);
 await context.close();
}}finally{await browser.close();}
console.log('PASS isolated custom rest add/delete/empty/reload/failure same ID/running deadline candidate');
