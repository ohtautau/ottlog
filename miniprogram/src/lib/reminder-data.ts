import { initialDomainState } from './domain-data';
import { habitTimePeriod, isHabitPriority, isHabitSort, isHabitTimePeriod, type HabitMetadata, type HabitSort } from './habit-metadata';
import { alignHabitDomain } from './habit-domains';
export const groups = initialDomainState.domains.map(domain => domain.name);
export const scenes = {
  exercise: "力量 / 运动", unplug: "放下手机", supplement: "个人补剂安排", music: "音乐", moon: "月夜",
  shower: "淋浴", brush: "刷牙", celebrate: "庆祝", breathe: "心跳 / 呼吸", pause: "暂停",
  focus: "专注时钟", language: "语言", film: "影像创作", camera: "摄影", explore: "探索", notes: "笔记",
  pulse: "脉搏", measure: "测量", bag: "收拾背包", stretch: "伸展", food: "餐盘", slow: "慢慢吃",
  water: "喝水", sun: "晒太阳", walk: "散步", plant: "照顾植物", coffee: "休息一杯", tidy: "整理空间", write: "写一点文字", connect: "联系朋友",
} as const;
export type Scene = keyof typeof scenes;
export type Reminder = HabitMetadata & { id: string; title: string; group: string; domainId?: string; kind: Scene; note: string; minutes: number; enabled: boolean; iconId?: string; backgroundKind?: Scene; backgroundImage?: string };
/** Inclusive UTC calendar-day ranges retain totals when the 90-day calendar is trimmed. */
export type HabitDayRange = [number, number];
export type HabitReflection = { id: string; habitId: string; day: string; text: string; createdAt: number; lastShownAt?: number };
export type ReminderState = { version: 1; items: Reminder[]; done: Record<string, string[]>; completionHistory?: Record<string, HabitDayRange[]>; reflections?: HabitReflection[]; sort?: HabitSort; checkInTimes?: Record<string, Record<string, number>> };
export function isReminderState(value: unknown): value is ReminderState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as ReminderState;
  return state.version === 1 && Array.isArray(state.items) && state.items.length <= 80
    && !!state.done && typeof state.done === 'object' && !Array.isArray(state.done)
    && state.items.every(item => item && typeof item.id === 'string' && !!item.id && typeof item.title === 'string' && !!item.title.trim()
      && typeof item.note === 'string' && typeof item.group === 'string' && Object.prototype.hasOwnProperty.call(scenes, item.kind)
      && typeof item.minutes === 'number' && Number.isFinite(item.minutes) && typeof item.enabled === 'boolean'
      && (item.priority === undefined || isHabitPriority(item.priority))
      && (item.timePeriod === undefined || isHabitTimePeriod(item.timePeriod))
      && (item.createdAt === undefined || typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) && item.createdAt >= 0)
      && (item.domainId === undefined || typeof item.domainId === 'string'))
    && Object.values(state.done).every(ids => Array.isArray(ids) && ids.every(id => typeof id === 'string'))
    && (state.sort === undefined || isHabitSort(state.sort));
}
const item = (id: string, title: string, group: string, kind: Scene, note: string, minutes = 0): Reminder => alignHabitDomain({ id, title, group, kind, note, minutes, enabled: true, priority: 'none' }, initialDomainState.domains);
export const initialReminders: ReminderState = { version: 1, done: {}, items: [
  item("exercise", "力量训练", "健康", "exercise", "看看今天的训练安排。先换上运动鞋，也算开始。"),
  { ...item("cardio", "有氧运动", "健康", "walk", "按今天的安排，完成有氧运动。"), iconId: 'run' },
  item("unplug", "提醒自己戒游戏", "健康", "unplug", "这一局之后，把注意力还给自己。看看还有什么想做的。"),
  item("lunch-supplement", "午饭后吃补剂", "健康", "supplement", "核对自己的午饭后安排，按既定计划记录。"),
  item("dinner-supplement", "晚餐后吃补剂", "健康", "supplement", "核对自己的晚餐后安排，做过了就记一下。"),
  item("music", "睡前放音乐", "健康", "music", "挑一首想听的歌，让房间慢下来。"),
  item("melatonin", "吃褪黑素", "健康", "moon", "只核对你自己的既定安排，需要时再记录。"),
  item("shower", "洗澡", "健康", "shower", "放下手里的事，去冲掉今天的疲惫。"),
  item("morning-brush", "早上刷牙", "健康", "brush", "拿起牙刷，开始今天。"),
  item("evening-brush", "晚上刷牙", "健康", "brush", "给今天收个尾。"),
  item("celebrate", "做完事鼓励自己", "精神", "celebrate", "看到这条麻烦您屈尊夸一下自己。"),
  item("heart", "嘭嘭", "精神", "breathe", "让心嘭嘭。留一点时间，感受自己的心情。"),
  item("pause", "等等", "精神", "pause", "让事等等。不休息怎么工作！"),
  item("focus-work", "正事番茄钟", "学习", "focus", "目标，计划，可执行的下一步，这是不同的东西。先选一个下一步。", 25),
  item("focus-english", "英语番茄钟", "学习", "language", "打开一段英语，听一点、读一点、说一点。", 25),
  item("focus-media", "自媒体番茄钟", "学习", "film", "写下一条想表达的内容，从一个镜头开始。", 25),
  item("focus-photo", "摄影 / 后期番茄钟", "学习", "camera", "挑一张照片，观察光线，再试一个调整。", 25),
  item("explore", "拓展学习", "学习", "explore", "给好奇心留一个位置，打开一个想了解的话题。"),
  item("notes", "回顾笔记", "学习", "notes", "翻开一页旧笔记，找回一个曾经有用的想法。"),
  item("pulse", "记录晨脉", "健身", "pulse", "记下今天的观察，给以后的自己留个参考。"),
  item("measure", "测量身体数据", "健身", "measure", "按自己的记录习惯，补上今天的数据。"),
  item("bag", "携带训练用品", "健身", "bag", "水、毛巾、训练用品。出门前看一眼包。"),
  item("stretch", "活动度训练", "健身", "stretch", "想起自己的活动度练习，从熟悉的动作开始。"),
  item("food", "记录饮食", "饮食", "food", "记下刚才吃了什么，一句话也可以。"),
  item("slow", "记得慢点吃饭", "饮食", "slow", "暂时放下屏幕，好好尝一口眼前的食物。"),
] };

