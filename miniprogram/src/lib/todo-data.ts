import { localToolDay, todoQuadrants, toolId, type Todo, type TodoState, type TodoSortMode } from './tool-records';
import { noteStateFits, validNoteImages } from './note-image-data';
export type { TodoSortMode } from './tool-records';

// The web client shares this limit. Never truncate a state to make room for generated tasks.
export const MAX_TODO_TASKS = 200;

export const DEFAULT_TODO_TAGS = ['工作', '学习', '生活', '购物'];

/** Spaces are ignored within names; punctuation and symbols separate names. */
export function parseTodoTags(text: string): string[] {
  const compact = text.replace(/[\s\p{Cf}\uFE0E\uFE0F]+/gu, '');
  return [...new Set(compact.split(/[\p{P}\p{S}\p{C}]+/u).filter(tag => /[\p{L}\p{N}]/u.test(tag)))];
}

export function sortTodosByTime(tasks: Todo[]): Todo[] {
  return sortTodos(tasks, 'schedule', 'asc');
}

export type TodoSortField = 'schedule' | 'created';
export type TodoSortDirection = 'asc' | 'desc';

/** Sort the original records without changing fields; missing time stays last in either direction. */
export function sortTodos(tasks: Todo[], field: TodoSortField, direction: TodoSortDirection): Todo[] {
  const key = (task: Todo) => field === 'schedule'
    ? task.dueDate ? `${task.dueDate}T${task.dueTime || '23:59'}` : null
    : Number.isFinite(Date.parse(task.createdAt)) ? Date.parse(task.createdAt) : null;
  return [...tasks].sort((a, b) => {
    const left = key(a), right = key(b);
    if (left === null || right === null) return left !== null ? -1 : right !== null ? 1 : 0;
    const comparison = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
    return direction === 'asc' ? comparison : -comparison;
  });
}

/** Older or newer unrecognized sort metadata must not invalidate the user's records. */
export function getTodoSortMode(state: TodoState): TodoSortMode {
  return state.sort === 'schedule' || state.sort === 'created' ? state.sort : 'custom';
}

export function orderTodos(state: TodoState): Todo[] {
  const mode = getTodoSortMode(state);
  return mode === 'custom' ? state.tasks : sortTodos(state.tasks, mode, mode === 'schedule' ? 'asc' : 'desc');
}

function saveTodoOrder(state: TodoState, tasks: Todo[], sort: TodoSortMode): TodoState {
  const updated = { ...state, tasks, sort };
  if (tasks.some(task => task.images?.length) && !noteStateFits(updated)) throw new Error('任务空间不足，请移除一些图片或整理旧任务');
  return updated;
}

export function applyTodoSort(state: TodoState, mode: TodoSortMode): TodoState {
  const tasks = mode === 'custom' ? orderTodos(state) : sortTodos(state.tasks, mode, mode === 'schedule' ? 'asc' : 'desc');
  return state.sort === mode && tasks.every((task, index) => task.id === state.tasks[index].id)
    ? state : saveTodoOrder(state, tasks, mode);
}

/** Reorder only the displayed IDs; filtered records retain their display-order slots. */
export function moveTodo(state: TodoState, id: string, quadrantId: string, beforeId: string | null, visibleIds?: readonly string[]): TodoState {
  const task = state.tasks.find(item => item.id === id);
  const quadrant = todoQuadrants.find(item => item.id === quadrantId);
  if (!task || !quadrant || beforeId === id) return state;
  const ordered = orderTodos(state);
  const visible = visibleIds ? new Set(visibleIds) : new Set(ordered.map(item => item.id));
  if (!visible.has(id)) return state;
  const sameGroup = (item: Todo) => item.important === quadrant.important && item.urgent === quadrant.urgent && !!item.completedAt === !!task.completedAt;
  const before = beforeId ? ordered.find(item => item.id === beforeId) : undefined;
  if (beforeId && (!before || !visible.has(beforeId) || !sameGroup(before))) return state;
  const shown = ordered.filter(item => visible.has(item.id));
  const sameQuadrant = task.important === quadrant.important && task.urgent === quadrant.urgent;
  if (sameQuadrant) {
    const group = shown.filter(sameGroup), current = group.findIndex(item => item.id === id);
    if (beforeId === (group[current + 1]?.id ?? null)) return state;
  }
  const tasks = shown.filter(item => item.id !== id);
  const moved = { ...task, important: quadrant.important, urgent: quadrant.urgent, updatedAt: new Date().toISOString() };
  let index = beforeId ? tasks.findIndex(item => item.id === beforeId) : -1;
  if (index < 0) {
    index = tasks.reduce((last, item, i) => sameGroup(item) ? i + 1 : last, tasks.length);
  }
  tasks.splice(index, 0, moved);
  let next = 0;
  return saveTodoOrder(state, ordered.map(item => visible.has(item.id) ? tasks[next++] : item), 'custom');
}

