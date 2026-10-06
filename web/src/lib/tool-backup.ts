import { appTools } from "./app-tools";
import { normalizeDiningState, type DiningState } from '@/app/eat/food-data';
import { isMealLibrary, type MealLibrary } from "@/app/eat/meal-data";
import { cleanState, type ReminderState } from "@/app/daily/reminders";
import { isMemoState, type MemoState } from "@/app/memos/memo-data";
import { normalizePomodoroState, pauseTimer, type PomodoroState } from "@/app/pomodoro/pomodoro-data";
import { normalizeTodoState, type TodoState } from "./todo-data";
import { validDay } from "./tool-dates";
import type { PersonalToolKey } from "./use-personal-tool-state";

export type ToolData = { meals: MealLibrary; reminders: ReminderState; todos: TodoState; pomodoro: PomodoroState; memos: MemoState; dining: DiningState };
export type ImportMode = "merge" | "replace";
export type ToolBackup<K extends PersonalToolKey = PersonalToolKey> = {
  format: "ottlog-personal-tool"; version: 1; tool: K; exportedAt: string; data: ToolData[K];
};
export const toolNames = { ...Object.fromEntries(appTools.map(tool => [tool.key, tool.title])), meals: '饮食工具', dining: '吃什么' } as Record<PersonalToolKey, string>;
export const maximumBackupBytes = 8 * 1024 * 1024;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
const limit = (key: PersonalToolKey) => key === "meals" ? 128 * 1024 : 1024 * 1024;

/** Ignore JSON property order, but keep record order and duplicate entries observable. */
export function dataSignature(value: unknown): string {
  const sort = (item: unknown): unknown => Array.isArray(item) ? item.map(sort) : object(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, sort(item[key])])) : item;
  return JSON.stringify(sort(value));
}

/** Import must reject invalid/oversized records, never silently truncate a backup. */
export function validateToolData<K extends PersonalToolKey>(key: K, value: unknown): ToolData[K] {
  let valid = object(value) && value.version === 1;
  if (valid) {
    switch (key) {
      case "dining": valid = dataSignature(value) === dataSignature(normalizeDiningState(value)); break;
      case "meals": valid = isMealLibrary(value); break;
      case "memos": valid = isMemoState(value); break;
      case "todos": valid = dataSignature(value) === dataSignature(normalizeTodoState(value)); break;
      case "reminders": {
        const data = value as ReminderState;
        valid = Array.isArray(data.items) && object(data.done)
          && data.items.every(item => item && typeof item.id === "string" && !!item.id.trim())
          && Object.keys(data.done).every(validDay)
          && dataSignature(data) === dataSignature(cleanState(data));
        break;
      }
      case "pomodoro": {
        const data = value as PomodoroState;
        valid = Array.isArray(data.sessions) && data.sessions.every(item => object(item) && typeof item.endedAt === "string")
          && dataSignature({ ...data, sessions: [...data.sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)) }) === dataSignature(normalizePomodoroState(data));
        break;
      }
    }
  }
  if (!valid) throw new Error(`${toolNames[key]}的数据格式不完整、包含重复编号或超过数量限制，请检查备份文件。`);
  if (bytes(value) > limit(key)) throw new Error(`${toolNames[key]}的数据超过 ${limit(key) / 1024} KB 上限，请减少记录后重试。`);
  return value as ToolData[K];
}

export function createToolBackup<K extends PersonalToolKey>(tool: K, data: ToolData[K], at = new Date()): ToolBackup<K> {
  const valid = validateToolData(tool, data);
  // Snapshot a running timer at export time without pausing the actual page.
  const snapshot = tool === "pomodoro" ? pauseTimer(valid as PomodoroState, at.getTime()) : valid;
  return { format: "ottlog-personal-tool", version: 1, tool, exportedAt: at.toISOString(), data: validateToolData(tool, snapshot) };
}

