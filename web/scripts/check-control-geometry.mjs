import {chromium,expect} from '@playwright/test';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw new Error('Isolated QA origin required');
const browser=await chromium.launch({headless:true});
try{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'}),state={version:1,tasks:[],categories:[{id:'fun',name:'娱乐',iconId:'game',color:'#b9dbca'}]};
 await page.route('**/api/**',route=>{const pathname=new URL(route.request().url()).pathname;if(pathname.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'geometry-fixture',csrfToken:'isolated',isAdmin:false}});const key=pathname.match(/personal-tools\/([^/]+)$/)?.[1];return route.fulfill({json:{data:key==='todos'?state:key==='memos'?{version:1,notes:[]}:null}});});
 const button=name=>page.getByRole('button',{name,exact:true});await page.goto(origin+'/todos');await button('创建任务').click();const title=page.getByRole('textbox',{name:'任务名称',exact:true});await expect(title).toBeEnabled();
 const family=await title.evaluate(node=>getComputedStyle(node).fontFamily);await button('任务分类').click();await expect(button('选择分类：娱乐')).toHaveCSS('font-family',family);await button('分类更多操作').click();await button('关闭').click();
 await button('设置日期、提醒和重复').click();await button('选择下周').click();const note=page.locator('.todo-schedule-day.is-selected .calendar-date-note'),clock=page.getByRole('listbox',{name:'任务小时',exact:true});await expect(clock).toBeVisible();await clock.scrollIntoViewIfNeeded();const before=await note.boundingBox();
 const box=await clock.boundingBox(),initial=await clock.evaluate(node=>node.scrollTop);await page.mouse.move(box.x+box.width/2,box.y+box.height*.7);await page.mouse.down();await expect(button('编辑任务日期')).toBeDisabled();await expect(button('编辑任务日期')).toHaveCSS('opacity','1');await page.mouse.move(box.x+box.width/2,box.y+box.height*.7-70,{steps:12});await page.mouse.up();
 await expect(clock).toHaveAttribute('data-moving','false');const samples=await clock.evaluate(async node=>{const values=[];for(let i=0;i<12;i++){values.push(node.scrollTop);await new Promise(resolve=>requestAnimationFrame(resolve));}return values;});
 expect(samples[0]).toBeGreaterThan(initial+28);expect(Math.max(...samples)-Math.min(...samples)).toBeLessThan(1);expect((await note.boundingBox()).y).toBeCloseTo(before.y,0);expect(samples[0]%28).toBeCloseTo(0,0);
 await expect(page.locator('.todo-schedule-day.is-selected .due-time')).toBeVisible();await page.close();console.log(`PASS control geometry ${viewport.width}: task/category font family, real mouse wheel drag/settle without rebound, fixed calendar notes.`);
}}finally{await browser.close();}
