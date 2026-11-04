import { useEffect, useRef, useState } from 'react';
import Taro, { useDidHide } from '@tarojs/taro';
import { isWebTool } from './tool-platform';

type Point = { clientX:number; clientY:number };
type TouchEvent = { touches?:Point[]; changedTouches?:Point[]; stopPropagation():void; preventDefault?():void };
type Rect = { top:number; bottom:number; left:number; right:number };
type Session = { owner:string; keys:string; index:number; target:number; start:Point; point:Point; active:boolean; ending?:boolean; rect?:Rect; valid:boolean };
let sequence=0;
/** Handle-only sorting. The caller retains ownership of persistence and failures. */
export function useHandleSort(keys:readonly string[], enabled:boolean, owner:string, commit:(from:number,to:number)=>void) {
 const [id]=useState(()=>`handle-sort-${++sequence}`),[drag,setDrag]=useState<Session|null>(null),[scrollTop,setScrollTop]=useState(0);
 const session=useRef<Session|null>(null),hold=useRef<ReturnType<typeof setTimeout>|null>(null),tick=useRef<ReturnType<typeof setInterval>|null>(null),offset=useRef(0),blocked=useRef(0);
 const locks=useRef<{node:Taro.ScrollViewContext;enabled:boolean}[]>([]);
 const latest=useRef({keys,enabled,owner,commit});latest.current={keys,enabled,owner,commit};
 function cancel(){if(hold.current)clearTimeout(hold.current);if(tick.current)clearInterval(tick.current);hold.current=null;tick.current=null;session.current=null;for(const lock of locks.current)lock.node.scrollEnabled=lock.enabled;locks.current=[];setDrag(null);}
 function measure(s:Session,done?:()=>void){Taro.createSelectorQuery().selectAll(`#${id} .handle-sort-row`).boundingClientRect().select(`#${id}`).boundingClientRect().exec(results=>{
  if(session.current!==s)return;if(s.owner!==latest.current.owner||s.keys!==JSON.stringify(latest.current.keys)){cancel();return;}const rows=results[0] as Rect[],box=results[1] as Rect|undefined;if(!box||!rows?.length){done?.();return;}
  s.rect ||= rows[s.index];s.valid=s.point.clientX>=box.left-24&&s.point.clientX<=box.right+24&&s.point.clientY>=box.top-32&&s.point.clientY<=box.bottom+32;
  s.target=Math.max(0,Math.min(rows.length-1,rows.filter(r=>s.point.clientY>(r.top+r.bottom)/2).length-(s.point.clientY>(rows[s.index].top+rows[s.index].bottom)/2?1:0)));
  if(s.active&&!s.ending&&s.valid){const direction=s.point.clientY<box.top+28?-1:s.point.clientY>box.bottom-28?1:0;if(direction)setScrollTop(Math.max(0,offset.current+direction*16));}
  setDrag({...s});done?.();
 });}
 function activate(s:Session){if(session.current!==s||!latest.current.enabled)return;s.active=true;blocked.current=Date.now()+500;
  if(!isWebTool)Taro.createSelectorQuery().select(`#${id}`).node().exec(results=>{if(session.current!==s)return;for(const result of results){const node=result?.node as Taro.ScrollViewContext;if(node&&typeof node.scrollEnabled==='boolean'){locks.current.push({node,enabled:node.scrollEnabled});node.scrollEnabled=false;}}});
  measure(s);tick.current=setInterval(()=>measure(s),60);
 }
 function start(index:number,point:Point,mouse=false){cancel();if(!latest.current.enabled)return;const s:Session={owner:latest.current.owner,keys:JSON.stringify(latest.current.keys),index,target:index,start:point,point,active:false,valid:true};session.current=s;if(mouse)activate(s);else hold.current=setTimeout(()=>activate(s),400);}
 function move(point:Point){const s=session.current;if(!s||s.ending)return;if(!s.active){if(Math.hypot(point.clientX-s.start.clientX,point.clientY-s.start.clientY)>8)cancel();return;}s.point=point;measure(s);}
 function finish(){const s=session.current;if(!s||s.ending)return;if(!s.active){cancel();return;}s.ending=true;if(tick.current)clearInterval(tick.current);blocked.current=Date.now()+400;measure(s,()=>{const valid=s.valid&&latest.current.enabled&&s.owner===latest.current.owner&&s.keys===JSON.stringify(latest.current.keys);cancel();if(valid&&s.index!==s.target)latest.current.commit(s.index,s.target);});}

 const signature=JSON.stringify(keys);
 useEffect(()=>{cancel();},[signature,owner,enabled]);
 useDidHide(cancel);
 useEffect(()=>()=>{cancel();},[]);
 useEffect(()=>{
  if(!isWebTool||typeof document==='undefined')return;
  let pointer:number|undefined,capture:HTMLElement|undefined;
  const release=()=>{const node=capture,p=pointer;pointer=undefined;capture=undefined;if(p!==undefined&&node?.hasPointerCapture(p))node.releasePointerCapture(p);};
  const down=(e:PointerEvent)=>{if(pointer!==undefined){cancel();release();return;}const handle=(e.target as HTMLElement).closest(`#${id} .handle-sort-grip`);if(!handle||e.button!==0)return;pointer=e.pointerId;capture=handle as HTMLElement;start(Number(handle.getAttribute('data-sort-index')),e,e.pointerType==='mouse');if(e.pointerType==='mouse')capture.setPointerCapture(pointer);};
  const moving=(e:PointerEvent)=>{if(e.pointerId!==pointer)return;move(e);if(session.current?.active){e.preventDefault();if(capture&&!capture.hasPointerCapture(e.pointerId))capture.setPointerCapture(e.pointerId);}};
  const end=(e:PointerEvent)=>{if(e.pointerId!==pointer)return;if(session.current?.active){session.current.point=e;finish();}else cancel();release();};
  const abort=()=>{cancel();release();};
  // Ignore implicit capture handed off from a child to this grip.
  const lost=(e:PointerEvent)=>{if(pointer!==undefined&&e.pointerId===pointer&&e.target===capture)abort();};
  const key=(e:KeyboardEvent)=>{if(e.isComposing||e.keyCode===229||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='Escape'&&session.current){e.preventDefault();e.stopImmediatePropagation();abort();return;}const handle=(e.target as HTMLElement).closest(`#${id} .handle-sort-grip`);if(!handle||!latest.current.enabled)return;const from=Number(handle.getAttribute('data-sort-index')),to=from+(e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0);if(to!==from){e.preventDefault();if(to>=0&&to<latest.current.keys.length)latest.current.commit(from,to);}};
  const scroll=(e:globalThis.TouchEvent)=>{if(session.current?.active)e.preventDefault();};
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',moving,{passive:false});document.addEventListener('pointerup',end);document.addEventListener('pointercancel',abort);document.addEventListener('keydown',key,true);document.addEventListener('touchmove',scroll,{passive:false});window.addEventListener('blur',abort);document.addEventListener('visibilitychange',abort);document.addEventListener('lostpointercapture',lost);
  return()=>{abort();document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointermove',moving);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',abort);document.removeEventListener('keydown',key,true);document.removeEventListener('touchmove',scroll);window.removeEventListener('blur',abort);document.removeEventListener('visibilitychange',abort);document.removeEventListener('lostpointercapture',lost);};
 },[id,owner,enabled,signature]);
 return {id,drag,scrollTop,onScroll:(top:number)=>{offset.current=top;},cancel,suppressClick:()=>!!session.current||Date.now()<blocked.current,
  bind:(index:number)=>isWebTool?{}:{onTouchStart:(e:TouchEvent)=>{e.stopPropagation();if(e.touches?.length!==1){cancel();return;}start(index,e.touches[0]);},onTouchMove:(e:TouchEvent)=>{if(e.touches?.length!==1){cancel();return;}if(session.current?.active){e.stopPropagation();e.preventDefault?.();}move(e.touches[0]);},onTouchEnd:(e:TouchEvent)=>{if(e.touches?.length){cancel();return;}if(session.current&&e.changedTouches?.[0])session.current.point=e.changedTouches[0];finish();},onTouchCancel:cancel},
 };
}
