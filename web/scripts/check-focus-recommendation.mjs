// Run only against an isolated candidate; every API is a disposable fixture.
import {chromium,expect} from '@playwright/test';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)||['3000','5229'].includes(new URL(origin).port))throw Error('Use an isolated QA candidate');
const browser=await chromium.launch({headless:true});
try{
for(const width of [1440,390])for(const [count,interval] of [[1,4],[3,4],[4,4],[8,4],[1,1]])for(const chosenMode of ['shortBreak','longBreak']){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference'}),page=await context.newPage();page.setDefaultTimeout(15000);
 const now=Date.now(),stamp=new Date(now-60000).toISOString(),selection={title:'隔离测试',taskId:null,habitId:null};
 let state={version:1,settings:{focus:30,shortBreak:2,longBreak:7,longEvery:interval,transitionMode:'autoBreak'},mode:'focus',selection,active:null,completedFocusCount:count,sessions:[{...selection,id:'finished',mode:'focus',durationSeconds:60,plannedSeconds:60,completed:true,startedAt:stamp,endedAt:new Date(now).toISOString()}]};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{const r=route.request(),p=new URL(r.url()).pathname,key=p.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];if(p.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'focus-recommendation-fixture',csrfToken:'isolated',isAdmin:false}});if(key){if(key==='pomodoro'&&r.method()==='PUT')state=r.postDataJSON().data;return route.fulfill({json:{data:key==='pomodoro'?state:null}});}return route.fulfill({json:{enabled:false,reminders:[]}});});
 const button=name=>page.getByRole('button',{name,exact:true});
 await page.goto(origin+'/pomodoro');await expect(page.locator('.focus-completion-row')).toBeVisible();
 const recommended=count%interval===0?'开始长休息':'开始短休息';
 await expect(button(recommended)).toHaveClass(/ui-button-primary/);
 await expect(button(recommended==='开始长休息'?'开始短休息':'开始长休息')).toHaveClass(/ui-button-secondary/);
 const boxes=await page.locator('.focus-completion-row button').evaluateAll(ns=>ns.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));expect(boxes[0].w).toBeCloseTo(boxes[1].w,0);expect(boxes[0].h).toBe(boxes[1].h);
 await expect.poll(()=>page.locator('.focus-progress-fill').evaluateAll(ns=>ns.every(n=>Math.abs(n.getBoundingClientRect().width-n.parentElement.getBoundingClientRect().width)<1))).toBe(true);
 // Observe actual rendered widths/animations on the first frame after replacement.
 const observeReset=async()=>page.evaluate(()=>{window.__oldBar=document.querySelector('.focus-progress');window.__resetSample=null;const observer=new MutationObserver(()=>{const bar=document.querySelector('.focus-progress');if(bar&&bar!==window.__oldBar){observer.disconnect();requestAnimationFrame(()=>window.__resetSample={widths:[...bar.querySelectorAll('.focus-progress-fill')].map(n=>n.getBoundingClientRect().width),animations:bar.getAnimations({subtree:true}).length});}});observer.observe(document.body,{childList:true,subtree:true});});
 const assertReset=async()=>{await expect.poll(()=>page.evaluate(()=>window.__resetSample)).not.toBeNull();const sample=await page.evaluate(()=>window.__resetSample);expect(sample.widths.every(w=>w<1)).toBe(true);expect(sample.animations).toBe(0);};
 await observeReset();await button(chosenMode==='shortBreak'?'开始短休息':'开始长休息').click();await expect.poll(()=>state.active?.mode).toBe(chosenMode);await assertReset();expect(state.completedFocusCount).toBe(count);
 // A remote tick within the SAME run must retain DOM and animate one interval.
 await page.evaluate(()=>{const bar=document.querySelector('.focus-progress');window.__sameBar=bar;window.__smooth=null;const observer=new MutationObserver(()=>{if(!bar.getAnimations({subtree:true}).length)return;observer.disconnect();requestAnimationFrame(()=>{const fill=bar.querySelector('.focus-progress-fill');window.__smooth={same:bar===document.querySelector('.focus-progress'),width:fill.getBoundingClientRect().width,target:fill.parentElement.getBoundingClientRect().width,animations:bar.getAnimations({subtree:true}).length};});});observer.observe(bar,{attributes:true,subtree:true});});
 state.active.deadline=Date.now()+state.active.totalSeconds*1000*.9;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect.poll(()=>page.evaluate(()=>window.__smooth)).not.toBeNull();const smooth=await page.evaluate(()=>window.__smooth);expect(smooth.same).toBe(true);expect(smooth.animations).toBe(1);expect(smooth.width).toBeLessThan(smooth.target*.55);
 // Expire rest through the existing model, then return to focus at zero.
 state.active.deadline=Date.now()-1;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>state.active).toBeNull();await expect(button('开始专注')).toBeVisible();
 await expect.poll(()=>page.locator('.focus-progress-fill').evaluateAll(ns=>ns.every(n=>n.getBoundingClientRect().width<1))).toBe(true);
 for(const label of ['短休息','长休息','专注']){await observeReset();await button(label).click();await assertReset();}
 await observeReset();await button('开始专注').click();await expect.poll(()=>state.active?.mode).toBe('focus');await assertReset();
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.focus-progress-fill').first()).toHaveCSS('transition-duration','0s');
 await context.close();expect(errors).toEqual([]);console.log(`PASS ${width}: count=${count}, interval=${interval}, action=${chosenMode}, reset + same-run transition`);
}
}finally{await browser.close();}
