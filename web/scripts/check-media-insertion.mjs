// Coordinator Windows only. Real file chooser; every business API is intercepted.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated 3017 candidate');
const out='test-results/media-insertion';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const width of [1440,390]){
const page=await browser.newPage({viewport:{width,height:900}}),stamp=new Date().toISOString();
const states={todos:{version:1,tasks:[],categories:[],sort:'created'},memos:{version:1,notes:[]},domains:{version:1,domains:[{id:'other',name:'其它',iconId:'notes',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[],negativeRecords:[]}],completedGoals:[]}};
await page.route('**/api/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,key=p.match(/^\/api\/personal-tools\/([^/]+)$/)?.[1];if(p.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'media-isolated',csrfToken:'isolated'}});if(key){if(req.method()==='PUT')states[key]=req.postDataJSON().data;return route.fulfill({json:{data:states[key]??null}});}return route.fulfill({json:{enabled:false,reminders:[]}});});
await page.goto(origin+'/today');
const files=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#39ad6c';x.fillRect(16,16,32,32);const png=c.toDataURL('image/png');x.fillStyle='#ebae78';x.fillRect(0,0,64,64);return {png,jpeg:c.toDataURL('image/jpeg',.8)};});
const file=kind=>({name:`geometry.${kind==='png'?'png':'jpg'}`,mimeType:`image/${kind}`,buffer:Buffer.from(files[kind].split(',')[1],'base64')});
const button=name=>page.getByRole('button',{name,exact:true});
const upload=async(name,kind)=>{const chooser=page.waitForEvent('filechooser');await button(name).click();await (await chooser).setFiles(file(kind));};
const saved=mode=>mode==='任务'?states.todos.tasks:mode==='便签'?states.memos.notes:[...states.domains.domains[0].positiveRecords,...states.domains.domains[0].negativeRecords];
for(const mode of ['任务','便签','记录']){
await button('创建记录').click();await button('创建类型：'+mode).click();
if(mode==='任务')await page.getByRole('textbox',{name:'任务名称',exact:true}).fill('图片任务');
if(mode==='便签')await page.getByPlaceholder('准备记什么？',{exact:true}).fill('图片便签');
const body=mode==='任务'?page.getByRole('textbox',{name:'任务备注',exact:true}):mode==='便签'?page.getByRole('textbox',{name:'便签内容',exact:true}):page.getByRole('textbox',{name:'记录内容',exact:true});
await body.fill('原正文保留');const attach=mode==='记录'?'正记录附件':mode==='任务'?'任务附件':'编辑附件';
if(mode==='任务'){
 const cancelled=page.waitForEvent('filechooser');await button(attach).click();await (await cancelled).element().evaluate(input=>input.dispatchEvent(new Event('cancel')));await expect(button(attach)).toBeEnabled();await expect(page.locator('.operation-toast')).toHaveCount(0);
 const invalid=page.waitForEvent('filechooser');await button(attach).click();await (await invalid).setFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('invalid PNG')});await expect(page.locator('.operation-toast')).toContainText('无法读取图片');await expect(page.locator('.memo-image img')).toHaveCount(0);await expect(body).toHaveValue('原正文保留');await expect(button(attach)).toBeEnabled();
 const oversize=page.waitForEvent('filechooser');await button(attach).click();await (await oversize).setFiles({name:'oversize.png',mimeType:'image/png',buffer:Buffer.alloc(12*1024*1024+1)});await expect(page.locator('.operation-toast')).toContainText('12MB');await expect(button(attach)).toBeEnabled();
}

await upload(attach,'png');const thumbnails=page.locator('.entry-composer .memo-image img');await expect(thumbnails).toHaveCount(1);
const alpha=await thumbnails.first().evaluate(async img=>{if(!img.complete)await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});if(!img.naturalWidth)throw Error('image not loaded');const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return {corner:x.getImageData(0,0,1,1).data[3],center:x.getImageData(32,32,1,1).data[3],background:getComputedStyle(img).backgroundColor};});expect(alpha.corner).toBe(0);expect(alpha.center).toBe(255);expect(alpha.background).toBe('rgba(0, 0, 0, 0)');
await upload(attach,'jpeg');await expect(thumbnails).toHaveCount(2);await expect(body).toHaveValue('原正文保留');
await expect.poll(()=>saved(mode).find(r=>r.images?.length===2)?.id).toBeTruthy();const record=saved(mode).find(r=>r.images?.length===2),id=record.id,remaining=record.images[1].id;
await page.screenshot({path:`${out}/${width}-${mode}.png`});await button('移除图片 1').click();await expect(thumbnails).toHaveCount(1);await expect.poll(()=>saved(mode).find(r=>r.id===id)?.images?.map(i=>i.id)).toEqual([remaining]);
await page.keyboard.press('Escape');await expect(page.locator('.entry-composer')).toHaveCount(0);expect(saved(mode).find(r=>r.id===id)).toBeTruthy();
await page.goto(origin+(mode==='任务'?'/todos':mode==='便签'?'/memos':'/domains'));
if(mode==='任务')await page.locator('.todo-task-content').filter({hasText:'图片任务'}).first().click();else if(mode==='便签')await page.locator('.memo-note-open').filter({hasText:'图片便签'}).first().click();else await page.locator('.domains-recent-records .domain-record-plain').filter({hasText:'原正文保留'}).first().click();
await expect(page.locator('.memo-image img')).toHaveCount(1);expect(saved(mode).find(r=>r.id===id).images[0].id).toBe(remaining);await page.keyboard.press('Escape');await page.goto(origin+'/today');
results.push({width,mode,id,alpha,status:'passed'});
}
await page.close();
}}finally{await browser.close();await fs.writeFile(`${out}/result.json`,JSON.stringify(results,null,2));}
