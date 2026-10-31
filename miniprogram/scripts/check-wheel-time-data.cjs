const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const result = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib', `${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'module', 'require', output)(result.exports, result, dependency => load(dependency.replace('./', '')));
  cache.set(name, result.exports); return result.exports;
}
const { monthDays, wheelDate, reminderLeadLabel, reminderCalendarLabel } = load('wheel-time-data');
assert.equal(monthDays(1900, 2), 28); assert.equal(monthDays(2000, 2), 29);
assert.equal(monthDays(2028, 2), 29); assert.equal(monthDays(2029, 2), 28);
assert.equal(monthDays(2028, 4), 30);
assert.equal(wheelDate(2028, 2, 31), '2028-02-29');
assert.equal(wheelDate(2029, 2, 29), '2029-02-28');
assert.equal(wheelDate(2028, 4, 31), '2028-04-30');
assert.equal(wheelDate(999, 1, 1), '1000-01-01');
assert.equal(wheelDate(10000, 12, 31), '9999-12-31');
const at = (date, time) => new Date(`${date}T${time}:00`).toISOString();
for (const [task, reminder, label] of [
  ['2028-03-31', '2028-03-30', '前一天'], ['2028-03-31', '2028-03-29', '前两天'],
  ['2028-03-31', '2028-03-24', '前一周'], ['2028-03-31', '2028-02-29', '前一月'],
  ['2029-03-31', '2029-02-28', '前一月'], ['2028-01-01', '2027-12-01', '前一月'],
  ['2028-03-31', '2028-03-31', '任务当天'], ['2028-03-31', '2028-04-01', '后一天'],
]) assert.equal(reminderCalendarLabel(task, at(reminder, '09:00')), label);
assert.equal(reminderCalendarLabel('', at('2028-03-31', '09:00')), '');
assert.equal(reminderLeadLabel('2028-03-31', '10:00', at('2028-03-30', '09:30')), '提前1天30分钟提醒');
assert.equal(reminderLeadLabel('2028-03-31', '10:00', at('2028-03-31', '10:00')), '准时提醒');
assert.equal(reminderLeadLabel('2028-03-31', '10:00', at('2028-03-31', '11:01')), '晚于任务时间1小时1分钟提醒');
assert.equal(reminderLeadLabel('2028-03-31', '10:00', new Date(new Date(at('2028-03-31', '10:00')).getTime() - 30000).toISOString()), '提前30秒提醒');
assert.match(reminderLeadLabel('', undefined, at('2028-03-31', '11:01')), /请先设置任务日期和时间/);
assert.match(reminderLeadLabel('bad', '10:00', at('2028-03-31', '11:01')), /有效/);
const originalTZ = process.env.TZ;
try {
  process.env.TZ = 'America/New_York';
  assert.equal(reminderLeadLabel('2028-03-12', '03:30', at('2028-03-12', '01:30')), '提前1小时提醒');
  assert.equal(reminderLeadLabel('2028-11-05', '02:30', '2028-11-05T06:30:00.000Z'), '提前1小时提醒');
} finally { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; }
console.log('PASS wheel calendar boundaries and actual elapsed reminder lead, including DST');
