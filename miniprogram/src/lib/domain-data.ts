import { habitTimePeriod, isHabitPriority, isHabitTimePeriod, type HabitMetadata } from './habit-metadata';
import { validNoteImages } from './note-image-data';
import type { MemoImage } from './tool-records';
export type GoalKind = 'longTerm' | 'shortTerm';
export type RecordKind = 'positive' | 'negative';
export type Goal = { id: string; content: string; status: 'active' | 'completed'; createdAt: string; completedAt?: string };
export type Habit = HabitMetadata & { id: string; name: string; startedDates: string[] };
export type RecordItem = { id: string; content: string; createdAt: string; images?: MemoImage[] };
export type Domain = {
  id: string; name: string; iconId?: string; longTermGoal: Goal | null; shortTermGoal: Goal | null;
  habits: Habit[]; positiveRecords: RecordItem[]; negativeRecords: RecordItem[];
};
export type CompletedGoal = Goal & { domainId: string; kind: GoalKind };
export type DomainState = { version: 1; domains: Domain[]; completedGoals: CompletedGoal[] };

export const MAX_DOMAIN_COUNT = 24;
export const MAX_DOMAIN_HABITS = 24;
export const MAX_DOMAIN_RECORDS = 5000;
export const MAX_DOMAIN_COMPLETED_GOALS = 1000;
export const MAX_DOMAIN_NAME_LENGTH = 24;
export const MAX_DOMAIN_GOAL_LENGTH = 200;
export const MAX_DOMAIN_HABIT_LENGTH = 24;
export const MAX_DOMAIN_RECORD_LENGTH = 6000;
// Leave space for the API envelope under the existing 1 MB request limit.
export const MAX_DOMAIN_DATA_BYTES = 980 * 1024;