/** Retry the original absolute order without moving again or restoring deleted records. */
export function retryTodoMove(state: TodoState, target: TodoState, id: string): TodoState {
  const moved = target.tasks.find(task => task.id === id);
  if (!moved || !state.tasks.some(task => task.id === id)) throw new Error('任务已不存在，请重新排序');
  const remaining = new Map(state.tasks.map(task => [task.id, task]));
  const tasks = target.tasks.flatMap(task => {
    const latest = remaining.get(task.id);
    if (!latest) return [];
    remaining.delete(task.id);
    return [task.id === id ? { ...latest, important: moved.important, urgent: moved.urgent,
      updatedAt: Date.parse(latest.updatedAt) > Date.parse(moved.updatedAt) ? latest.updatedAt : moved.updatedAt } : latest];
  });
  return saveTodoOrder(state, [...tasks, ...remaining.values()], 'custom');
}

/** Keep the shared storage shape compatible while folding old categories into tags. */
export function mergeTodoCategories(state: TodoState): TodoState {
  return { ...state, tasks: state.tasks.map(task => {
    if (!task.categoryId) return task;
    const name = state.categories.find(category => category.id === task.categoryId)?.name.trim() || task.categoryId;
    return { ...task, categoryId: '', tags: [...new Set([...(task.tags || []), name])] };
  }) };
}

/** Derive toolbar feedback from all surviving tasks, independently of page filters or order. */
export function todoToolbarSummary(state: TodoState, now: Date): { completedToday: number; recent: Todo | undefined } {
  const cutoff = now.getTime(), dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  let completedToday = 0, recent: Todo | undefined, recentAt = -Infinity;
  for (const task of state.tasks) {
    const completedAt = typeof task.completedAt === 'string' ? Date.parse(task.completedAt) : NaN;
    if (!Number.isFinite(completedAt) || !Number.isFinite(cutoff) || completedAt > cutoff) continue;
    if (completedAt >= dayStart.getTime()) completedToday++;
    if (completedAt > recentAt || completedAt === recentAt && (!recent || task.id > recent.id)) {
      recent = task; recentAt = completedAt;
    }
  }
  return { completedToday, recent };
}

export function rankedTodoTags(state: TodoState): string[] {
  const counts = new Map<string, number>();
  for (const name of [...DEFAULT_TODO_TAGS, ...state.categories.map(category => category.name.trim())]) {
    if (name) counts.set(name, 0);
  }
  for (const task of state.tasks) for (const tag of new Set(task.tags || [])) counts.set(tag, (counts.get(tag) || 0) + 1);
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!);
}

export function createTodo(quadrantId = 'later', now = new Date()): Todo {
  const quadrant = todoQuadrants.find(item => item.id === quadrantId) || todoQuadrants[3];
  const timestamp = now.toISOString();
  return {
    id: toolId(), title: '', description: '', categoryId: '', important: quadrant.important, urgent: quadrant.urgent,
    dueDate: '', tags: [], nextTasks: [], subtasks: [], completedAt: null, createdAt: timestamp, updatedAt: timestamp,
  };
}

function calendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const result = new Date(0);
  result.setHours(12, 0, 0, 0);
  result.setFullYear(year, month - 1, day);
  return localToolDay(result) === value ? result : null;
}

