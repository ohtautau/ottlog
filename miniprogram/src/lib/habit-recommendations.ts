import type { Reminder, ReminderState } from './reminder-data';

export type HabitOpenLog = { version: 1; opened: Record<string, number[]> };
export type HabitSuggestion = { item: Reminder; reason: string; typicalMinute?: number };
const DAY = 86_400_000;
const dayKey = (at: number) => { const date = new Date(at); return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; };
const localDay = (at: number) => { const date = new Date(at); return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY; };
export const habitOpenKey = (owner: string) => `${typeof MINIPROGRAM_PREVIEW !== 'undefined' && MINIPROGRAM_PREVIEW ? 'ottlog-mini-preview-v1:' : ''}ottlog.habit-openings.v1.${encodeURIComponent(owner)}`;
export const emptyHabitOpenLog = (): HabitOpenLog => ({ version: 1, opened: {} });

/** Store the first deliberate opening of each local day, separately from check-ins. */
export function cleanHabitOpenLog(value: unknown, ids: string[], now = Date.now()): HabitOpenLog {
  const result = emptyHabitOpenLog();
  if (!value || typeof value !== 'object' || (value as HabitOpenLog).version !== 1) return result;
  const opened = (value as HabitOpenLog).opened;
  if (!opened || typeof opened !== 'object' || Array.isArray(opened)) return result;
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(opened, id) || !Array.isArray(opened[id])) continue;
    const seen = new Set<string>();
    const entries = opened[id].filter(at => typeof at === 'number' && Number.isFinite(at) && at > 0 && at <= now && at >= now - 180 * DAY).sort((a, b) => a - b)
      .filter(at => { const day = dayKey(at); if (seen.has(day)) return false; seen.add(day); return true; }).slice(-90);
    if (entries.length) Object.defineProperty(result.opened, id, { value: entries, enumerable: true, writable: true, configurable: true });
  }
  return result;
}

export function recordHabitOpening(log: HabitOpenLog, id: string, now: number): HabitOpenLog {
  const previous = Object.prototype.hasOwnProperty.call(log.opened, id) ? log.opened[id] : [];
  if (previous.some(at => dayKey(at) === dayKey(now))) return log;
  return { ...log, opened: { ...log.opened, [id]: [...previous, now].slice(-90) } };
}

const minuteAt = (at: number) => { const date = new Date(at); return date.getHours() * 60 + date.getMinutes(); };
const offsetFrom = (minute: number, anchor: number) => ((minute - anchor + 2160) % 1440) - 720;
export const clockDistance = (a: number, b: number) => Math.abs(offsetFrom(a, b));
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };

/** Unwrap around the circular medoid so 23:50 and 00:10 average to midnight. */
export function typicalOpeningMinute(openings: number[]): number | null {
  const seen = new Set<string>();
  const minutes = openings.filter(at => { const day = dayKey(at); if (seen.has(day)) return false; seen.add(day); return true; }).map(minuteAt);
  if (minutes.length < 3) return null;
  const anchor = minutes.reduce((best, candidate) => minutes.reduce((sum, m) => sum + clockDistance(m, candidate), 0) < minutes.reduce((sum, m) => sum + clockDistance(m, best), 0) ? candidate : best, minutes[0]);
  const offsets = minutes.map(minute => offsetFrom(minute, anchor));
  const center = median(offsets);
  const threshold = Math.max(60, median(offsets.map(offset => Math.abs(offset - center))) * 3);
  const inliers = offsets.filter(offset => Math.abs(offset - center) <= threshold).sort((a, b) => a - b);
  if (inliers.length < 3) return null;
  const trim = inliers.length >= 5 ? Math.max(1, Math.floor(inliers.length * .15)) : 0;
  const trimmed = inliers.slice(trim, inliers.length - trim);
  return (Math.round(anchor + trimmed.reduce((sum, minute) => sum + minute, 0) / trimmed.length) + 1440) % 1440;
}

export function latestHabitActivity(state: ReminderState, log: HabitOpenLog, id: string, now: number): number | null {
  const openings = Object.prototype.hasOwnProperty.call(log.opened, id) ? log.opened[id] : [];
  const days = openings.map(localDay);
  for (const [day, ids] of Object.entries(state.done)) {
    if (!ids.includes(id) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const at = Date.parse(`${day}T12:00:00`);
    if (Number.isFinite(at) && localDay(at) <= localDay(now)) days.push(localDay(at));
  }
  return days.length ? Math.max(...days) : null;
}

export type HabitSuggestionOptions = {
  timelyCount?: number;
  randomCount?: number;
  excludeRandomIds?: readonly string[];
};

const suggestionCount = (value: number | undefined, fallback: number) => value === undefined || !Number.isFinite(value) ? fallback : Math.max(0, Math.min(80, Math.floor(value)));

function shuffleHabits(items: Reminder[], seed: number): Reminder[] {
  let random = seed | 0 || 1;
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
    const j = (random >>> 0) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Keep the time-based section stable while refresh changes the independent random group. */
export function suggestHabits(state: ReminderState, log: HabitOpenLog, now: number, seed: number, options: HabitSuggestionOptions = {}) {
  const date = new Date(now), today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const available = state.items.filter(item => item.enabled && !state.done[today]?.includes(item.id));
  const timelyCount = suggestionCount(options.timelyCount, 4);
  const randomCount = suggestionCount(options.randomCount, 6);
  const routine = available.map(item => ({ item, typicalMinute: typicalOpeningMinute(Object.prototype.hasOwnProperty.call(log.opened, item.id) ? log.opened[item.id] : []) }))
    .filter((row): row is { item: Reminder; typicalMinute: number } => row.typicalMinute !== null)
    .sort((a, b) => clockDistance(a.typicalMinute, minuteAt(now)) - clockDistance(b.typicalMinute, minuteAt(now)) || a.item.id.localeCompare(b.item.id))
    .slice(0, timelyCount).map(row => ({ ...row, reason: `常在 ${String(Math.floor(row.typicalMinute / 60)).padStart(2, '0')}:${String(row.typicalMinute % 60).padStart(2, '0')} 打开` }));
  const fallback: HabitSuggestion[] = available.slice(0, timelyCount).map(item => ({ item, reason: '随手开始' }));
  const timely: HabitSuggestion[] = routine.length ? routine : fallback;
  const used = new Set(timely.map(row => row.item.id));
  const pool = available.filter(item => !used.has(item.id));
  const shuffled = shuffleHabits(pool, seed);
  const previous = new Set(options.excludeRandomIds ?? []);
  // Prefer every possible replacement before reusing cards from the preceding group.
  const next = [...shuffled.filter(item => !previous.has(item.id)), ...shuffled.filter(item => previous.has(item.id))];
  const random: HabitSuggestion[] = next.slice(0, randomCount).map(item => ({ item, reason: '' }));
  return { timely, random, learned: routine.length > 0, randomPoolCount: pool.length };
}
