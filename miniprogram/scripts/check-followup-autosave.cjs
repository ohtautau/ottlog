const assert=require('node:assert/strict'),path=require('node:path'),esbuild=require('esbuild');
function load(name){const code=esbuild.buildSync({entryPoints:[path.join(__dirname,'../src/lib',name+'.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);return m.exports;}
const {SettledAutosave}=load('settled-autosave');
(async()=>{
 let writes=[],release,fail=false,errors=[];
 const queue=new SettledAutosave(async(value,owner)=>{writes.push({owner,value});if(release===null)await new Promise(r=>release=r);return !fail;},error=>errors.push(error));
 queue.reset('a',{minutes:25});queue.set('a',{minutes:25},false);await queue.flush();assert.equal(writes.length,0,'Opening or changing view does not write');
 queue.set('a',{minutes:30},true);await queue.flush();assert.equal(writes.length,0,'Moving wheel cannot publish');
 queue.set('a',{minutes:30},false);release=null;const inFlight=queue.flush();queue.set('a',{minutes:31},false);queue.set('a',{minutes:32},false);await queue.flush();release();await inFlight;
 assert.deepEqual(writes.map(w=>w.value.minutes),[30,32],'In-flight values merge into latest settled target');
 fail=true;queue.set('a',{minutes:33},false);await queue.flush();await queue.flush();assert.equal(writes.length,3,'Failure does not spin/rewrite');assert.ok(errors.at(-1));
 fail=false;await queue.flush(true);assert.equal(writes.length,4);assert.deepEqual(writes[2],writes[3],'Retry keeps exact target');assert.equal(errors.at(-1),'');
 release=null;queue.set('a',{minutes:34},false);const stale=queue.flush();queue.cancel();queue.reset('b',{minutes:25});queue.set('b',{minutes:26},true);release();await stale;assert.equal(writes.at(-1).owner,'a');
 queue.set('b',{minutes:26},false);await queue.flush();assert.equal(writes.at(-1).owner,'b');assert.equal(writes.at(-1).value.minutes,26,'Old completion cannot acknowledge new owner');
 const timer=load('pomodoro-data'),records=load('tool-records'),todo=load('todo-data'),auto=load('todo-autosave');
 const running=timer.startTimer(timer.initialPomodoroState,1000,'run',{title:'fixture',taskId:null});const adjusted={...running,settings:{...running.settings,focus:40}};
 assert.equal(timer.normalizePomodoroState(adjusted).active.deadline,running.active.deadline,'Rhythm update preserves active deadline');
 const original={...todo.createTodo('do'),id:'legacy',title:'旧任务',nextTasks:[{id:'keep-next',title:'历史内容'}]};
 const state={...records.initialTodoState,tasks:[original,{...original,id:'already-created',title:'已有真实任务',nextTasks:[]}]};const before=JSON.stringify(state);
 const complete=todo.completeTodo(state,'legacy');assert.equal(complete.tasks.length,2);assert.deepEqual(complete.tasks[0].nextTasks,original.nextTasks);assert.equal(complete.tasks[1],state.tasks[1]);assert.equal(JSON.stringify(state),before);
 const draft={...original,dueDate:'2099-01-31',recurrence:{unit:'month',interval:3,anchorDay:31}};
 let attempt;assert.throws(()=>{attempt=structuredClone(draft);throw new Error('storage');});
 const remote={...state,tasks:state.tasks.map(t=>t.id==='legacy'?{...t,description:'远端备注'}:t)};
 const saved=auto.autoSaveTodo(remote,original,attempt,'');assert.equal(saved.tasks[0].dueDate,'2099-01-31');assert.equal(saved.tasks[0].description,'远端备注');assert.deepEqual(saved.tasks[0].recurrence,draft.recurrence);assert.equal(saved.tasks[0].id,'legacy');
 assert.throws(()=>auto.autoSaveTodo({...state,tasks:[]},original,attempt,''),/不存在|删除/);
 console.log('PASS settled autosave: no opening/moving writes, in-flight coalescing, failure/exact retry, owner cancellation, deadline stability, retired chain preservation; schedule same-ID retry and remote/deletion guards.');
})().catch(error=>{console.error(error);process.exitCode=1;});