const defaultDomainIcons = new Map<string, string>([
  ['growth', 'plant'], ['work', 'work'], ['english', 'language'], ['fitness', 'exercise'],
  ['life', 'home'], ['mind', 'breathe'], ['photo', 'camera'], ['media', 'film'],
]);
const starters = [
  ['growth', '成长'], ['work', '工作'], ['english', '英语'], ['fitness', '健身'],
  ['life', '生活'], ['mind', '心理'], ['photo', '摄影'], ['media', '自媒体'],
] as const;
export const initialDomainState: DomainState = {
  version: 1,
  domains: starters.map(([id, name]) => ({
    id, name, iconId: defaultDomainIcons.get(id), longTermGoal: null, shortTermGoal: null,
    habits: [],
    positiveRecords: [], negativeRecords: [],
  })),
  completedGoals: [],
};

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
const isText = (value: unknown, maximum: number): value is string => typeof value === 'string' && !!value.trim() && value.length <= maximum;
const isGoalKind = (value: unknown): value is GoalKind => value === 'longTerm' || value === 'shortTerm';
const isRecordKind = (value: unknown): value is RecordKind => value === 'positive' || value === 'negative';
const uniqueIds = (values: { id: string }[]) => new Set(values.map(value => value.id)).size === values.length;
/** Version 1 data saved before domain customization does not contain iconId. */
export function domainIcon(domain: Pick<Domain, 'id' | 'iconId'>): string {
  return isId(domain.iconId) ? domain.iconId : defaultDomainIcons.get(domain.id) ?? 'star';
}
function isIso(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19);
}
function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}
function isGoal(value: unknown, status: Goal['status']): value is Goal {
  return isObject(value) && isId(value.id) && isText(value.content, MAX_DOMAIN_GOAL_LENGTH) && value.status === status && isIso(value.createdAt)
    && (status === 'active' ? value.completedAt === undefined : isIso(value.completedAt) && Date.parse(value.completedAt) >= Date.parse(value.createdAt));
}
function isRecord(value: unknown): value is RecordItem {
  return isObject(value) && isId(value.id) && typeof value.content === 'string' && value.content.length <= MAX_DOMAIN_RECORD_LENGTH
    && validNoteImages(value.images) && (!!value.content.trim() || !!(value.images as MemoImage[] | undefined)?.length) && isIso(value.createdAt);
}
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
export function isDomainState(value: unknown): value is DomainState {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.domains) || value.domains.length > MAX_DOMAIN_COUNT
    || !Array.isArray(value.completedGoals) || value.completedGoals.length > MAX_DOMAIN_COMPLETED_GOALS) return false;
  if (!Array.from(value.domains).every(domain => isObject(domain) && isId(domain.id) && isText(domain.name, MAX_DOMAIN_NAME_LENGTH)
    && (domain.iconId === undefined || isId(domain.iconId))
    && (domain.longTermGoal === null || isGoal(domain.longTermGoal, 'active')) && (domain.shortTermGoal === null || isGoal(domain.shortTermGoal, 'active'))
    && Array.isArray(domain.habits) && domain.habits.length <= MAX_DOMAIN_HABITS
    && Array.from(domain.habits).every(habit => isObject(habit) && isId(habit.id) && isText(habit.name, MAX_DOMAIN_HABIT_LENGTH)
      && Array.isArray(habit.startedDates) && Array.from(habit.startedDates).every(isDateKey) && new Set(habit.startedDates).size === habit.startedDates.length
      && (habit.priority === undefined || isHabitPriority(habit.priority))
      && (habit.timePeriod === undefined || isHabitTimePeriod(habit.timePeriod))
      && (habit.createdAt === undefined || typeof habit.createdAt === 'number' && Number.isFinite(habit.createdAt) && habit.createdAt >= 0))
    && Array.isArray(domain.positiveRecords) && Array.from(domain.positiveRecords).every(isRecord)
    && Array.isArray(domain.negativeRecords) && Array.from(domain.negativeRecords).every(isRecord))) return false;
  const domains = value.domains as Domain[], ids = new Set(domains.map(domain => domain.id));
  if (!uniqueIds(domains) || !Array.from(value.completedGoals).every(goal => isObject(goal) && ids.has(goal.domainId as string) && isGoalKind(goal.kind) && isGoal(goal, 'completed'))) return false;
  const goals = [...value.completedGoals as CompletedGoal[], ...domains.flatMap(domain => [domain.longTermGoal, domain.shortTermGoal].filter((goal): goal is Goal => !!goal))];
  const habits = domains.flatMap(domain => domain.habits), records = domains.flatMap(domain => [...domain.positiveRecords, ...domain.negativeRecords]);
  if (!uniqueIds(goals) || !uniqueIds(habits) || !uniqueIds(records) || records.length > MAX_DOMAIN_RECORDS) return false;
  try { return serializedBytes(value) <= MAX_DOMAIN_DATA_BYTES; } catch { return false; }
}
function assertState(value: DomainState) {
  if (!isDomainState(value)) throw new Error('领域记录格式不正确，请重新读取');
}
function domainIn(state: DomainState, id: string): Domain {
  const domain = state.domains.find(item => item.id === id);
  if (!domain) throw new Error('这个领域已不存在，请重新打开');
  return domain;
}
function timestamp(now: Date): string {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()) || now.getFullYear() < 1970 || now.getFullYear() > 9999 || now.getUTCFullYear() > 9999) throw new Error('当前时间不正确，请检查设备时间');
  return now.toISOString();
}
export function localDateKey(now = new Date()): string {
  timestamp(now);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function identifier(prefix: string, existing: { id: string }[], now = new Date()): string {
  const occupied = new Set(existing.map(item => item.id));
  const base = `${prefix}-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  let result = base, suffix = 0;
  while (occupied.has(result)) result = `${base}-${++suffix}`;
  return result;
}
function capacityChecked(state: DomainState): DomainState {
  if (serializedBytes(state) > MAX_DOMAIN_DATA_BYTES) throw new Error('领域记录存储空间已满，已有记录已保留');
  return state;
}
function replaceDomain(state: DomainState, domain: Domain): DomainState {
  return capacityChecked({ ...state, domains: state.domains.map(item => item.id === domain.id ? domain : item) });
}
export function completedGoalCount(state: DomainState, domainId: string): number {
  return state.completedGoals.filter(goal => goal.domainId === domainId).length;
}
/** Keep the latest completed goal visible until a new goal replaces its card. */
export function displayedDomainGoal(state: DomainState, domainId: string, kind: GoalKind): Goal | null {
  const domain = domainIn(state, domainId);
  const current = kind === 'longTerm' ? domain.longTermGoal : domain.shortTermGoal;
  return current || [...state.completedGoals].reverse().find(goal => goal.domainId === domainId && goal.kind === kind) || null;
}

export type RecentDomainRecord = { domainId: string; domainName: string; kind: RecordKind; record: RecordItem };
/** One combined recent window; preserve the original records and image bytes. */
export function recentDomainRecords(state: DomainState, limit = 10): RecentDomainRecord[] {
  if (!Number.isFinite(limit) || limit < 1) return [];
  const records = state.domains.flatMap(domain => (['positive', 'negative'] as const).flatMap(kind =>
    (kind === 'positive' ? domain.positiveRecords : domain.negativeRecords).map(record => ({ domainId: domain.id, domainName: domain.name, kind, record }))));
  return records.filter(item => Number.isFinite(Date.parse(item.record.createdAt))).sort((a, b) =>
    Date.parse(b.record.createdAt) - Date.parse(a.record.createdAt) || (a.record.id < b.record.id ? 1 : a.record.id > b.record.id ? -1 : 0)).slice(0, Math.min(10, Math.floor(limit)));
}

export function undoDomainGoalCompletion(state: DomainState, domainId: string, kind: GoalKind, expectedGoalId: string): DomainState {
  assertState(state);
  if (!isGoalKind(kind)) throw new Error('请选择长期或短期目标');
  const domain = domainIn(state, domainId), key = kind === 'longTerm' ? 'longTermGoal' : 'shortTermGoal';
  const displayed = displayedDomainGoal(state, domainId, kind);
  // Repeated/stale taps must never overwrite a replacement or restore an older goal.
  if (domain[key] || !displayed || displayed.id !== expectedGoalId || displayed.status !== 'completed') return state;
  const restored: Goal = { id: displayed.id, content: displayed.content, status: 'active', createdAt: displayed.createdAt };
  return { ...state, domains: state.domains.map(item => item.id === domainId ? { ...item, [key]: restored } : item),
    completedGoals: state.completedGoals.filter(goal => goal.id !== expectedGoalId) };
}
export function saveDomain(state: DomainState, input: { id?: string; name: string; iconId: string }): DomainState {
  assertState(state);
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!isText(name, MAX_DOMAIN_NAME_LENGTH)) throw new Error(`领域名称需为 1–${MAX_DOMAIN_NAME_LENGTH} 个字符`);
  if (!isId(input.iconId)) throw new Error('请选择一个有效的图标');
  const existing = input.id === undefined ? undefined : state.domains.find(domain => domain.id === input.id);
  if (input.id !== undefined && !existing) throw new Error('这个领域已不存在，请重新打开');
  if (state.domains.some(domain => domain.id !== existing?.id && domain.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('已经有同名领域了');
  if (!existing && state.domains.length >= MAX_DOMAIN_COUNT) throw new Error(`最多保存 ${MAX_DOMAIN_COUNT} 个领域`);
  if (existing && existing.name === name && existing.iconId === input.iconId) return state;
  const domain: Domain = existing ? { ...existing, name, iconId: input.iconId } : {
    id: identifier('domain', state.domains), name, iconId: input.iconId,
    longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [],
  };
  return capacityChecked({ ...state, domains: existing ? state.domains.map(item => item.id === existing.id ? domain : item) : [...state.domains, domain] });
}
export function deleteDomain(state: DomainState, id: string): DomainState {
  assertState(state);
  if (!state.domains.some(domain => domain.id === id)) return state;
  return { ...state, domains: state.domains.filter(domain => domain.id !== id), completedGoals: state.completedGoals.filter(goal => goal.domainId !== id) };
}
export function reorderDomains(state: DomainState, ids: string[]): DomainState {
  assertState(state);
  if (!Array.isArray(ids)) throw new Error('领域排序格式不正确，请重新打开');
  const byId = new Map(state.domains.map(domain => [domain.id, domain]));
  const ordered = [...new Set(ids)].flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  const included = new Set(ordered.map(domain => domain.id));
  let index = 0;
  // Keep unmentioned domains in place, including any added while a sort was open.
  const domains = state.domains.map(domain => included.has(domain.id) ? ordered[index++] : domain);
  return domains.every((domain, position) => domain === state.domains[position]) ? state : { ...state, domains };
}
export function saveDomainGoal(state: DomainState, domainId: string, kind: GoalKind, content: string, now = new Date(), expectedGoalId?: string | null): DomainState {
  assertState(state);
  if (!isGoalKind(kind)) throw new Error('请选择长期或短期目标');
  const domain = domainIn(state, domainId), key = kind === 'longTerm' ? 'longTermGoal' : 'shortTermGoal', current = domain[key];
  if (expectedGoalId !== undefined && (current?.id ?? null) !== expectedGoalId) throw new Error('目标已变化，请重新打开');
  const text = typeof content === 'string' ? content.trim() : '';
  if (!isText(text, MAX_DOMAIN_GOAL_LENGTH)) throw new Error(`目标需为 1–${MAX_DOMAIN_GOAL_LENGTH} 个字符`);
  if (current?.content === text) return state;
  const goals = [...state.completedGoals, ...state.domains.flatMap(item => [item.longTermGoal, item.shortTermGoal].filter((goal): goal is Goal => !!goal))];
  const goal: Goal = current ? { ...current, content: text } : { id: identifier('goal', goals, now), content: text, status: 'active', createdAt: timestamp(now) };
  return replaceDomain(state, { ...domain, [key]: goal });
}
export function completeDomainGoal(state: DomainState, domainId: string, kind: GoalKind, expectedGoalId: string, now = new Date()): DomainState {
  assertState(state);
  if (!isGoalKind(kind)) throw new Error('请选择长期或短期目标');
  const domain = domainIn(state, domainId), key = kind === 'longTerm' ? 'longTermGoal' : 'shortTermGoal', goal = domain[key];
  // A late or repeated tap cannot complete a replacement goal.
  if (!goal || goal.id !== expectedGoalId) return state;
  if (state.completedGoals.length >= MAX_DOMAIN_COMPLETED_GOALS) throw new Error(`已保存 ${MAX_DOMAIN_COMPLETED_GOALS} 个已完成目标，已有目标已保留`);
  const completedAt = timestamp(now);
  if (Date.parse(completedAt) < Date.parse(goal.createdAt)) throw new Error('当前时间早于目标创建时间，请检查设备时间');
  return capacityChecked({ ...state, domains: state.domains.map(item => item.id === domainId ? { ...item, [key]: null } : item),
    completedGoals: [...state.completedGoals, { ...goal, status: 'completed', domainId, kind, completedAt }] });
}
export function saveDomainHabit(state: DomainState, domainId: string, name: string, id?: string, metadata: HabitMetadata = {}, now = new Date()): DomainState {
  assertState(state);
  const domain = domainIn(state, domainId), current = id === undefined ? undefined : domain.habits.find(habit => habit.id === id);
  if (id !== undefined && !current) throw new Error('这个习惯已不存在，请重新打开');
  const text = typeof name === 'string' ? name.trim() : '';
  if (!isText(text, MAX_DOMAIN_HABIT_LENGTH)) throw new Error(`习惯需为 1–${MAX_DOMAIN_HABIT_LENGTH} 个字符`);
  const priority = metadata.priority ?? current?.priority ?? 'none';
  if (!isHabitPriority(priority)) throw new Error('请选择习惯优先度');
  if (metadata.timePeriod !== undefined && !isHabitTimePeriod(metadata.timePeriod)) throw new Error('请选择习惯时段');
  const timePeriod = metadata.timePeriod ?? current?.timePeriod ?? 'free';
  if (current?.name === text && current.priority === priority && habitTimePeriod(current) === timePeriod) return state;
  if (!current && domain.habits.length >= MAX_DOMAIN_HABITS) throw new Error(`每个领域最多保存 ${MAX_DOMAIN_HABITS} 个习惯`);
  const habit: Habit = current ? { ...current, name: text, priority, timePeriod } : { id: identifier('habit', state.domains.flatMap(item => item.habits), now), name: text, priority, timePeriod, createdAt: now.getTime(), startedDates: [] };
  return replaceDomain(state, { ...domain, habits: current ? domain.habits.map(item => item.id === id ? habit : item) : [...domain.habits, habit] });
}
export function deleteDomainHabit(state: DomainState, domainId: string, id: string): DomainState {
  assertState(state);
  const domain = domainIn(state, domainId);
  if (!domain.habits.some(habit => habit.id === id)) return state;
  return replaceDomain(state, { ...domain, habits: domain.habits.filter(habit => habit.id !== id) });
}
export function toggleDomainHabit(state: DomainState, domainId: string, id: string, now = new Date()): DomainState {
  assertState(state);
  const domain = domainIn(state, domainId), habit = domain.habits.find(item => item.id === id);
  if (!habit) throw new Error('这个习惯已不存在，请重新打开');
  const today = localDateKey(now), started = habit.startedDates.includes(today);
  return replaceDomain(state, { ...domain, habits: domain.habits.map(item => item.id === id ? { ...item,
    startedDates: started ? item.startedDates.filter(day => day !== today) : [...item.startedDates, today] } : item) });
}
export function addDomainRecord(state: DomainState, domainId: string, kind: RecordKind, content: string, now = new Date()): DomainState {
  assertState(state);
  if (!isRecordKind(kind)) throw new Error('请选择正记录或负记录');
  const domain = domainIn(state, domainId), text = typeof content === 'string' ? content.trim() : '';
  if (!isText(text, MAX_DOMAIN_RECORD_LENGTH)) throw new Error(`记录需为 1–${MAX_DOMAIN_RECORD_LENGTH} 个字符`);
  const records = state.domains.flatMap(item => [...item.positiveRecords, ...item.negativeRecords]);
  if (records.length >= MAX_DOMAIN_RECORDS) throw new Error(`已保存 ${MAX_DOMAIN_RECORDS} 条记录，已有记录已保留`);
  const record: RecordItem = { id: identifier('record', records, now), content: text, createdAt: timestamp(now) };
  const key = kind === 'positive' ? 'positiveRecords' : 'negativeRecords';
  return replaceDomain(state, { ...domain, [key]: [...domain[key], record] });
}
export function deleteDomainRecord(state: DomainState, domainId: string, kind: RecordKind, id: string): DomainState {
  assertState(state);
  if (!isRecordKind(kind)) throw new Error('请选择正记录或负记录');
  const domain = domainIn(state, domainId), key = kind === 'positive' ? 'positiveRecords' : 'negativeRecords';
  if (!domain[key].some(record => record.id === id)) return state;
  return replaceDomain(state, { ...domain, [key]: domain[key].filter(record => record.id !== id) });
}

/** Create the fallback domain only when saving; opening/cancelling never changes data. */
export function addUncategorizedDomainRecord(state: DomainState, kind: RecordKind, content: string, now = new Date()): DomainState {
  assertState(state);
  const existing = state.domains.find(domain => domain.name.trim() === '未分类');
  const next = existing ? state : saveDomain(state, { name: '未分类', iconId: 'notes' });
  return addDomainRecord(next, existing?.id ?? next.domains[next.domains.length - 1].id, kind, content, now);
}

/** Commit both populated boxes together. Draft IDs also make volatile retries idempotent. */
export function saveDomainRecords(state: DomainState, domainId: string, entries: { kind: RecordKind; record: RecordItem }[], retry = false): DomainState {
  assertState(state);
  if (!entries.length || entries.length > 2
    || !entries.every(entry => isRecordKind(entry.kind) && isRecord(entry.record)) || !uniqueIds(entries.map(entry => entry.record))) throw new Error('请输入有效的记录内容，最多 6000 字');
  const all = state.domains.flatMap(domain => [...domain.positiveRecords, ...domain.negativeRecords]);
  // Validate the complete batch before creating even the fallback domain.
  if (all.length + entries.filter(entry => !all.some(record => record.id === entry.record.id)).length > MAX_DOMAIN_RECORDS) throw new Error(`最多保存 ${MAX_DOMAIN_RECORDS} 条记录`);
  const fallback = state.domains.find(domain => domain.name.trim() === '未分类');
  const next = domainId || fallback ? state : saveDomain(state, { name: '未分类', iconId: 'notes' });
  const domain = domainIn(next, domainId || fallback?.id || next.domains[next.domains.length - 1].id);
  let updated = domain;
  for (const { kind, record } of entries) {
    const key = kind === 'positive' ? 'positiveRecords' : 'negativeRecords';
    const existing = all.find(item => item.id === record.id);
    if (existing) {
      if (!retry || !domain[key].some(item => item.id === record.id) || JSON.stringify(existing) !== JSON.stringify(record)) throw new Error('记录已存在或发生变化，请重新打开');
      continue;
    }
    updated = { ...updated, [key]: [...updated[key], record] };
  }
  return updated === domain ? next : replaceDomain(next, updated);
}
