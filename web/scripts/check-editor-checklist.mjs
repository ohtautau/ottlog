// Windows coordinator only: isolated 3017, all API requests intercepted. No real account.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated 3017 candidate');
const out='test-results/editor-checklist';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const width of [1440,390])for(const mode of ['任务','便签']){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:true}),page=await context.newPage(),errors=[],writes=[];
 let owner='checklist-isolated';const states={};
 const fresh=()=>({todos:{version:1,tasks:[],categories:[]},memos:{version:1,notes:[]}});states[owner]=fresh();
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,key=p.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];if(p.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:owner,csrfToken:'isolated'}});if(key){if(req.method()==='PUT'){states[owner][key]=structuredClone(req.postDataJSON().data);writes.push({owner,key,data:structuredClone(states[owner][key])});}return route.fulfill({json:{data:states[owner][key]??null}});}return route.fulfill({json:{enabled:false,reminders:[]}});});
 await page.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__checklistFail&&k.startsWith('ottlog-tool-v1:')&&(/:(todos|memos)$/.test(k)))throw Error('isolated storage failure');return set.call(this,k,v);};});
 const button=name=>page.getByRole('button',{name,exact:true}),list=()=>page.locator('.editor-checklist').first(),rows=()=>list().locator('.handle-sort-row'),inputs=()=>list().locator('input'),saved=()=>mode==='任务'?states['checklist-isolated'].todos.tasks:states['checklist-isolated'].memos.notes,field=mode==='任务'?'subtasks':'checklist';
 const titles=()=>rows().locator('input').evaluateAll(nodes=>nodes.map(n=>n.value));
 await page.goto(origin+'/today');await button('创建记录').click();await button('创建类型：'+mode).click();
 if(mode==='任务')await page.getByRole('textbox',{name:'任务名称',exact:true}).fill('共用清单任务');
 // Memo deliberately has no title/body: checklist alone is content.
 await button('添加子任务').click();
 for(const title of ['第一项','第二项','第三项']){await inputs().last().fill(title);await page.keyboard.press('Enter');await expect(inputs().last()).toBeFocused();}
 await expect(rows()).toHaveCount(3);await expect(list().getByRole('button',{name:'取消新增清单项',exact:true})).toHaveCount(1);
 for(const r of await rows().all()){await expect(r.locator('.handle-sort-grip')).toHaveCount(1);await expect(r.getByRole('button',{name:/删除/})).toHaveCount(0);}
 const finalTitle=await inputs().nth(2).inputValue();await button('取消新增清单项').click();await expect(inputs()).toHaveCount(3);expect(await inputs().nth(2).inputValue()).toBe(finalTitle);await button('添加子任务').click();await expect(inputs()).toHaveCount(4);
 await inputs().nth(1).focus();await page.keyboard.press('ArrowUp');await expect(inputs().nth(0)).toBeFocused();await page.keyboard.press('ArrowDown');await expect(inputs().nth(1)).toBeFocused();
 const ime=await inputs().nth(1).evaluate(input=>{const event=new KeyboardEvent('keydown',{key:'ArrowDown',isComposing:true,bubbles:true,cancelable:true});input.dispatchEvent(event);return {prevented:event.defaultPrevented,focused:document.activeElement===input};});expect(ime).toEqual({prevented:false,focused:true});
 await inputs().last().fill('临时');await inputs().nth(3).fill('\u200b\u0300 ');await inputs().nth(0).focus();await expect(rows()).toHaveCount(3);
 await button('完成子任务 1').click();await expect.poll(()=>saved()[0]?.[field]?.[0]?.completed).toBe(true);const id=saved()[0].id,originalIds=saved()[0][field].map(r=>r.id);
 await rows().first().locator('.handle-sort-grip button').focus();await page.keyboard.press('ArrowDown');await expect.poll(titles).toEqual(['第二项','第一项','第三项']);await rows().nth(1).locator('.handle-sort-grip button').focus();await page.keyboard.press('ArrowUp');await expect.poll(titles).toEqual(['第一项','第二项','第三项']);
 const mouse=async(cancel=false)=>{const a=await rows().first().locator('.handle-sort-grip').boundingBox(),b=await rows().nth(2).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+a.width/2,b.y+b.height-6,{steps:10});await expect(page.locator('.editor-checklist-ghost')).toBeVisible();await expect(list().locator('.is-placeholder')).toHaveCount(1);await expect(list().locator('.is-target')).toHaveCount(1);if(cancel)await page.keyboard.press('Escape');await page.mouse.up();};
 await mouse(true);expect(await titles()).toEqual(['第一项','第二项','第三项']);await mouse();await expect.poll(titles).toEqual(['第二项','第三项','第一项']);await expect.poll(()=>saved().find(r=>r.id===id)[field].map(r=>r.id)).toEqual([originalIds[1],originalIds[2],originalIds[0]]);
 const cdp=await context.newCDPSession(page),touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 async function gesture(kind){const a=await rows().first().locator('.handle-sort-grip').boundingBox(),b=await rows().nth(2).boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2;await touch('touchStart',[{x,y,id:1}]);if(kind==='slide'){await touch('touchMove',[{x,y:y+24,id:1}]);await page.waitForTimeout(500);}else{await page.waitForTimeout(550);await expect(page.locator('.editor-checklist-ghost')).toBeVisible();if(kind==='multi')await touch('touchStart',[{x,y,id:1},{x:x+18,y:y+8,id:2}]);else await touch('touchMove',[{x,y:b.y+b.height-6,id:1}]);}await touch(kind==='cancel'?'touchCancel':'touchEnd',[]);await expect(page.locator('.editor-checklist-ghost')).toHaveCount(0);}
 for(const kind of ['slide','cancel','multi']){const before=await titles();await gesture(kind);expect(await titles()).toEqual(before);}
 await gesture('sort');await expect.poll(titles).toEqual(['第三项','第一项','第二项']);
 // Genuine file chooser: preserve transparent corners and list identity.
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#39ad6c';x.fillRect(16,16,32,32);return c.toDataURL('image/png');});
 const chooser=page.waitForEvent('filechooser');await button(mode==='任务'?'任务附件':'编辑附件').click();await (await chooser).setFiles({name:'transparent.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});await expect(page.locator('.memo-image img')).toHaveCount(1);
 const alpha=await page.locator('.memo-image img').evaluate(async img=>{await img.decode();const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,1,1).data[3];});expect(alpha).toBe(0);await expect.poll(()=>saved().find(r=>r.id===id)?.images?.length).toBe(1);
 await page.keyboard.press('Escape');await expect(page.locator('.entry-composer')).toHaveCount(0);
 const route=mode==='任务'?'/todos':'/memos';await page.goto(origin+route);
 const open=async()=>{if(mode==='任务')await page.locator('.todo-task-content').filter({hasText:'共用清单任务'}).first().click();else await page.locator('.memo-note-open').first().click();};await open();await expect.poll(titles).toEqual(['第三项','第一项','第二项']);
 // Same DOM for original-record editing, failure keeps the same parent and children.
 await page.evaluate(()=>window.__checklistFail=true);await inputs().nth(0).fill('失败后重试');await inputs().nth(1).focus();await expect(button('重试')).toBeVisible({timeout:10000});await page.evaluate(()=>window.__checklistFail=false);await button('重试').click();await expect.poll(()=>saved().find(r=>r.id===id)[field][0].title).toBe('失败后重试');expect(saved()).toHaveLength(1);
 await page.keyboard.press('Escape');await page.reload();await open();await expect(inputs().first()).toHaveValue('失败后重试');
 // Grow through real inputs, then boundary scroll and discard preview.
 await button('添加子任务').click();for(let i=0;i<12;i++){await inputs().last().fill('边缘'+i);await page.keyboard.press('Enter');}await page.locator('.editor-checklist-scroll').evaluate(n=>n.scrollTop=0);await expect.poll(()=>saved().find(r=>r.id===id)[field].length).toBe(15);
 const scroller=page.locator('.editor-checklist-scroll'),box=await scroller.boundingBox(),grip=await rows().first().locator('.handle-sort-grip').boundingBox();await page.mouse.move(grip.x+10,grip.y+10);await page.mouse.down();await page.mouse.move(grip.x+10,box.y+box.height-5,{steps:10});await expect.poll(()=>scroller.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);await page.keyboard.press('Escape');await page.mouse.up();
 await scroller.evaluate(n=>n.scrollTop=0);const h=await rows().first().locator('.handle-sort-grip').boundingBox();await page.mouse.move(h.x+10,h.y+10);await page.mouse.down();await expect(page.locator('.editor-checklist-ghost')).toBeVisible();const before=writes.length;owner='other-owner';states[owner]=fresh();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('.editor-checklist-ghost')).toHaveCount(0,{timeout:15000});await page.mouse.up();expect(writes.slice(before).filter(w=>w.owner==='other-owner')).toEqual([]);expect(states[owner]).toEqual(fresh());
 expect(errors).toEqual([]);results.push({width,mode,status:'passed',id});await context.close();
}}finally{await browser.close();await fs.writeFile(`${out}/result.json`,JSON.stringify(results,null,2));}
