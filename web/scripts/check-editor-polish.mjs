// Windows coordinator only: disposable API fixtures, never the live service.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated candidate 3017');
const out='test-results/editor-polish';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),report=[];
try {for(const viewport of [{width:1440,height:900},{width:2412,height:1051},{width:390,height:844},{width:375,height:667}]){
 const page=await browser.newPage({viewport}),stamp=new Date().toISOString(),writes=[],errors=[];
 const pixel={id:'fixture-image',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII='};
 const states={todos:{version:1,tasks:[],categories:[],sort:'created'},memos:{version:1,notes:[{id:'memo',title:'隔离便签',body:'正文',tags:['工作','长标签用于窄屏换行'],color:'blue',pinned:false,createdAt:stamp,updatedAt:stamp}]},mottos:{version:1,mottos:['原格言'],rotationSeconds:16},domains:{version:1,domains:[{id:'other',name:'其它',iconId:'notes',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[{id:'record',content:'**原样文本**',createdAt:stamp,images:[pixel]}],negativeRecords:[]},{id:'named-today',name:'今日',iconId:'notes',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[],negativeRecords:[]}],completedGoals:[]},reminders:{version:1,items:[{id:'free',title:'自由习惯',group:'其它',kind:'plant',note:'',minutes:0,enabled:true,timePeriod:'free'},{id:'timed',title:'时段习惯',group:'今日',kind:'plant',note:'',minutes:0,enabled:true,timePeriod:'morning'},{id:'archived',title:'归档习惯',group:'其它',kind:'plant',note:'',minutes:0,enabled:false}],done:{[stamp.slice(0,10)]:['free']}}};
 let owner='polish-fixture';
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(window.__failToolStorage&&key.startsWith('ottlog-tool-v1:')&&key.endsWith(':'+window.__failToolStorage))throw Error('isolated persistence failure');return original.call(this,key,value);};});
 await page.route('**/api/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,key=p.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];if(p.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:owner,csrfToken:'isolated'}});if(key){if(req.method()==='PUT'){writes.push({owner,key,data:req.postDataJSON().data});states[key]=req.postDataJSON().data;}return route.fulfill({json:{data:states[key]??null}});}return route.fulfill({json:{enabled:false,reminders:[]}});});
 page.on('pageerror',e=>errors.push(e.message));const button=name=>page.getByRole('button',{name,exact:true});
 const close=async()=>{await page.keyboard.press('Escape');await expect(page.locator('.entry-composer,.document-editor-sheet')).toHaveCount(0);};
 const aligned=async selectors=>{const xs=[];for(const selector of selectors){const node=page.locator(selector).first();xs.push(await node.evaluate(n=>{const s=getComputedStyle(n);return n.getBoundingClientRect().x+parseFloat(s.paddingLeft)+parseFloat(s.borderLeftWidth);}));}for(const x of xs)expect(Math.abs(x-xs[0])).toBeLessThanOrEqual(1);};
 await page.goto(origin+'/today');await button('创建记录').click();
 let baseline;
 for(const mode of ['任务','便签','记录','任务','记录','便签']){
  await button('创建类型：'+mode).click();const panel=page.locator('.entry-composer');await expect(panel).toBeVisible();
  const geometry=await panel.evaluate(n=>{const box=x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};return [...box(n),...box(n.querySelector('.entry-type-heading')),...box(n.querySelector('.entry-modes')),...Array.from(n.querySelectorAll('.entry-mode')).flatMap(box)];});
  if(!baseline)baseline=geometry;else geometry.forEach((v,i)=>expect(Math.abs(v-baseline[i])).toBeLessThanOrEqual(1));
  if(mode==='任务'){await expect(panel.locator('.todo-category-icon')).not.toHaveClass(/is-outline/);await expect(panel.locator('.todo-category-icon')).toHaveAttribute('src',/\.png$/);}
  if(mode==='便签')await expect(page.getByPlaceholder('准备记什么？',{exact:true})).toBeVisible();
  if(mode==='记录'){await expect(panel.locator('.progress-column-tools button')).toHaveCount(2);await expect(panel.locator('.progress-record-tools .task-detail-attachment-symbol')).toHaveCount(0);await expect(panel.getByPlaceholder('记录内容',{exact:true})).toHaveCount(2);await expect(panel.locator('.progress-record-heading').first()).toHaveCSS('font-weight','600');}
 }
 await close();
 await page.goto(origin+'/mottos');await button('编辑第 1 句格言').click();
 await aligned(['.document-editor-sheet .memo-sheet-fields','.compact-motto-input','.document-autosave-footer']);await expect(page.locator('.mottos-editor-meta')).toHaveCount(0);
 await expect(page.locator('.compact-motto-input')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 const content=page.getByRole('textbox',{name:'格言内容',exact:true});await content.fill('自动保存格言');await expect.poll(()=>states.mottos.mottos).toEqual(['自动保存格言']);
 await page.evaluate(()=>window.__failToolStorage='mottos');await content.fill('失败保留格言');await expect(page.locator('.operation-toast[role=alert]')).toBeVisible();await page.keyboard.press('Escape');await expect(content).toBeVisible();await expect(page.locator('.document-editor-sheet [role=alert]')).toHaveCount(0);
 await page.evaluate(()=>window.__failToolStorage='');await page.locator('.document-autosave-footer').getByRole('button',{name:'重试',exact:true}).click();await expect.poll(()=>states.mottos.mottos).toEqual(['失败保留格言']);await close();
 await button('创建格言').click();await content.fill('新增格言');await expect.poll(()=>states.mottos.mottos.includes('新增格言')).toBe(true);await close();
 await button('编辑第 1 句格言').click();await button('格言更多操作').click();await button('删除格言').click();await page.getByRole('dialog',{name:'删除这句格言？',exact:true}).getByRole('button',{name:'删除',exact:true}).click();await expect.poll(()=>states.mottos.mottos).toEqual(['新增格言']);
 await page.goto(origin+'/domains');
 const summary=page.locator('.domains-recent-records');await expect(summary).toBeVisible();
 const spacing=await summary.evaluate(n=>{const s=getComputedStyle(n),cols=[...n.querySelectorAll('.domain-record-column')].map(c=>{const s=getComputedStyle(c);return [parseFloat(s.paddingLeft),parseFloat(s.paddingRight)];});return [parseFloat(s.paddingLeft),parseFloat(s.paddingRight),cols];});expect(spacing[0]).toBeGreaterThanOrEqual(16);expect(spacing[0]).toBe(spacing[1]);expect(spacing[2][0][1]).toBe(spacing[2][1][0]);
 await page.locator('#domain-recent-record .domain-record-plain').click();await expect(page.getByRole('dialog',{name:'编辑记录',exact:true})).toBeVisible();await expect(page.locator('.record-edit-meta')).toContainText('正记录');await expect(page.locator('.record-edit-meta button')).toHaveCount(0);
 await aligned(['.record-edit-meta','.record-edit-autosave .memo-body-input','.record-edit-footer']);
 const record=page.getByRole('textbox',{name:'记录内容',exact:true});await expect(record).toHaveValue('**原样文本**');await expect(record).toHaveAttribute('placeholder','记录内容');
 const image=page.locator('.record-edit-autosave .memo-image image,.record-edit-autosave .memo-image img').first();await expect(image).toBeVisible();expect((await image.boundingBox()).height).toBe(96);
 await page.evaluate(()=>window.__failToolStorage='domains');await record.fill('保留ID的编辑');await expect(page.locator('.operation-toast[role=alert]')).toBeVisible();await page.keyboard.press('Escape');await expect(record).toBeVisible();await page.evaluate(()=>window.__failToolStorage='');await page.locator('.record-edit-footer').getByRole('button',{name:'重试',exact:true}).click();await expect.poll(()=>states.domains.domains[0].positiveRecords[0].content).toBe('保留ID的编辑');expect(states.domains.domains[0].positiveRecords[0].id).toBe('record');await close();
 await page.locator('#domain-recent-record .domain-record-plain').click();await button('记录更多操作').click();await button('删除记录').click();await expect.poll(()=>states.domains.domains[0].positiveRecords).toEqual([]);
 await page.goto(origin+'/memos');await button('便签分类：工作').click();await button('排序便签').click();await button('便签排序：标题顺序').click();await button('完成').click();const bar=page.locator('.applied-options');await expect(bar).toContainText('#工作');await expect(bar).toContainText('排序：标题顺序');await expect(bar.locator('button')).toHaveCount(0);await expect(bar).toHaveCSS('padding-left','20px');await expect(bar).toHaveCSS('padding-right','20px');expect(await bar.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await button('筛选便签').click();await button('重置便签筛选').click();await button('关闭便签筛选').click();await expect(bar).toHaveCount(0);
 await page.goto(origin+'/daily');const before=writes.length;
 await expect(page.locator('.daily-time-period-layout')).toBeVisible();await page.locator('.daily-core-filter').filter({hasText:/^全部$/}).click();await expect(page.locator('.daily-neglected')).toHaveCount(0);await expect(page.locator('.daily-time-period-layout')).toHaveCount(0);await expect(button('查看习惯：自由习惯')).toBeVisible();await expect(button('查看习惯：时段习惯')).toBeVisible();await expect(button('查看习惯：归档习惯')).toHaveCount(0);
 await page.locator('.daily-core-filter').filter({hasText:/^今日$/}).nth(1).click();await expect(button('查看习惯：时段习惯')).toBeVisible();await expect(button('查看习惯：自由习惯')).toHaveCount(0);expect(writes.length).toBe(before);
 await page.locator('.daily-core-filter').filter({hasText:/^全部$/}).click();await button('时段习惯 今天打卡').click();await expect.poll(()=>Object.values(states.reminders.done).some(ids=>ids.includes('timed'))).toBe(true);await expect(page.locator('.daily-reflection-overlay')).toHaveCount(0);
 await button('筛选习惯').click();await button('习惯完成状态：已归档').click();await button('关闭习惯筛选').click();await expect(button('查看习惯：归档习惯')).toBeVisible();await expect(button('查看习惯：自由习惯')).toHaveCount(0);
 await button('筛选习惯').click();await button('重置习惯筛选').click();await button('关闭习惯筛选').click();await page.locator('.daily-core-filter').filter({hasText:/^全部$/}).click();
 await button('排序习惯').click();await button('创建日期').click();await button('升序').click();await page.locator('.sort-panel-footer').getByRole('button',{name:'排序',exact:true}).click();await expect.poll(()=>states.reminders.sort).toEqual({field:'created',direction:'asc'});
 // Real Chromium touch input exercises the original shared long-press sorter.
 const tiles=page.locator('.daily-habit-pages .habit-sort-tile');await expect(tiles).toHaveCount(2);const ids=await tiles.evaluateAll(nodes=>nodes.map(n=>n.id));const a=await tiles.nth(0).boundingBox(),b=await tiles.nth(1).boundingBox();const cdp=await page.context().newCDPSession(page);const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
 await touch('touchStart',a.x+a.width/2,a.y+a.height/2);await expect(page.locator('.habit-sort-tile.is-dragging')).toHaveCount(1);await touch('touchMove',b.x+b.width/2,b.y+b.height/2);await touch('touchEnd');await expect.poll(()=>states.reminders.sort?.field).toBe('custom');await expect.poll(()=>tiles.evaluateAll(nodes=>nodes.map(n=>n.id))).toEqual([...ids].reverse());await cdp.detach();
 // Reload with a different intercepted owner; prior owner's open editor cannot write.
 await page.goto(origin+'/mottos');await button('编辑第 1 句格言').click();owner='polish-other';states.mottos={version:1,mottos:['另一账号'],rotationSeconds:16};const mark=writes.length;await page.reload();await expect(page.locator('.document-editor-sheet')).toHaveCount(0);await expect(button('编辑第 1 句格言')).toBeVisible();expect(writes.slice(mark)).toEqual([]);
 expect(errors).toEqual([]);await page.screenshot({path:`${out}/${viewport.width}.png`});report.push({viewport,status:'passed'});await page.close();
}}finally{await browser.close();await fs.writeFile(`${out}/result.json`,JSON.stringify(report,null,2));}