/** Split only the original combined default; retain its identity and history. */
export function splitDefaultExerciseHabit(value: ReminderState): ReminderState {
  if (!isReminderState(value)) return value;
  const index = value.items.findIndex(entry => entry.id === 'exercise' && entry.kind === 'exercise' && entry.title.trim() === '力量训练 / 有氧运动');
  if (index < 0) return value;
  const exercise = value.items[index];
  const existingCardio = value.items.some(entry => entry.title.trim() === '有氧运动'
    && (exercise.domainId !== undefined && entry.domainId !== undefined ? entry.domainId === exercise.domainId : entry.group === exercise.group));
  // A full archive must stay intact instead of losing its final habit or splitting halfway.
  if (!existingCardio && value.items.length >= 80) return value;
  const items = value.items.map((entry, position) => position === index ? { ...entry, title: '力量训练' } : entry);
  if (!existingCardio) {
    const occupied = new Set(items.map(entry => entry.id));
    // Orphan references must not become the history of a newly allocated habit.
    for (const ids of Object.values(value.done)) for (const id of ids) occupied.add(id);
    for (const id of Object.keys(value.completionHistory ?? {})) occupied.add(id);
    if (Array.isArray(value.reflections)) for (const reflection of value.reflections) {
      if (reflection && typeof reflection.habitId === 'string') occupied.add(reflection.habitId);
    }
    let id = 'cardio', suffix = 2;
    while (occupied.has(id)) id = `cardio-${suffix++}`;
    const cardio: Reminder = { id, title: '有氧运动', kind: 'walk', iconId: 'run', note: '按今天的安排，完成有氧运动。',
      group: exercise.group, enabled: exercise.enabled, priority: exercise.priority ?? 'none', minutes: exercise.minutes };
    if (exercise.domainId !== undefined) cardio.domainId = exercise.domainId;
    if (exercise.createdAt !== undefined) cardio.createdAt = exercise.createdAt;
    if (exercise.timePeriod !== undefined) cardio.timePeriod = exercise.timePeriod;
    items.splice(index + 1, 0, cardio);
  }
  const next = { ...value, items };
  let serialized: string;
  try { serialized = JSON.stringify(next); } catch { return value; }
  let bytes = 0;
  for (let index = 0; index < serialized.length; index++) {
    const code = serialized.codePointAt(index)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (code >= 0x10000) index++;
    if (bytes > 1024 * 1024) return value;
  }
  return next;
}

