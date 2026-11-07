// Prepared for Windows QA; every API intercepted, isolated 3017 only.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated 3017 only');
const out='test-results/progress-editor';await fs.mkdir(out,{recursive:true});
const fresh=()=>({todos:{version:1,categories:[],tasks:[]},memos:{version:1,notes:[]},domains:{version:1,domains:[{id:'work',name:'工作',iconId:'work',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[],negativeRecords:[]}],completedGoals:[]}});
const browser=await chromium.launch(),results=[];let currentPage,currentViewport;
const viewports=[[1440,900],[360,780],[390,844],[375,667],[844,390],[390,440]].filter(([width])=>!process.env.OTTLOG_PROGRESS_WIDTH||width===Number(process.env.OTTLOG_PROGRESS_WIDTH));
if(!viewports.length){await browser.close();throw Error('OTTLOG_PROGRESS_WIDTH must match a configured viewport');}
try{for(const [width,height] of viewports){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<900,serviceWorkers:'block'}),page=await context.newPage(),errors=[],writes=[];
 let owner='progress-isolated',delay=0;const states={[owner]:fresh()};
 currentPage=page;currentViewport=`${width}x${height}`;page.setDefaultTimeout(7000);
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),key=url.pathname.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];
  if(url.pathname.startsWith('/api/')){
   if(url.pathname.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:owner,csrfToken:'isolated'}});
   if(key){const capturedOwner=owner;if(req.method()==='PUT'){const data=structuredClone(req.postDataJSON().data);if(delay)await new Promise(resolve=>setTimeout(resolve,delay));states[capturedOwner][key]=data;writes.push({owner:capturedOwner,key,data});}return route.fulfill({json:{data:states[capturedOwner][key]??null}});}
   return route.fulfill({json:{enabled:false,reminders:[]}});
  }
  if(url.origin!==origin&&!['data:','blob:'].includes(url.protocol))return route.abort();
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),panel=()=>page.locator('.entry-composer'),fields=kind=>panel().locator(`.is-${kind} textarea`),saved=kind=>states['progress-isolated'].domains.domains.flatMap(d=>d[`${kind}Records`]);
 const row=(kind,index=0)=>panel().locator(`.progress-record-column.is-${kind} .progress-record-field`).nth(index);
 const attachment=(kind,index=0)=>row(kind,index).getByRole('button',{name:'该条记录附件',exact:true});
 const open=async()=>{await button('创建记录').click();await button('创建类型：记录').click();await expect(attachment('positive')).toBeEnabled();};
 const geometry=async()=>{
  const boxes=[];const p=await panel().boundingBox();
  expect(p.y).toBeGreaterThanOrEqual(-1);expect(p.y+p.height).toBeLessThanOrEqual((await page.viewportSize()).height+1);
  for(const kind of ['negative','positive']){
   const records=panel().locator(`.progress-record-column.is-${kind} .progress-record-field`);
   for(let i=0;i<await records.count();i++){
    const field=records.nth(i),action=field.locator('.record-action-row'),a=await action.boundingBox(),f=await field.boundingBox();
    expect(a.x).toBeCloseTo(f.x,0);expect(a.width).toBeCloseTo(f.width,0);
    const clip=action.getByRole('button',{name:'该条记录附件',exact:true}),b=await clip.boundingBox();
    expect(b.width).toBeGreaterThanOrEqual(32);expect(b.height).toBeGreaterThanOrEqual(40);expect(b.x).toBeCloseTo(a.x,0);
    const plus=await action.getByRole('button',{name:'增加投入分数',exact:true}).boundingBox();
    expect(plus.x+plus.width).toBeLessThanOrEqual(a.x+a.width+1);expect(plus.x+plus.width).toBeGreaterThanOrEqual(a.x+a.width-1);expect(plus.y).toBeCloseTo(b.y,0);
    expect(await action.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);boxes.push(a);
   }
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);return boxes;
 };
 await page.goto(origin+'/today');await open();await expect(fields('positive')).toHaveCount(1);await expect(fields('negative')).toHaveCount(1);await geometry();
 await expect(panel().locator('.record-effort-value')).toHaveText(['0','0']);
 // Nonzero score alone is content; returning to zero removes that blank saved row.
 const negativeId=await fields('negative').first().getAttribute('data-editor-row');
 await row('negative').getByRole('button',{name:'增加投入分数',exact:true}).click();
 await expect.poll(()=>saved('negative').find(r=>r.id===negativeId)?.effortScore).toBe(1);
 await row('negative').getByRole('button',{name:'减少投入分数',exact:true}).click();
 await expect.poll(()=>saved('negative').find(r=>r.id===negativeId)).toBeUndefined();
 const first=fields('positive').first();await first.fill('');const emptyRowHeight=(await row('positive').boundingBox()).height;await first.pressSequentially('p');await expect(fields('positive')).toHaveCount(1);expect(Math.abs((await row('positive').boundingBox()).height-emptyRowHeight),'first character does not add a delete-tool row').toBeLessThanOrEqual(1);await first.pressSequentially('lain typing');await expect(fields('positive')).toHaveCount(1);
 const firstId=await first.getAttribute('data-editor-row');
 await first.focus();await row('positive').getByRole('button',{name:'增加投入分数',exact:true}).evaluate(n=>{n.click();n.click();});
 await expect(row('positive').locator('.record-effort-value')).toHaveText('2');await expect(first).toBeFocused();
 await expect(row('negative').locator('.record-effort-value')).toHaveText('0');
 await expect.poll(()=>saved('positive').find(r=>r.id===firstId)?.effortScore).toBe(2);await first.fill('粘贴内容\n第二行备注');await expect(fields('positive')).toHaveCount(1);
 await first.focus();const ime=await first.evaluate(n=>{n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));const e=new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true});n.dispatchEvent(e);n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'中文'}));return e.defaultPrevented;});expect(ime).toBe(false);await expect(fields('positive')).toHaveCount(1);
 const ime229=await first.evaluate(n=>{const e=new KeyboardEvent('keydown',{key:'Enter',keyCode:229,bubbles:true,cancelable:true});n.dispatchEvent(e);return e.defaultPrevented;});expect(ime229).toBe(false);await expect(fields('positive')).toHaveCount(1);
 await first.press('Enter');await expect(fields('positive')).toHaveCount(2);await expect(fields('positive').last()).toBeFocused();await fields('positive').last().press('Enter');await expect(fields('positive')).toHaveCount(2);
 await fields('positive').last().fill('正二');await expect(fields('positive')).toHaveCount(2);await fields('positive').last().press('ArrowUp');await expect(first).toBeFocused();await first.press('ArrowDown');await expect(fields('positive').last()).toBeFocused();
 await fields('positive').last().press('ArrowDown');await expect(fields('positive')).toHaveCount(3);await expect(fields('positive').last()).toBeFocused();await fields('positive').last().fill('  ');await fields('negative').first().focus();await expect(fields('positive')).toHaveCount(2);
 await fields('negative').first().fill('负一');await expect(fields('negative')).toHaveCount(1);await expect(fields('positive')).toHaveCount(2);
 await first.fill('短文');await first.press('Shift+Enter');await expect(first).toHaveValue('短文\n');await expect(fields('positive')).toHaveCount(2);
 delay=1800;await first.fill('长备注\n'.repeat(100));await geometry();
 await panel().locator('.entry-scroll').evaluate(n=>n.scrollTop=n.scrollHeight);await geometry();await expect.poll(()=>saved('positive').find(r=>r.id===firstId)?.content,{timeout:15000}).toBe(('长备注\n'.repeat(100)).trim());delay=0;await geometry();
 // Grow by explicit Enter, including after scroll; neither typing nor save adds a row.
 for(let i=0;i<5;i++){await fields('positive').last().press('Enter');await expect(fields('positive').last()).toBeFocused();await fields('positive').last().fill('追加'+i);await geometry();}
 expect(await fields('positive').last().getAttribute('data-editor-row')).not.toBe(firstId);await fields('negative').first().focus();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#39ad6c';x.fillRect(16,16,32,32);return c.toDataURL('image/png');});
 const file={name:'transparent.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')};
 for(const [,kind,id] of [['正','positive',firstId],['负','negative',await fields('negative').first().getAttribute('data-editor-row')]]){
  const chooser=page.waitForEvent('filechooser');await attachment(kind).click();await (await chooser).setFiles(file);
  await expect.poll(()=>saved(kind).find(r=>r.id===id)?.images?.length).toBe(1);expect(saved(kind).filter(r=>r.images?.length)).toHaveLength(1);await geometry();
  const target=attachment(kind);await target.scrollIntoViewIfNeeded();expect(await target.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
 }
 const alpha=await panel().locator('.memo-image img').first().evaluate(async img=>{await img.decode();const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,1,1).data[3];});expect(alpha).toBe(0);
 // Type switching shares title text; keep that title within the existing memo limit.
 await first.fill('切换检查');await expect.poll(()=>saved('positive').find(r=>r.id===firstId)?.content).toBe('切换检查');
 await button('创建类型：任务').click();await button('设置日期、提醒和重复').click();
 for(const mode of ['编辑任务日期','编辑提醒日期','编辑重复'])await button(mode).click();
 await button('关闭日期设置').click();await button('创建类型：便签').click();await button('创建类型：记录').click();await expect(row('positive').locator('.record-effort-value')).toHaveText('2');await expect(attachment('positive')).toBeVisible();await geometry();
 // Keyboard-visible area simulation: real resize invokes existing viewport listeners.
 if(width===390&&height===844){await page.setViewportSize({width,height:440});await fields('positive').first().focus();await geometry();await page.setViewportSize({width,height});await geometry();}
 await page.screenshot({path:`${out}/${width}x${height}.png`});
 // Closing is deliberately guarded while the picker is busy. Cancel, then close.
 let chooserPromise=page.waitForEvent('filechooser');await attachment('positive').click();let chooser=await chooserPromise;await page.keyboard.press('Escape');await expect(panel()).toHaveCount(1);await chooser.setFiles([]);await expect(attachment('positive')).toBeEnabled();await page.keyboard.press('Escape');await expect(panel()).toHaveCount(0);
 // Existing editing uses the same action row; close/reopen preserves score and ID.
 states['progress-isolated'].domains.domains[0].positiveRecords.push({id:'score-only-history',content:'',effortScore:5,createdAt:'2026-11-01T00:00:00.000Z'});
 await page.goto(origin+'/domains');
 const pure=page.locator('[data-record-id="score-only-history"]');await expect(pure).toContainText('投入 5 分');
 await pure.click({position:{x:3,y:3}});await expect(page.locator('.record-edit-autosave .record-effort-value')).toHaveText('5');
 await page.locator('.record-edit-autosave').getByRole('button',{name:'增加投入分数',exact:true}).click();
 await expect.poll(()=>saved('positive').find(r=>r.id==='score-only-history')?.effortScore).toBe(6);await page.keyboard.press('Escape');
 await pure.click({position:{x:3,y:3}});await expect(page.locator('.record-edit-autosave .record-effort-value')).toHaveText('6');await page.keyboard.press('Escape');
 const card=page.locator(`[data-record-id="${firstId}"]`).first();
 await card.click({position:{x:3,y:3}});
 const existing=page.locator('.record-edit-autosave');await expect(existing.locator('.record-action-row')).toHaveCount(1);
 await expect(existing.locator('.record-effort-value')).toHaveText('2');
 await existing.getByRole('button',{name:'增加投入分数',exact:true}).evaluate(n=>{n.click();n.click();});
 await expect.poll(()=>saved('positive').find(r=>r.id===firstId)?.effortScore).toBe(4);
 await page.keyboard.press('Escape');await expect(existing).toHaveCount(0);
 await card.click({position:{x:3,y:3}});await expect(existing.locator('.record-effort-value')).toHaveText('4');
 const existingChooser=page.waitForEvent('filechooser');await existing.getByRole('button',{name:'该条记录附件',exact:true}).click();await (await existingChooser).setFiles(file);
 await expect.poll(()=>saved('positive').find(r=>r.id===firstId)?.images?.length).toBe(2);
 await page.keyboard.press('Escape');await expect(existing).toHaveCount(0);
 // Owner change unmounts the editor even while a result is outstanding.
 await page.goto(origin+'/today');await open();chooserPromise=page.waitForEvent('filechooser');await attachment('positive').click();chooser=await chooserPromise;
 owner='progress-other';states[owner]=fresh();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(panel()).toHaveCount(0,{timeout:15000});const before=writes.length;await chooser.setFiles(file);await page.waitForTimeout(700);expect(writes.slice(before).filter(w=>w.owner===owner)).toEqual([]);expect(states[owner]).toEqual(fresh());
 expect(errors).toEqual([]);results.push({width,height,status:'passed',writes:writes.length});await context.close();console.log(`PASS progress editor ${width}x${height}`);
}}catch(error){results.push({viewport:currentViewport,status:'failed',message:String(error),stack:error.stack});if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:`${out}/${currentViewport}-failure.png`});throw error;}finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(results,null,2));await browser.close();}
console.log('PASS progress editor layout, explicit rows, real focus, stable media targets and late-result isolation');
