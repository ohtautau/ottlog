export type GrowthSize = 'small' | 'medium' | 'large';
export type GrowthGoal = { id: string; title: string; createdAt: string | null };
export type GrowthDomain = { id: string; name: string; iconId: string; archived: boolean; currentGoal?: GrowthGoal | null };
export type GrowthEvent = { id: string; domainId: string; size: GrowthSize; createdAt: string; note?: string };
export type GrowthCompletedGoal = GrowthGoal & { domainId: string; completedAt: string };
export type GrowthState = { version: 1; domains: GrowthDomain[]; events: GrowthEvent[]; completedGoals: GrowthCompletedGoal[] };
export type GrowthStats = { total: number; recentMonths: number; month: number; week: number; recordCount: number; recentMonthsCount: number; monthCount: number; weekCount: number; completedGoalCount: number; lastEvent: GrowthEvent | null };

export const growthPoints: Readonly<Record<GrowthSize, number>> = { small: 1, medium: 3, large: 5 };
export const MAX_GROWTH_DOMAINS = 24;
export const MAX_GROWTH_EVENTS = 5000;
export const MAX_GROWTH_COMPLETED_GOALS = 1000;
export const MAX_GROWTH_NAME_LENGTH = 20;
export const MAX_GROWTH_GOAL_LENGTH = 80;
export const MAX_GROWTH_NOTE_LENGTH = 120;
// Keep room for the API request envelope under its 1 MB payload limit.
export const MAX_GROWTH_DATA_BYTES = 980 * 1024;
export const initialGrowthState: GrowthState = {
  version: 1,
  domains: [
    { id: 'work', name: '工作', iconId: 'work', archived: false },
    { id: 'health', name: '健康', iconId: 'pulse', archived: false },
    { id: 'mind', name: '精神', iconId: 'plant', archived: false },
    { id: 'fitness', name: '健身', iconId: 'exercise', archived: false },
    { id: 'photo', name: '摄影', iconId: 'camera', archived: false },
    { id: 'english', name: '英语', iconId: 'language', archived: false },
    { id: 'media', name: '自媒体', iconId: 'film', archived: false },
  ],
  events: [],
  completedGoals: [],
};

