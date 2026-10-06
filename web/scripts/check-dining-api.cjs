/* eslint-disable @typescript-eslint/no-require-imports */
// Run only against the disposable options test database on port 5237.
const assert = require('node:assert/strict');
const { request } = require('@playwright/test');
const { load } = require('./tool-backup-fixtures.cjs');
const { tauFoods } = load('app/eat/food-data.ts');
async function main() {
  const admin = await request.newContext({baseURL:'http://127.0.0.1:5237'});
  const reader = await request.newContext({baseURL:'http://127.0.0.1:5237'});
  const guest = await request.newContext({baseURL:'http://127.0.0.1:5237'});
  async function write(client, route, data, method = 'post') {
    const { csrfToken } = await (await client.get('/api/account/session')).json();
    return client[method](route, {data,headers:{'X-CSRF-TOKEN':csrfToken}});
  }
  try {
    assert.equal((await write(admin,'/api/account/login',{userName:'options-test-tau',password:'Options-test-only-2026!'})).status(),200);
    assert.equal((await write(reader,'/api/account/register',{userName:`reader_${Date.now()}`,password:'Options-reader-only-2026!'})).status(),200);
    const custom = {...tauFoods[0],id:'admin-custom',name:'测试新增'};
    const record = {id:'test-record',name:'田鸡粥',english:'Frog Porridge',foodId:'tau-1',mode:'compare',at:new Date().toISOString(),early:true,answers:[]};
    const data = {version:1,customFoods:[custom],history:[record]};
    assert.equal((await write(admin,'/api/personal-tools/dining',{data},'put')).status(),200);
    assert.deepEqual((await (await admin.get('/api/personal-tools/dining')).json()).data,data);
    assert.equal((await write(reader,'/api/personal-tools/dining',{data},'put')).status(),403);
    assert.equal((await (await reader.get('/api/personal-tools/dining')).json()).data,null);
    const own = {...data,customFoods:[]};
    assert.equal((await write(reader,'/api/personal-tools/dining',{data:own},'put')).status(),200);
    assert.deepEqual((await (await reader.get('/api/personal-tools/dining')).json()).data,own);
    assert.deepEqual((await (await admin.get('/api/personal-tools/dining')).json()).data,data);
    assert.equal((await guest.get('/api/personal-tools/dining')).status(),401);
    assert.equal((await reader.put('/api/personal-tools/dining',{data:{data:own}})).status(),400);
    console.log('PASS API: Tau custom-food write/read, reader rejection, reader history save, account isolation, guest denial, CSRF protection.');
  } finally {await Promise.all([admin.dispose(),reader.dispose(),guest.dispose()]);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
