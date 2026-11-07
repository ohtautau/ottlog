// Run against coordinator Windows Chromium; every business API is disposable.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
await fs.mkdir('test-results/panel-queue-editor',{recursive:true});
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated loopback candidate 3017');
const browser=await chromium.launch({headless:true});
const stamp='2026-11-04T00:00:00Z',priority={kind:'quadrant',quadrantId:'do'},medium={kind:'quadrant',quadrantId:'plan'},category={kind:'category',categoryId:'queue-category'};
try{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage(),errors=[],writes=[];
 let owner='queue-fixture',state={version:1,tasks:[],categories:[{id:'queue-category',name:'队列分类',iconId:'plant',color:'#b9dbca'},{id:'queue-category-two',name:'第二分类',iconId:'notes',color:'#b9dbca'}]};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{const request=route.request(),path=new URL(request.url()).pathname;
  if(path.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:owner,csrfToken:'isolated'}});
  if(path==='/api/personal-tools/todos'){if(request.method()==='PUT'){state=structuredClone(request.postDataJSON().data);writes.push(structuredClone(state));}return route.fulfill({json:{data:state}});}
  if(path.startsWith('/api/personal-tools/'))return route.fulfill({json:{data:null}});
  return route.fulfill({json:{enabled:false,reminders:[]}});
 });
 // Force an actual browser storage failure without touching any external storage.
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(window.__queueFailLocal&&key.startsWith('ottlog-tool-v1:')&&key.endsWith(':todos'))throw Error('isolated storage failure');return original.call(this,key,value);};});
 const button=name=>page.getByRole('button',{name:name.startsWith('更换')?new RegExp('^'+name+'：'):name,exact:!name.startsWith('更换')}),queue=()=>page.locator('.todo-panel-source-panel'),rows=()=>queue().locator('.todo-panel-queue-options > .handle-sort-row');
 const queueLabels=()=>rows().locator('.entity-choice-label').allTextContents();
 // Measure rendered slots, original artwork and semantic labels across both source groups.
 const aligned=async(buttons)=>{
  const geometry=await buttons.evaluateAll(nodes=>nodes.map(n=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
   const slot=n.querySelector('.todo-source-icon-slot'),icon=slot.querySelector('.priority-flag,.library-icon'),label=n.querySelector('.entity-choice-label')||n.querySelector(':scope > span');
   return {slot:rect(slot),icon:rect(icon),label:rect(label),row:rect(n),flag:icon.matches('.priority-flag'),overflow:n.scrollWidth>n.clientWidth};
  }));
  expect(geometry.length).toBeGreaterThan(0);
  for(const g of geometry){expect(g.slot.width).toBe(24);expect(g.slot.height).toBe(24);expect(g.icon.width).toBe(g.flag?16:24);expect(g.icon.height).toBe(g.flag?20:24);expect(Math.abs(g.icon.cx-g.slot.cx)).toBeLessThanOrEqual(1);expect(Math.abs(g.icon.cy-g.slot.cy)).toBeLessThanOrEqual(1);expect(Math.abs(g.slot.cy-g.row.cy)).toBeLessThanOrEqual(1);expect(Math.abs(g.label.cy-g.row.cy)).toBeLessThanOrEqual(1);expect(Math.abs(g.slot.left-geometry[0].slot.left)).toBeLessThanOrEqual(1);expect(Math.abs(g.slot.cx-geometry[0].slot.cx)).toBeLessThanOrEqual(1);expect(Math.abs(g.label.left-geometry[0].label.left)).toBeLessThanOrEqual(1);expect(g.overflow).toBe(false);}
 };

 const open=async()=>{await button('待办更多操作').click();await button('编辑').click();await button('更换高优先级区域显示').click();await expect(queue()).toBeVisible();};
 const close=async()=>{await button('关闭区域显示选择').click();await button('关闭象限显示编辑').click();};
 const add=async name=>{await button('添加显示项').click();await button(`加入显示队列：${name}`).click();await button('关闭添加显示项').click();};
 const noToast=async()=>expect(await page.locator('.operation-toast').count()).toBe(0);
 const shape=async()=>{for(const row of await rows().all()){await expect(row.locator('.handle-sort-grip')).toHaveCount(1);await expect(row.locator('.handle-sort-grip button')).toHaveCount(1);await expect(row.locator('.entity-choice-selection,.check-symbol')).toHaveCount(0);await expect(row.getByRole('button',{name:/^移出显示队列：/})).toHaveCount(1);await expect(row.locator('.todo-panel-remove .delete-symbol')).toHaveCount(1);await expect(row.locator('.handle-sort-grip')).toHaveJSProperty('nextElementSibling',null);const bounds=await row.evaluate(n=>{const r=n.getBoundingClientRect(),label=n.querySelector('.entity-choice-label').getBoundingClientRect(),remove=n.querySelector('.todo-panel-remove').getBoundingClientRect(),grip=n.querySelector('.handle-sort-grip').getBoundingClientRect();return {contained:remove.left>=r.left&&grip.right<=r.right+1,ordered:label.right<=remove.left+1&&remove.right<=grip.left+1,overflow:n.scrollWidth>n.clientWidth};});expect(bounds.contained).toBe(true);expect(bounds.ordered).toBe(true);expect(bounds.overflow).toBe(false);await expect(row.getByRole('button',{name:/上移|下移|删除/})).toHaveCount(0);}await expect(queue().getByRole('button',{name:/上移|下移|排序队列/})).toHaveCount(0);};
 const mouseDrag=async(from,to,cancel=false)=>{await rows().nth(from).locator('.handle-sort-grip').hover();const a=await rows().nth(from).locator('.handle-sort-grip').boundingBox(),b=await rows().nth(to).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2+(to>from?8:-8),{steps:12});await expect(page.locator('.todo-queue-ghost')).toBeVisible();await expect(page.locator('.todo-queue-ghost .todo-panel-remove button')).toBeDisabled();await aligned(page.locator('.todo-queue-ghost .entity-choice-option'));await expect(rows().locator('.entity-choice-option').first()).toBeVisible();await expect(queue().locator('.is-placeholder')).toHaveCount(1);await expect(queue().locator('.is-target')).toHaveCount(1);if(cancel)await page.keyboard.press('Escape');await page.mouse.up();};
 await page.goto(origin+'/todos');await open();
 await expect.poll(queueLabels).toEqual(['高优先级']);await expect(button('添加显示项')).toBeVisible();await shape();
 // Four positions use one compact layout, stronger labels and real source icons.
 const positions=page.locator('.todo-panel-editor-row');await expect(positions).toHaveCount(4);
 for(const pos of await positions.all()){const g=await pos.evaluate(n=>{const r=n.getBoundingClientRect(),t=n.firstElementChild,s=getComputedStyle(t),b=n.querySelector('.todo-panel-source-trigger').getBoundingClientRect();return {height:r.height,weight:Number(s.fontWeight),color:s.color,gap:b.left-t.getBoundingClientRect().right};});expect(g.height).toBeGreaterThanOrEqual(40);expect(g.height).toBeLessThanOrEqual(44);expect(g.weight).toBeGreaterThanOrEqual(600);expect(g.gap).toBe(12);await expect(pos.locator('.todo-panel-source-trigger .priority-flag')).toHaveCount(1);}
 // Disclosure has no persistence, membership or toast side effects; keyboard toggles native buttons.
 const beforeGroups=writes.length,beforeQueue=structuredClone(state.panelQueues);
 await button('添加显示项').click();
 const addPanel=page.locator('.todo-panel-add-layer .form-popover-panel');
 const candidates=()=>addPanel.locator('.entity-choice-option');
 await expect(candidates().filter({has:page.locator('.priority-flag')})).toHaveCount(4);
 expect(await candidates().filter({has:page.locator('.library-icon')}).count()).toBeGreaterThanOrEqual(2);
 await aligned(candidates());
 for(const title of ['优先级','分类']){
  const heading=addPanel.getByRole('button',{name:title,exact:true});await expect(heading).toHaveAttribute('aria-expanded','true');
  const id=await heading.getAttribute('aria-controls');expect(id).toBeTruthy();const expandedHeight=(await addPanel.boundingBox()).height;
  await heading.click();await expect(heading).toHaveAttribute('aria-expanded','false');await expect(page.locator(`[id="${id}"]`)).toBeHidden();
  await expect.poll(async()=>(await addPanel.boundingBox()).height).toBeLessThan(expandedHeight);
  await heading.focus();await page.keyboard.press('Enter');await expect(heading).toHaveAttribute('aria-expanded','true');
  await expect.poll(async()=>(await addPanel.boundingBox()).height).toBeCloseTo(expandedHeight,0);
  await aligned(candidates());
 }
 expect(writes.length).toBe(beforeGroups);expect(state.panelQueues).toEqual(beforeQueue);await noToast();await button('关闭添加显示项').click();
 // Trigger columns occupy all available space with aligned icons, labels and chevrons.
 const geometry=await positions.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),label=n.firstElementChild.getBoundingClientRect(),b=n.querySelector('.todo-panel-source-trigger'),icon=b.querySelector('.todo-source-icon-slot').getBoundingClientRect(),chevron=b.querySelector('.select-chevron').getBoundingClientRect();return {left:label.left,labelWidth:label.width,right:r.right,triggerRight:b.getBoundingClientRect().right,iconLeft:icon.left,chevronRight:chevron.right,overflow:n.scrollWidth>n.clientWidth};}));
 for(const g of geometry){expect(g.labelWidth).toBe(44);expect(Math.abs(g.triggerRight-g.right)).toBeLessThanOrEqual(1);expect(g.iconLeft).toBe(geometry[0].iconLeft);expect(g.chevronRight).toBe(geometry[0].chevronRight);expect(g.overflow).toBe(false);}
 await aligned(positions.locator('.todo-panel-source-trigger'));
 await add('队列分类');await add('中优先级');await expect.poll(()=>state.panelQueues?.do).toEqual([priority,category,medium]);await expect.poll(queueLabels).toEqual(['高优先级','队列分类','中优先级']);await shape();await aligned(rows().locator('.entity-choice-option'));
 await button('显示分类：队列分类').click();await expect(rows().filter({has:page.getByText('队列分类',{exact:true})})).toHaveClass(/is-current/);
 const highlight=await rows().nth(1).evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n),h=n.querySelector('.handle-sort-grip').getBoundingClientRect();return {bg:s.backgroundColor,contains:h.right<=r.right&&h.left>=r.left};});expect(highlight.bg).not.toBe('rgba(0, 0, 0, 0)');expect(highlight.contains).toBe(true);
 await close();await expect(positions).toHaveCount(0);await noToast();await open();
 await expect(page.locator('.todo-panel-editor-row').nth(1).locator('.priority-flag')).toHaveCSS('color','rgb(228, 206, 133)');
 const currentIcon=page.locator('.todo-panel-editor-row').first().locator('.todo-panel-source-trigger .library-icon');await expect(currentIcon).toHaveCount(1);await aligned(positions.locator('.todo-panel-source-trigger'));await aligned(rows().locator('.entity-choice-option'));
 let count=writes.length;await mouseDrag(0,2);await expect.poll(queueLabels).toEqual(['队列分类','中优先级','高优先级']);await expect.poll(()=>writes.length).toBe(count+1);await noToast();
 count=writes.length;await mouseDrag(0,2,true);await page.waitForTimeout(150);expect(writes.length).toBe(count);
 if(!await queue().count())await button('更换高优先级区域显示').click();
 await expect.poll(queueLabels).toEqual(['队列分类','中优先级','高优先级']);
 // Use genuine touch input through CDP, not dispatchEvent on touch handlers.
 const cdp=await context.newCDPSession(page);
 const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 await rows().nth(0).locator('.handle-sort-grip').hover();const a=await rows().nth(0).locator('.handle-sort-grip').boundingBox(),b=await rows().nth(2).boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,targetY=b.y+b.height/2+8;
 count=writes.length;await touch('touchStart',[{x,y}]);await page.waitForTimeout(550);await expect(page.locator('.todo-queue-ghost')).toBeVisible();await touch('touchMove',[{x,y:targetY}]);await expect(queue().locator('.is-target')).toHaveCount(1);await touch('touchEnd',[]);await expect.poll(queueLabels).toEqual(['中优先级','高优先级','队列分类']);await expect.poll(()=>writes.length).toBe(count+1);
 // Ordinary swipes on rows or grips never reorder; multiple fingers cancel.
 for(const grip of [false,true]){const r=await rows().nth(0).locator(grip?'.handle-sort-grip':'.entity-choice-option').boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;count=writes.length;await touch('touchStart',[{x,y}]);await touch('touchMove',[{x,y:y+22}]);await page.waitForTimeout(500);await touch('touchEnd',[]);await expect(page.locator('.todo-queue-ghost')).toHaveCount(0);expect(writes.length).toBe(count);}
 const r=await rows().nth(0).locator('.handle-sort-grip').boundingBox();count=writes.length;await touch('touchStart',[{x:r.x+10,y:r.y+10,id:1}]);await page.waitForTimeout(500);await touch('touchStart',[{x:r.x+10,y:r.y+10,id:1},{x:r.x+20,y:r.y+15,id:2}]);await touch('touchEnd',[]);await expect(page.locator('.todo-queue-ghost')).toHaveCount(0);expect(writes.length).toBe(count);
 // Keyboard is available on the handle without visible arrow controls.
 await rows().nth(0).locator('.handle-sort-grip button').focus();await page.keyboard.press('ArrowDown');await expect.poll(queueLabels).toEqual(['高优先级','中优先级','队列分类']);await expect.poll(()=>state.panelQueues.do).toEqual([priority,medium,category]);await expect(rows().nth(0).locator('.handle-sort-grip button')).toBeEnabled();
 // Local failure retains the editable queue and exposes the actual same-target retry.
 await page.evaluate(()=>{window.__queueFailLocal=true;});await rows().nth(0).locator('.handle-sort-grip button').focus();await page.keyboard.press('ArrowDown');await expect(button('重试保存显示队列')).toBeVisible();await expect(page.locator('.operation-toast[role=alert]')).toBeVisible();await expect(button('撤销最近一次操作')).toHaveCount(0);await page.evaluate(()=>{window.__queueFailLocal=false;});await button('重试保存显示队列').click();await expect(button('重试保存显示队列')).toHaveCount(0);await expect.poll(()=>state.panelQueues.do).toEqual([medium,priority,category]);await expect(page.locator('.operation-toast')).toHaveCount(0,{timeout:6500});await noToast();
 await close();await page.reload();await open();await expect.poll(queueLabels).toEqual(['中优先级','高优先级','队列分类']);await shape();
 // Direct removal: non-current stays selected, current falls back to remaining first.
 await button('显示分类：队列分类').click();await button('移出显示队列：队列分类').click();await expect.poll(()=>state.panelQueues.do).toEqual([medium,priority]);
 // The current source is category from above; removing it already fell back to medium.
 await expect.poll(()=>state.panelSources.do).toEqual(medium);
 await button('显示象限：高优先级').click();await button('移出显示队列：中优先级').click();await expect.poll(()=>state.panelSources.do).toEqual(priority);
 await expect(button('移出显示队列：高优先级（至少保留一项）')).toBeDisabled();
 await close();await open();await expect.poll(queueLabels).toEqual(['高优先级']);
 // Keep the adding-layer removal path, including its last-item guard.
 await add('中优先级');await button('添加显示项').click();await addPanel.getByRole('button',{name:'移出显示队列：中优先级',exact:true}).click();await expect(addPanel.getByRole('button',{name:'移出显示队列：高优先级',exact:true})).toBeDisabled();await button('关闭添加显示项').click();
 await add('中优先级');
 // Removal storage failure retries the captured target, with no selection click or drag.
 await expect.poll(()=>state.panelQueues.do).toEqual([priority,medium]);await page.evaluate(()=>{window.__queueFailLocal=true;});await button('移出显示队列：中优先级').click();await expect(button('重试保存显示队列')).toBeVisible();await expect(page.locator('.todo-queue-ghost')).toHaveCount(0);await page.evaluate(()=>{window.__queueFailLocal=false;});await button('重试保存显示队列').click();await expect.poll(()=>state.panelQueues.do).toEqual([priority]);await expect(button('重试保存显示队列')).toHaveCount(0);await expect(page.locator('.operation-toast')).toHaveCount(0,{timeout:6500});await add('中优先级');await close();
 // Cycle through the real quadrant gesture; do not call model setters from tests.
 const zone=page.locator('#todo-zone-do'),z=await zone.boundingBox();await touch('touchStart',[{x:z.x+z.width*.75,y:z.y+70}]);await touch('touchMove',[{x:z.x+z.width*.2,y:z.y+70}]);await touch('touchEnd',[]);await expect.poll(()=>state.panelSources.do).toEqual(medium);await noToast();
 // A long queue uses the shared scroll viewport; edge dragging scrolls while
 // Escape discards the preview without a queued write.
 state.categories[0].name='非常长的分类名称'.repeat(12);state.panelSources.do=category;
 await page.reload();await open();
 const longTrigger=positions.first().locator('.todo-panel-source-trigger');await expect(longTrigger).toHaveAttribute('aria-label',new RegExp(state.categories[0].name));
 const longGeometry=await longTrigger.evaluate(n=>{const r=n.getBoundingClientRect(),t=n.querySelector(':scope > span'),s=getComputedStyle(t);return {overflow:n.scrollWidth>n.clientWidth,textOverflow:s.textOverflow,whiteSpace:s.whiteSpace,right:r.right};});expect(longGeometry.overflow).toBe(false);expect(longGeometry.textOverflow).toBe('ellipsis');expect(longGeometry.whiteSpace).toBe('nowrap');await aligned(positions.locator('.todo-panel-source-trigger'));await button('添加显示项').click();await aligned(candidates());await button('关闭添加显示项').click();await close();
 state.categories.push(...Array.from({length:14},(_,i)=>({id:`edge-${i}`,name:`滚动分类${i}`,iconId:'notes',color:'#b9dbca'})));
 state.panelQueues.do=[priority,medium,...state.categories.map(c=>({kind:'category',categoryId:c.id}))];
 await page.reload();await open();await aligned(rows().locator('.entity-choice-option'));await shape();await rows().first().locator('.handle-sort-grip').hover();const scroller=queue().locator('.form-popover-scroll').first(),edge=await scroller.boundingBox(),first=await rows().first().locator('.handle-sort-grip').boundingBox();
 count=writes.length;await page.mouse.move(first.x+10,first.y+10);await page.mouse.down();await page.mouse.move(first.x+10,edge.y+edge.height-6,{steps:8});await expect.poll(()=>scroller.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);await page.keyboard.press('Escape');await page.mouse.up();await expect(page.locator('.todo-queue-ghost')).toHaveCount(0);expect(writes.length).toBe(count);
 if(!await queue().count())await button('更换高优先级区域显示').click();
 await scroller.evaluate(n=>{n.scrollTop=0;});
 // Switch API owner during an active gesture through the normal account refresh.
 await rows().nth(0).locator('.handle-sort-grip').hover();const h=await rows().nth(0).locator('.handle-sort-grip').boundingBox();await page.mouse.move(h.x+10,h.y+10);await page.mouse.down();await expect(page.locator('.todo-queue-ghost')).toBeVisible();count=writes.length;owner='queue-other-owner';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('.todo-queue-ghost')).toHaveCount(0,{timeout:15000});await page.mouse.up();expect(writes.length).toBe(count);
 expect(errors).toEqual([]);await context.close();console.log(`PASS queue editor ${viewport.width}x${viewport.height}`);
}}finally{await browser.close();}
