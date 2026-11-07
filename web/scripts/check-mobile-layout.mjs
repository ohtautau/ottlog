// Prepared for Windows coordinator. Never run against a production origin.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const origin = process.env.OTTLOG_PARITY_ORIGIN || 'http://127.0.0.1:3017';
if (!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin)) throw Error('Use isolated 3017 only');
const out = 'test-results/mobile-layout';
await fs.mkdir(out, {recursive:true});
const viewports = [[360,780],[375,667],[390,844],[430,932],[844,390],[390,440],[1440,900]];
const results = [], failures = [];
const stamp = new Date().toISOString(), day = new Date().toLocaleDateString('en-CA');
const previous = new Date(); previous.setDate(previous.getDate() - 1);
const yesterday = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}`;
const quadrants = [['do', true, true], ['plan', true, false], ['delegate', false, true], ['later', false, false]];
const fixtures = {
  todos: { version: 1, categories: [], sort: 'custom', tasks: quadrants.flatMap(([zone, important, urgent]) => Array.from({ length: 20 }, (_, index) => ({ id: `layout-${zone}-${index}`, title: `宽屏任务 ${zone} ${String(index + 1).padStart(2, '0')}`, description: '**完整备注**\n\n保留所有内容，检查内部滚动和保存。', categoryId: '', important, urgent, dueDate: day, dueTime: '09:30', tags: ['布局回归'], completedAt: null, createdAt: stamp, updatedAt: stamp, nextTasks: [] }))) },
  domains: { version: 1, domains: Array.from({ length: 24 }, (_, index) => ({ id: `layout-domain-${index}`, name: `布局领域${String(index + 1).padStart(2, '0')}`, iconId: 'plant', longTermGoal: { id: `layout-long-${index}`, content: '长期目标保留完整文字，按可用区域展示。', status: 'active', createdAt: stamp }, shortTermGoal: { id: `layout-short-${index}`, content: '完成本次宽屏页面和弹窗检查。', status: 'active', createdAt: stamp }, habits: [], positiveRecords: Array.from({ length: index === 0 ? 30 : 1 }, (_, record) => ({ id: `positive-${index}-${record}`, content: `正向记录 ${record + 1}：完整记录内容与换行\n继续保留。`, createdAt: stamp })), negativeRecords: Array.from({ length: index === 0 ? 30 : 1 }, (_, record) => ({ id: `negative-${index}-${record}`, content: `负向记录 ${record + 1}：用于验证独立滚动。`, createdAt: stamp })) })), completedGoals: [{ id: 'layout-completed', domainId: 'layout-domain-0', kind: 'shortTerm', content: '已完成目标历史保持可访问。', status: 'completed', createdAt: stamp, completedAt: stamp }] },
  reminders: { version: 1, items: Array.from({ length: 40 }, (_, index) => ({ id: `layout-habit-${index}`, title: `宽屏习惯${String(index + 1).padStart(2, '0')}`, group: '布局领域01', domainId: 'layout-domain-0', kind: 'plant', iconId: 'plant', note: '完整提醒备注。\n'.repeat(20), minutes: 0, enabled: true, priority: 'none', timePeriod: index < 20 ? 'free' : 'morning', createdAt: Date.now() })), done: { [yesterday]: ['layout-habit-0', 'layout-habit-20'] }, reflections: [] },
  memos: { version: 1, notes: Array.from({ length: 48 }, (_, index) => ({ id: `layout-memo-${index}`, title: `宽屏便签${String(index + 1).padStart(2, '0')}`, body: index === 0 ? '# 便签完整正文\n\n' + Array.from({ length: 100 }, (_, line) => `第${line + 1}行：阅读窗保留完整正文。`).join('\n\n') + '\n\n正文末尾标记' : '用自然文字检查宽屏卡片的可读性，所有卡片都应通过列表内部滚动访问。', color: ['blue', 'sage', 'sand', 'rose', 'violet', 'mint'][index % 6], tags: ['布局回归'], pinned: false, priority: 'none', createdAt: stamp, updatedAt: stamp })) },
};

fixtures.todos.categories = [{id:'mobile-category',name:'需要省略的很长分类名称用于手机布局测试',iconId:'plant'}];
fixtures.todos.tasks[0].subtasks = [{id:'mobile-child',title:'检查清单内容可读',completed:false}];
fixtures.mottos = {version:1,mottos:Array.from({length:20},(_,i)=>`手机格言${i+1}：保留完整内容。`),rotationSeconds:16};
fixtures.articles = {version:1,articles:Array.from({length:20},(_,i)=>({id:`article-${i}`,title:`手机文章${i+1}`,body:'真实结构测试正文。'.repeat(30),category:'生活',tags:[],createdAt:stamp,updatedAt:stamp}))};
fixtures.pomodoro = {version:1,settings:{focus:25,shortBreak:5,longBreak:15,longEvery:4,transitionMode:'manual'},mode:'focus',selection:{taskId:null,title:''},active:null,sessions:[{id:'fixture-session',mode:'focus',durationSeconds:1500,plannedSeconds:1500,startedAt:stamp,endedAt:stamp,completed:true,taskId:null,title:'隔离专注历史',restStartedId:'fixture-rest'}]};
const browser = await chromium.launch();
try { for (const [width,height] of viewports) {
 const context = await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'});
 const state = structuredClone(fixtures), writes = [], errors = [];
 // Context-wide interception includes Next account requests, background refresh,
 // image/notification endpoints, and any future API. No API request continues.
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.startsWith('/api/')) {
   const key=url.pathname.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
   if(key && req.method()==='PUT') {state[key]=structuredClone(req.postDataJSON().data);writes.push(key);}
   if(url.pathname.startsWith('/api/account/')) return route.fulfill({json:{authenticated:true,userName:'mobile-isolated',csrfToken:'fixture-only'}});
   if(key) return route.fulfill({json:{data:state[key]??null}});
   return route.fulfill({json:{enabled:false,reminders:[]}});
  }
  if(url.origin!==origin && !['data:','blob:'].includes(url.protocol)) return route.abort();
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const root=page.locator('.tool-app-root');
 const button=name=>page.getByRole('button',{name,exact:true});
 async function bounds(locator,label,min=1) {
  await expect(locator,label).toBeVisible();const b=await locator.boundingBox();
  expect(b.height,label+' height').toBeGreaterThanOrEqual(min);
  expect(b.x,label+' left').toBeGreaterThanOrEqual(-1);
  expect(b.x+b.width,label+' right').toBeLessThanOrEqual(width+1);
  expect(b.y,label+' top').toBeGreaterThanOrEqual(-1);
  expect(b.y+b.height,label+' bottom').toBeLessThanOrEqual(height+1);
  return b;
 }
 async function fits(label) {
  expect(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth),label+' horizontal overflow').toBeLessThanOrEqual(1);
  const selected=page.getByRole('navigation',{name:'日常工具',exact:true}).locator('[aria-current=page]');
  await bounds(selected,label+' selected tool',40);
 }
 async function scrollList(selector,label) {
  for(const node of await root.locator(selector).all()) {
   await bounds(node,label,40);
   const m=await node.evaluate(n=>({h:n.clientHeight,s:n.scrollHeight,o:getComputedStyle(n).overflowY}));
   if(m.s>m.h+2){expect(['auto','scroll']).toContain(m.o);await node.evaluate(n=>n.scrollTop=n.scrollHeight);expect(await node.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);}
  }
 }
 async function click(name) {const n=button(name);await n.scrollIntoViewIfNeeded();await bounds(n,name,40);await n.click({trial:true});await n.click();}
 async function modal(selector) {
  const panel=root.locator(selector).last();await bounds(panel,selector);
  for(const control of await panel.locator('button:not(:disabled)').all()) {
   if(!await control.isVisible())continue;
   await control.scrollIntoViewIfNeeded();await bounds(control,selector+' button',40);
   await control.click({trial:true});
  }
  await fits(selector);await page.screenshot({path:`${out}/${width}x${height}-${results.length}-modal.png`});
 }
 async function run(label,fn){try{await fn();results.push({width,height,label,status:'pass'});}catch(e){failures.push({width,height,label,error:e.message});}}
 for(const route of ['today','todos','pomodoro','domains','daily','memos','mottos','articles','statistics']) await run(route,async()=>{
  await page.goto(origin+'/'+route);await expect(root.locator('.shared-app-content')).toBeVisible();await expect(root).not.toContainText('正在读取…');await expect(root.locator('.browser-error')).toHaveCount(0);await fits(route);
  if(route==='todos') {await expect(root.locator('.todo-task')).not.toHaveCount(0);await expect(root.locator('.todo-quadrants')).toHaveCSS('grid-template-columns',/px px/);await scrollList('.todo-quadrant-scroll','quadrants');}
  if(route==='memos') {await expect(root.locator('.memo-note')).toHaveCount(48);await scrollList('.memo-list-scroll','memos');}
  if(route==='daily') {await expect(root.locator('.daily-suggestion')).not.toHaveCount(0);await scrollList('.daily-habit-scroll,.daily-neglected .habit-list-section-scroll','habits and independent reminders');}
  if(route==='pomodoro') {await bounds(root.locator('.focus-timer-stage'),'timer',40);await bounds(root.locator('.focus-action-area'),'timer actions',40);expect((await root.locator('.focus-feedback-slot').boundingBox()).height).toBe(40);}
  if(route==='domains')await expect(root.locator('.domain-entry')).not.toHaveCount(0);
  if(route==='articles')await expect(root).toContainText('手机文章');
  if(route==='mottos')await expect(root).toContainText('手机格言');
  const fab=root.locator('.floating-create-button');
  if(await fab.count()) {await bounds(fab,'FAB',40);await fab.click({trial:true});}
  await page.screenshot({path:`${out}/${width}x${height}-${route}.png`});
 });
 await run('task/date/category/queue',async()=>{
  await page.goto(origin+'/todos');await page.locator('.todo-task-content').first().click();await modal('.task-detail-panel');
  await click('设置日期、提醒和重复');await modal('.todo-schedule-sheet');
  for(const name of ['编辑任务日期','编辑提醒日期','编辑重复']) {await click(name);await modal('.todo-schedule-sheet');}
  await page.keyboard.press('Escape');await click('任务分类');await modal('.form-popover-panel');
  await page.goto(origin+'/todos');await click('待办更多操作');await click('编辑');await click('更换高优先级区域显示：高优先级');await modal('.todo-panel-source-panel');await click('添加显示项');await modal('.todo-panel-add-layer .form-popover-panel');
 });
 await run('creation-task/note/record',async()=>{
  for(const name of ['任务','便签','记录']){await page.goto(origin+'/today');await click('创建记录');await click('创建类型：'+name);await modal('.entry-composer');}
 });
 await run('focus wheels',async()=>{
  await page.goto(origin+'/pomodoro');await click('专注更多操作');await click('调整时长');await modal('.focus-settings');
  for(const name of ['专注时长','短休息时长','长休息时长','长休息间隔']){const wheel=root.getByRole('listbox',{name,exact:true});await wheel.scrollIntoViewIfNeeded();await bounds(wheel,name,40);}
 });
 await run('account/motto',async()=>{
  await page.goto(origin+'/today');await page.getByRole('button',{name:/^打开账号窗口/}).click();await modal('[role=dialog]');
  await page.goto(origin+'/mottos');await click('创建格言');await modal('.mottos-editor-sheet');
 });
 expect(errors).toEqual([]);await context.close();
 results.push({width,height,fixtureWrites:writes,errors});
}} finally {await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify({results,failures},null,2));}
expect(failures,'mobile layout acceptance').toEqual([]);
console.log('PASS mobile layout; all API calls intercepted, no real account used.');
