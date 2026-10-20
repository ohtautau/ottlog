import { cleanState, habitDayIndex, hasHabitDay, localDate, type HabitReflection, type ReminderState } from './reminder-data';

export type { HabitReflection } from './reminder-data';
export const MAX_HABIT_REFLECTIONS = 512;
// Tool-state updates are immutable. Reuse normalization while a grid renders many cards.
const normalizedStates = new WeakMap<ReminderState, ReminderState>();
function normalized(value: ReminderState): ReminderState {
  let state = normalizedStates.get(value);
  if (!state) { state = cleanState(value); normalizedStates.set(value, state); }
  return state;
}

export function habitCompletionStats(value: ReminderState, habitId: string, now = Date.now()): { days: number; streak: number; lastDay: string | null; daysSinceLast: number | null } {
  const state = normalized(value), today = habitDayIndex(localDate(new Date(now)));
  if (today === null || !state.items.some(item => item.id === habitId)) return { days: 0, streak: 0, lastDay: null, daysSinceLast: null };
  const ranges = state.completionHistory?.[habitId] ?? [];
  let days = 0, last: number | null = null, streak = 0;
  for (const [start, end] of ranges) {
    if (start > today) continue;
    const until = Math.min(end, today);
    days += until - start + 1; last = last === null ? until : Math.max(last, until);
    if (today - until <= 1) streak = until - start + 1;
  }
  return { days, streak, lastDay: last === null ? null : new Date(last * 86_400_000).toISOString().slice(0, 10), daysSinceLast: last === null ? null : today - last };
}

/** Replay this owner's memories across habits. Unshown entries come first; equal times are shuffled. */
export function chooseHabitReflection(value: ReminderState, random: () => number = Math.random): HabitReflection | null {
  const rows = normalized(value).reflections ?? [];
  if (!rows.length) return null;
  const oldest = Math.min(...rows.map(entry => entry.lastShownAt ?? 0));
  const pool = rows.filter(entry => (entry.lastShownAt ?? 0) === oldest);
  const roll = random(), index = Number.isFinite(roll) ? Math.floor(Math.max(0, Math.min(0.999999999, roll)) * pool.length) : 0;
  return pool[index];
}

export function markHabitReflectionShown(value: ReminderState, reflectionId: string, now = Date.now()): ReminderState {
  const state = normalized(value);
  if (!Number.isFinite(now) || now <= 0) return state;
  const rows = state.reflections ?? [];
  if (!rows.some(entry => entry.id === reflectionId)) return state;
  // Keep replay order even when two check-ins share a timestamp or the device clock moves backwards.
  const shownAt = Math.max(now, rows.reduce((latest, entry) => Math.max(latest, entry.lastShownAt ?? 0), 0) + 1);
  return { ...state, reflections: rows.map(entry => entry.id === reflectionId ? { ...entry, lastShownAt: shownAt } : entry) };
}

export function saveHabitReflection(value: ReminderState, input: { habitId: string; day: string; text: string; id?: string; now?: number }): ReminderState {
  const state = normalized(value), day = habitDayIndex(input.day), now = input.now ?? Date.now();
  if (day === null || !state.items.some(item => item.id === input.habitId && item.enabled) || !hasHabitDay(state.completionHistory?.[input.habitId], day)) throw new Error('这次打卡已撤销，请重新打卡后记录');
  const text = Array.from(input.text.replace(/\s+/g, ' ').trim()).slice(0, 120).join('');
  if (!text) return state;
  if (!Number.isFinite(now) || now <= 0) throw new Error('记录时间无效');
  const rows = state.reflections ?? [], existing = rows.find(entry => entry.habitId === input.habitId && entry.day === input.day);
  const id = existing?.id ?? input.id ?? `reflection-${input.habitId}-${input.day}-${now}`;
  if (!id || id.length > 160 || rows.some(entry => entry.id === id && entry !== existing)) throw new Error('记录标识重复，请重试');
  const reflection: HabitReflection = existing ? { ...existing, text } : { id, habitId: input.habitId, day: input.day, text, createdAt: now };
  if (existing) return { ...state, reflections: rows.map(entry => entry.id === existing.id ? reflection : entry) };
  // Keep room for each new check-in, even if a device clock moves backwards.
  const oldest = [...rows].sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const evicted = new Set(oldest.slice(0, Math.max(0, rows.length - MAX_HABIT_REFLECTIONS + 1)).map(entry => entry.id));
  return { ...state, reflections: [...rows.filter(entry => !evicted.has(entry.id)), reflection] };
}
