import { advanceTimer, automaticBreakId, finishTimer, startTimer, type PomodoroState } from './pomodoro-data';

/** Desktop focus expiry records one session and waits for an explicit rest choice. */
export function advanceWithBreakChoice(state:PomodoroState,now:number):PomodoroState {
  const next=state.active?.mode==='focus' ? finishTimer(state,now) : advanceTimer(state,now);
  return next!==state && state.active?.mode==='focus' ? {...next,mode:'focus'} : next;
}
/** Session evidence also accepts legacy states parked on a rest tab; reads never migrate them.
 * Hosts display this prompt only on the focus tab. */
export function pendingFocusCompletion(state:PomodoroState) {
  const latest=state.sessions[0];
  return !state.active && latest?.mode==='focus' && latest.completed ? latest : null;
}
export function startChosenBreak(state:PomodoroState,mode:'shortBreak'|'longBreak',now:number,focusId:string):PomodoroState {
  const completed=pendingFocusCompletion(state);
  if(!completed || completed.id!==focusId)return state;
  const started=startTimer({...state,mode},now,automaticBreakId(focusId),state.selection);
  return started.active ? {...started,active:{...started.active,rootRunId:completed.rootRunId || focusId,originFocusId:focusId}} : state;
}

/** Read-only recommendation from completed rounds, never the upcoming UI round.
 * Callers use the existing normalized settings/count (or the legacy session fallback). */
export function recommendedBreakMode(completedRounds:number,longEvery:number):'shortBreak'|'longBreak' {
  return completedRounds>0 && completedRounds%longEvery===0 ? 'longBreak' : 'shortBreak';
}
