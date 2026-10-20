const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const filename = path.join(__dirname, '../src/lib/todo-schedule.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleValue = { exports: {} };
new Function('exports', 'module', 'require', output)(moduleValue.exports, moduleValue, () => {
  throw new Error('Schedule helpers must have no runtime dependencies');
});
const {
  calendarMonthDays, shiftCalendarMonth, recurrenceLabel, copyTodoSchedule,
  clearTodoSchedule, localReminderParts, makeLocalReminder, scheduleSummary, clockTime,
  reminderDay, reminderDayLabel, relativeReminder, reminderSelection, reminderDays, reminderTimes,
} = moduleValue.exports;

const october = calendarMonthDays('2026-10', '2026-11-01');
assert.equal(october.length, 42);
assert.deepEqual(october[0], { date: '2026-09-27', day: 27, inMonth: false });
assert.deepEqual(october[4], { date: '2026-10-01', day: 1, inMonth: true });
assert.deepEqual(october[41], { date: '2026-11-07', day: 7, inMonth: false });
assert.equal(october.filter(day => day.inMonth).length, 31);
assert.equal(new Set(october.map(day => day.date)).size, 42);
assert.equal(calendarMonthDays('2026-02')[0].date, '2026-02-01', 'Sunday starts in the first column without an extra week');
assert.equal(calendarMonthDays('2024-02').filter(day => day.inMonth).length, 29);
assert.equal(calendarMonthDays('2025-02').filter(day => day.inMonth).length, 28);
assert.equal(calendarMonthDays('2024-02').find(day => day.date === '2024-02-29').day, 29);
assert.equal(shiftCalendarMonth('2026-12', 1), '2027-01');
assert.equal(shiftCalendarMonth('2026-01', -1), '2025-12');
assert.equal(shiftCalendarMonth('2024-02', 24), '2026-02');
assert.throws(() => calendarMonthDays('2026-13'), /有效的月份/);
assert.throws(() => shiftCalendarMonth('2026-10', 0.5), /整数/);

assert.equal(recurrenceLabel(), '不重复');
for (const [unit, label] of Object.entries({ day: '每天', week: '每周', month: '每月', year: '每年', weekday: '工作日' })) {
  assert.equal(recurrenceLabel({ unit, interval: 1 }), label);
}
for (const [unit, label] of Object.entries({ day: '每 3 天', week: '每 3 周', month: '每 3 月', year: '每 3 年', weekday: '每 3 个工作日' })) {
  assert.equal(recurrenceLabel({ unit, interval: 3 }), label);
}

const original = Object.freeze({ dueDate: '2026-10-05', dueTime: '09:30', reminderAt: '2026-10-05T00:30:00.000Z', recurrence: Object.freeze({ unit: 'month', interval: 1, anchorDay: 31 }) });
const copy = copyTodoSchedule(original);
assert.deepEqual(copy, original);
assert.notEqual(copy, original);
assert.notEqual(copy.recurrence, original.recurrence);
copy.recurrence.interval = 3;
assert.equal(original.recurrence.interval, 1, 'Editing a pending schedule cannot mutate the task before confirmation');
assert.equal(copy.recurrence.anchorDay, 31, 'Monthly anchors survive a schedule edit');
assert.deepEqual(clearTodoSchedule(), { dueDate: '', dueTime: undefined, reminderAt: undefined, recurrence: undefined });
assert.equal(scheduleSummary(clearTodoSchedule(), '2026-10-05'), '日期');
assert.equal(scheduleSummary(original, '2026-10-05'), '今天 · 09:30 · 提醒 · 每月');
assert.equal(scheduleSummary({ dueDate: '2026-10-06' }, '2026-10-05'), '明天');
assert.equal(scheduleSummary({ dueDate: '2026-10-04' }, '2026-10-05'), '昨天');
assert.equal(scheduleSummary({ dueDate: '2026-10-08' }, '2026-10-05'), '10月8日');
assert.equal(scheduleSummary({ dueDate: '2027-01-01' }, '2026-12-31'), '明天', 'Relative dates work across years');
assert.equal(scheduleSummary({ dueDate: '2027-02-01' }, '2026-12-31'), '2027年2月1日');
assert.equal(scheduleSummary({ dueDate: '', reminderAt: original.reminderAt }, '2026-10-05'), '提醒');

// Explicit timezone changes cover ISO/local roundtrips even on a developer machine in UTC.
const oldTimezone = process.env.TZ;
try {
  for (const timezone of ['Asia/Singapore', 'America/New_York', 'UTC']) {
    process.env.TZ = timezone;
    const iso = makeLocalReminder('2026-10-05', '09:30');
    const expected = new Date(2026, 9, 5, 9, 30).toISOString();
    assert.equal(iso, expected, `${timezone}: reminders use local wall time`);
    assert.deepEqual(localReminderParts(iso), { date: '2026-10-05', time: '09:30' });
  }
  process.env.TZ = 'Asia/Singapore';
  assert.equal(makeLocalReminder('2026-10-05', '00:05'), '2026-10-04T16:05:00.000Z');
  assert.deepEqual(localReminderParts('2026-10-04T16:05:00.000Z'), { date: '2026-10-05', time: '00:05' });
  process.env.TZ = 'America/New_York';
  assert.throws(() => makeLocalReminder('2026-03-08', '02:30'), /有效的提醒时间/, 'DST gaps must not silently become a different time');
} finally {
  if (oldTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = oldTimezone;
}
for (const [date, time] of [['2026-02-29', '09:30'], ['2026-02-30', '09:30'], ['2026-04-31', '09:30'], ['2026-13-01', '09:30'], ['', '09:30']]) {
  assert.throws(() => makeLocalReminder(date, time), /有效的提醒日期/);
}
for (const time of ['24:00', '09:60', '9:30', '09:30:00', '']) assert.throws(() => makeLocalReminder('2026-10-05', time), /有效的提醒时间/);
assert.deepEqual(localReminderParts('invalid'), { date: '', time: '' });
assert.deepEqual(localReminderParts(undefined), { date: '', time: '' });
assert.doesNotThrow(() => makeLocalReminder('2024-02-29', '23:59'));
for (const [hour, minute, result] of [['0', '0', '00:00'], ['23', '59', '23:59'], ['1', '5', '01:05'], ['09', '00', '09:00']]) assert.equal(clockTime(hour, minute), result);
for (const [hour, minute] of [['', '00'], ['09', ''], ['', ''], ['24', '00'], ['23', '60'], ['-1', '00'], ['09', '-1'], ['1.5', '00'], ['09', '1.5'], ['abc', '00'], ['1e2', '00'], ['100', '00'], ['09', '100'], [' 1', '00'], ['000', '00']]) assert.throws(() => clockTime(hour, minute), /0–23.*0–59/, 'Invalid clock fields cannot be coerced into another valid time');
assert.deepEqual(reminderTimes.map(choice => choice.minutes), [0, 10, 30, 60, 120]);
assert.deepEqual(reminderDays.map(choice => choice.label), ['当天', '前一天', '前两天', '前三天', '前一周', '前一月']);
for (const [base, days, result] of [['2026-03-31', -1, '2026-02-28'], ['2024-03-31', -1, '2024-02-29'], ['2026-01-31', -1, '2025-12-31'], ['2026-01-01', 7, '2025-12-25'], ['2026-03-01', 2, '2026-02-27']]) assert.equal(reminderDay(base, days), result);
assert.throws(() => reminderDay('1000-01-01', 1), /有效/);
assert.throws(() => reminderDay('2026-02-30', 0), /有效/);
assert.equal(reminderDayLabel('2026-03-31', '2026-02-28'), '前一月');
assert.equal(reminderDayLabel('2026-03-31', '2026-02-27'), '2026-02-27');
const reminderBeforeMidnight = relativeReminder('2026-03-01', '00:05', 10);
assert.equal(reminderBeforeMidnight.date, '2026-02-28'); assert.equal(reminderBeforeMidnight.time, '23:55');
assert.equal(reminderBeforeMidnight.at, makeLocalReminder('2026-02-28', '23:55'));
for (const day of reminderDays) for (const time of reminderTimes) {
  const anchor = reminderDay('2026-03-31', day.days), actual = relativeReminder(anchor, '10:00', time.minutes);
  const saved = makeLocalReminder(actual.date, actual.time);
  assert.deepEqual(reminderSelection(saved, '2026-03-31', '10:00'), { anchor, preset: time.id });
}
assert.deepEqual(reminderSelection(makeLocalReminder('2026-02-28', '23:55'), '2026-03-01', '00:05'), { anchor: '2026-03-01', preset: 'ten' });
assert.deepEqual(reminderSelection(makeLocalReminder('2026-03-31', '08:17'), '2026-03-31', '10:00'), { anchor: '2026-03-31', preset: 'custom' });
assert.deepEqual(reminderSelection(undefined, '2026-03-31', '10:00'), { anchor: '2026-03-31', preset: 'none' });
const reminderTimezone = process.env.TZ;
try {
  process.env.TZ = 'America/New_York';
  const fold = relativeReminder('2028-11-05', '03:30', 120);
  assert.equal(fold.at, '2028-11-05T06:30:00.000Z'); assert.equal(fold.time, '01:30');
  assert.deepEqual(reminderSelection(fold.at, '2028-11-05', '03:30'), { anchor: '2028-11-05', preset: 'two' });
  assert.equal(reminderSelection('2028-11-05T05:30:00.000Z', '2028-11-05', '03:30').preset, 'custom', 'A different repeated-hour instant is not the same quick reminder');
  assert.throws(() => relativeReminder('2028-03-12', '02:30', 10), /有效/);
  assert.equal(reminderDay('2028-03-13', 1), '2028-03-12', 'One day uses the local calendar across DST');
} finally { if (reminderTimezone === undefined) delete process.env.TZ; else process.env.TZ = reminderTimezone; }
console.log('Todo schedule helpers passed: six-week calendar, recurrence, drafts, clock validation, local reminders, six relative dates, month-end clamps, midnight offsets and read-only reminder display recovery.');
