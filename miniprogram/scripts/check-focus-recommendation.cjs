const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(name){const source=fs.readFileSync(path.join(__dirname,'../src/lib',name+'.ts'),'utf8');const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;const exports={};new Function('exports','require',output)(exports,name=>load(name.replace('./','')));return exports;}
const {normalizePomodoroState,initialPomodoroState,startTimer}=load('pomodoro-data');
const {recommendedBreakMode:recommend,advanceWithBreakChoice,startChosenBreak}=load('focus-completion');
for(const count of [0,1,2,3,4,5,7,8,12])assert.equal(recommend(count,4),count>0&&count%4===0?'longBreak':'shortBreak');
for(const count of [1,2,3,4,8])assert.equal(recommend(count,1),'longBreak');
const now=Date.parse('2026-11-04T00:00:00Z');
for(const count of [1,3,4,8]){
 const before=normalizePomodoroState({...initialPomodoroState,completedFocusCount:count-1});
 const running=startTimer(before,now,`focus-${count}`,before.selection);
 const completed=advanceWithBreakChoice(running,now+1500000),snapshot=JSON.stringify(completed);
 assert.equal(completed.completedFocusCount,count);assert.equal(completed.mode,'focus');assert.equal(completed.active,null);
 assert.equal(recommend(completed.completedFocusCount,completed.settings.longEvery),count%4===0?'longBreak':'shortBreak');
 assert.equal(recommend(normalizePomodoroState(JSON.parse(snapshot)).completedFocusCount,4),recommend(count,4));
 for(const mode of ['shortBreak','longBreak']){const chosen=startChosenBreak(completed,mode,now+1500001,`focus-${count}`);assert.equal(chosen.active.mode,mode);assert.equal(chosen.completedFocusCount,count);}
 assert.equal(JSON.stringify(completed),snapshot,'Recommendation and choices do not mutate the source');
 const legacy={...completed,completedFocusCount:undefined};assert.equal(normalizePomodoroState(legacy).completedFocusCount,1);
 assert.equal(recommend(legacy.completedFocusCount??legacy.sessions.filter(s=>s.mode==='focus'&&s.completed).length,4),'shortBreak');
}
const accountA=normalizePomodoroState({...initialPomodoroState,completedFocusCount:8}),accountB=normalizePomodoroState({...initialPomodoroState,completedFocusCount:3});
assert.equal(recommend(accountA.completedFocusCount,4),'longBreak');assert.equal(recommend(accountB.completedFocusCount,4),'shortBreak');
assert.equal(recommend(accountB.completedFocusCount,1),'longBreak');assert.equal(recommend(accountA.completedFocusCount,3),'shortBreak');
for(const longEvery of [undefined,0,NaN,1,12,99]){const normalized=normalizePomodoroState({...accountA,settings:{...accountA.settings,longEvery}});assert.equal(recommend(normalized.completedFocusCount,normalized.settings.longEvery),8%normalized.settings.longEvery===0?'longBreak':'shortBreak');}
console.log('PASS focus recommendation: completed counts, intervals, explicit actions, reload, legacy fallback, account isolation, no mutation');

const legacySessions=Array.from({length:4},(_,i)=>({...initialPomodoroState.selection,id:`legacy-${i}`,mode:'focus',durationSeconds:60,plannedSeconds:60,completed:true,startedAt:new Date(now-i*60000).toISOString(),endedAt:new Date(now-i*60000+60000).toISOString()}));
const old=normalizePomodoroState({...initialPomodoroState,completedFocusCount:undefined,sessions:legacySessions});assert.equal(old.completedFocusCount,4);assert.equal(recommend(old.completedFocusCount,4),'longBreak');
const retained=normalizePomodoroState({...old,completedFocusCount:1008});assert.equal(recommend(retained.completedFocusCount,4),'longBreak');assert.equal(retained.sessions.length,4);

const suggestions=load('focus-activities');
assert.equal(suggestions.focusActivities.length,15);
assert.deepEqual(suggestions.focusActivities.find(item=>item.title==='洗杯子'),{title:'洗杯子',iconId:'clean'});
assert.equal(suggestions.claimFocusSuggestions('owner-a','completion-1'),true);
assert.equal(suggestions.claimFocusSuggestions('owner-a','completion-1'),false);
assert.equal(suggestions.claimFocusSuggestions('owner-a','completion-2'),true);
assert.equal(suggestions.claimFocusSuggestions('owner-b','completion-1'),true);
assert.equal(suggestions.claimFocusSuggestions('owner-b',''),false);
console.log('PASS suggestion UI completion/owner isolation, no storage');

for(const random of [()=>0,()=>1,()=>NaN,()=>-1,()=>Infinity,()=>0.5]){
 let previous=[];
 for(let i=0;i<100;i++){
  const before=JSON.stringify(previous), next=suggestions.selectFocusActivities(previous,random);
  assert.equal(next.length,3);assert.equal(new Set(next.map(x=>x.title)).size,3);
  assert(next.every(x=>!previous.some(y=>y.title===x.title)));
  assert.equal(JSON.stringify(previous),before);previous=next;
 }
}
console.log('PASS 15-pool/3-card bounded sampling, extreme RNG, full previous-group exclusion, immutability');
