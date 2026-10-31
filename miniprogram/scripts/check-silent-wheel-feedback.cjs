// Isolated browser model: validates gestures/state/feedback calls, not physical hardware.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..'), web = createRequire(path.join(root, '../web/package.json'));
const { build } = web('esbuild'), { chromium, expect } = web('@playwright/test');
const out = path.join(root, 'test-results/silent-wheel-feedback');
fs.mkdirSync(out, { recursive: true });
const mock = `import React from 'react';
export function View({ariaLabel,catchMove,children,...props}){return <div {...props} aria-label={ariaLabel}>{children}</div>}
export function Text({children,...props}){return <span {...props}>{children}</span>}
export const PickerView=View, PickerViewColumn=View;
export default {getEnv:()=> 'WEAPP',ENV_TYPE:{WEAPP:'WEAPP'},vibrateShort:async()=>{window.haptics++},getWindowInfo:()=>({screenHeight:896,windowHeight:window.contentHeight,statusBarHeight:20}),getMenuButtonBoundingClientRect:()=>({top:24,height:32}),onKeyboardHeightChange:cb=>window.keyboard=cb,offKeyboardHeightChange:()=>{},onWindowResize:cb=>window.resize=cb,offWindowResize:()=>{}};`;
const source = `import React,{useState}from'react';import{createRoot}from'react-dom/client';
import WheelPicker,{wheelNumbers}from${JSON.stringify(path.join(root,'src/components/wheel-picker.tsx'))};
import useKeyboardDock from${JSON.stringify(path.join(root,'src/lib/use-keyboard-dock.ts'))};
function App(){const[draft,setDraft]=useState(['1','2','3','4']),[saved,setSaved]=useState(draft),[moving,setMoving]=useState(false);const inset=useKeyboardDock();
return <main><WheelPicker label='测试' columns={draft.map((value,i)=>({label:['专注','短休息','长休息','间隔'][i],ariaLabel:'列'+i,values:wheelNumbers(1,12),value}))} onChange={setDraft} onMovingChange={setMoving}/><output>{draft.join(',')}</output><button disabled={moving} onClick={()=>setSaved(draft)}>保存</button><button disabled={moving} onClick={()=>setDraft(saved)}>取消</button><aside data-inset={inset}/></main>};createRoot(document.getElementById('root')).render(<App/>);`;
(async()=>{
  await build({stdin:{contents:source,resolveDir:path.resolve(root,'../web'),loader:'tsx'},bundle:true,jsx:'automatic',outfile:path.join(out,'app.js'),plugins:[{name:'isolated-wechat-model',setup(b){
    b.onResolve({filter:/^@tarojs\//},()=>({path:'mock',namespace:'mock'}));
    b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mock,loader:'tsx',resolveDir:path.resolve(root,'../web')}));
    b.onResolve({filter:/^react(?:-dom)?(?:\/.*)?$/},a=>({path:web.resolve(a.path)}));
    b.onLoad({filter:/\.css$/},a=>({contents:fs.readFileSync(a.path,'utf8').replace(/PX/g,'px').replace(/> text/g,'> span'),loader:'css'}));
  }}]});
  const server=http.createServer((req,res)=>{if(req.url==='/app.js'||req.url==='/app.css'){res.setHeader('Content-Type',req.url.endsWith('js')?'text/javascript':'text/css');res.end(fs.readFileSync(path.join(out,req.url.slice(1))));}else {res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#192633}main{max-width:336px;margin:20px auto;color:white}button{height:48px}</style><div id="root"></div><script>window.haptics=0;window.contentHeight=749</script><script src="/app.js"></script>')}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{browser=await chromium.launch();for(const width of[360,375,430,768]){
    const page=await browser.newPage({viewport:{width,height:667},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);const wheel=page.getByRole('slider',{name:'列0'});await expect(wheel).toHaveAttribute('aria-valuenow','0');
    expect(await page.evaluate(()=>window.haptics)).toBe(0);const start={clientY:160,clientX:60,identifier:1};
    await wheel.dispatchEvent('touchstart',{touches:[start]});await expect(page.getByRole('button',{name:'保存'})).toBeDisabled();
    await wheel.dispatchEvent('touchmove',{touches:[{...start,clientY:96}]});await page.waitForTimeout(100);await wheel.dispatchEvent('touchend',{touches:[],changedTouches:[{...start,clientY:96}]});
    await expect(page.locator('output')).toHaveText('3,2,3,4');await expect(page.getByRole('button',{name:'保存'})).toBeEnabled();expect(await page.evaluate(()=>window.haptics)).toBeGreaterThan(0);
    await page.getByRole('button',{name:'取消'}).click();await expect(wheel).toHaveAttribute('aria-valuenow','0');await expect(page.locator('output')).toHaveText('1,2,3,4');
    await wheel.dispatchEvent('touchstart',{touches:[start]});await wheel.dispatchEvent('touchmove',{touches:[{...start,clientY:-10000}]});await wheel.dispatchEvent('touchcancel',{touches:[]});await expect(wheel).toHaveAttribute('aria-valuenow','0');
    await page.evaluate(()=>window.keyboard({height:300}));await expect(page.locator('aside')).toHaveAttribute('data-inset','213');
    await page.evaluate(()=>{window.contentHeight=449;window.resize()});await expect(page.locator('aside')).toHaveAttribute('data-inset','0');
    await page.evaluate(()=>window.keyboard({height:0}));await expect(page.locator('aside')).toHaveAttribute('data-inset','0');
    const geometry=await page.locator('.time-wheel-stage').evaluate(node=>({background:getComputedStyle(node).backgroundColor,mask:getComputedStyle(node).maskImage,widths:[...node.querySelectorAll('.time-wheel-column')].map(n=>n.getBoundingClientRect().width)}));expect(geometry.background).toBe('rgba(0, 0, 0, 0)');expect(new Set(geometry.widths).size).toBe(1);expect(geometry.mask).toContain('40%');expect(errors).toEqual([]);
    await page.screenshot({path:path.join(out,width+'.png')});await page.close();console.log('PASS silent wheel gestures, bounds/cancel, haptic calls, transparent fade and keyboard viewport overlap: '+width);
  }}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
