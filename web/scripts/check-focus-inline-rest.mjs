// Isolated business APIs: completion routing, inline suggestions and field alignment.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated candidate 3017');
const out='test-results/focus-inline-rest';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{for(const [width,height] of [[1440,900],[390,844],[375,667],[844,390],[390,440]].filter(([width])=>!process.env.OTTLOG_FOCUS_WIDTH||width===Number(process.env.OTTLOG_FOCUS_WIDTH))){
 for(const count of [1,4]){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await context.newPage(),errors=[],writes=[];
  const selection={taskId:null,habitId:null,title:'正在处理的事项',domainId:'work'},stamp=new Date(Date.now()-1500000).toISOString();
  const settings={focus:25,shortBreak:5,longBreak:15,longEvery:4,transitionMode:'manual'};
  const states={pomodoro:{version:1,settings,mode:'focus',selection,completedFocusCount:count-1,sessions:[],active:{id:'focus-fixture',mode:'focus',totalSeconds:1500,remainingSeconds:60,running:true,deadline:Date.now()+60000,startedAt:stamp,selection},unknown:{keep:true}},domains:{version:1,domains:[{id:'work',name:'工作',iconId:'work',habits:[],positiveRecords:[],negativeRecords:[],longTermGoal:null,shortTermGoal:null}],completedGoals:[]},todos:{version:1,tasks:[],categories:[]},reminders:{version:1,items:[],done:{}}};
  page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url()),key=url.pathname.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
   if(url.pathname.startsWith('/api/')){
    if(url.pathname.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'inline-rest-fixture',csrfToken:'fixture'}});
    if(key){if(req.method()==='PUT'){states[key]=req.postDataJSON().data;writes.push({key,data:structuredClone(states[key])});}return route.fulfill({json:{data:states[key]??null}});}
    return route.fulfill({json:{enabled:false,reminders:[]}});
   }
   if(url.origin!==origin&&!['data:','blob:'].includes(url.protocol))return route.abort();
   return route.continue();
  });
  const button=name=>page.getByRole('button',{name,exact:true}),contextPanel=page.locator('.focus-context');
  const geometry=async()=>{
   await expect.poll(()=>page.locator('.focus-timer-stage').evaluate(n=>{const r=n.getBoundingClientRect(),t=n.querySelector('.focus-tomato-scene').getBoundingClientRect();return r.height>0&&t.height>0&&t.left>=r.left-1&&t.right<=r.right+1&&t.top>=r.top-1&&t.bottom<=r.bottom+1;})).toBe(true);
   const start=page.locator('.focus-start');await expect(start).toBeInViewport();
   expect(await start.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await expect(page.locator('.focus-feedback-slot')).toHaveCSS('height','40px');
  };
  await page.goto(origin+'/pomodoro');await expect(button('暂停')).toBeEnabled();
  await expect(page.locator('.focus-rest-suggestions')).toHaveCount(0);await geometry();
  const aligned=await contextPanel.evaluate(n=>{const d=n.querySelector('.focus-domain-row .form-choice-trigger').getBoundingClientRect(),p=n.querySelector('.focus-purpose').getBoundingClientRect(),label=n.querySelector('.focus-domain-row .form-choice-label').getBoundingClientRect(),input=n.querySelector('input').getBoundingClientRect(),a=n.querySelector('.focus-domain-row .select-chevron').getBoundingClientRect(),b=n.querySelector('.focus-source-toggle .select-chevron').getBoundingClientRect();return {domain:d.toJSON(),purpose:p.toJSON(),text:label.left-input.left,arrows:(a.left+a.width/2)-(b.left+b.width/2)};});
  expect(aligned.purpose.height).toBeGreaterThanOrEqual(64);expect(aligned.purpose.x).toBeCloseTo(aligned.domain.x,0);expect(aligned.purpose.width).toBeCloseTo(aligned.domain.width,0);expect(Math.abs(aligned.text)).toBeLessThanOrEqual(1);expect(Math.abs(aligned.arrows)).toBeLessThanOrEqual(1);
  await page.screenshot({path:`${out}/${width}x${height}-focus.png`});
  states.pomodoro.active.deadline=Date.now()-1;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  const mode=count===4?'longBreak':'shortBreak',label=count===4?'长休息':'短休息';
  await expect(button('开始'+label)).toBeEnabled({timeout:15000});
  expect(states.pomodoro.mode).toBe(mode);expect(states.pomodoro.active).toBeNull();expect(states.pomodoro.completedFocusCount).toBe(count);
  await expect(button(label)).toHaveAttribute('aria-pressed','true');
  if(width===1440&&count===1){
   states.pomodoro.mode='focus';const readsOnly=writes.length;
   await page.reload();await expect(button('开始短休息')).toBeEnabled();expect(states.pomodoro.mode).toBe('focus');expect(writes.length).toBe(readsOnly);
   await button('专注').click();await expect(button('开始专注')).toBeEnabled();
   await button('短休息').click();await expect(button('开始短休息')).toBeEnabled();await expect.poll(()=>states.pomodoro.mode).toBe('shortBreak');
  }
  await expect(page.locator('.focus-suggestions-overlay,.focus-completion-row')).toHaveCount(0);
  await expect(contextPanel.locator('.focus-suggestion-card')).toHaveCount(3);await geometry();
  await expect.poll(()=>contextPanel.locator('.focus-suggestion-card img').evaluateAll(nodes=>nodes.length===3&&nodes.every(n=>n.complete&&n.naturalWidth>0))).toBe(true);
  const domain=await page.locator('.focus-domain-row').boundingBox(),cards=await page.locator('.focus-rest-suggestions').boundingBox();expect(cards.y).toBeGreaterThanOrEqual(domain.y+domain.height);
  const before=await page.locator('.focus-suggestion-card').allTextContents(),writeCount=writes.length;
  await button('换一组休息建议').scrollIntoViewIfNeeded();await button('换一组休息建议').click();
  const after=await page.locator('.focus-suggestion-card').allTextContents();expect(after.every(title=>!before.includes(title))).toBe(true);expect(writes.length).toBe(writeCount);
  await expect.poll(()=>contextPanel.locator('.focus-suggestion-card img').evaluateAll(nodes=>nodes.length===3&&nodes.every(n=>n.complete&&n.naturalWidth>0))).toBe(true);
  await page.screenshot({path:`${out}/${width}x${height}-${mode}.png`});
  await button('开始'+label).click();await expect(button('暂停')).toBeEnabled();
  await expect.poll(()=>states.pomodoro.active?.mode).toBe(mode);expect(states.pomodoro.active.id).toBe('break:focus-fixture');expect(states.pomodoro.active.totalSeconds).toBe(settings[mode]*60);expect(states.pomodoro.sessions[0].restStartedId).toBe('break:focus-fixture');await geometry();
  if(width===1440&&count===1){
   const deadline=states.pomodoro.active.deadline;
   await button('专注更多操作').click();await button('编辑休息建议').click();
   await expect(page.getByRole('dialog',{name:'编辑休息建议',exact:true})).toBeVisible();
   await button('添加休息建议').click();await page.getByRole('textbox',{name:'建议名称',exact:true}).fill('呼吸练习');await button('添加').click();
   await expect.poll(()=>states.pomodoro.restActivities?.some(item=>item.title==='呼吸练习')).toBe(true);
   await button('删除建议：呼吸练习').click();await page.getByRole('dialog',{name:'删除休息建议',exact:true}).getByRole('button',{name:'删除',exact:true}).click();
   await expect.poll(()=>states.pomodoro.restActivities?.some(item=>item.title==='呼吸练习')).toBe(false);
   expect(states.pomodoro.active.deadline).toBe(deadline);await button('返回休息建议').click();
   await expect(page.locator('.focus-suggestions-overlay')).toHaveCount(0);
  }
  await button('暂停').click();await button('结束').click();await expect(button('开始专注')).toBeEnabled();await expect.poll(()=>states.pomodoro.mode).toBe('focus');
  await page.reload();await expect(button('开始专注')).toBeEnabled();await expect(page.locator('.focus-suggestions-overlay,.focus-rest-suggestions')).toHaveCount(0);
  expect(states.pomodoro.settings).toEqual(settings);expect(states.pomodoro.unknown).toEqual({keep:true});expect(states.pomodoro.completedFocusCount).toBe(count);expect(errors).toEqual([]);
  if(width===1440){
   await button('开始专注').click();await expect.poll(()=>states.pomodoro.active?.mode).toBe('focus');
   if(count===1){
    await button('专注更多操作').click();await button('编辑休息建议').click();await button('添加休息建议').click();
    await page.getByRole('textbox',{name:'建议名称',exact:true}).fill('保留未提交的建议');
   }else await page.goto(origin+'/memos');
   states.pomodoro.active.deadline=Date.now()-1;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await expect.poll(()=>states.pomodoro.mode,{timeout:15000}).toBe('shortBreak');
   if(count===1){
    await expect(page.getByRole('textbox',{name:'建议名称',exact:true})).toHaveValue('保留未提交的建议');
    await button('返回建议列表').click();await button('返回休息建议').click();
   }else await page.goto(origin+'/pomodoro');
   await expect(button('开始短休息')).toBeEnabled();await expect(page.locator('.focus-suggestions-overlay')).toHaveCount(0);
   expect(states.pomodoro.completedFocusCount).toBe(count+1);expect(states.pomodoro.settings).toEqual(settings);expect(errors).toEqual([]);
  }
  await context.close();console.log(`PASS ${width}x${height} round ${count}: matching rest, inline cards, refresh, aligned fields, stable start, return`);
 }
}}finally{await browser.close();}
