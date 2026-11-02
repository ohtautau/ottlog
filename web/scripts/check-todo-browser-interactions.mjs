import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(import.meta.dirname, '../..');
process.chdir(root);
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import {buildSync} from 'esbuild';
buildSync({absWorkingDir:root,entryPoints:[path.join(root,'miniprogram/src/lib/todo-data.ts')],bundle:true,platform:'node',format:'cjs',outfile:path.join(root,'.tmp/todo-browser-model.cjs')});
const model=(await import(pathToFileURL(path.join(root,'.tmp/todo-browser-model.cjs')).href)).default;
const make=(title,important=false,urgent=false)=>({...model.createTodo(),title,important,urgent});
const origin=process.env.OTTLOG_WEB_TEST_ORIGIN || 'http://127.0.0.1:3000';
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    for(const width of [1440,390]) {
      let state={version:1,tasks:[make('拖动测试'),{...make('已完成测试'),completedAt:'2026-10-30T08:00:00.000Z'}],categories:[]},writes=0;
      const page=await browser.newPage({viewport:{width,height:1000},hasTouch:true});page.setDefaultTimeout(10000);
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/api/**',async route=>{
        const p=new URL(route.request().url()).pathname;
        if(p.startsWith('/api/account/'))return route.fulfill({status:200,json:{authenticated:true,userName:'drag-check',isAdmin:false,csrfToken:'fixture'}});
        if(p==='/api/personal-tools/todos') {
          if(route.request().method()==='PUT') {state=route.request().postDataJSON().data;writes++;}
          return route.fulfill({status:200,json:{data:state}});
        }
        return route.fulfill({status:200,json:p.startsWith('/api/personal-tools/')?{data:null}:{enabled:false,reminders:[]}});
      });
      if(process.env.OTTLOG_WEB_TEST_LOCAL_TOOLS==='1') {
        for(const name of ['app.js','app.css'])await page.route('**/tool-app/'+name,route=>route.fulfill({path:path.join(root,'web/public/tool-app',name),contentType:name.endsWith('.js')?'text/javascript':'text/css'}));
      }
      await page.goto(origin+'/todos');
      const task=()=>page.locator('.todo-quadrant .todo-task').filter({hasText:'拖动测试'});
      await expect(task()).toHaveCount(1);
      await expect(page.getByRole('button',{name:'编辑任务：已完成测试',exact:true})).toHaveCount(0);
      await expect(page.locator('.todo-completed-toggle')).toHaveAttribute('aria-expanded','false');
      const geometry=await task().evaluate(node=>{const a=node.querySelector('.todo-task-content').getBoundingClientRect(),b=node.querySelector('.todo-task-title').getBoundingClientRect();return Math.abs((a.top+a.bottom-b.top-b.bottom)/2)});
      expect(geometry).toBeLessThan(1);
      const before=()=>page.locator('.todo-drag-delete-zone');
      const feedback=page.locator('.operation-toast');
      await expect(before()).toHaveCount(0);
      async function dragTo(selector,steps=5,cancel=false) {
        const source=await task().boundingBox(),from=await task().locator('.todo-task-title').boundingBox(),to=await page.locator(selector).boundingBox();
        await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
        await page.mouse.move(from.x+from.width/2+8,from.y+from.height/2,{steps:2});
        await expect(before()).toBeVisible();
        const ghost=page.locator('.todo-drag-ghost');
        await expect(ghost.locator('.todo-task-title')).toHaveText('拖动测试');await expect(ghost.locator('.todo-check')).toHaveCount(1);
        await expect(task()).toHaveCSS('opacity','0');
        const lifted=await ghost.boundingBox();expect(lifted.width).toBeCloseTo(source.width,1);expect(lifted.height).toBeCloseTo(source.height,1);
        expect(lifted.x).toBeCloseTo(source.x+8,1);expect(lifted.y).toBeCloseTo(source.y,1);
        await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps});
        await expect.poll(async()=>Math.abs((await ghost.boundingBox()).x-(to.x+to.width/2-(from.x+from.width/2-source.x)))).toBeLessThan(1);
        if(cancel)await page.keyboard.press('Escape');
        await page.mouse.up();
        await expect(before()).toHaveCount(0);
        await expect(page.locator('.todo-overlay')).toHaveCount(0);
      }
      for(const [id,important,urgent]of [['do',true,true],['plan',true,false],['delegate',false,true],['later',false,false]]) {
        const prior=structuredClone(state);
        const zone=page.locator('#todo-zone-'+id);if(!await zone.count())throw Error('Missing '+id);
        await dragTo('#todo-zone-'+id);
        await expect.poll(()=>state.tasks.find(t=>t.title==='拖动测试')).toMatchObject({important,urgent});
        await expect(feedback).toContainText('已移动任务');
        await feedback.getByRole('button',{name:'撤销最近一次操作',exact:true}).click();
        await expect.poll(()=>state.tasks).toEqual(prior.tasks);
        await expect(page.locator('.floating-create-button')).toBeEnabled();
        await dragTo('#todo-zone-'+id);
        await expect.poll(()=>state.tasks.find(t=>t.title==='拖动测试')).toMatchObject({important,urgent});
        await expect(task().locator('..')).toBeVisible();
        await page.waitForTimeout(370);
      }
      const count=writes;await dragTo('#todo-zone-do',2,true);expect(writes).toBe(count);
      await page.waitForTimeout(370);
      const from=await task().locator('.todo-task-title').boundingBox();await page.mouse.move(from.x+10,from.y+8);await page.mouse.down();await page.mouse.move(from.x+20,from.y+8);
      await expect(before()).toBeVisible();const trash=await before().boundingBox();await page.mouse.move(trash.x+trash.width/2,trash.y+trash.height/2,{steps:5});await expect(before()).toHaveClass(/is-over/);
      fs.mkdirSync('web/test-results',{recursive:true});await page.screenshot({path:`web/test-results/todo-drag-trash-${width}.png`});
      await page.mouse.up();await expect.poll(()=>state.tasks.some(t=>t.title==='拖动测试')).toBe(false);await expect(task()).toHaveCount(0);
      await expect(feedback).toContainText('已删除任务');await feedback.getByRole('button',{name:'撤销最近一次操作',exact:true}).click();await expect(task()).toHaveCount(1);
      await page.waitForTimeout(370);
      await page.locator('.floating-create-button').click();
      await expect(page.getByLabel('任务标签',{exact:true})).toBeVisible();
      await page.getByLabel('任务名称',{exact:true}).fill('直接输入标签');await page.getByLabel('任务标签',{exact:true}).fill('新标签，工作');
      await page.locator('.entry-composer .sheet-actions').getByRole('button',{name:'创建任务',exact:true}).click();
      await expect.poll(()=>state.tasks.find(t=>t.title==='直接输入标签')?.tags).toEqual(['新标签','工作']);
      await expect(feedback).toContainText('已创建任务');
      await feedback.getByRole('button',{name:'撤销最近一次操作',exact:true}).click();await expect.poll(()=>state.tasks.some(t=>t.title==='直接输入标签')).toBe(false);
      if(width===390) {
        const cdp=await page.context().newCDPSession(page);
        const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
        let source=await task().boundingBox();const beforeScroll=writes;
        await touch('touchStart',source.x+source.width/2,source.y+source.height/2);
        await touch('touchMove',source.x+source.width/2,source.y+source.height/2+18);await touch('touchEnd');await page.waitForTimeout(450);
        await expect(page.locator('.todo-drag-ghost')).toHaveCount(0);expect(writes).toBe(beforeScroll);
        source=await task().boundingBox();const target=await page.locator('#todo-zone-plan').boundingBox();
        await touch('touchStart',source.x+source.width/2,source.y+source.height/2);await page.waitForTimeout(430);
        await expect(page.locator('.todo-drag-ghost .todo-check')).toHaveCount(1);
        await touch('touchMove',target.x+target.width/2,target.y+target.height/2);await touch('touchEnd');
        await expect.poll(()=>state.tasks.find(t=>t.title==='拖动测试')).toMatchObject({important:true,urgent:false});
        await expect(feedback).toContainText('已移动任务');await feedback.getByRole('button',{name:'撤销最近一次操作',exact:true}).click();
        await expect.poll(()=>state.tasks.find(t=>t.title==='拖动测试')).toMatchObject({important:false,urgent:false});await cdp.detach();
      }
      expect(errors).toEqual([]);console.log('PASS web todo',width,'full-card pointer offset/size, cross-quadrant drag, Escape, quick deletion/undo, default collapsed, title centering, inline new tags'+(width===390?', ordinary touch scrolling and held touch drag/undo':''));
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
