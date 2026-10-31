import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const out='web/test-results/shared-domain-cards'; await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const width of [375,768,1024,1440,2407]) for(const scenario of [0,1,7,8,13,'legacy']) {
  const count=scenario==='legacy'?1:scenario;
  const context=await browser.newContext({viewport:{width,height:900}});
  const state={version:1,completedGoals:[],domains:Array.from({length:count},(_,i)=>({id:`domain-${i}`,name:`领域 ${i+1}`,iconId:'book',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[],negativeRecords:[]}))};
  if(scenario==='legacy')state.domains.unshift({id:'legacy-system',name:'未分类',iconId:'notes',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[],negativeRecords:[]});
  await context.addInitScript(state=>localStorage.setItem('ottlog-tool-v1:guest:domains',JSON.stringify({data:state,pending:false})),state);
  const writes=[];await context.route('**/api/**',r=>{if(r.request().method()!=='GET')writes.push(r.request().url());return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(new URL(r.request().url()).pathname.includes('/account/')?{authenticated:false,csrfToken:'isolated'}:{data:null})});});
  const page=await context.newPage();await page.goto('http://127.0.0.1:3000/domains');
  const cards=page.locator('.domains-list .domain-entry-shell');await expect(cards).toHaveCount(count+2);
  expect(await cards.evaluateAll(nodes=>nodes.map(node=>node.classList.contains('domain-create-shell')?'+':node.querySelector('.domain-progress-name')?.textContent))).toEqual([...Array.from({length:count},(_,i)=>`领域 ${i+1}`),'其它','+']);
  await expect(page.locator('.domain-card-groups .empty-data-preview')).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ottlog-tool-v1:guest:domains')).data)).toEqual(state);
  const sizes=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));
  expect(Math.max(...sizes.map(r=>r.width))-Math.min(...sizes.map(r=>r.width))).toBeLessThan(1);
  expect(Math.max(...sizes.map(r=>r.height))-Math.min(...sizes.map(r=>r.height))).toBeLessThan(1);
  const columns=await page.locator('.domain-card-groups').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);
  expect(sizes.slice(0,columns).every(r=>Math.abs(r.y-sizes[0].y)<1)).toBe(true);
  for(let i=1;i<Math.min(columns,sizes.length);i++)expect(Math.abs(sizes[i].x-sizes[i-1].x-sizes[i-1].width-12)).toBeLessThan(1);
  expect(sizes.every(rect=>Math.abs(rect.height-132)<1)).toBe(true);
  expect(await page.locator('.domain-card-groups').evaluate(n=>getComputedStyle(n).padding)).toBe('8px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  if(count){await page.getByRole('button',{name:'排序领域',exact:true}).click();await expect(page.locator('.domain-entry-shell.is-sorting')).toHaveCount(count);await page.getByRole('button',{name:'排序领域',exact:true}).click();}
  await page.locator('.domain-entry-scroll').evaluate(n=>{n.scrollTop=n.scrollHeight;});
  await expect(page.getByRole('button',{name:'创建领域',exact:true})).toBeInViewport();
  expect(writes).toEqual([]);await page.screenshot({path:`${out}/${scenario}-${width}.png`});await context.close();
 }
 console.log('PASS responsive domain frames: ordinary→其它→create order,0/1/7/8/13/legacy cases,retained archives,equal132px height,8px inset,12px gap,adaptive columns,sorting and internal access at375/768/1024/1440/2407');
}finally{await browser.close();}