function validRecurrence(task: Todo): boolean {
  const rule = task.recurrence;
  return !rule || ['day', 'week', 'month', 'year', 'weekday'].includes(rule.unit)
    && Number.isInteger(rule.interval) && rule.interval >= 1 && rule.interval <= 365
    && (rule.anchorDay === undefined || Number.isInteger(rule.anchorDay) && rule.anchorDay >= 1 && rule.anchorDay <= 31);
}

function monthlyAnchor(task: Todo, date: Date): number {
  const day = date.getDate();
  const anchor = task.recurrence?.anchorDay;
  if (!calendarDate(task.dueDate) || !anchor) return day;
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  // Another client can change the date without understanding the anchor field.
  // Retain an anchor only when this date is that day or its legitimate month-end clamp.
  return day === anchor || day === lastDay && anchor > day ? anchor : day;
}

/** Advance exactly one period. An overdue cycle stays overdue instead of silently skipping work. */
export function nextRecurrenceDate(task: Todo, now = new Date()): string {
  if (!task.recurrence) return '';
  if (!validRecurrence(task)) throw new Error('循环周期需要是 1 至 365 的整数');
  const date = calendarDate(task.dueDate) || calendarDate(localToolDay(now))!;
  const { unit, interval } = task.recurrence;
  if (unit === 'month' || unit === 'year') {
    const day = monthlyAnchor(task, date);
    date.setDate(1);
    date.setMonth(date.getMonth() + interval * (unit === 'year' ? 12 : 1));
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  } else if (unit === 'weekday') {
    for (let remaining = interval; remaining > 0;) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) remaining--;
    }
  } else {
    date.setDate(date.getDate() + interval * (unit === 'week' ? 7 : 1));
  }
  return localToolDay(date);
}

function ensureRoom(state: TodoState, count: number) {
  if (count && state.tasks.length + count > MAX_TODO_TASKS) {
    throw new Error(`最多保存 ${MAX_TODO_TASKS} 件任务，请先清理已完成任务${count > 1 ? `，本次需要 ${count} 个空位` : ''}`);
  }
}

export function saveTodo(state: TodoState, draft: Todo, now = new Date()): TodoState {
  const existing = state.tasks.find(task => task.id === draft.id);
  if (!draft.title.trim()) throw new Error('请先输入任务名称');
  if (draft.title.length > 100 || draft.description.length > 10000) throw new Error('任务名称最多 100 字，备注最多 10000 字');
  if (!validNoteImages(draft.images)) throw new Error('备注图片无效或超出数量限制，请重新选择');
  if (draft.dueDate && !calendarDate(draft.dueDate)) throw new Error('请选择有效的任务日期');
  if (draft.dueTime && (!draft.dueDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.dueTime))) throw new Error('请先选择任务日期，再设置有效的时间');
  if (!validRecurrence(draft)) throw new Error('循环周期需要是 1 至 365 的整数');
  const nextTasks = draft.nextTasks?.filter(child => child.title.trim());
  if ((nextTasks?.length || 0) > 50 || nextTasks?.some(child => child.title.length > 100)) throw new Error('最多 50 个下一步任务，每个不超过 100 字');
  if (draft.reminderAt && !Number.isFinite(Date.parse(draft.reminderAt))) throw new Error('请选择有效的通知时间');
  ensureRoom(state, existing ? 0 : 1);
  const recurrence = draft.recurrence ? { ...draft.recurrence } : undefined;
  if (recurrence?.unit === 'month' || recurrence?.unit === 'year') {
    if (!draft.dueDate) delete recurrence.anchorDay;
    else {
      const date = calendarDate(draft.dueDate)!;
      recurrence.anchorDay = existing?.dueDate !== draft.dueDate || existing?.recurrence?.unit !== recurrence.unit
        ? date.getDate() : monthlyAnchor(draft, date);
    }
  }
  const task: Todo = {
    ...existing, ...draft, title: draft.title.trim(), description: draft.description.trim(),
    images: (draft.images ?? existing?.images)?.map(image => ({ ...image })),
    tags: draft.tags ? [...new Set(draft.tags.map(tag => tag.trim()).filter(Boolean))] : draft.tags,
    recurrence, nextTasks: nextTasks?.map(child => ({ ...child, title: child.title.trim() })),
    subtasks: draft.subtasks?.map(child => ({ ...child, title: child.title.trim() })),
    completedAt: existing ? existing.completedAt : draft.completedAt,
    completionGeneration: existing ? existing.completionGeneration : draft.completionGeneration,
    generatedFrom: existing?.generatedFrom || draft.generatedFrom,
    createdAt: existing?.createdAt || draft.createdAt, updatedAt: now.toISOString(),
  };
  const updated = { ...state, tasks: existing ? state.tasks.map(item => item.id === task.id ? task : item) : [task, ...state.tasks] };
  if (updated.tasks.some(item => item.images?.length) && !noteStateFits(updated)) throw new Error('任务空间不足，请移除一些图片或整理旧任务');
  return updated;
}

