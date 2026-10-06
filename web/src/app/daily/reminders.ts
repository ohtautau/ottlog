export const groups = ["健康", "精神", "学习", "健身", "饮食"] as const;
export const scenes = {
  exercise: "力量 / 运动", unplug: "放下手机", supplement: "个人补剂安排", music: "音乐", moon: "月夜",
  shower: "淋浴", brush: "刷牙", celebrate: "庆祝", breathe: "心跳 / 呼吸", pause: "暂停",
  focus: "专注时钟", language: "语言", film: "影像创作", camera: "摄影", explore: "探索", notes: "笔记",
  pulse: "脉搏", measure: "测量", bag: "收拾背包", stretch: "伸展", food: "餐盘", slow: "慢慢吃",
  water: "喝水", sun: "晒太阳", walk: "散步", plant: "照顾植物", coffee: "休息一杯", tidy: "整理空间", write: "写一点文字", connect: "联系朋友",
} as const;
export type Scene = keyof typeof scenes;
export type Reminder = { id: string; title: string; group: string; domainId?: string; priority?: 'high' | 'medium' | 'low' | 'none'; createdAt?: number; kind: Scene; iconId?: string; note: string; minutes: number; enabled: boolean; backgroundKind?: Scene; backgroundImage?: string };
export type ReminderState = { version: 1; items: Reminder[]; done: Record<string, string[]> };
const item = (id: string, title: string, group: string, kind: Scene, note: string, minutes = 0): Reminder => ({ id, title, group, kind, note, minutes, enabled: true });
export const initialReminders: ReminderState = { version: 1, done: {}, items: [
  item("exercise", "力量训练 / 有氧运动", "健康", "exercise", "看看今天的训练安排。先换上运动鞋，也算开始。"),
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

export function cleanState(value: ReminderState): ReminderState {
  if (!value || !Array.isArray(value.items)) return initialReminders;
  const seen = new Set<string>();
  const items = value.items.filter(r => r && typeof r.id === "string" && r.id.length <= 80 && !seen.has(r.id) && seen.add(r.id)
    && typeof r.title === "string" && r.title.trim() && typeof r.note === "string" && typeof r.group === "string" && Object.hasOwn(scenes, r.kind))
    .slice(0, 80).map(r => {
      const result = { ...r, title: r.title.slice(0, 60), note: r.note.slice(0, 240), group: r.group.trim().slice(0, 24) || '未分类', enabled: r.enabled !== false, minutes: Math.min(120, Math.max(0, Number(r.minutes) || 0)) };
      if (result.backgroundKind !== undefined && !Object.hasOwn(scenes, result.backgroundKind)) delete result.backgroundKind;
      if (result.backgroundImage !== undefined && !isBackgroundImage(result.backgroundImage)) delete result.backgroundImage;
      return result;
    });
  const done: Record<string, string[]> = {};
  if (value.done && typeof value.done === "object") for (const [day, ids] of Object.entries(value.done).sort().slice(-90)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(ids)) done[day] = [...new Set(ids.filter(id => items.some(r => r.id === id)))];
  }
  // Preserve metadata written by newer clients, including habit reflections and archived totals.
  return { ...value, version: 1, items, done };
}
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

/** Only raster data URLs or HTTPS images are allowed; SVG/data documents cannot be imported. */
export function isBackgroundImage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value === "") return true;
  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value.length <= 8 * 1024;
  if (value.length > 2048) return false;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

export function weekday(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `周${["日", "一", "二", "三", "四", "五", "六"][new Date(year, month - 1, date).getDay()]}`;
}
