const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
function load(name){const code=esbuild.buildSync({entryPoints:[path.join(__dirname,'../src/lib',name+'.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);return m.exports;}
const t=load('pomodoro-data'),f=load('focus-completion');
const now=Date.parse('2026-11-05T00:00:00Z'),reload=s=>t.normalizePomodoroState(JSON.parse(JSON.stringify(s)));
const base={...reload(t.initialPomodoroState),unknown:{keep:true},restActivities:[],settings:{...t.initialPomodoroState.settings,shortBreak:6},selection:{taskId:null,title:'fixture',extra:'keep'}};
const running=t.startTimer(base,now,'focus-a',base.selection),complete=f.advanceWithBreakChoice(running,running.active.deadline);
assert.equal(f.pendingFocusCompletion(complete).id,'focus-a');assert(!('restStartedId' in reload(complete).sessions[0]));
for(const mode of ['shortBreak','longBreak']){
 assert.equal(f.pendingFocusCompletion({...complete,mode}).id,'focus-a','Mode tabs alone do not acknowledge');
 for(const launch of [s=>f.startChosenBreak(s,mode,now+1600000,'focus-a'),s=>t.startTimer({...s,mode},now+1600000,'manual-rest',s.selection)]){
  const snapshot=JSON.stringify(complete),rest=launch(complete),deadline=rest.active.deadline;
  assert.equal(rest.sessions[0].restStartedId,rest.active.id);assert.equal(rest.active.originFocusId,'focus-a');
  assert.equal(rest.active.totalSeconds,base.settings[mode]*60);assert.equal(rest.completedFocusCount,1);
  assert.equal(t.startTimer(rest,now,'retry',rest.selection),rest);assert.equal(f.startChosenBreak(rest,mode,now,'focus-a'),rest);
  for(const elapsed of [0,1,1000,rest.active.totalSeconds*1000]){
   let ended=elapsed<rest.active.totalSeconds*1000?t.finishTimer(t.pauseTimer(reload(rest),now+1600000+elapsed),now+1600000+elapsed,true):f.advanceWithBreakChoice(reload(rest),deadline+86400000);
   ended=reload(ended);assert.equal(ended.mode,'focus');assert.equal(ended.active,null);assert.equal(f.pendingFocusCompletion(ended),null);
   assert.equal(f.startChosenBreak(ended,mode,now+1700000,'focus-a'),ended,'Persisted same-ID choice cannot restart');
   assert.equal(ended.completedFocusCount,1);assert.deepEqual(ended.settings,base.settings);assert.deepEqual(ended.unknown,base.unknown);assert.deepEqual(ended.restActivities,[]);
   if(elapsed<1000)assert.equal(ended.sessions.length,1,'No fabricated zero-second history');
   else assert.equal(ended.sessions[0].durationSeconds,Math.min(Math.ceil(elapsed/1000),rest.active.totalSeconds));
   const next=t.startTimer(ended,deadline+86400001,'focus-b',ended.selection);assert.equal(next.active.totalSeconds,1500);
   const nextDone=f.advanceWithBreakChoice(next,next.active.deadline);assert.equal(f.pendingFocusCompletion(nextDone).id,'focus-b');assert.equal(nextDone.completedFocusCount,2);
  }
  assert.equal(reload(rest).active.deadline,deadline,'Leaving and reopening does not rebase deadline');assert.equal(JSON.stringify(complete),snapshot);
 }
}
for(const mode of ['shortBreak','longBreak']){
 const auto=t.advanceTimer({...running,completedFocusCount:mode==='longBreak'?3:0},running.active.deadline);
 assert.equal(auto.active.mode,mode);assert.equal(auto.sessions[0].restStartedId,auto.active.id);
 assert.equal(f.pendingFocusCompletion(reload(t.finishTimer(auto,auto.active.startedAt?Date.parse(auto.active.startedAt):now,true))),null);
 assert.equal(f.pendingFocusCompletion(t.advanceTimer({...running,completedFocusCount:mode==='longBreak'?3:0},running.active.deadline+86400000)),null);
}
// Legacy evidence can be older in sorted history (clock skew/import), and is read-only.
for(const evidence of [{originFocusId:'focus-a',id:'old-rest'},{id:t.automaticBreakId('focus-a')}]){
 const legacy={...complete,sessions:[complete.sessions[0],{...complete.sessions[0],...evidence,mode:'shortBreak',completed:false}]},before=JSON.stringify(legacy);
 assert.equal(f.pendingFocusCompletion(legacy),null);assert.equal(JSON.stringify(legacy),before);assert.equal(f.pendingFocusCompletion(reload(legacy)),null);
 const normalized=reload(legacy);assert(!('restStartedId' in normalized.sessions.find(s=>s.id==='focus-a')),'Legacy reads do not materialize ack');
}
const ownerA=t.finishTimer(f.startChosenBreak(complete,'shortBreak',now+1600000,'focus-a'),now+1600000,true),ownerB=reload(complete);
assert.equal(f.pendingFocusCompletion(ownerA),null);assert.equal(f.pendingFocusCompletion(ownerB).id,'focus-a','Ack is state-local, never global across owners');
const page=fs.readFileSync(path.join(__dirname,'../src/pages/pomodoro/index.tsx'),'utf8');assert(!page.includes("className='focus-completion-label'"));assert(page.includes("className='focus-completion-row'"));
console.log('PASS rest return: shared/manual/chosen/native start, zero/early/full/hidden expiry, persistence, legacy evidence, next focus, immutable unknown fields/count/deadline, owner-local evidence');