export function cleanState(value: ReminderState): ReminderState {
  if (!value || !Array.isArray(value.items)) return initialReminders;
  const seen = new Set<string>();
  const items = value.items.filter(r => r && typeof r.id === "string" && r.id.length <= 80 && !seen.has(r.id) && seen.add(r.id)
    && typeof r.title === "string" && r.title.trim() && typeof r.note === "string" && typeof r.group === "string" && Object.prototype.hasOwnProperty.call(scenes, r.kind))
    .slice(0, 80).map(r => {
      const result = { ...r, title: r.title.slice(0, 60), note: r.note.slice(0, 240), group: r.group.trim().slice(0, 24) || '未分类', priority: isHabitPriority(r.priority) ? r.priority : 'none' as const, enabled: r.enabled !== false, minutes: Math.min(120, Math.max(0, Number(r.minutes) || 0)) };
      if (r.timePeriod !== undefined) result.timePeriod = habitTimePeriod(r);
      if (result.backgroundKind !== undefined && !Object.prototype.hasOwnProperty.call(scenes, result.backgroundKind)) delete result.backgroundKind;
      if (result.backgroundImage !== undefined && !isBackgroundImage(result.backgroundImage)) delete result.backgroundImage;
      return result;
    });
  const allDone: Record<string, string[]> = {};
  if (value.done && typeof value.done === "object") for (const [day, ids] of Object.entries(value.done).sort()) {
    if (habitDayIndex(day) !== null && Array.isArray(ids)) allDone[day] = [...new Set(ids.filter(id => items.some(r => r.id === id)))];
  }
  const completionHistory: Record<string, HabitDayRange[]> = {};
  for (const entry of items) {
    let ranges = cleanHabitDayRanges(value.completionHistory && Object.prototype.hasOwnProperty.call(value.completionHistory, entry.id) ? value.completionHistory[entry.id] : undefined);
    // Explicit calendar records win over the archive, including undo on another client.
    for (const [day, ids] of Object.entries(allDone)) ranges = setHabitDay(ranges, habitDayIndex(day)!, ids.includes(entry.id));
    if (ranges.length) Object.defineProperty(completionHistory, entry.id, { value: ranges, enumerable: true, configurable: true, writable: true });
  }
  const reflections: HabitReflection[] = [];
  const reflectionIds = new Set<string>(), reflectionDays = new Set<string>();
  if (Array.isArray(value.reflections)) for (const entry of value.reflections) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || entry.id.length > 160 || reflectionIds.has(entry.id)
      || typeof entry.habitId !== 'string' || !items.some(item => item.id === entry.habitId)
      || typeof entry.day !== 'string' || habitDayIndex(entry.day) === null || !hasHabitDay(completionHistory[entry.habitId], habitDayIndex(entry.day)!)
      || typeof entry.text !== 'string' || !entry.text.trim() || !Number.isFinite(entry.createdAt) || entry.createdAt <= 0) continue;
    const key = `${entry.habitId}\n${entry.day}`;
    if (reflectionDays.has(key)) continue;
    reflectionIds.add(entry.id); reflectionDays.add(key);
    const result: HabitReflection = { id: entry.id, habitId: entry.habitId, day: entry.day, text: Array.from(entry.text.replace(/\s+/g, ' ').trim()).slice(0, 120).join(''), createdAt: entry.createdAt };
    if (typeof entry.lastShownAt === 'number' && Number.isFinite(entry.lastShownAt) && entry.lastShownAt > 0) result.lastShownAt = entry.lastShownAt;
    reflections.push(result);
  }
  const done = Object.fromEntries(Object.entries(allDone).slice(-90));
  const checkInTimes: Record<string, Record<string, number>> = {};
  if (value.checkInTimes && typeof value.checkInTimes === 'object') for (const [day, entries] of Object.entries(value.checkInTimes)) {
    if (!done[day] || !entries || typeof entries !== 'object' || Array.isArray(entries)) continue;
    const times = Object.fromEntries(Object.entries(entries).filter(([id, stamp]) => done[day].includes(id)
      && typeof stamp === 'number' && Number.isFinite(stamp) && stamp > 0 && localDate(new Date(stamp)) === day));
    if (Object.keys(times).length) checkInTimes[day] = times;
  }
  return { ...value, version: 1, items, done, completionHistory, reflections, ...(value.checkInTimes !== undefined ? { checkInTimes } : {}) };
}
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