export function parseToolBackup<K extends PersonalToolKey>(text: string, tool: K): ToolBackup<K> {
  if (new TextEncoder().encode(text).length > maximumBackupBytes) throw new Error("文件不能超过 8 MB。");
  let raw: unknown;
  try { raw = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch { throw new Error("文件不是有效的 JSON 备份，请重新选择。"); }
  if (!object(raw) || raw.format !== "ottlog-personal-tool" || raw.version !== 1) throw new Error("不支持这个备份格式或版本，请选择从日常工具导出的 JSON 文件。");
  if (raw.tool !== tool) throw new Error("这个备份属于其他工具，请到对应工具页面导入。");
  if (typeof raw.exportedAt !== "string" || !Number.isFinite(Date.parse(raw.exportedAt))) throw new Error("备份时间无效，请检查文件。");
  const data = validateToolData(tool, raw.data);
  return createToolBackup(tool, data, new Date(raw.exportedAt));
}

function mergeRecords<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const seen = new Set(current.map(item => item.id));
  return [...current, ...incoming.filter(item => !seen.has(item.id))];
}

export function importToolData<K extends PersonalToolKey>(tool: K, current: ToolData[K], incoming: ToolData[K], mode: ImportMode): ToolData[K] {
  const imported = validateToolData(tool, incoming);
  if (mode === "replace") {
    if (tool === "pomodoro" && object(current) && (current as PomodoroState).active) throw new Error("请先结束或重置当前番茄钟，再替换数据；也可以选择合并记录。");
    return imported;
  }
  const existing = validateToolData(tool, current);
  let result: unknown;
  switch (tool) {
    case "dining": {
      const a = existing as DiningState, b = imported as DiningState;
      result = { version: 1, customFoods: mergeRecords(a.customFoods, b.customFoods), history: mergeRecords(a.history, b.history).sort((x, y) => y.at.localeCompare(x.at)) };
      break;
    }
    case "meals": result = { version: 1, meals: mergeRecords((existing as MealLibrary).meals, (imported as MealLibrary).meals), ...((existing as MealLibrary).nutrition || (imported as MealLibrary).nutrition ? { nutrition: mergeRecords((existing as MealLibrary).nutrition ?? [], (imported as MealLibrary).nutrition ?? []) } : {}) }; break;
    case "memos": result = { version: 1, notes: mergeRecords((existing as MemoState).notes, (imported as MemoState).notes) }; break;
    case "todos": {
      const a = existing as TodoState, b = imported as TodoState;
      // Reuse existing categories with the same name, even across different accounts.
      const categories = [...a.categories];
      const ids = new Map<string, string>();
      for (const category of b.categories) {
        const match = categories.find(item => item.id === category.id) ?? categories.find(item => item.name.toLocaleLowerCase() === category.name.toLocaleLowerCase());
        ids.set(category.id, match?.id ?? category.id);
        if (!match) categories.push(category);
      }
      result = { version: 1, categories, tasks: mergeRecords(a.tasks, b.tasks.map(task => ({ ...task, categoryId: ids.get(task.categoryId) ?? task.categoryId }))) };
      break;
    }
    case "reminders": {
      const a = existing as ReminderState, b = imported as ReminderState;
      result = { version: 1, items: mergeRecords(a.items, b.items), done: Object.fromEntries([...new Set([...Object.keys(a.done), ...Object.keys(b.done)])].sort().map(day => [day, [...new Set([...(a.done[day] ?? []), ...(b.done[day] ?? [])])]])) };
      break;
    }
    case "pomodoro": {
      const a = existing as PomodoroState, b = imported as PomodoroState;
      result = { ...a, sessions: mergeRecords(a.sessions, b.sessions.filter(session => session.id !== a.active?.id)).sort((x, y) => y.endedAt.localeCompare(x.endedAt)) };
      break;
    }
  }
  return validateToolData(tool, result);
}

export function toolDataSummary(tool: PersonalToolKey, data: unknown): string {
  try {
    const valid = validateToolData(tool, data);
    switch (tool) {
      case "dining": { const state = valid as DiningState; return `${state.customFoods.length} 条自添餐单 · ${state.history.length} 次选择`; }
      case "meals": return `${(valid as MealLibrary).meals.length} 道餐食 · ${(valid as MealLibrary).nutrition?.length ?? 0} 条饮食记录`;
      case "reminders": { const state = valid as ReminderState; return `${state.items.length} 条行动 · ${Object.keys(state.done).length} 天记录`; }
      case "todos": { const state = valid as TodoState; return `${state.tasks.length} 件待办 · ${state.categories.length} 个分类`; }
      case "pomodoro": { const state = valid as PomodoroState; return `${state.sessions.length} 条计时记录${state.active ? " · 1 个未结束计时" : ""}`; }
      case "memos": return `${(valid as MemoState).notes.length} 条备忘`;
    }
  } catch { return "当前数据格式异常，可用有效备份替换恢复"; }
}
