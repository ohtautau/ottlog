import { useEffect,useLayoutEffect,useRef } from 'react';
import { hasVolatilePersonalTool,usePersonalToolState } from '../../miniprogram/src/lib/use-personal-tool-state';
import { initialPomodoroState,isPomodoroState,normalizePomodoroState } from '../../miniprogram/src/lib/pomodoro-data';
import { advanceWithBreakChoice,pendingFocusCompletion } from '../../miniprogram/src/lib/focus-completion';
import { notifyFocusComplete } from './desktop-notifications';

/** One shared deadline listener survives navigation between tool pages and tab hiding.
 * Timer transitions and persistence remain owned by the original model/owner queue. */
export default function FocusCompletionMonitor() {
  const source=usePersonalToolState('pomodoro',initialPomodoroState);
  const latest=useRef(source),mounted=useRef(true);
  useLayoutEffect(()=>{latest.current=source;},[source]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    if(!source.ready || !source.owner || !isPomodoroState(source.value))return;
    const state=normalizePomodoroState(source.value),active=state.active;
    if(!active?.running || active.deadline===null) {
      // Recover a completion committed while the previous tool root unmounted.
      const completed=pendingFocusCompletion(state),age=completed ? Date.now()-Date.parse(completed.endedAt) : Infinity;
      if(completed && age>=0 && age<60000 && !hasVolatilePersonalTool('pomodoro',source.owner))notifyFocusComplete(source.owner,completed.id,completed.title);
      return;
    }
    const owner=source.owner;let disposed=false,working=false,timer;
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(check,Math.max(0,active.deadline-Date.now()));};
    async function check() {
      if(disposed || working || latest.current.owner!==owner || !latest.current.ready)return;
      if(Date.now()<active.deadline){schedule();return;}
      working=true;let completed=null;
      try {
        await latest.current.setValue(previous=>{
          if(latest.current.owner!==owner || !isPomodoroState(previous))throw new Error('账号或计时已变化');
          const current=normalizePomodoroState(previous);
          if(current.active?.id!==active.id || current.active.deadline!==active.deadline || !current.active.running)return previous;
          const next=advanceWithBreakChoice(current,Date.now());
          completed=next.sessions.find(session=>session.id===active.id && session.mode==='focus' && session.completed) || null;
          return next;
        });
        if(mounted.current && latest.current.owner===owner && completed && !hasVolatilePersonalTool('pomodoro',owner))notifyFocusComplete(owner,completed.id,completed.title);
      } catch { if(!disposed && latest.current.owner===owner)timer=setTimeout(check,2000); }
      finally { working=false; }
    }
    schedule();window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
    return()=>{disposed=true;clearTimeout(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
  },[source.ready,source.owner,source.value]);
  return null;
}
