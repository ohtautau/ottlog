const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loaded = new Map();
function load(file) {
  if (loaded.has(file)) return loaded.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; loaded.set(file, exports);
  new Function('exports', 'require', source)(exports, name => load(path.resolve(path.dirname(file), name + '.ts')));
  return exports;
}
const model = load(path.join(__dirname, '../src/lib/reminder-data.ts'));
const { habitMonthCalendar, shiftHabitMonth } = load(path.join(__dirname, '../src/lib/habit-calendar.ts'));
const { habitCompletionStats } = load(path.join(__dirname, '../src/lib/habit-reflections.ts'));
const { habitCalendarDayEditable, habitCalendarDayCompleted, setHabitCalendarDay } = load(path.join(__dirname, '../src/lib/habit-calendar-edit.ts'));
const clock = day => new Date(`${day}T12:00:00`).getTime();
const blank = { version: 1, items: model.initialReminders.items.slice(0, 1), done: {} };
const make = days => ({ ...blank, done: Object.fromEntries(days.map(day => [day, ['exercise']])) });
const progress = (days, today) => habitCompletionStats(make(days), 'exercise', clock(today));

assert.equal(shiftHabitMonth('2026-12', 1), '2027-01');
assert.equal(shiftHabitMonth('2024-01', -1), '2023-12');
assert.equal(shiftHabitMonth('2024-12', 14), '2026-02');
assert.throws(() => shiftHabitMonth('2024-13', 1), /月份/);
assert.throws(() => shiftHabitMonth('2024-01', 0.5), /月份/);
assert.throws(() => habitMonthCalendar(blank, 'exercise', '2026-02-01'), /日期/);

const september = habitMonthCalendar(make(['2026-09-01', '2026-09-07', '2026-09-15', '2026-09-29']), 'exercise', '2026-09', clock('2026-09-15'));
assert.equal(september.days.length, 42);
assert.equal(september.days[0].day, '2026-08-30', 'The six-week calendar begins on Sunday');
assert.equal(september.days[41].day, '2026-10-10');
assert.equal(september.days.filter(day => day.inMonth).length, 30);
assert.equal(september.days.filter(day => day.today).length, 1);
assert.equal(september.days.find(day => day.today).day, '2026-09-15');
assert.equal(september.days.find(day => day.day === '2026-09-29').completed, false, 'Imported future check-ins do not inflate current completion');
assert.equal(september.days.find(day => day.day === '2026-09-16').future, true);
assert.equal(september.completed, 3);
assert.equal(september.rate, 10, 'Monthly rate uses all 30 calendar days, including days not yet reached');
assert.equal(september.stats.days, 3);
assert.deepEqual(september.logs, [], 'Completed days without comments stay in statistics but do not appear in the month log');

