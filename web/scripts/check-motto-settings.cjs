const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {origin}=JSON.parse(fs.readFileSync('test-results/productivity-runtime.json','utf8'));
(async()=>{const browser=await chromium.launch();try{
const c=await browser.newContext({viewport:{width:390,height:844}});
const s=await(await c.request.get(origin+'/api/auth/session')).json();
assert.equal((await c.request.post(origin+'/api/auth/setup',{headers:{'X-CSRF-TOKEN':s.csrfToken},data:{userName:'motto_admin',password:'Motto-test-only-2026!'}})).status(),200);
const p=await c.newPage();await p.goto(origin+'/admin');await p.getByRole('navigation',{name:'后台导航'}).getByRole('link',{name:'首页格言',exact:true}).click();const panel=p.getByRole('region',{name:'首页格言管理'});
await expect(panel.locator('li')).toHaveCount(21);
await panel.getByLabel('新增一句').fill('测试新增格言');await panel.getByRole('button',{name:'添加格言'}).click();await expect(panel.locator('li')).toHaveCount(22);
await panel.getByRole('button',{name:'编辑第 22 句',exact:true}).click();await panel.getByLabel('编辑第 22 句',{exact:true}).fill('修改后的格言');await panel.getByRole('button',{name:'保存',exact:true}).click();await expect(panel.locator('li').last()).toContainText('修改后的格言');
await p.reload();await p.getByRole('navigation',{name:'后台导航'}).getByRole('link',{name:'首页格言',exact:true}).click();await expect(panel.locator('li').last()).toContainText('修改后的格言');
await panel.getByLabel('新增一句').fill('修改后的格言');await panel.getByRole('button',{name:'添加格言'}).click();await expect(panel.getByRole('status')).toHaveText('这句格言已经存在');
await panel.scrollIntoViewIfNeeded();assert(await panel.evaluate(el=>el.getBoundingClientRect().right<=innerWidth));await p.screenshot({path:'test-results/motto-settings-mobile.png'});
p.once('dialog',d=>d.accept());await panel.getByRole('button',{name:'删除第 22 句',exact:true}).click();await expect(panel.locator('li')).toHaveCount(21);
await panel.getByRole('button',{name:'编辑第 1 句',exact:true}).click();await panel.getByLabel('编辑第 1 句',{exact:true}).fill('首页轮播验证');await panel.getByRole('button',{name:'保存',exact:true}).click();await expect(panel.getByRole('status')).toHaveText('已保存这句格言');await p.goto(origin+'/');await expect(p.locator('.motto-text')).toHaveText('首页轮播验证');
console.log('PASS add, edit, delete, duplicate prevention, reload, mobile bounds, homepage');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
