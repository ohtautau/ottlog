// Exercise the shared native gesture controller with deterministic geometry/time.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function fixture(web=false){
 const slots=[],effects=[],timeouts=new Map(),intervals=new Map(),commits=[];
 let cursor=0,nextTimer=0,hide;
 const listeners=new Map(),pending=[];
 const document={addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list);},removeEventListener(type,fn){listeners.set(type,(listeners.get(type)||[]).filter(item=>item!==fn));}};
 const window=document;
 const emit=(type,event={})=>{for(const fn of [...(listeners.get(type)||[])])fn(event);};
 let captured;
 const child={closest:()=>grip},other={};
 const grip={closest:()=>grip,getAttribute:()=> '0',hasPointerCapture:p=>captured===grip,
  setPointerCapture(p){const previous=captured;captured=grip;if(previous&&previous!==grip)emit('lostpointercapture',{pointerId:p,target:previous});},
  releasePointerCapture(p){captured=undefined;emit('lostpointercapture',{pointerId:p,target:grip});}};
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={
  useRef(value){const i=cursor++;return slots[i]||=( {current:value} );},
  useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;}];},
  useEffect(fn,deps){const i=cursor++,previous=slots[i];if(!previous||!equal(previous.deps,deps)){effects.push(()=>{previous?.cleanup?.();slots[i]={deps,cleanup:fn()};});}},
 };
 const node={scrollEnabled:true},rows=[0,1,2].map(i=>({left:0,right:300,top:i*44,bottom:(i+1)*44}));
 const taro={createSelectorQuery(){const values=[];let all=false;return {selectAll(){all=true;return this;},select(){all=false;return this;},boundingClientRect(){values.push(all?rows:{left:0,right:300,top:0,bottom:160});return this;},node(){values.push({node});return this;},exec(callback){if(web)pending.push(()=>callback(values));else callback(values);}};}};
 const source=fs.readFileSync(path.resolve(__dirname,'../src/lib/use-handle-sort.ts'),'utf8'),output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,module={exports:{}};
 new Function('require','module','exports','setTimeout','clearTimeout','setInterval','clearInterval','document','window',output)(name=>name==='react'?react:name==='@tarojs/taro'?{__esModule:true,default:taro,useDidHide:fn=>{hide=fn;}}:{isWebTool:web},module,module.exports,fn=>{const id=++nextTimer;timeouts.set(id,fn);return id;},id=>timeouts.delete(id),fn=>{const id=++nextTimer;intervals.set(id,fn);return id;},id=>intervals.delete(id),document,window);
 let hook,keys=['a','b','c'],enabled=true,owner='owner-a';
 function render(update={}){({keys,enabled,owner}={keys,enabled,owner,...update});cursor=0;hook=module.exports.useHandleSort(keys,enabled,owner,(...args)=>commits.push(args));while(effects.length)effects.shift()();return hook;}
 const event=(y,count=1)=>({touches:Array.from({length:count},()=>({clientX:280,clientY:y})),changedTouches:[{clientX:280,clientY:y}],stopPropagation(){},preventDefault(){}});
 render();
 return {get hook(){return hook;},commits,node,render,grip,child,other,emit,
  pointer(type,{target=child,pointerId=7,pointerType='touch',clientY=22,...rest}={}){if(type==='pointerdown'&&pointerType==='touch')captured=target;emit(type,{target,pointerId,pointerType,clientX:280,clientY,button:0,preventDefault(){},...rest});},
  flush:()=>{while(pending.length)pending.shift()();},
  start:(i=0)=>hook.bind(i).onTouchStart(event(rows[i].top+22)),move:(y,count=1)=>hook.bind(0).onTouchMove(event(y,count)),end:(y=120,count=0)=>hook.bind(0).onTouchEnd(event(y,count)),hold:()=>{for(const [id,fn] of [...timeouts]){timeouts.delete(id);fn();}},hide:()=>hide(),unmount:()=>{for(const slot of slots)slot?.cleanup?.();},timers:()=>timeouts.size+intervals.size};
}
{
 const f=fixture();f.start();f.move(120);f.hold();f.end();assert.deepEqual(f.commits,[],'ordinary slide cannot sort');assert.equal(f.timers(),0);
 f.start();f.hold();assert.equal(f.node.scrollEnabled,false);f.move(125);f.end();f.end();assert.deepEqual(f.commits,[[0,2]],'one actual move, one commit');assert.equal(f.node.scrollEnabled,true);assert.equal(f.timers(),0);
}
for(const cancel of [f=>f.hook.cancel(),f=>f.hide(),f=>f.render({owner:'owner-b'}),f=>f.render({enabled:false}),f=>f.render({keys:['a','c']}),f=>f.unmount(),f=>f.move(90,2),f=>f.end(100,1)]){
 const f=fixture();f.start();f.hold();f.move(125);cancel(f);f.end();assert.deepEqual(f.commits,[],'cancel/owner/read/close/multi-touch/unmount never persists');assert.equal(f.node.scrollEnabled,true);assert.equal(f.timers(),0);
}
{
 const f=fixture();f.start();f.hold();f.move(500);f.end(500);assert.deepEqual(f.commits,[],'outside drop cancels');
 f.start(2);f.hold();f.move(10);f.end(10);assert.deepEqual(f.commits,[[2,0]],'upward drop');
}
console.log('PASS shared handle sorting: long hold, actual up/down drops, one commit, scrolling before hold, bounds, multi-touch, cancel/hide/close/owner/queue/unmount cleanup.');

