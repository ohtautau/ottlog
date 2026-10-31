import { makeLocalReminder } from './todo-schedule';

export function monthDays(year: number, month: number): number {
  return month === 2 ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
}
export function wheelDate(year: number, month: number, day: number): string {
  const boundedYear = Math.min(9999, Math.max(1000, year));
  return `${boundedYear}-${String(month).padStart(2, '0')}-${String(Math.min(day, monthDays(boundedYear, month))).padStart(2, '0')}`;
}
/** Calendar wording is relative to the task's local date, independent of its clock time. */
export function reminderCalendarLabel(dueDate: string, reminderAt: string | undefined): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !reminderAt) return '';
  const reminder = new Date(reminderAt);
  if (!Number.isFinite(reminder.getTime())) return '';
  const [year, month, day] = dueDate.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > monthDays(year, month)) return '';
  const ry = reminder.getFullYear(), rm = reminder.getMonth() + 1, rd = reminder.getDate();
  const days = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(ry, rm - 1, rd)) / 86400000);
  if (!days) return '任务当天';
  const direction = days > 0 ? '前' : '后';
  const count = (value: number) => ['', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十'][value] || String(value);
  const months = (year - ry) * 12 + month - rm;
  if (months && rd === Math.min(day, monthDays(ry, rm))) {
    const amount = Math.abs(months);
    return `${direction}${count(amount % 12 ? amount : amount / 12)}${amount % 12 ? '月' : '年'}`;
  }
  const amount = Math.abs(days);
  return `${direction}${count(amount % 7 ? amount : amount / 7)}${amount % 7 ? '天' : '周'}`;
}
export function reminderLeadLabel(dueDate: string, dueTime: string | undefined, reminderAt: string | undefined): string {
  if (!reminderAt) return '请选择提醒时间';
  if (!dueDate || !dueTime) return '请先设置任务日期和时间，才能计算提前多久';
  try {
    const difference = new Date(makeLocalReminder(dueDate, dueTime)).getTime() - new Date(reminderAt).getTime();
    if (!Number.isFinite(difference)) return '请选择有效时间';
    if (difference === 0) return '准时提醒';
    let remaining = Math.floor(Math.abs(difference) / 1000);
    const days = Math.floor(remaining / 86400); remaining %= 86400;
    const hours = Math.floor(remaining / 3600); remaining %= 3600;
    const minutes = Math.floor(remaining / 60), seconds = remaining % 60;
    const duration = `${days ? `${days}天` : ''}${hours ? `${hours}小时` : ''}${minutes ? `${minutes}分钟` : ''}${seconds ? `${seconds}秒` : ''}` || '不到1秒';
    return difference > 0 ? `提前${duration}提醒` : `晚于任务时间${duration}提醒`;
  } catch { return '请先设置有效的任务日期和时间'; }
}
