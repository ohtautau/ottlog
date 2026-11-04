// Real shared editor and image reader, deterministic hooks and native API fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let slots=[],cursor=0,effects=[],props,chosen,read,notifications=[],changes=[];
const react={createElement:(type,props,...children)=>({type,props:{...props,children:children.flat()}}),useMemo:f=>f(),useRef:v=>{const i=cursor++;return slots[i]??(slots[i]={current:v});},useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],n=>slots[i]=typeof n==='function'?n(slots[i]):n];},useEffect:(f,deps)=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j])){old?.cleanup?.();effects.push(()=>{slots[i]={deps,cleanup:f()};});}}};
const taro={chooseMedia:()=>chosen,getImageInfo:async()=>({width:32,height:32}),getEnv:()=> 'WEAPP',ENV_TYPE:{WEB:'WEB'},getFileSystemManager:()=>({readFile:({success})=>success({data:'iVBORw0KGgoAAAAA'})}),compressImage:()=>{throw Error('PNG must not compress');}};
function compile(file,require){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020}}).outputText;new Function('React','module','exports','require',js)(react,module,module.exports,require);return module.exports;}
const images=compile(path.join(__dirname,'../src/lib/memo-images.ts'),dep=>dep==='@tarojs/taro'?{default:taro}:dep==='./tool-records'?{toolId:()=> 'stable-image'}:compile(path.join(__dirname,'../src/lib/note-image-data.ts'),()=>{}));
const editor=compile(path.join(__dirname,'../src/components/markdown-note-editor.tsx'),dep=>dep==='react'?react:dep==='@tarojs/taro'?{default:taro}:dep==='../lib/app-dialog'?{showAppMessage:n=>notifications.push(n)}:dep==='../lib/memo-images'?{...images,readMemoImage:()=>read}:dep==='../lib/markdown'?{createMarkdownRenderer:()=>()=>''}:{}).default;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
const all=n=>!n||typeof n!=='object'?[]:[n,...(n.props?.children||[]).flatMap(all)];
function render(){cursor=0;const tree=editor(props);effects.splice(0).forEach(f=>f());return tree;}
function setup(){slots=[];effects=[];changes=[];notifications=[];props={value:'original body',images:[],owner:'a',recordId:'record',disabled:false,canInsertImage:true,maxLength:6000,ariaLabel:'note',placeholder:'',checkImages:()=>{},onChange:()=>{},onImagesChange:next=>{changes.push(next);props.images=next;},onBusyChange:busy=>{props.disabled=busy;render();}};}
async function insert(){const tree=render();return all(tree).find(n=>n.props?.ariaLabel==='插入图片').props.onClick();}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
assert.match((await images.readMemoImage('original.png',100)).dataUrl,/^data:image\/png/);
await assert.rejects(images.readMemoImage('huge.png',13*1024*1024),/过大/);
setup();chosen=Promise.resolve({tempFiles:[{tempFilePath:'png',size:100}]});let pending=deferred();read=pending.promise;await insert();await tick();assert.equal(props.disabled,true);assert.equal(changes.length,0);pending.resolve({id:'one',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAAA'});await tick();assert.equal(changes.length,1);assert.equal(props.value,'original body');
read=Promise.resolve({id:'two',dataUrl:'data:image/jpeg;base64,/9j/AAAA'});await insert();await tick();assert.deepEqual(props.images.map(i=>i.id),['one','two']);
const remove=all(render()).find(n=>n.props?.ariaLabel==='移除图片 1');remove.props.onClick();assert.deepEqual(props.images.map(i=>i.id),['two']);
for(const invalidation of ['owner','record','permission']){setup();pending=deferred();read=pending.promise;await insert();await tick();if(invalidation==='owner')props.owner='b';else if(invalidation==='record')props.recordId='new';else props.canInsertImage=false;render();props.canInsertImage=true;render();pending.resolve({id:'late'});await tick();assert.equal(changes.length,0,invalidation);}
setup();pending=deferred();read=pending.promise;await insert();await tick();for(const slot of slots)slot?.cleanup?.();pending.resolve({id:'unmounted-late'});await tick();assert.equal(changes.length,0);assert.equal(props.disabled,false);
setup();chosen=Promise.reject({errMsg:'chooseMedia:fail cancel'});await insert();await tick();assert.equal(changes.length,0);assert.equal(notifications.length,0);
setup();chosen=Promise.resolve({tempFiles:[{tempFilePath:'bad',size:10}]});read=Promise.reject(Error('bad image'));await insert();await tick();assert.equal(changes.length,0);assert.equal(notifications.length,1);
console.log('PASS media: real shared async editor self-busy, two images, delete, owner/record/revoked-ready invalidation, cancel/bad image; native PNG original and source limit');
})().catch(e=>{console.error(e);process.exitCode=1;});
