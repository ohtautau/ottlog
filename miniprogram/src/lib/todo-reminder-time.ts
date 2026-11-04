import type { Todo } from './tool-records';
type Schedule = Pick<Todo, 'dueDate' | 'dueTime' | 'reminderAt' | 'recurrence'>;

function day(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(0); date.setHours(12, 0, 0, 0); date.setFullYear(y, m - 1, d);
  if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) return date;
}
function at(date: Date, time: string): Date | undefined {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;
  const [h, m] = time.split(':').map(Number), result = new Date(date);
  result.setHours(h, m, 0, 0);
  if (result.getHours() === h && result.getMinutes() === m && result.getDate() === date.getDate()) return result;
}
/** Absolute current reminder; derive only one successor, without mutating legacy input. */
export function nextTodoReminder(schedule: Schedule, nextDate: string): string | undefined {
  if (!schedule.reminderAt) return;
  const old = day(schedule.dueDate), next = day(nextDate), reminder = new Date(schedule.reminderAt);
  if (!old || !next || !Number.isFinite(reminder.getTime())) return;
  if (schedule.dueTime) {
    const from = at(old, schedule.dueTime), to = at(next, schedule.dueTime);
    if (!from || !to) return;
    const result = new Date(to.getTime() + reminder.getTime() - from.getTime());
    return Number.isFinite(result.getTime()) ? result.toISOString() : undefined;
  }
  // Date-only tasks have no implicit midnight. Shift local calendar days and retain clock time.
  const serial = (date: Date) => { const copy = new Date(0); copy.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate()); copy.setUTCHours(0,0,0,0); return copy.getTime(); };
  reminder.setDate(reminder.getDate() + Math.round((serial(next) - serial(old)) / 86400000));
  return Number.isFinite(reminder.getTime()) ? reminder.toISOString() : undefined;
}
export function todoReminderValidation(next: Schedule, original: Schedule, now = Date.now()): string | undefined {
  if (!next.reminderAt) return;
  if (next.recurrence && !day(next.dueDate)) return '请设置有效的任务日期，以便按间隔生成下一轮提醒';
  if (next.recurrence && next.dueTime && !at(day(next.dueDate)!, next.dueTime)) return '请设置有效的任务时间，以便按间隔生成下一轮提醒';
  const stamp = Date.parse(next.reminderAt);
  if (!Number.isFinite(stamp)) return '请选择有效的提醒时间';
  if (!next.recurrence && next.reminderAt !== original.reminderAt && stamp <= now) return '请选择未来的提醒时间';
}