// Starter data is used only when no saved state exists; saved edits and empty
// histories are never replaced. Relative dates keep the preview useful over time.
export function demoGrowthState(now = new Date()): GrowthState {
  const at = (daysAgo: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };
  const samples = [
    { goal: '完成项目第一版并收集反馈', done: '梳理本月工作重点', notes: ['推进核心功能', '整理用户反馈', '完成一次项目复盘'], count: 28 },
    { goal: '本周有五天在十一点前休息', done: '连续一周坚持饭后散步', notes: ['提前半小时休息', '准备一份均衡午餐', '饭后散步二十分钟'], count: 22 },
    { goal: '读完一本书并写下三点感受', done: '完成七天睡前阅读', notes: ['安静阅读二十分钟', '写下今天的感受', '留出十分钟冥想'], count: 18 },
    { goal: '完成本周三次力量训练', done: '学会一组基础拉伸动作', notes: ['完成全身力量训练', '练习深蹲动作', '跑步后认真拉伸'], count: 25 },
    { goal: '拍一组有故事感的街头照片', done: '整理十张满意的作品', notes: ['练习捕捉傍晚光线', '尝试新的街头构图', '整理照片并记录思路'], count: 15 },
    { goal: '用英语做一次三分钟分享', done: '完成十次口语跟读', notes: ['跟读一段英文播客', '录制一分钟口语', '复习今天的新表达'], count: 24 },
    { goal: '发布一篇完整的图文作品', done: '整理出五个内容选题', notes: ['打磨文章开头', '整理选题素材', '完成图文内容初稿'], count: 12 },
  ];
  const events: GrowthEvent[] = [];
  const completedGoals: GrowthCompletedGoal[] = [];
  const domains = initialGrowthState.domains.map((domain, index) => {
    const sample = samples[index];
    for (let entry = 0; entry < sample.count; entry++) {
      // Recent entries populate this week/month; the rest span three months.
      const daysAgo = entry < 3 ? entry : 4 + (entry - 3) * 3;
      events.push({ id: `demo-growth-${domain.id}-${entry + 1}`, domainId: domain.id,
        size: (['small', 'medium', 'large'] as const)[(entry + index) % 3],
        createdAt: at(daysAgo), note: `示例：${sample.notes[entry % sample.notes.length]}` });
    }
    completedGoals.push({ id: `demo-completed-${domain.id}`, domainId: domain.id,
      title: sample.done, createdAt: at(28 + index), completedAt: at(8 + index) });
    return { ...domain, currentGoal: { id: `demo-goal-${domain.id}`, title: sample.goal, createdAt: at(7) } };
  });
  return { version: 1, domains, events, completedGoals };
}

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
const isText = (value: unknown, maximum: number): value is string => typeof value === 'string' && !!value.trim() && value.length <= maximum;
const isSize = (value: unknown): value is GrowthSize => value === 'small' || value === 'medium' || value === 'large';
function isIso(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  // Round-trip the calendar part as Date.parse normalizes impossible dates.
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19);
}
function isGoal(value: unknown): value is GrowthGoal {
  return isObject(value) && isId(value.id) && isText(value.title, MAX_GROWTH_GOAL_LENGTH) && (value.createdAt === null || isIso(value.createdAt));
}
function uniqueIds(values: { id: string }[]) { return new Set(values.map(value => value.id)).size === values.length; }
function serializedBytes(value: unknown): number {
  const json = JSON.stringify(value);
  let bytes = 0;
  for (let index = 0; index < json.length; index++) {
    const code = json.charCodeAt(index);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < json.length && json.charCodeAt(index + 1) >= 0xdc00 && json.charCodeAt(index + 1) <= 0xdfff) { bytes += 4; index++; }
    else bytes += 3;
  }
  return bytes;
}
export function isGrowthState(value: unknown): value is GrowthState {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.domains) || value.domains.length > MAX_GROWTH_DOMAINS
    || !Array.isArray(value.events) || value.events.length > MAX_GROWTH_EVENTS
    || !Array.isArray(value.completedGoals) || value.completedGoals.length > MAX_GROWTH_COMPLETED_GOALS) return false;
  if (!value.domains.every(domain => isObject(domain) && isId(domain.id) && isText(domain.name, MAX_GROWTH_NAME_LENGTH) && isId(domain.iconId)
    && typeof domain.archived === 'boolean' && (domain.currentGoal == null || isGoal(domain.currentGoal)))) return false;
  const domains = value.domains as GrowthDomain[];
  const domainIds = new Set(domains.map(domain => domain.id));
  if (!uniqueIds(domains)) return false;
  if (!value.events.every(event => isObject(event) && isId(event.id) && domainIds.has(event.domainId as string) && isSize(event.size) && isIso(event.createdAt)
    && (event.note === undefined || typeof event.note === 'string' && event.note.length <= MAX_GROWTH_NOTE_LENGTH))) return false;
  if (!value.completedGoals.every(goal => {
    if (!isObject(goal) || !domainIds.has(goal.domainId as string) || !isIso(goal.completedAt)) return false;
    const completedAt = goal.completedAt;
    return isGoal(goal) && (goal.createdAt === null || Date.parse(goal.createdAt) <= Date.parse(completedAt));
  })) return false;
  const events = value.events as GrowthEvent[], completed = value.completedGoals as GrowthCompletedGoal[];
  const allGoals = [...completed, ...domains.flatMap(domain => domain.currentGoal ? [domain.currentGoal] : [])];
  if (!uniqueIds(events) || !uniqueIds(allGoals)) return false;
  try { return serializedBytes(value) <= MAX_GROWTH_DATA_BYTES; } catch { return false; }
}
function assertState(value: GrowthState) {
  if (!isGrowthState(value)) throw new Error('成长记录格式不正确，请重新读取');
}
function writableDomain(state: GrowthState, id: string): GrowthDomain {
  const domain = state.domains.find(item => item.id === id);
  if (!domain) throw new Error('这个领域已不存在，请重新打开');
  if (domain.archived) throw new Error('请先恢复这个领域，再记录进步');
  return domain;
}
function timestamp(now: Date): string {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()) || now.getFullYear() < 1970 || now.getFullYear() > 9999) throw new Error('当前时间不正确，请检查设备时间');
  return now.toISOString();
}
function identifier(prefix: string, existing: { id: string }[], now = new Date()): string {
  const occupied = new Set(existing.map(item => item.id));
  const base = `${prefix}-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  let result = base, suffix = 0;
  while (occupied.has(result)) result = `${base}-${++suffix}`;
  return result;
}
function capacityChecked(state: GrowthState): GrowthState {
  if (serializedBytes(state) > MAX_GROWTH_DATA_BYTES) throw new Error('成长记录存储空间已满，已有记录已保留');
  return state;
}
export function recordGrowth(state: GrowthState, domainId: string, size: GrowthSize, now = new Date(), note?: string): GrowthState {
  assertState(state); writableDomain(state, domainId);
  if (!isSize(size)) throw new Error('请选择小进步、中等进步或大进步');
  if (state.events.length >= MAX_GROWTH_EVENTS) throw new Error(`已保存 ${MAX_GROWTH_EVENTS} 条成长记录，已有记录已保留`);
  if (note !== undefined && typeof note !== 'string') throw new Error('请输入文字备注');
  const trimmedNote = note?.trim();
  if (trimmedNote && trimmedNote.length > MAX_GROWTH_NOTE_LENGTH) throw new Error(`备注最多 ${MAX_GROWTH_NOTE_LENGTH} 个字符`);
  const event: GrowthEvent = { id: identifier('progress', state.events, now), domainId, size, createdAt: timestamp(now), ...(trimmedNote ? { note: trimmedNote } : {}) };
  return capacityChecked({ ...state, events: [...state.events, event] });
}
export function undoGrowth(state: GrowthState, eventId: string): GrowthState {
  assertState(state);
  if (!isId(eventId)) throw new Error('无法找到这条成长记录');
  if (!state.events.some(event => event.id === eventId)) return state;
  return { ...state, events: state.events.filter(event => event.id !== eventId) };
}
export function saveGrowthDomain(state: GrowthState, input: { id?: string; name: string; iconId: string }): GrowthState {
  assertState(state);
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!isText(name, MAX_GROWTH_NAME_LENGTH)) throw new Error(`领域名称需为 1–${MAX_GROWTH_NAME_LENGTH} 个字符`);
  if (!isId(input.iconId)) throw new Error('请选择一个有效的图标');
  const existing = input.id ? state.domains.find(domain => domain.id === input.id) : undefined;
  if (input.id !== undefined && !existing) throw new Error('这个领域已不存在，请重新打开');
  if (state.domains.some(domain => domain.id !== existing?.id && domain.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('已经有同名领域了');
  if (!existing && state.domains.length >= MAX_GROWTH_DOMAINS) throw new Error(`最多保存 ${MAX_GROWTH_DOMAINS} 个领域，可以恢复已归档的领域`);
  if (existing && existing.name === name && existing.iconId === input.iconId) return state;
  const domain: GrowthDomain = existing ? { ...existing, name, iconId: input.iconId } : { id: identifier('domain', state.domains), name, iconId: input.iconId, archived: false };
  return capacityChecked({ ...state, domains: existing ? state.domains.map(item => item.id === existing.id ? domain : item) : [...state.domains, domain] });
}
export function setGrowthGoal(state: GrowthState, domainId: string, title: string, now = new Date()): GrowthState {
  assertState(state);
  const domain = writableDomain(state, domainId), text = typeof title === 'string' ? title.trim() : '';
  if (!isText(text, MAX_GROWTH_GOAL_LENGTH)) throw new Error(`小目标需为 1–${MAX_GROWTH_GOAL_LENGTH} 个字符`);
  if (domain.currentGoal?.title === text) return state;
  const goal: GrowthGoal = domain.currentGoal ? { ...domain.currentGoal, title: text } : {
    id: identifier('goal', [...state.completedGoals, ...state.domains.flatMap(item => item.currentGoal ? [item.currentGoal] : [])], now),
    title: text, createdAt: timestamp(now),
  };
  return capacityChecked({ ...state, domains: state.domains.map(item => item.id === domainId ? { ...item, currentGoal: goal } : item) });
}
export function completeGrowthGoal(state: GrowthState, domainId: string, now = new Date(), expectedGoalId?: string): GrowthState {
  assertState(state);
  const domain = writableDomain(state, domainId), goal = domain.currentGoal;
  if (!goal || expectedGoalId !== undefined && goal.id !== expectedGoalId) return state;
  if (state.completedGoals.length >= MAX_GROWTH_COMPLETED_GOALS) throw new Error(`已保存 ${MAX_GROWTH_COMPLETED_GOALS} 个已完成目标，已有目标已保留`);
  const completedAt = timestamp(now);
  if (goal.createdAt && Date.parse(completedAt) < Date.parse(goal.createdAt)) throw new Error('当前时间早于目标创建时间，请检查设备时间');
  return capacityChecked({ ...state, domains: state.domains.map(item => item.id === domainId ? { ...item, currentGoal: null } : item),
    completedGoals: [...state.completedGoals, { ...goal, domainId, completedAt }] });
}
export function setGrowthDomainArchived(state: GrowthState, domainId: string, archived: boolean): GrowthState {
  assertState(state);
  const domain = state.domains.find(item => item.id === domainId);
  if (!domain) throw new Error('这个领域已不存在，请重新打开');
  if (typeof archived !== 'boolean') throw new Error('领域状态不正确');
  if (domain.archived === archived) return state;
  return capacityChecked({ ...state, domains: state.domains.map(item => item.id === domainId ? { ...item, archived } : item) });
}
export function reorderGrowthDomains(state: GrowthState, ids: string[]): GrowthState {
  assertState(state);
  const byId = new Map(state.domains.filter(domain => !domain.archived).map(domain => [domain.id, domain]));
  const ordered = [...new Set(ids)].flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  const included = new Set(ordered.map(domain => domain.id));
  let index = 0;
  const domains = state.domains.map(domain => included.has(domain.id) ? ordered[index++] : domain);
  return domains.every((domain, position) => domain === state.domains[position]) ? state : { ...state, domains };
}
function summarize(events: GrowthEvent[], completedGoals: GrowthCompletedGoal[], now: Date): GrowthStats {
  const end = now.getTime();
  if (!Number.isFinite(end)) throw new Error('当前时间不正确，请检查设备时间');
  // A rolling three-calendar-month window starts at local midnight, clamping
  // the day for shorter months (May 31 starts February 28, or 29 in leap years).
  const recentMonth = now.getMonth() - 3;
  const recentDay = Math.min(now.getDate(), new Date(now.getFullYear(), recentMonth + 1, 0).getDate());
  const recentMonthsStart = new Date(now.getFullYear(), recentMonth, recentDay).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  // Construct local calendar boundaries rather than subtracting 24-hour days: a
  // week that crosses a daylight-saving transition is not always 168 hours.
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7).getTime();
  const result: GrowthStats = { total: 0, recentMonths: 0, month: 0, week: 0, recordCount: 0, recentMonthsCount: 0, monthCount: 0, weekCount: 0, completedGoalCount: 0, lastEvent: null };
  for (const event of events) {
    const time = Date.parse(event.createdAt);
    if (!Number.isFinite(time) || time > end) continue;
    const points = growthPoints[event.size];
    result.total += points; result.recordCount++;
    if (time >= recentMonthsStart) { result.recentMonths += points; result.recentMonthsCount++; }
    if (time >= monthStart) { result.month += points; result.monthCount++; }
    if (time >= weekStart) { result.week += points; result.weekCount++; }
    if (!result.lastEvent || time >= Date.parse(result.lastEvent.createdAt)) result.lastEvent = event;
  }
  result.completedGoalCount = completedGoals.filter(goal => Date.parse(goal.completedAt) <= end).length;
  return result;
}
export function growthDomainStats(state: GrowthState, domainId: string, now = new Date()): GrowthStats {
  return summarize(state.events.filter(event => event.domainId === domainId), state.completedGoals.filter(goal => goal.domainId === domainId), now);
}
export function growthOverview(state: GrowthState, now = new Date()): GrowthStats & { activeDomainCount: number } {
  return { ...summarize(state.events, state.completedGoals, now), activeDomainCount: state.domains.filter(domain => !domain.archived).length };
}
