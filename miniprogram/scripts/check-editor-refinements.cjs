const assert=require('node:assert/strict');
const path=require('node:path');
const esbuild=require('esbuild');
function load(name){const code=esbuild.buildSync({entryPoints:[path.join(__dirname,'../src/lib',name+'.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;const module={exports:{}};new Function('module','exports',code)(module,module.exports);return module.exports;}
const {scheduleCalendarMarks:marks}=load('todo-schedule-preview');
let schedule={dueDate:'2028-01-31',dueTime:'10:15',recurrence:{unit:'month',interval:1}};
const encoded=JSON.stringify(schedule);
assert.equal(marks(schedule,'2028-02')['2028-02-29'].repeat,true);
assert.equal(marks(schedule,'2028-03')['2028-03-31'].repeat,true);
assert.equal(marks(schedule,'2028-03')['2028-03-29'],undefined);
assert.equal(JSON.stringify(schedule),encoded);
assert.equal(marks({...schedule,dueDate:'2028-02-29',recurrence:{unit:'year',interval:1}},'2029-02')['2029-02-28'].repeat,true);
assert.equal(marks({...schedule,dueDate:'2026-11-06',recurrence:{unit:'weekday',interval:2}},'2026-11')['2026-11-10'].repeat,true);
assert.equal(marks({...schedule,dueDate:'2026-11-06',recurrence:{unit:'weekday',interval:2}},'2026-11')['2026-11-09'],undefined);
const far=marks({...schedule,recurrence:{unit:'day',interval:1}},'2199-12');assert.equal(Object.keys(far).length,42);
for(const recurrence of [{unit:'day',interval:0},{unit:'month',interval:366},{unit:'day',interval:NaN}])assert.equal(Object.values(marks({...schedule,recurrence},'2028-02')).some(item=>item.repeat),false);
const reminder=new Date(2028,0,31,8,30).toISOString();
assert.deepEqual(marks({...schedule,reminderAt:reminder},'2028-01')['2028-01-31'],{due:true,dueTime:'10:15',reminder:true,reminderTime:'08:30'});
assert.deepEqual(marks({dueDate:''},'2028-01'),{});
const sub=load('todo-subtasks');
for(const text of ['', ' \n\t','\u200b\ufeff','\u2060\u200d','\u0301'])assert.equal(sub.hasSubtaskText(text),false);
assert.equal(sub.hasSubtaskText(' 有效子任务 '),true);
assert.equal(sub.visibleSubtasks([{title:'第一项'},{title:'\u200b'},{title:'第二项'}]).length,2);
const records=load('tool-records'),panel=load('todo-panel-source'),undo=load('todo-undo');
let state=records.initialTodoState,source=panel.getTodoPanelSource(state,'do');
for(let index=0;index<7;index++){const next=panel.cycleTodoPanelSource(state,'do',1);assert.equal(undo.isTodoDisplayOnlyChange(state,next),true);state=next;}
assert.deepEqual(panel.getTodoPanelSource(state,'do'),source);
assert.equal(undo.isTodoDisplayOnlyChange(state,{...state,tasks:[{id:'real-edit'}]}),false);
const timer=load('pomodoro-data'),focus=load('focus-completion');
const started=timer.startTimer({...timer.initialPomodoroState,settings:{focus:1,shortBreak:2,longBreak:7,longEvery:4,transitionMode:'autoBreak'}},100000,'focus-1',{title:'检查完成通知',taskId:null},1);
const complete=focus.advanceWithBreakChoice(started,160000);
assert.equal(complete.active,null);assert.equal(complete.sessions.length,1);assert.equal(complete.completedFocusCount,1);
assert.equal(focus.pendingFocusCompletion(complete).id,'focus-1');
assert.equal(focus.advanceWithBreakChoice(complete,160001),complete);
for(const mode of ['shortBreak','longBreak']){const rest=focus.startChosenBreak(complete,mode,170000,'focus-1');assert.equal(rest.active.mode,mode);assert.equal(rest.active.totalSeconds,mode==='shortBreak'?120:420);assert.equal(rest.active.originFocusId,'focus-1');assert.equal(focus.startChosenBreak(rest,mode,170001,'focus-1'),rest);assert.equal(rest.sessions.length,1);}
assert.equal(focus.startChosenBreak(complete,'shortBreak',170000,'wrong-id'),complete);
console.log('PASS calendar projections (monthly/leap/weekday/far future), invisible subtasks, cyclic display and silent changes, durable explicit break choices.');

assert.equal(complete.mode,'focus');
assert.equal(focus.advanceWithBreakChoice(started,100001),started);
assert.equal(focus.advanceWithBreakChoice(timer.pauseTimer(started,110000),200000).active.running,false);
const reloaded=timer.normalizePomodoroState(JSON.parse(JSON.stringify(complete)));
assert.equal(focus.pendingFocusCompletion(reloaded).id,'focus-1');
for(const mode of ['shortBreak','longBreak']) {
 const legacy={...reloaded,mode},before=JSON.stringify(legacy);
 assert.equal(focus.pendingFocusCompletion(legacy).id,'focus-1');
 assert.equal(focus.advanceWithBreakChoice(legacy,200000),legacy);
 assert.equal(JSON.stringify(legacy),before);
 const chosen=focus.startChosenBreak({...legacy,mode:'focus'},mode,200000,'focus-1');
 const paused=timer.pauseTimer(chosen,201000),resumed=timer.resumeTimer(paused,202000);
 assert.equal(timer.remainingSeconds(resumed.active,203000),chosen.active.totalSeconds-2);
 const ended=focus.advanceWithBreakChoice(resumed,1000000);
 assert.equal(ended.mode,'focus');assert.equal(focus.pendingFocusCompletion(ended),null);
 assert.equal(ended.completedFocusCount,1);assert.equal(ended.sessions.length,2);
}
assert.equal(timer.advanceTimer(started,160000).active.mode,'shortBreak');
console.log('PASS focus completion/reload, legacy read-only compatibility, explicit rest durations/pause/resume, no duplicate rounds, native automatic rest.');
