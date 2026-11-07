// Prepared for Windows QA; every API intercepted, isolated 3017 only.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated 3017 only');
const out='test-results/progress-editor';await fs.mkdir(out,{recursive:true});
const fresh=()=>({todos:{version:1,categories:[],tasks:[]},memos:{version:1,notes:[]},domains:{version:1,domains:[{id:'work',name:'工作',iconId:'work',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[],negativeRecords:[]}],completedGoals:[]}});
const browser=await chromium.launch(),results=[];
try{for(const [width,height] of [[1440,900],[390,844],[375,667],[844,390],[390,440]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<900,serviceWorkers:'block'}),page=await context.newPage(),errors=[],writes=[];
 let owner='progress-isolated',delay=0;const states={[owner]:fresh()};
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
 const open=async()=>{await button('创建记录').click();await button('创建类型：记录').click();await expect(button('正记录附件')).toBeEnabled();};
 const geometry=async()=>{
  const boxes=[];const p=await panel().boundingBox(),cols=panel().locator('.progress-record-column');
  expect(p.y).toBeGreaterThanOrEqual(-1);expect(p.y+p.height).toBeLessThanOrEqual((await page.viewportSize()).height+1);
  for(const [i,kind] of ['负','正'].entries()){
   const action=button(kind+'记录附件'),b=await action.boundingBox(),column=await cols.nth(i).boundingBox();
   expect(b.width).toBe(40);expect(b.height).toBe(40);expect(b.x).toBeCloseTo(column.x,0);
   expect(b.y+b.height).toBeLessThanOrEqual(p.y+p.height);expect(p.y+p.height-b.y-b.height).toBeGreaterThanOrEqual(15);
   expect(p.y+p.height-b.y-b.height).toBeLessThanOrEqual(40);
   expect(await action.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);boxes.push(b);
  }
  expect(boxes[0].y).toBeCloseTo(boxes[1].y,0);return boxes;
 };
 await page.goto(origin+'/today');await open();await expect(fields('positive')).toHaveCount(1);await expect(fields('negative')).toHaveCount(1);const initial=await geometry();
 const first=fields('positive').first();await first.fill('');await first.pressSequentially('plain typing');await expect(fields('positive')).toHaveCount(1);
 const firstId=await first.getAttribute('data-editor-row');await first.fill('粘贴内容\n第二行备注');await expect(fields('positive')).toHaveCount(1);
 await first.focus();const ime=await first.evaluate(n=>{n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));const e=new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true});n.dispatchEvent(e);n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'中文'}));return e.defaultPrevented;});expect(ime).toBe(false);await expect(fields('positive')).toHaveCount(1);
 const ime229=await first.evaluate(n=>{const e=new KeyboardEvent('keydown',{key:'Enter',keyCode:229,bubbles:true,cancelable:true});n.dispatchEvent(e);return e.defaultPrevented;});expect(ime229).toBe(false);await expect(fields('positive')).toHaveCount(1);
 await first.press('Enter');await expect(fields('positive')).toHaveCount(2);await expect(fields('positive').last()).toBeFocused();await fields('positive').last().press('Enter');await expect(fields('positive')).toHaveCount(2);
 await fields('positive').last().fill('正二');await expect(fields('positive')).toHaveCount(2);await fields('positive').last().press('ArrowUp');await expect(first).toBeFocused();await first.press('ArrowDown');await expect(fields('positive').last()).toBeFocused();
 await fields('positive').last().press('ArrowDown');await expect(fields('positive')).toHaveCount(3);await expect(fields('positive').last()).toBeFocused();await fields('positive').last().fill('  ');await fields('negative').first().focus();await expect(fields('positive')).toHaveCount(2);
 await fields('negative').first().fill('负一');await expect(fields('negative')).toHaveCount(1);await expect(fields('positive')).toHaveCount(2);
 await first.fill('短文');await first.press('Shift+Enter');await expect(first).toHaveValue('短文\n');await expect(fields('positive')).toHaveCount(2);
 delay=1800;await first.fill('长备注\n'.repeat(100));const during=await geometry();expect(during.map(b=>b.y)).toEqual(initial.map(b=>b.y));
 await panel().locator('.entry-scroll').evaluate(n=>n.scrollTop=n.scrollHeight);await geometry();await expect.poll(()=>saved('positive').find(r=>r.id===firstId)?.content,{timeout:15000}).toBe(('长备注\n'.repeat(100)).trim());delay=0;await geometry();
 // Grow by explicit Enter, including after scroll; neither typing nor save adds a row.
 for(let i=0;i<5;i++){await fields('positive').last().press('Enter');await expect(fields('positive').last()).toBeFocused();await fields('positive').last().fill('追加'+i);await geometry();}
 const lastId=await fields('positive').last().getAttribute('data-editor-row');await fields('negative').first().focus();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#39ad6c';x.fillRect(16,16,32,32);return c.toDataURL('image/png');});
 const file={name:'transparent.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')};
 for(const [label,kind,id] of [['正','positive',lastId],['负','negative',await fields('negative').first().getAttribute('data-editor-row')]]){
  const chooser=page.waitForEvent('filechooser');await button(label+'记录附件').click();await (await chooser).setFiles(file);
  await expect.poll(()=>saved(kind).find(r=>r.id===id)?.images?.length).toBe(1);expect(saved(kind).filter(r=>r.images?.length)).toHaveLength(1);await geometry();
 }
 const alpha=await panel().locator('.memo-image img').first().evaluate(async img=>{await img.decode();const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,1,1).data[3];});expect(alpha).toBe(0);
 await button('创建类型：便签').click();await button('创建类型：记录').click();await geometry();
 // Keyboard-visible area simulation: real resize invokes existing viewport listeners.
 if(width===390&&height===844){await page.setViewportSize({width,height:440});await fields('positive').first().focus();await geometry();await page.setViewportSize({width,height});await geometry();}
 await page.screenshot({path:`${out}/${width}x${height}.png`});
 // Closing is deliberately guarded while the picker is busy. Cancel, then close.
 let chooserPromise=page.waitForEvent('filechooser');await button('正记录附件').click();let chooser=await chooserPromise;await page.keyboard.press('Escape');await expect(panel()).toHaveCount(1);await chooser.setFiles([]);await expect(button('正记录附件')).toBeEnabled();await page.keyboard.press('Escape');await expect(panel()).toHaveCount(0);
 // Owner change unmounts the editor even while a result is outstanding.
 await open();chooserPromise=page.waitForEvent('filechooser');await button('正记录附件').click();chooser=await chooserPromise;
 owner='progress-other';states[owner]=fresh();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(panel()).toHaveCount(0,{timeout:15000});const before=writes.length;await chooser.setFiles(file);await page.waitForTimeout(700);expect(writes.slice(before).filter(w=>w.owner===owner)).toEqual([]);expect(states[owner]).toEqual(fresh());
 expect(errors).toEqual([]);results.push({width,height,status:'passed',writes:writes.length});await context.close();
}}finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(results,null,2));await browser.close();}
console.log('PASS progress editor layout, explicit rows, real focus, stable media targets and late-result isolation');
