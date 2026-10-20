import { habitCompletionStats } from './habit-reflections';
import type { Reminder, ReminderState } from './reminder-data';
import { cleanState } from './reminder-data';
import { habitPriorities, habitTimePeriod, habitTimePeriods, sortHabits, type HabitTimePeriod } from './habit-metadata';

/** Divide an already ordered view; keep each group's input order and original items. */
export function groupHabitsByTimePeriod<T extends { timePeriod?: unknown }>(items: readonly T[]): { timePeriod: HabitTimePeriod; items: T[] }[] {
  const groups = habitTimePeriods.map(timePeriod => ({ timePeriod, items: [] as T[] }));
  const byPeriod = new Map(groups.map(group => [group.timePeriod, group]));
  for (const item of items) byPeriod.get(habitTimePeriod(item))!.items.push(item);
  return groups.filter(group => group.items.length > 0);
}

export function orderedHabits(value: ReminderState, now = Date.now()): Reminder[] {
  const state = cleanState(value), sort = state.sort;
  if (!sort) return sortHabits(state.items);
  if (sort.field === 'custom') return [...state.items];
  const scores = new Map(state.items.map(item => {
    let score: number | null = null;
    if (sort.field === 'priority') score = habitPriorities.length - habitPriorities.indexOf(item.priority ?? 'none');
    if (sort.field === 'created') score = item.createdAt && item.createdAt > 0 ? item.createdAt : null;
    if (sort.field === 'days' || sort.field === 'streak') score = habitCompletionStats(state, item.id, now)[sort.field];
    if (sort.field === 'averageTime') {
      const times = Object.values(state.checkInTimes ?? {}).flatMap(entries => {
        const stamp = entries[item.id];
        if (!stamp || stamp > now) return [];
        const date = new Date(stamp);
        return [date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()];
      });
      if (times.length) score = times.reduce((total, time) => total + time, 0) / times.length;
    }
    return [item.id, score] as const;
  }));
  return [...state.items].sort((a, b) => {
    const first = scores.get(a.id) ?? null, second = scores.get(b.id) ?? null;
    if (first === null) return second === null ? 0 : 1;
    if (second === null) return -1;
    return (first - second) * (sort.direction === 'asc' ? 1 : -1)
      || (sort.field === 'priority' ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : 0);
  });
}

/** Freeze the displayed full order before replacing visible slots; hidden habits survive. */
export function saveHabitOrder(value: ReminderState, ids: string[], now = Date.now()): ReminderState {
  const state = cleanState(value);
  return { ...state, items: applyHabitOrder(orderedHabits(state, now), ids), sort: { field: 'custom', direction: 'asc' } };
}

/** Replace only the slots belonging to the visible group; retain hidden/new items. */
export function applyHabitOrder(items: Reminder[], ids: string[]): Reminder[] {
  const byId = new Map(items.map(item => [item.id, item]));
  const ordered = [...new Set(ids)].flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  const included = new Set(ordered.map(item => item.id));
  let index = 0;
  return items.map(item => included.has(item.id) ? ordered[index++] : item);
}

export function longestUncheckedHabits(state: ReminderState, now = Date.now()): Reminder[] {
  return state.items.filter(item => item.enabled)
    .map((item, index) => ({ item, index, gap: habitCompletionStats(state, item.id, now).daysSinceLast }))
    .filter(row => row.gap !== 0)
    .sort((a, b) => {
      if (a.gap === b.gap) return a.index - b.index;
      if (a.gap === null) return -1;
      if (b.gap === null) return 1;
      return b.gap - a.gap;
    }).slice(0, 2).map(row => row.item);
}
