const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const file = path.resolve(__dirname, '../src/lib', `${name}.ts`);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('exports', 'module', 'require', output)(module.exports, module, name => load(name.replace(/^\.\//, '')));
  cache.set(name, module.exports);
  return module.exports;
}
const { nextTodoReminder, todoReminderValidation } = load('todo-reminder-time');
const { completeTodo, toggleTodo } = load('todo-data');
const { initialTodoState } = load('tool-records');
process.env.TZ = 'Asia/Shanghai';
const iso = (day, time) => new Date(`${day}T${time}:00`).toISOString();
const now = new Date('2026-11-04T12:00:00+08:00');
for (const [date, unit, next] of [['2026-01-30','day','2026-01-31'],['2026-01-30','week','2026-02-06'],['2026-01-31','month','2026-02-28'],['2024-02-29','year','2025-02-28'],['2026-01-30','weekday','2026-02-02']]) {
 for (const minutes of [-30,-1440,0,45]) {
  const reminderAt = new Date(new Date(`${date}T00:10:00`).getTime()+minutes*60000).toISOString();
  const task = {id:'source',title:'repeat',dueDate:date,dueTime:'00:10',reminderAt,recurrence:{unit,interval:1},createdAt:now.toISOString(),updatedAt:now.toISOString(),completedAt:null};
  const original = {...initialTodoState,tasks:[task]}, saved = completeTodo(original,'source',now), successor=saved.tasks[0];
  assert.equal(successor.dueDate,next);
  assert.equal(Date.parse(successor.reminderAt)-Date.parse(iso(next,'00:10')),minutes*60000);
  assert.equal(saved.tasks[1].reminderAt,reminderAt);
  assert.equal(completeTodo(saved,'source',now),saved);
  // Undo restores the original snapshot; completing again derives the same reminder.
  assert.equal(completeTodo(original,'source',now).tasks[0].reminderAt,successor.reminderAt);
  if(unit==='month')assert.equal(completeTodo(saved,successor.id,now).tasks[0].dueDate,'2026-03-31');
  if(unit==='year'){let s=saved;for(let y=2026;y<=2028;y++)s=completeTodo(s,s.tasks[0].id,now);assert.equal(s.tasks[0].dueDate,'2028-02-29');}
 }
}
const schedule={dueDate:'2026-01-31',reminderAt:iso('2026-01-30','17:31'),recurrence:{unit:'month',interval:1}};
assert.equal(nextTodoReminder(schedule,'2026-02-28'),iso('2026-02-27','17:31'));
for(const patch of [{dueDate:''},{dueDate:'2026-02-30'},{dueTime:'25:00'},{reminderAt:'invalid'},{reminderAt:undefined}])assert.equal(nextTodoReminder({...schedule,...patch},'2026-02-28'),undefined);
assert.equal(todoReminderValidation(schedule,{},now.getTime()),undefined);
assert.match(todoReminderValidation({...schedule,dueDate:''},{},now.getTime()),/任务日期/);
assert.match(todoReminderValidation({...schedule,recurrence:undefined},{},now.getTime()),/未来/);
assert.equal(todoReminderValidation({...schedule,recurrence:undefined},schedule,now.getTime()),undefined);
for(const reminderAt of ['invalid',schedule.reminderAt,undefined]){
 const task={id:'missing',title:'old',dueDate:'',reminderAt,recurrence:{unit:'day',interval:1},completedAt:null};
 const result=completeTodo({...initialTodoState,tasks:[task]},task.id,now);
 assert.equal(result.tasks[0].reminderAt,undefined);assert.equal(result.tasks[1].reminderAt,reminderAt);assert.ok(result.tasks[1].completedAt);
}
console.log('PASS reminder interval, recurrence boundaries and validation');