// Model document-level pointer events, including capture handoff and delayed geometry.
for(const pointerType of ['touch','mouse']){
 const f=fixture(true);f.pointer('pointerdown',{pointerType});if(pointerType==='touch')f.hold();f.flush();
 f.pointer('pointermove',{pointerType,clientY:125}); // Child implicit capture transfers to grip.
 f.flush();f.render();assert.ok(f.hook.drag?.active,'capture handoff retains active drag');
 for(const event of [{target:f.child,pointerId:7},{target:f.other,pointerId:7},{target:f.grip,pointerId:99}])f.emit('lostpointercapture',event);
 f.render();assert.ok(f.hook.drag?.active,'unrelated capture losses retain session');
 f.pointer('pointerup',{pointerType,clientY:125});
 assert.deepEqual(f.commits,[],'pointerup awaits asynchronous measurement');
 f.emit('lostpointercapture',{target:f.grip,pointerId:7}); // May arrive after explicit release.
 f.flush();assert.deepEqual(f.commits,[[0,2]],'release loss does not cancel delayed commit');
 f.pointer('pointerup',{pointerType,clientY:125});f.flush();assert.equal(f.commits.length,1);
 assert.equal(f.timers(),0);f.unmount();
}
for(const cancel of [f=>f.emit('lostpointercapture',{target:f.grip,pointerId:7}),f=>f.emit('blur'),f=>f.pointer('pointercancel'),f=>f.render({owner:'owner-b'}),f=>f.render({keys:['a','c']}),f=>f.render({enabled:false}),f=>f.unmount()]){
 const f=fixture(true);f.pointer('pointerdown');f.hold();f.flush();f.pointer('pointermove',{clientY:125});f.flush();
 cancel(f);f.pointer('pointerup',{clientY:125});f.flush();assert.deepEqual(f.commits,[],'real grip loss/blur/cancel/owner/queue/close/unmount cancels');assert.equal(f.timers(),0);f.unmount();
}
console.log('PASS web handle sorting: child-to-grip capture handoff, unrelated losses, mouse/touch release with asynchronous measurement, real capture loss and cancellation guards.');
// Shared checklist and display queue both retain handle keyboard ordering.
{
 const f=fixture(true),key=extra=>f.emit('keydown',{target:f.child,key:'ArrowDown',preventDefault(){},stopImmediatePropagation(){},...extra});
 for(const extra of [{isComposing:true},{keyCode:229},{altKey:true},{ctrlKey:true},{metaKey:true}])key(extra);
 assert.deepEqual(f.commits,[],'IME and modified arrows never reorder');key({});assert.deepEqual(f.commits,[[0,1]]);f.unmount();
 const edge=fixture();edge.start();edge.hold();edge.move(155);edge.render();assert.ok(edge.hook.scrollTop>0,'active edge sets real ScrollView scroll target');edge.hook.cancel();assert.deepEqual(edge.commits,[],'edge preview cancellation never commits');edge.unmount();
}
console.log('PASS shared handle keyboard IME/modifier guards and boundary scroll preview cancellation.');