// Stable, bounded IDs keep repeated evaluation of a state update deterministic.
function generatedId(source: Todo, kind: string, now: Date, occupied: Set<string>): string {
  let first = 0x811c9dc5, second = 0x9e3779b9;
  for (let index = 0; index < source.id.length; index++) {
    first = Math.imul(first ^ source.id.charCodeAt(index), 0x01000193);
    second = Math.imul(second ^ source.id.charCodeAt(index), 0x85ebca6b);
  }
  const base = `auto-${kind}-${now.getTime().toString(36)}-${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
  let result = base, suffix = 1;
  while (occupied.has(result)) result = `${base}-${suffix++}`;
  occupied.add(result);
  return result;
}

export function completeTodo(state: TodoState, taskId: string, now = new Date()): TodoState {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task || task.completedAt) return state;
  const timestamp = now.toISOString();
  const generated: Todo[] = [];
  // Each open-to-completed transition generates a fresh set. Older clients may
  // leave completionGeneration on reopened tasks, so completedAt is the guard.
  const nextTasks = task.nextTasks || [];
  if (nextTasks.some(child => !child.title.trim())) throw new Error('请先填写下一步任务名称');
  // Check capacity before marking completion or constructing either branch.
  ensureRoom(state, Number(!!task.recurrence) + Number(nextTasks.length > 0));
  const occupied = new Set(state.tasks.map(item => item.id));
  const base: Todo = {
    ...task, completedAt: null, createdAt: timestamp, updatedAt: timestamp,
    generatedFrom: task.id, completionGeneration: undefined, reminderAt: undefined,
    tags: task.tags ? [...task.tags] : undefined,
    images: task.images?.map(image => ({ ...image })),
  };
  if (task.recurrence) {
    const anchor = calendarDate(task.dueDate) || calendarDate(localToolDay(now))!;
    generated.push({
      ...base, id: generatedId(task, 'cycle', now, occupied), dueDate: nextRecurrenceDate(task, now),
      recurrence: { ...task.recurrence, ...(['month', 'year'].includes(task.recurrence.unit) ? { anchorDay: monthlyAnchor(task, anchor) } : {}) },
      nextTasks: nextTasks.map(child => ({ ...child })), subtasks: task.subtasks?.map(child => ({ ...child, completed: false })),
    });
  }
  if (nextTasks.length) {
    generated.push({
      ...base, id: generatedId(task, 'next', now, occupied), title: nextTasks[0].title.trim(),
      recurrence: undefined, subtasks: [],
      nextTasks: nextTasks.slice(1).map(child => ({ ...child })),
    });
  }
  const completed = { ...task, completedAt: timestamp, updatedAt: timestamp, completionGeneration: timestamp };
  const updated = { ...state, tasks: [...generated, ...state.tasks.map(item => item.id === taskId ? completed : item)] };
  if (generated.length && updated.tasks.some(item => item.images?.length) && !noteStateFits(updated)) throw new Error('任务空间不足，请移除一些图片或整理旧任务');
  return updated;
}

export function toggleTodo(state: TodoState, taskId: string, now = new Date()): TodoState {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return state;
  if (!task.completedAt) return completeTodo(state, taskId, now);
  // Existing generated tasks remain independent; reopening starts a new completion.
  return {
    ...state, tasks: state.tasks.map(item => item.id === taskId
      ? { ...item, completedAt: null, updatedAt: now.toISOString(), completionGeneration: undefined }
      : item),
  };
}
