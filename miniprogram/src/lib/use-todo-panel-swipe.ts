import { useEffect, useRef } from 'react';
import type { ITouchEvent, ViewProps } from '@tarojs/components';
import type { TodoPanelId } from './tool-records';

/** Horizontal swipes change a display source; vertical scrolling and active drag keep priority. */
export default function useTodoPanelSwipe(owner: string, disabled: boolean, onCycle: (slot: TodoPanelId, direction: number) => void) {
  const current = useRef({ owner, disabled, onCycle }); current.current = { owner, disabled, onCycle };
  const gesture = useRef<{owner:string;slot:TodoPanelId;x:number;y:number;dx:number;dy:number}|null>(null);
  const suppressed = useRef<{slot:TodoPanelId;until:number}|null>(null);
  useEffect(() => { gesture.current=null;suppressed.current=null; }, [owner]);
  useEffect(() => {
    if(typeof document==='undefined')return;
    const stop=(event:MouseEvent)=>{const value=suppressed.current;if(value&&Date.now()<value.until&&(event.target as HTMLElement)?.closest?.(`#todo-zone-${value.slot}`)){event.preventDefault();event.stopImmediatePropagation();}};
    document.addEventListener('click',stop,true);return()=>document.removeEventListener('click',stop,true);
  },[]);
  return (slot:TodoPanelId) => ({
    onTouchStart:(original:Parameters<NonNullable<ViewProps['onTouchStart']>>[0])=>{
      const event=original as unknown as ITouchEvent;
      suppressed.current=null;
      if(current.current.disabled||event.touches.length!==1)return;
      const point=event.touches[0];gesture.current={owner:current.current.owner,slot,x:point.clientX,y:point.clientY,dx:0,dy:0};
    },
    onTouchMove:(original:Parameters<NonNullable<ViewProps['onTouchStart']>>[0])=>{
      const event=original as unknown as ITouchEvent;
      const value=gesture.current,point=event.touches[0];
      if(!value||!point||current.current.disabled||value.owner!==current.current.owner){gesture.current=null;return;}
      value.dx=point.clientX-value.x;value.dy=point.clientY-value.y;
      if(Math.abs(value.dy)>24&&Math.abs(value.dy)>=Math.abs(value.dx))gesture.current=null;
    },
    onTouchEnd:()=>{const value=gesture.current;gesture.current=null;if(!value||current.current.disabled||value.owner!==current.current.owner||Math.abs(value.dx)<48||Math.abs(value.dx)<Math.abs(value.dy)*1.6)return;suppressed.current={slot,until:Date.now()+400};current.current.onCycle(slot,value.dx<0?1:-1);},
    onTouchCancel:()=>{gesture.current=null;},
  });
}
