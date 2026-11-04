const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const calls=[],png='iVBORw0KGgoAAAAA';let live=true,fail=false,readCount=0,acceptAt=3,selected;
const image={set src(value){this.path=value;queueMicrotask(()=>fail?this.onerror():this.onload());}};
const node={width:1,height:1,createImage:()=>image,getContext:()=>({clearRect:(...args)=>calls.push(['clear',...args]),drawImage:(...args)=>calls.push(['draw',...args])})};
const taro={createSelectorQuery:()=>({select(id){selected=id;return this},fields(options){assert.deepEqual(options,{node:true});return this},exec(cb){cb([{node}]);}}),canvasToTempFilePath:async options=>{assert.equal(options.canvas,node);assert.equal(options.fileType,'png');assert.equal(options.width,node.width);assert.equal(options.height,node.height);assert.equal(options.destWidth,node.width);assert.equal(options.destHeight,node.height);assert.ok(node.width<=1280&&node.height<=1280);calls.push(['export',node.width,node.height]);return {tempFilePath:'output.png'};}};
const moduleFixture={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(__dirname+'/../src/lib/native-alpha-canvas.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText)(()=>({default:taro}),moduleFixture,moduleFixture.exports);
const run=()=>moduleFixture.exports.nativeAlphaImage('original.webp',2400,1200,{canvasId:'editor-only',isCurrent:()=>live},async()=>{readCount++;return png;},()=>readCount>=acceptAt);
(async()=>{
assert.equal(await run(),png);assert.equal(selected,'#editor-only');assert.deepEqual(calls.filter(c=>c[0]==='export').map(c=>c.slice(1)),[[1280,640],[960,480],[720,360]]);assert.equal(image.path,'original.webp');assert.equal(node.width,1);assert.equal(node.height,1);
readCount=0;acceptAt=99;calls.length=0;await assert.rejects(run(),/180KB/);assert.equal(readCount,6);assert.deepEqual(calls.filter(c=>c[0]==='export').at(-1),['export',256,128]);assert.equal(node.width,1);
fail=true;await assert.rejects(run(),/加载失败/);assert.equal(node.width,1);fail=false;
live=false;await assert.rejects(run(),/取消/);live=true;
const originalExport=taro.canvasToTempFilePath;taro.canvasToTempFilePath=async o=>{const result=await originalExport(o);live=false;return result;};readCount=0;await assert.rejects(run(),/取消/);assert.equal(readCount,0);assert.equal(node.width,1);live=true;
taro.canvasToTempFilePath=async()=>{throw Error('export failed')};await assert.rejects(run(),/export failed/);assert.equal(node.width,1);
taro.canvasToTempFilePath=originalExport;await assert.rejects(moduleFixture.exports.nativeAlphaImage('x',10,10,{canvasId:'one',isCurrent:()=>true},async()=>'/9j/AAAA',()=>true),/PNG/);assert.equal(node.width,1);
taro.canvasToTempFilePath=originalExport;await assert.rejects(moduleFixture.exports.nativeAlphaImage('x',10,10,{canvasId:'one',isCurrent:()=>true},async()=>{throw Error('read failed')},()=>true),/read failed/);assert.equal(node.width,1);
const realSetTimeout=global.setTimeout,realClearTimeout=global.clearTimeout;let timeout;
global.setTimeout=fn=>{timeout=fn;return 1};global.clearTimeout=()=>{};
try {taro.canvasToTempFilePath=()=>new Promise(()=>{});const pending=run();const rejected=assert.rejects(pending,/超时/);await new Promise(resolve=>setImmediate(resolve));timeout();await rejected;assert.equal(node.width,1);} finally {global.setTimeout=realSetTimeout;global.clearTimeout=realClearTimeout;}
taro.canvasToTempFilePath=originalExport;
taro.createSelectorQuery=undefined;await assert.rejects(run(),/Canvas 不可用/);
console.log('PASS native alpha: actual selected node, PNG export, six bounded sizes, bytes retry, load/export/format failures, cancellation and canvas cleanup');
})().catch(error=>{console.error(error);process.exitCode=1});