/** Calendar arithmetic uses UTC ordinals so daylight-saving changes cannot shift a day. */
export function habitDayIndex(day: string): number | null {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [year, month, date] = day.split('-').map(Number);
  const stamp = new Date(Date.UTC(2000, month - 1, date)); stamp.setUTCFullYear(year);
  return stamp.getUTCFullYear() === year && stamp.getUTCMonth() === month - 1 && stamp.getUTCDate() === date ? Math.floor(stamp.getTime() / 86_400_000) : null;
}
export function cleanHabitDayRanges(value: unknown): HabitDayRange[] {
  if (!Array.isArray(value)) return [];
  const ranges: HabitDayRange[] = [];
  const minimum = -719528, maximum = 2932896; // 0000-01-01 through 9999-12-31.
  for (const pair of value.filter(pair => Array.isArray(pair) && pair.length === 2 && Number.isInteger(pair[0]) && Number.isInteger(pair[1]) && pair[0] >= minimum && pair[1] <= maximum && pair[0] <= pair[1]).sort((a, b) => a[0] - b[0])) {
    const last = ranges[ranges.length - 1];
    if (last && pair[0] <= last[1] + 1) last[1] = Math.max(last[1], pair[1]);
    else ranges.push([pair[0], pair[1]]);
  }
  return ranges;
}
export function hasHabitDay(ranges: HabitDayRange[] | undefined, day: number): boolean {
  return Array.isArray(ranges) && ranges.some(([start, end]) => start <= day && day <= end);
}
function setHabitDay(ranges: HabitDayRange[], day: number, completed: boolean): HabitDayRange[] {
  if (completed) return hasHabitDay(ranges, day) ? ranges : cleanHabitDayRanges([...ranges, [day, day]]);
  return ranges.flatMap(([start, end]): HabitDayRange[] => day < start || day > end ? [[start, end]] : [start < day ? [start, day - 1] as HabitDayRange : null, day < end ? [day + 1, end] as HabitDayRange : null].filter((range): range is HabitDayRange => range !== null));
}

/** Only raster data URLs or HTTPS images are allowed; SVG/data documents cannot be imported. */
export function isBackgroundImage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value === "") return true;
  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value.length <= 8 * 1024;
  if (value.length > 2048) return false;
  // WeChat does not expose the browser URL constructor on every base-library version.
  return /^https:\/\/[^\s/@?#]+(?:[/?#][^\s]*)?$/.test(value);
}

export function recentDays(end: string, length = 7): string[] {
  const [year, month, day] = end.split("-").map(Number);
  return Array.from({ length }, (_, index) => localDate(new Date(year, month - 1, day - length + 1 + index)));
}

export function toggleReminderDone(value: ReminderState, id: string, day: string, now = Date.now()): ReminderState {
  const state = cleanState(value);
  const ordinal = habitDayIndex(day);
  if (ordinal === null || !state.items.some(item => item.id === id && item.enabled)) return state;
  const previous = state.done[day] ?? state.items.filter(item => hasHabitDay(state.completionHistory?.[item.id], ordinal)).map(item => item.id);
  const updated = { ...state.done, [day]: previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id] };
  const checkInTimes = { ...state.checkInTimes };
  if (!previous.includes(id) && Number.isFinite(now) && now > 0 && day === localDate(new Date(now))) {
    checkInTimes[day] = { ...checkInTimes[day], [id]: now };
  }
  return cleanState({ ...state, done: updated, checkInTimes });
}

export function weekday(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `周${["日", "一", "二", "三", "四", "五", "六"][new Date(year, month - 1, date).getDay()]}`;
}
