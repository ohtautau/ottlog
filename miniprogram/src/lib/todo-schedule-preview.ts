import { monthlyAnchor } from './todo-data';
import { calendarMonthDays, localReminderParts, type TodoSchedule } from './todo-schedule';

export type ScheduleDayMark = { due?: boolean; reminder?: boolean; repeat?: boolean; dueTime?: string; reminderTime?: string };
const parts = (day: string) => day.split('-').map(Number);
const serial = (day: string) => { const [y,m,d] = parts(day); return Date.UTC(y,m-1,d)/86400000; };

/** Inspect only 42 visible days, even for an old daily rule viewed centuries later. */
export function scheduleCalendarMarks(schedule: TodoSchedule, month: string): Record<string, ScheduleDayMark> {
  const marks: Record<string, ScheduleDayMark> = {}, reminder = localReminderParts(schedule.reminderAt);
  const rule = schedule.recurrence, base = schedule.dueDate, baseParts = parts(base);
  const validRule = !!rule && Number.isInteger(rule.interval) && rule.interval >= 1 && rule.interval <= 365 && /^\d{4}-\d{2}-\d{2}$/.test(base);
  const baseDate = validRule ? new Date(`${base}T12:00:00`) : null;
  for (const item of calendarMonthDays(month)) {
    const mark: ScheduleDayMark = {};
    if (item.date === base) { mark.due = true; mark.dueTime = schedule.dueTime; }
    if (item.date === reminder.date) { mark.reminder = true; mark.reminderTime = reminder.time; }
    if (validRule && baseDate && Number.isFinite(baseDate.getTime()) && baseDate.getFullYear()===baseParts[0] && baseDate.getMonth()+1===baseParts[1] && baseDate.getDate()===baseParts[2] && item.date > base) {
      const [year,mon,day] = parts(item.date), diff = serial(item.date)-serial(base);
      let repeated = false;
      if (rule.unit === 'day' || rule.unit === 'week') repeated = diff % (rule.interval*(rule.unit==='week'?7:1)) === 0;
      else if (rule.unit === 'month' || rule.unit === 'year') {
        const months = (year-baseParts[0])*12+mon-baseParts[1], step = rule.interval*(rule.unit==='year'?12:1);
        const anchor = monthlyAnchor(schedule,baseDate), last = new Date(year,mon,0).getDate();
        repeated = months >= 0 && months % step === 0 && day === Math.min(anchor,last);
      } else if (rule.unit === 'weekday') {
        const weekday = new Date(Date.UTC(year,mon-1,day)).getUTCDay();
        let count = Math.floor(diff/7)*5;
        for (let offset=1;offset<=diff%7;offset++) { const dayOfWeek=(baseDate.getDay()+offset)%7; if(dayOfWeek!==0&&dayOfWeek!==6)count++; }
        repeated = weekday!==0&&weekday!==6&&count%rule.interval===0;
      }
      if (repeated) { mark.repeat = true; mark.dueTime = schedule.dueTime; }
    }
    if (Object.keys(mark).length) marks[item.date] = mark;
  }
  return marks;
}
