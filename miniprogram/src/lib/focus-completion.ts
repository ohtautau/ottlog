import { advanceTimer, automaticBreakId, finishTimer, startTimer, type PomodoroState } from './pomodoro-data';

/** Desktop focus expiry records one session and waits for an explicit rest choice. */
export function advanceWithBreakChoice(state:PomodoroState,now:number):PomodoroState {
  return state.active?.mode==='focus' ? finishTimer(state,now) : advanceTimer(state,now);
}
export function pendingFocusCompletion(state:PomodoroState) {
  const latest=state.sessions[0];
  return !state.active && state.mode!=='focus' && latest?.mode==='focus' && latest.completed ? latest : null;
}
export function startChosenBreak(state:PomodoroState,mode:'shortBreak'|'longBreak',now:number,focusId:string):PomodoroState {
  const completed=pendingFocusCompletion(state);
  if(!completed || completed.id!==focusId)return state;
  const started=startTimer({...state,mode},now,automaticBreakId(focusId),state.selection);
  return started.active ? {...started,active:{...started.active,rootRunId:completed.rootRunId || focusId,originFocusId:focusId}} : state;
}