for (const [month, expected] of [['2024-02', 29], ['2026-02', 28], ['2000-02', 29], ['1900-02', 28], ['2026-12', 31]]) {
  const calendar = habitMonthCalendar(blank, 'exercise', month, clock('2026-12-31'));
  assert.equal(calendar.daysInMonth, expected);
  assert.equal(calendar.days.filter(day => day.inMonth).length, expected);
  assert.equal(calendar.days.length, 42);
  for (let index = 1; index < calendar.days.length; index++) assert.equal(model.habitDayIndex(calendar.days[index].day), model.habitDayIndex(calendar.days[index - 1].day) + 1, 'Month grids contain every date exactly once');
}
assert.equal(progress(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01').streak, 3, 'A streak crosses leap day and month boundaries');
assert.equal(progress(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01').streak, 3, 'A streak crosses a year boundary');
assert.equal(progress(['2026-09-13', '2026-09-14'], '2026-09-15').streak, 2, 'Yesterday keeps the current streak alive before today is checked');
assert.equal(progress(['2026-09-12', '2026-09-13'], '2026-09-15').streak, 0, 'Missing a whole day breaks the current streak');
assert.equal(progress(['2026-09-13', '2026-09-15'], '2026-09-15').streak, 1);
assert.equal(progress(['2026-09-14', '2026-09-16'], '2026-09-15').streak, 1, 'Future dates cannot extend yesterday\'s streak');
assert.equal(progress(['2026-09-16'], '2026-09-15').streak, 0);

const oldDays = model.recentDays('2026-09-15', 1000);
const archived = model.cleanState(make(oldDays));
assert.equal(Object.keys(archived.done).length, 90);
assert.equal(archived.completionHistory.exercise.length, 1);
const before = JSON.stringify(archived);
const oldMonth = habitMonthCalendar(archived, 'exercise', '2024-02', clock('2026-09-15'));
assert.equal(oldMonth.completed, 29, 'Month details retain archived check-ins outside the recent calendar');
assert.equal(oldMonth.rate, 100);
assert.equal(oldMonth.stats.days, 1000);
assert.equal(oldMonth.stats.streak, 1000);
assert.equal(JSON.stringify(archived), before, 'Viewing a calendar cannot mutate history');
const undone = model.toggleReminderDone(archived, 'exercise', '2026-09-14');
assert.equal(habitCompletionStats(undone, 'exercise', clock('2026-09-15')).streak, 1, 'Undo splits a compressed run and recomputes the streak');
const restored = model.toggleReminderDone(undone, 'exercise', '2026-09-14');
assert.equal(habitCompletionStats(restored, 'exercise', clock('2026-09-15')).streak, 1000);
const futureRange = model.cleanState({ ...blank, completionHistory: { exercise: [[model.habitDayIndex('2026-09-12'), model.habitDayIndex('2026-09-30')]] } });
assert.equal(habitCompletionStats(futureRange, 'exercise', clock('2026-09-15')).streak, 4, 'A partly future archived range is clipped at the local today');

const withNote = { ...make(['2026-09-07']), reflections: [{ id: 'note', habitId: 'exercise', day: '2026-09-07', text: 'A real saved memory', createdAt: clock('2026-09-07') }] };
assert.deepEqual(habitMonthCalendar(withNote, 'exercise', '2026-09', clock('2026-09-15')).logs, [{ day: '2026-09-07', text: 'A real saved memory' }]);
const mixedNotes = { ...make(['2026-09-01', '2026-09-07', '2026-09-15', '2026-09-16']), reflections: [
  { id: 'old-note', habitId: 'exercise', day: '2026-09-01', text: 'Old comment', createdAt: clock('2026-09-01') },
  { id: 'blank-note', habitId: 'exercise', day: '2026-09-07', text: ' \n\t ', createdAt: clock('2026-09-07') },
  { id: 'recent-note', habitId: 'exercise', day: '2026-09-15', text: 'Latest comment\nwith another line', createdAt: clock('2026-09-15') },
  { id: 'orphan-note', habitId: 'exercise', day: '2026-09-14', text: 'Not checked in', createdAt: clock('2026-09-14') },
  { id: 'future-note', habitId: 'exercise', day: '2026-09-16', text: 'Future comment', createdAt: clock('2026-09-16') },
] };
const mixedBefore = JSON.stringify(mixedNotes);
const mixedCalendar = habitMonthCalendar(mixedNotes, 'exercise', '2026-09', clock('2026-09-15'));
assert.deepEqual(mixedCalendar.logs, [
  { day: '2026-09-15', text: 'Latest comment with another line' },
  { day: '2026-09-01', text: 'Old comment' },
], 'Logs show only valid checked-in comments in descending day order using original text normalization');
assert.equal(mixedCalendar.completed, 3);
assert.equal(mixedCalendar.rate, 10);
assert.equal(mixedCalendar.stats.days, 3, 'Comment filtering does not change any completion calculation');
assert.equal(JSON.stringify(mixedNotes), mixedBefore, 'Comment projection remains read-only');
const withoutLatest = setHabitCalendarDay(mixedNotes, 'exercise', '2026-09-15', false, clock('2026-09-15'));
assert.deepEqual(habitMonthCalendar(withoutLatest, 'exercise', '2026-09', clock('2026-09-15')).logs, [{ day: '2026-09-01', text: 'Old comment' }], 'Undo hides that day from the log');
assert.equal(habitMonthCalendar(withNote, 'missing', '2026-09', clock('2026-09-15')).completed, 0);
assert.equal(habitMonthCalendar(withNote, 'constructor', '2026-09', clock('2026-09-15')).stats.streak, 0);

// The local date remains stable around DST transitions; calendar arithmetic is UTC-based.
const previousZone = process.env.TZ;
for (const zone of ['UTC', 'Asia/Shanghai', 'America/New_York']) {
  process.env.TZ = zone;
  assert.equal(progress(['2026-03-07', '2026-03-08', '2026-03-09'], '2026-03-09').streak, 3, zone);
  assert.equal(progress(['2026-10-31', '2026-11-01', '2026-11-02'], '2026-11-02').streak, 3, zone);
  assert.equal(habitMonthCalendar(blank, 'exercise', '2026-03', clock('2026-03-09')).days[0].day, '2026-03-01', zone);
}
if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone;
const editNow = clock('2026-10-01');
assert.equal(habitCalendarDayEditable('2026-07-04', editNow), true);
for (const day of ['2026-07-03', '2026-10-02', '2026-02-29', 'not-a-date']) assert.equal(habitCalendarDayEditable(day, editNow), false);
const editable = model.cleanState({ ...blank, items: [blank.items[0], { ...blank.items[0], id: 'other' }], done: { '2026-09-30': ['other'] } });
const original = JSON.stringify(editable);
const checked = setHabitCalendarDay(editable, 'exercise', '2026-09-30', true, editNow);
assert.deepEqual(checked.done['2026-09-30'], ['other', 'exercise']);
assert.equal(setHabitCalendarDay(checked, 'exercise', '2026-09-30', true, editNow), checked, 'Retrying the same target cannot toggle it back');
assert.equal(habitCalendarDayCompleted(checked, 'exercise', '2026-09-30'), true);
const dateUndone = setHabitCalendarDay(checked, 'exercise', '2026-09-30', false, editNow);
assert.deepEqual(dateUndone.done['2026-09-30'], ['other']);
assert.equal(setHabitCalendarDay(dateUndone, 'exercise', '2026-09-30', false, editNow), dateUndone);
assert.equal(JSON.stringify(editable), original);
assert.throws(() => setHabitCalendarDay(editable, 'exercise', '2026-10-02', true, editNow), /90/);
assert.throws(() => setHabitCalendarDay({ ...editable, items: editable.items.filter(item => item.id !== 'exercise') }, 'exercise', '2026-10-01', true, editNow), /归档或移除/);
assert.throws(() => setHabitCalendarDay({ ...editable, items: editable.items.map(item => ({ ...item, enabled: false })) }, 'exercise', '2026-10-01', true, editNow), /归档或移除/);
console.log('PASS habit calendar: 42 Sunday-first cells, leap years, month/year boundaries, full-month rates, current streaks, archive/undo, future exclusion, notes, DST and bounded, idempotent date editing.');
