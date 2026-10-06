const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {origin}=JSON.parse(fs.readFileSync('test-results/productivity-runtime.json','utf8'));
(async()=>{const browser=await chromium.launch();try{
const c=await browser.newContext({viewport:{width:390,height:844}});
const s=await(await c.request.get(origin+'/api/auth/session')).json();
assert.equal((await c.request.post(origin+'/api/auth/setup',{headers:{'X-CSRF-TOKEN':s.csrfToken},data:{userName:'password_admin',password:'Password-test-only-2026!'}})).status(),200);
const p=await c.newPage();await p.goto(origin+'/admin');await expect(p.getByRole('button',{name:'修改密码',exact:true})).toHaveCount(0);
await p.getByRole('link',{name:'账号设置 →',exact:true}).click();
await expect(p.getByRole('heading',{name:'账号设置',exact:true})).toBeVisible();
await p.getByLabel('当前密码',{exact:true}).fill('Password-test-only-2026!');await p.getByLabel('新密码',{exact:true}).fill('New-password-test-2026!');await p.getByLabel('确认新密码',{exact:true}).fill('Mismatch-password-2026!');await p.getByRole('button',{name:'保存新密码并退出'}).click();await expect(p.getByText('两次输入的新密码不一致')).toBeVisible();
await p.getByLabel('确认新密码',{exact:true}).fill('New-password-test-2026!');await p.getByRole('button',{name:'保存新密码并退出'}).click();await expect(p.getByText('密码已修改，请使用新密码重新登录')).toBeVisible();
assert.equal((await(await c.request.get(origin+'/api/account/profile')).json()).authenticated,false);
await p.getByLabel('账号',{exact:true}).fill('password_admin');await p.getByLabel('密码',{exact:true}).fill('New-password-test-2026!');await p.getByRole('button',{name:'登录',exact:true}).click();await expect(p).toHaveURL(origin+'/admin');
console.log('PASS: settings entry, removed old entry, confirmation mismatch, change password, sign-out, new password login');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
