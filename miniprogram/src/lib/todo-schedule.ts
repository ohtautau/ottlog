import type { Todo, TodoRecurrence } from './tool-records';

export type TodoSchedule = Pick<Todo, 'dueDate' | 'dueTime' | 'reminderAt' | 'recurrence'>;
export type CalendarMonthDay = { date: string; day: number; inMonth: boolean };

const twoDigits = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${String(date.getFullYear()).padStart(4, '0')}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
const monthKey = (date: Date) => dateKey(date).slice(0, 7);

/** Validate complete input before padding; never coerce signs/decimals. */
export function clockTime(hour: string, minute: string): string {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute) || Number(hour) > 23 || Number(minute) > 59) throw new Error('时间请填写 0–23 时、0–59 分。');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function calendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return dateKey(date) === value ? date : null;
}

function monthStart(month: string): Date {
  const date = calendarDate(`${month}-01`);
  if (!/^\d{4}-\d{2}$/.test(month) || !date) throw new Error('请选择有效的月份');
  return date;
}

/** Always six weeks, with Sunday first. Selection does not move the displayed month. */
export function calendarMonthDays(month: string, _selectedDate?: string): CalendarMonthDay[] {
  const first = monthStart(month);
  const day = new Date(first);
  day.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, () => {
    const item = { date: dateKey(day), day: day.getDate(), inMonth: monthKey(day) === month };
    day.setDate(day.getDate() + 1);
    return item;
  });
}

export function shiftCalendarMonth(month: string, offset: number): string {
  if (!Number.isInteger(offset)) throw new Error('月份偏移需要是整数');
  const first = monthStart(month);
  first.setMonth(first.getMonth() + offset);
  if (first.getFullYear() < 0 || first.getFullYear() > 9999) throw new Error('请选择有效的月份');
  return monthKey(first);
}

export function recurrenceLabel(rule?: TodoRecurrence): string {
  if (!rule) return '不重复';
  const names: Record<TodoRecurrence['unit'], string> = { day: '每天', week: '每周', month: '每月', year: '每年', weekday: '工作日' };
  if (rule.interval === 1) return names[rule.unit];
  const units: Record<TodoRecurrence['unit'], string> = { day: '天', week: '周', month: '月', year: '年', weekday: '个工作日' };
  return `每 ${rule.interval} ${units[rule.unit]}`;
}

export function copyTodoSchedule(schedule: TodoSchedule): TodoSchedule {
  return {
    dueDate: schedule.dueDate,
    dueTime: schedule.dueTime,
    reminderAt: schedule.reminderAt,
    recurrence: schedule.recurrence ? { ...schedule.recurrence } : undefined,
  };
}

export function clearTodoSchedule(): TodoSchedule {
  return { dueDate: '', dueTime: undefined, reminderAt: undefined, recurrence: undefined };
}

export function localReminderParts(value: string | undefined): { date: string; time: string } {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return { date: '', time: '' };
  return { date: dateKey(date), time: `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}` };
}

/** Construct in the device's local timezone, rejecting normalized dates and DST gaps. */
export function makeLocalReminder(date: string, time: string): string {
  const value = calendarDate(date);
  if (!value) throw new Error('请选择有效的提醒日期');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('请选择有效的提醒时间');
  const [hours, minutes] = time.split(':').map(Number);
  value.setHours(hours, minutes, 0, 0);
  if (dateKey(value) !== date || value.getHours() !== hours || value.getMinutes() !== minutes) {
    throw new Error('请选择有效的提醒时间');
  }
  return value.toISOString();
}

export const reminderTimes = [
  { id: 'at', label: '准时', minutes: 0 }, { id: 'ten', label: '提前10分钟', minutes: 10 },
  { id: 'half', label: '提前30分钟', minutes: 30 }, { id: 'hour', label: '提前1小时', minutes: 60 }, { id: 'two', label: '提前2小时', minutes: 120 },
] as const;
export const reminderDays = [
  { days: 0, label: '当天' }, { days: 1, label: '前一天' }, { days: 2, label: '前两天' },
  { days: 3, label: '前三天' }, { days: 7, label: '前一周' }, { days: -1, label: '前一月' },
] as const;
/** Calendar days/months use local dates; an unavailable month-end clamps. */
export function reminderDay(base: string, days: number): string {
  const value = calendarDate(base);
  if (!value) throw new Error('请选择有效的提醒日期');
  if (days === -1) {
    const day = value.getDate(); value.setDate(1); value.setMonth(value.getMonth() - 1);
    const end = new Date(value); end.setMonth(end.getMonth() + 1); end.setDate(0);
    value.setDate(Math.min(day, end.getDate()));
  } else value.setDate(value.getDate() - days);
  const result = dateKey(value);
  if (result < '1000-01-01' || result > '9999-12-31') throw new Error('请选择有效的提醒日期');
  return result;
}
export function relativeReminder(date: string, time: string, minutes: number) {
  const at = new Date(new Date(makeLocalReminder(date, time)).getTime() - minutes * 60_000).toISOString();
  return { ...localReminderParts(at), at };
}
export function reminderDayLabel(base: string, date: string) {
  for (const choice of reminderDays) {
    try { if (reminderDay(base, choice.days) === date) return choice.label; } catch { /* Keep legacy absolute dates readable. */ }
  }
  return date;
}
/** Recover a matching display only; never replace a saved absolute reminder. */
export function reminderSelection(value: string | undefined, date: string, time: string) {
  const parts = localReminderParts(value);
  if (parts.date) for (const day of reminderDays) for (const choice of reminderTimes) {
    try {
      const anchor = reminderDay(date, day.days), match = relativeReminder(anchor, time, choice.minutes);
      if (new Date(match.at).getTime() === new Date(value || '').getTime()) return { anchor, preset: choice.id };
    } catch { /* Invalid old task dates retain their absolute reminder. */ }
  }
  return { anchor: parts.date || date, preset: parts.date ? 'custom' : 'none' };
}

export function scheduleSummary(schedule: TodoSchedule, today: string): string {
  const parts: string[] = [];
  const due = calendarDate(schedule.dueDate);
  const current = calendarDate(today);
  if (due) {
    let label = `${due.getMonth() + 1}月${due.getDate()}日`;
    if (current) {
      const yesterday = new Date(current), tomorrow = new Date(current);
      yesterday.setDate(yesterday.getDate() - 1);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (schedule.dueDate === today) label = '今天';
      else if (schedule.dueDate === dateKey(tomorrow)) label = '明天';
      else if (schedule.dueDate === dateKey(yesterday)) label = '昨天';
      else if (due.getFullYear() !== current.getFullYear()) label = `${due.getFullYear()}年${label}`;
    }
    parts.push(label);
  }
  if (schedule.dueTime) parts.push(schedule.dueTime);
  if (schedule.reminderAt) parts.push('提醒');
  if (schedule.recurrence) parts.push(recurrenceLabel(schedule.recurrence));
  return parts.join(' · ') || '日期';
}
