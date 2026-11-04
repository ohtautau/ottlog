// Deterministic event regression, without a browser or account access.
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),esbuild=require('esbuild');
function harness(source){
 const start=source.indexOf('function WheelColumn('),end=source.indexOf('export function PickerView',start);
 let slots=[],cursor=0,effects=[],pending=new Map(),id=0,selected=29,writes=[],starts=0,ends=0,tree;
 const node={scrollTop:812,hasPointerCapture:()=>false,setPointerCapture(){},releasePointerCapture(){}};
 const React={Children:{toArray:x=>x},createElement:(type,props,...children)=>({type,props:{...props,children}})};
 function useRef(value){const i=cursor++;return slots[i]||(slots[i]={current:value});}
 function useState(value){const slot=useRef(value);return [slot.current,next=>{slot.current=next;}];}
 function effect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old[j]))effects.push(fn);slots[i]=deps;}
 const code=esbuild.transformSync(source.slice(start,end)+'\nreturn WheelColumn;',{loader:'jsx',format:'cjs'}).code;
 const Wheel=new Function('React','useRef','useState','useLayoutEffect','useEffect','setTimeout','clearTimeout',code)(React,useRef,useState,effect,effect,fn=>{pending.set(++id,fn);return id;},key=>pending.delete(key));
 function render(value=selected){selected=value;cursor=0;effects=[];tree=Wheel({column:{props:{ariaLabel:'专注时长',children:Array.from({length:120},(_,i)=>({key:String(i),props:{children:String(i+1)}}))}},selected,rowHeight:28,onSelect:i=>writes.push(i+1),onStart:()=>starts++,onEnd:()=>ends++});tree.props.children[0].props.ref.current=node;effects.forEach(fn=>fn());return tree.props.children[0].props;}
 let handlers=render();
 return {node,writes,get starts(){return starts;},get ends(){return ends;},get handlers(){return handlers;},render(value){handlers=render(value);},scroll(top){node.scrollTop=top;handlers.onScroll({currentTarget:node});},flush(){const batch=[...pending.values()];pending.clear();batch.forEach(fn=>fn());}};
}
const old=cp.execFileSync('git',['show','HEAD:web/shared-app/components.jsx'],{encoding:'utf8'});
const before=harness(old);before.scroll(784);assert.deepEqual(before.writes,[29]);
const source=fs.readFileSync(require('node:path').join(__dirname,'../shared-app/components.jsx'),'utf8');
const h=harness(source);h.scroll(784);h.flush();assert.deepEqual(h.writes,[]);assert.equal(h.node.scrollTop,812,'passive alignment restores 30');
h.render(29);h.scroll(812);assert.deepEqual(h.writes,[]);
// Real wheel initiation; final position can differ from the last delivered scroll event.
h.handlers.onWheel();h.scroll(784);h.node.scrollTop=812;h.flush();assert.deepEqual(h.writes,[],'returning to 30 does not write');
h.handlers.onWheel();h.scroll(840);h.render(29);h.node.scrollTop=812;h.flush();assert.deepEqual(h.writes,[],'render cannot replace final physical position');
for(const [index,value] of [[0,1],[59,60],[119,120],[29,30]]){h.handlers.onWheel();h.scroll(index*28);h.flush();assert.equal(h.writes.at(-1),value);h.render(index);}
const count=h.writes.length;h.handlers.onPointerDown({pointerType:'mouse',button:0,clientY:100,currentTarget:h.node});h.scroll(840);h.flush();assert.equal(h.writes.length,count,'held drag cannot settle or save');h.node.scrollTop=812;h.handlers.onPointerUp({pointerId:1,currentTarget:h.node,preventDefault(){}});h.flush();assert.equal(h.writes.length,count,'drag returns precisely to 30');
h.handlers.onKeyDown({key:'ArrowUp',preventDefault(){}});assert.equal(h.writes.at(-1),29);h.render(28);h.handlers.onKeyDown({key:'ArrowDown',preventDefault(){}});assert.equal(h.writes.at(-1),30);
h.render(29);const touchCount=h.writes.length;h.handlers.onPointerDown({pointerType:'touch'});h.scroll(840);h.flush();assert.equal(h.writes.length,touchCount,'touch held at a row must not save');h.node.scrollTop=812;h.handlers.onPointerUp({pointerId:2,currentTarget:h.node,preventDefault(){}});h.flush();assert.equal(h.writes.length,touchCount);
console.log('PASS: original handler reproduces synthetic passive 30→29; fixed passive/layout events, final-position settle, rerender, held drag, keyboard and 1/30/60/120 boundaries. This does not reproduce the historical production gesture.');
