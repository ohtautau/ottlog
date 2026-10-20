import { cleanState, habitDayIndex, hasHabitDay, localDate, toggleReminderDone, type ReminderState } from './reminder-data';

/** Matches the existing history editor's inclusive 90-day window. */
export function habitCalendarDayEditable(day: string, now = Date.now()): boolean {
  const ordinal = habitDayIndex(day), today = habitDayIndex(localDate(new Date(now)));
  return ordinal !== null && today !== null && ordinal <= today && ordinal >= today - 89;
}

export function habitCalendarDayCompleted(value: ReminderState, id: string, day: string): boolean {
  const ordinal = habitDayIndex(day);
  return ordinal !== null && hasHabitDay(cleanState(value).completionHistory?.[id], ordinal);
}

/** A target state makes failed local writes safe to retry without toggling twice. */
export function setHabitCalendarDay(value: ReminderState, id: string, day: string, completed: boolean, now = Date.now()): ReminderState {
  if (!habitCalendarDayEditable(day, now)) throw new Error('只能修改最近 90 天的打卡');
  if (!value.items.some(item => item.id === id && item.enabled)) throw new Error('这个习惯已归档或移除');
  if (habitCalendarDayCompleted(value, id, day) === completed) return value;
  const next = toggleReminderDone(value, id, day, now);
  if (habitCalendarDayCompleted(next, id, day) !== completed) throw new Error('这次打卡未能保存，请重试');
  return next;
}
