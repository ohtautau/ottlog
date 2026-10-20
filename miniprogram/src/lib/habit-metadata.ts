export const habitPriorities = ['high', 'medium', 'low', 'none'] as const;
export type HabitPriority = typeof habitPriorities[number];
export const habitPriorityLabels: Record<HabitPriority, string> = { high: '高', medium: '中', low: '低', none: '无' };
export const habitPriorityColors: Record<HabitPriority, string> = { high: '#efb3a3', medium: '#e3ce97', low: '#a9d9b9', none: '#91a6ae' };
export const habitTimePeriods = ['morning', 'noon', 'afternoon', 'night', 'free'] as const;
export type HabitTimePeriod = typeof habitTimePeriods[number];
export const habitTimePeriodLabels: Record<HabitTimePeriod, string> = { morning: '上午', noon: '中午', afternoon: '下午', night: '夜晚', free: '自由' };
export const isHabitTimePeriod = (value: unknown): value is HabitTimePeriod => habitTimePeriods.includes(value as HabitTimePeriod);
/** Default browsing period follows the device's local clock; saved habits are untouched. */
export function currentHabitTimePeriod(now = Date.now()): Exclude<HabitTimePeriod, 'free'> {
  const hour = new Date(now).getHours();
  return hour < 11 ? 'morning' : hour < 13 ? 'noon' : hour < 18 ? 'afternoon' : 'night';
}
const periodHints: [HabitTimePeriod, RegExp][] = [
  ['morning', /早上|早晨|上午|晨间|晨起|起床|早餐|晨脉|\bmorning\b/i],
  ['noon', /中午|午间|午饭|午餐|午睡|\bnoon\b/i],
  ['afternoon', /下午|午后|\bafternoon\b/i],
  ['night', /晚上|晚间|夜晚|夜间|睡前|晚饭|晚餐|\b(?:evening|night)\b/i],
];
/** Suggest only missing periods; saved choices, including free, always win. */
export function habitTimePeriod(item: { timePeriod?: unknown; title?: unknown; note?: unknown } | null | undefined): HabitTimePeriod {
  const value = item?.timePeriod;
  if (value !== undefined) return isHabitTimePeriod(value) ? value : 'free';
  const title = typeof item?.title === 'string' ? item.title : '';
  const note = typeof item?.note === 'string' ? item.note : '';
  for (const text of [title, note]) {
    if (/随时|自由|不限时|任意时间|早晚/.test(text)) return 'free';
    const matches = periodHints.filter(([, pattern]) => pattern.test(text));
    if (matches.length) return matches.length === 1 ? matches[0][0] : 'free';
  }
  if (/计划|测量身体|口语|英语/.test(title)) return 'morning';
  if (/力量|有氧|训练|运动|摄影|后期|自媒体|写作/.test(title)) return 'afternoon';
  if (/睡眠|褪黑素|洗澡|阅读|读书|回顾|复盘|整理房间/.test(title)) return 'night';
  return 'free';
}
export type HabitMetadata = { priority?: HabitPriority; createdAt?: number; timePeriod?: HabitTimePeriod };
export const habitSortFields = ['priority', 'custom', 'days', 'streak', 'averageTime', 'created'] as const;
export type HabitSortField = typeof habitSortFields[number];
export type HabitSort = { field: HabitSortField; direction: 'asc' | 'desc' };
export const habitSortLabels: Record<HabitSortField, string> = { priority: '优先度', custom: '自定义排序', days: '坚持天数', streak: '连续打卡天数', averageTime: '平均打卡时间', created: '创建日期' };
export const isHabitSort = (value: unknown): value is HabitSort => !!value && typeof value === 'object'
  && habitSortFields.includes((value as HabitSort).field) && ['asc', 'desc'].includes((value as HabitSort).direction);
export const isHabitPriority = (value: unknown): value is HabitPriority => habitPriorities.includes(value as HabitPriority);

/** Missing timestamps belong to older data; equal keys retain the saved order. */
export function sortHabits<T extends HabitMetadata>(items: readonly T[]): T[] {
  const rank = (item: T) => habitPriorities.indexOf(isHabitPriority(item.priority) ? item.priority : 'none');
  const created = (item: T) => Number.isFinite(item.createdAt) && item.createdAt! > 0 ? item.createdAt! : 0;
  return [...items].sort((a, b) => rank(a) - rank(b) || created(b) - created(a));
}
