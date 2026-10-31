import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {request,chromium}=require('@playwright/test');
const repo=path.resolve(import.meta.dirname,'../..');
const root=path.join(repo,'local-state/remember-login');fs.mkdirSync(root,{recursive:true});const data=fs.mkdtempSync(path.join(root,'fixture-'));
const net=require('node:net');const available=net.createServer();await new Promise(r=>available.listen(0,'127.0.0.1',r));const port=available.address().port;await new Promise(r=>available.close(r));
const base='http://127.0.0.1:'+port;
const server=spawn('dotnet',[process.env.OTTLOG_AUTH_TEST_DLL||path.join(repo,'backend/Ottlog.Api/bin/Debug/net10.0/Ottlog.Api.dll'),'--urls',base],{windowsHide:true,stdio:['ignore',fs.openSync(path.join(data,'server.log'),'w'),fs.openSync(path.join(data,'errors.log'),'w')],env:{...process.env,ASPNETCORE_ENVIRONMENT:'Development',Data__Directory:path.join(data,'data'),SeedExamples:'false',Admin__Password:'',Admin__PasswordFile:'',ASPNETCORE_HOSTINGSTARTUPASSEMBLIES:''}});
const reader={userName:'remember-fixture',password:'Fixture-password-2026'},admin={userName:'remember-admin',password:'Fixture-admin-password-2026'};
const contexts=[];let persistent;
async function client(){const c=await request.newContext({baseURL:base});contexts.push(c);return c;}
async function mutate(c,route,body){const s=await(await c.get(base+(route.startsWith('/api/auth/')?'/api/auth/session':'/api/account/session'))).json();return c.post(base+route,{headers:{'X-CSRF-TOKEN':s.csrfToken},data:body});}
function lifetime(response,persist){const raw=response.headersArray().find(h=>h.name.toLowerCase()==='set-cookie'&&h.value.startsWith('ottlog.admin='))?.value;assert(raw,'Authentication cookie present');assert(/httponly/i.test(raw));assert(/samesite=strict/i.test(raw));const expiration=/expires=([^;]+)/i.exec(raw);assert.equal(!!expiration,persist);if(expiration)assert(Math.abs(Date.parse(expiration[1])-Date.now()-30*86400000)<120000,'Remembered cookie lasts 30 days');}
(async()=>{
 try{
  for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('Fixture server exited');try{if((await fetch(base+'/health/ready')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));if(i===99)throw Error('Fixture server not ready');}
  const a=await client();let r=await mutate(a,'/api/auth/setup',admin);assert.equal(r.status(),200);lifetime(r,false);
  const c=await client();r=await mutate(c,'/api/account/register',reader);assert.equal(r.status(),200);lifetime(r,false);
  const guest=await client();assert.equal((await guest.get(base+'/api/mottos')).status(),401,'Mottos remain account-private');
  for(const key of ['todos','memos','reminders','domains','mottos','pomodoro','growth','articles'])assert.equal((await c.get(base+'/api/personal-tools/'+key)).status(),200,'Existing tool key preserved: '+key);
  assert.deepEqual((await(await c.get(base+'/api/mottos')).json()).mottos,[],'Empty account does not fall back to global mottos');
  const normal=await client();r=await mutate(normal,'/api/account/login?channel=mini',reader);assert.equal(r.status(),200);lifetime(r,false);
  const remembered=await client();r=await mutate(remembered,'/api/account/login',{...reader,rememberMe:true});assert.equal(r.status(),200);lifetime(r,true);
  const delegated=await client();r=await mutate(delegated,'/api/account/login',{...admin,rememberMe:true});assert.equal(r.status(),200);lifetime(r,true);
  const direct=await client();r=await mutate(direct,'/api/auth/login',{...admin,rememberMe:true});assert.equal(r.status(),200);lifetime(r,true);
  const invalid=await client();r=await invalid.post(base+'/api/account/login',{data:{...reader,rememberMe:true}});assert.equal(r.status(),400);assert.equal((await(await invalid.get(base+'/api/account/profile')).json()).authenticated,false);
  const profile=path.join(data,'browser-profile');persistent=await chromium.launchPersistentContext(profile,{headless:true});r=await mutate(persistent.request,'/api/account/login',{...reader,rememberMe:true});assert.equal(r.status(),200);lifetime(r,true);await persistent.close();
  persistent=await chromium.launchPersistentContext(profile,{headless:true});assert.equal((await(await persistent.request.get(base+'/api/account/profile')).json()).authenticated,true,'Remembered login survives browser restart');r=await mutate(persistent.request,'/api/account/logout');assert.equal(r.status(),204);await persistent.close();
  persistent=await chromium.launchPersistentContext(profile,{headless:true});assert.equal((await(await persistent.request.get(base+'/api/account/profile')).json()).authenticated,false,'Logout stays logged out after browser restart');await persistent.close();persistent=null;
  const stale=await request.newContext({storageState:await direct.storageState()});contexts.push(stale);r=await mutate(direct,'/api/auth/password',{currentPassword:admin.password,newPassword:'Changed-fixture-password-2026'});assert.equal(r.status(),204);assert.equal((await(await stale.get(base+'/api/account/profile')).json()).authenticated,false,'Password change revokes remembered cookie');
  console.log('PASS isolated reader/admin registration and login: ordinary/mini session cookies, explicit 30-day persistence, real browser restart, logout, CSRF and password revocation; no production data touched');
 }finally{if(persistent)await persistent.close();await Promise.allSettled(contexts.map(c=>c.dispose()));server.kill();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
