import { cleanState, habitDayIndex, hasHabitDay, localDate, type ReminderState } from './reminder-data';
import { habitCompletionStats } from './habit-reflections';

const DAY_MS = 86_400_000;
const normalizedStates = new WeakMap<ReminderState, ReminderState>();
const dateFromOrdinal = (ordinal: number) => new Date(ordinal * DAY_MS).toISOString().slice(0, 10);

export function shiftHabitMonth(month: string, offset: number): string {
  if (habitDayIndex(`${month}-01`) === null || !Number.isInteger(offset)) throw new Error('月份无效');
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1 + offset;
  if (index < 0 || index >= 10_000 * 12) throw new Error('月份超出范围');
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
}

export type HabitCalendarDay = {
  day: string; date: number; inMonth: boolean; today: boolean; future: boolean; completed: boolean;
};

/** Calendar days use UTC ordinals; the user's today is always their local date. */
export function habitMonthCalendar(value: ReminderState, habitId: string, month: string, now = Date.now()) {
  const first = habitDayIndex(`${month}-01`), today = habitDayIndex(localDate(new Date(now)));
  if (first === null || today === null) throw new Error('日期无效');
  let state = normalizedStates.get(value);
  if (!state) { state = cleanState(value); normalizedStates.set(value, state); }
  const endDate = new Date(first * DAY_MS); endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  const next = endDate.getTime() / DAY_MS, daysInMonth = next - first;
  const start = first - new Date(first * DAY_MS).getUTCDay();
  const exists = state.items.some(item => item.id === habitId);
  const history = exists ? state.completionHistory?.[habitId] : undefined;
  const days: HabitCalendarDay[] = Array.from({ length: 42 }, (_, index) => {
    const ordinal = start + index, day = dateFromOrdinal(ordinal);
    return { day, date: new Date(ordinal * DAY_MS).getUTCDate(), inMonth: ordinal >= first && ordinal < next, today: ordinal === today, future: ordinal > today, completed: ordinal <= today && hasHabitDay(history, ordinal) };
  });
  const completedDays = days.filter(day => day.inMonth && day.completed);
  const reflections = new Map((state.reflections ?? []).filter(entry => entry.habitId === habitId).map(entry => [entry.day, entry.text]));
  return {
    month, days, daysInMonth, completed: completedDays.length,
    rate: Math.round(completedDays.length / daysInMonth * 100),
    stats: habitCompletionStats(state, habitId, now),
    logs: [...completedDays].reverse().map(day => ({ day: day.day, text: reflections.get(day.day) ?? '' })).filter(entry => !!entry.text.trim()),
  };
}
