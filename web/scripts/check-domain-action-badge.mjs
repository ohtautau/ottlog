import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.OTTLOG_PARITY_ORIGIN||'http://127.0.0.1:3017';
if(!/^http:\/\/(127\.0\.0\.1|localhost):3017$/.test(origin))throw Error('Use isolated candidate 3017');
const out='test-results/domain-action-badge';await fs.mkdir(out,{recursive:true});
const cases=[
 {id:'zero',total:'0',current:0,petals:0,tier:0},
 {id:'near',total:'99',current:99,petals:0,tier:0},
 {id:'first',total:'100',current:0,petals:1,tier:0},
 {id:'partial',total:'250',current:50,petals:2,tier:0},
 {id:'full',total:'500',current:0,petals:5,tier:0},
 {id:'upgrade',total:'600',current:0,petals:1,tier:1},
 {id:'diamond',total:'1100',current:0,petals:1,tier:2},
 {id:'star',total:'2600',current:0,petals:1,tier:5},
 {id:'large',total:'18014398509481983',current:83,petals:4,tier:5},
];
const browser=await chromium.launch();
try{for(const width of [320,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage(),writes=[],errors=[];
 const record=(id,effortScore)=>({id,content:'测试记录',effortScore,createdAt:'2026-11-27T00:00:00Z'});
 const domains={version:1,domains:cases.map(c=>({id:c.id,name:c.id==='full'?'用长领域名称检查图案及两行文字的边界':c.id,iconId:'plant',longTermGoal:null,shortTermGoal:null,habits:[],positiveRecords:[record('positive-'+c.id,c.id==='large'?Number.MAX_SAFE_INTEGER:Number(c.total))],negativeRecords:c.id==='large'?[record('negative-large',Number.MAX_SAFE_INTEGER),record('one',1)]:[]})),completedGoals:[]};
 page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.startsWith('/api/')){
   if(req.method()!=='GET')writes.push(url.pathname);
   if(url.pathname.startsWith('/api/account/'))return route.fulfill({json:{authenticated:true,userName:'badge-fixture',csrfToken:'fixture'}});
   return route.fulfill({json:{data:url.pathname==='/api/personal-tools/domains'?domains:null,enabled:false,reminders:[]}});
  }
  if(url.origin!==origin&&!['data:','blob:'].includes(url.protocol))return route.abort();
  return route.continue();
 });
 const check=async(root,c)=>{
  await expect(root.locator('.domain-action-value')).toHaveText(c.total);
  const track=root.getByRole('progressbar');await expect(track).toHaveAttribute('aria-valuenow',String(c.current));
  await expect(root.locator('.domain-action-badge')).toHaveCount(1);await expect(root.locator('.domain-action-badge')).toHaveClass(new RegExp('is-tier-'+c.tier));
  await expect(root.locator('.domain-action-petal.is-lit')).toHaveCount(c.petals);await expect(root.locator('.domain-action-badge')).toHaveText('');
  const bounds=await track.boundingBox(),fill=await root.locator('.domain-action-fill').boundingBox();expect(Math.abs(fill.width-bounds.width*c.current/100)).toBeLessThanOrEqual(1);
 };
 await page.goto(origin+'/domains');
 for(const c of cases){
  const card=page.locator('#domain-entry-'+c.id);await card.scrollIntoViewIfNeeded();await check(card,c);
  expect(await card.evaluate(n=>{const frame=n.getBoundingClientRect(),goal=n.querySelector('.domain-progress-card-goal').getBoundingClientRect();return [...n.querySelectorAll('.domain-action-badge,.domain-action-track,.domain-progress-title')].every(child=>{const r=child.getBoundingClientRect();return r.left>=frame.left&&r.right<=frame.right&&r.top>=frame.top&&r.bottom<goal.top;});})).toBe(true);
 }
 await page.screenshot({path:`${out}/${width}-cards.png`});
 for(const c of [cases[3],cases[4],cases[8]]){
  await page.locator('#domain-entry-'+c.id+' .domain-entry').click();
  await check(page.locator('.domain-heading'),c);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto(origin+'/domains');
 }
 if(width===1440){
  for(const total of [250,100,0]){
   domains.domains[0].positiveRecords=[record('changing',total)];await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   const card=page.locator('#domain-entry-zero');await expect(card.locator('.domain-action-value')).toHaveText(String(total),{timeout:15000});
   await check(card,{total:String(total),current:total%100,petals:Math.floor(total/100),tier:0});
  }
  await page.getByRole('button',{name:'领域更多操作',exact:true}).click();await page.getByRole('button',{name:'排序',exact:true}).click();
  await expect(page.locator('#domain-entry-partial .domain-action-badge,#domain-entry-partial .domain-action-track')).toHaveCount(0);
 }
 expect(writes).toEqual([]);expect(errors).toEqual([]);await context.close();console.log(`PASS ${width}: hundred resets, progressive badge/ranks, huge exact scores, list/detail geometry and readonly rendering`);
}}finally{await browser.close();}
