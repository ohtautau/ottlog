import { validNoteImages } from './note-image-data';
export type TodoSubtask = { id: string; title: string; completed: boolean };
export type TodoNextTask = { id: string; title: string };
export type TodoRecurrence = { unit: 'day' | 'week' | 'month' | 'year' | 'weekday'; interval: number; anchorDay?: number };
export type Todo = {
  id: string; title: string; description: string; categoryId: string; important: boolean; urgent: boolean;
  dueDate: string; dueTime?: string; tags?: string[]; recurrence?: TodoRecurrence; nextTasks?: TodoNextTask[];
  reminderAt?: string; generatedFrom?: string; completionGeneration?: string;
  completedAt: string | null; createdAt: string; updatedAt: string; subtasks?: TodoSubtask[]; images?: MemoImage[];
};
export type TodoCategory = { id: string; name: string; color: string; iconId?: string };
export type TodoSortMode = 'schedule' | 'created' | 'custom';
export type TodoPanelId = 'do' | 'plan' | 'delegate' | 'later';
export type TodoPanelSource = { kind: 'quadrant'; quadrantId: TodoPanelId } | { kind: 'category'; categoryId: string };
export type TodoState = { version: 1; tasks: Todo[]; categories: TodoCategory[]; sort?: TodoSortMode; panelSources?: Partial<Record<TodoPanelId, TodoPanelSource>>; panelQueues?: Partial<Record<TodoPanelId, TodoPanelSource[]>> };
export const initialTodoState: TodoState = { version: 1, tasks: [], categories: [{ id:'entertainment',name:'娱乐',iconId:'game',color:'#b9dbca' }, { id:'shopping',name:'购物',iconId:'shopping',color:'#b9dbca' }] };
export const todoQuadrants = [
  { id: 'do', title: '高优先级', caption: '重要且紧急', important: true, urgent: true, color: '#e7a097' },
  { id: 'plan', title: '中优先级', caption: '重要不紧急', important: true, urgent: false, color: '#e4ce85' },
  { id: 'delegate', title: '低优先级', caption: '紧急但不重要', important: false, urgent: true, color: '#99b8ec' },
  { id: 'later', title: '无优先级', caption: '不重要不紧急', important: false, urgent: false, color: '#abd0b2' },
] as const;
export const todoQuadrant = (task: Pick<Todo, 'important' | 'urgent'>) => todoQuadrants.find(item => item.important === task.important && item.urgent === task.urgent) || todoQuadrants[3];
export function isTodoState(value: unknown): value is TodoState {
  if (!value || typeof value !== 'object') return false;
  const state = value as TodoState;
  return state.version === 1 && Array.isArray(state.tasks) && Array.isArray(state.categories)
    && state.tasks.every(task => task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.description === 'string' && typeof task.categoryId === 'string' && typeof task.dueDate === 'string'
      && (!task.subtasks || Array.isArray(task.subtasks) && task.subtasks.every(child => child && typeof child.id === 'string' && typeof child.title === 'string'))
      && (task.dueTime === undefined || typeof task.dueTime === 'string' && (!task.dueTime || /^([01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime)))
      && (task.tags === undefined || Array.isArray(task.tags) && task.tags.every(tag => typeof tag === 'string'))
      && validNoteImages(task.images)
      && (task.nextTasks === undefined || Array.isArray(task.nextTasks) && task.nextTasks.every(child => child && typeof child.id === 'string' && typeof child.title === 'string'))
      && (task.recurrence === undefined || !!task.recurrence && ['day', 'week', 'month', 'year', 'weekday'].includes(task.recurrence.unit) && Number.isInteger(task.recurrence.interval) && task.recurrence.interval >= 1 && task.recurrence.interval <= 365
        && (task.recurrence.anchorDay === undefined || Number.isInteger(task.recurrence.anchorDay) && task.recurrence.anchorDay >= 1 && task.recurrence.anchorDay <= 31))
      && (task.reminderAt === undefined || typeof task.reminderAt === 'string' && (!task.reminderAt || Number.isFinite(Date.parse(task.reminderAt))))
      && (task.generatedFrom === undefined || typeof task.generatedFrom === 'string')
      && (task.completionGeneration === undefined || typeof task.completionGeneration === 'string'))
    && state.categories.every(category => category && typeof category.id === 'string' && typeof category.name === 'string');
}
export const memoColors = { blue: { label: '雾蓝', value: '#94b6e2', surface: '#354b65' }, sage: { label: '鼠尾草', value: '#abd0b2', surface: '#405747' }, sand: { label: '麦纸', value: '#e1c699', surface: '#594d38' }, rose: { label: '落日粉', value: '#dba8ad', surface: '#5b4049' }, violet: { label: '淡紫', value: '#b5ade1', surface: '#494461' }, mint: { label: '薄荷', value: '#b9dbca', surface: '#3d584e' } } as const;
export type MemoColor = keyof typeof memoColors;
export type MemoPriority = 'high' | 'medium' | 'low' | 'none';
export type MemoImage = { id: string; dataUrl: string };
export type Memo = { id: string; title: string; body: string; color: MemoColor; tags: string[]; priority?: MemoPriority; images?: MemoImage[]; iconId?: string; pinned: boolean; createdAt: string; updatedAt: string };
export type MemoState = { version: 1; notes: Memo[] };
export const initialMemoState: MemoState = { version: 1, notes: [] };
/** Missing priorities in existing records are read as none without migrating them. */
export const memoPriority = (note: Pick<Memo, 'priority'>): MemoPriority => note.priority ?? 'none';
/** Memo priority visuals use the task palette without changing stored values. */
export const memoPriorityColor = (priority: MemoPriority = 'none') => todoQuadrants[{ high: 0, medium: 1, low: 2, none: 3 }[priority]].color;
export function isMemoState(value: unknown): value is MemoState {
  if (!value || typeof value !== 'object') return false;
  const state = value as MemoState;
  return state.version === 1 && Array.isArray(state.notes) && state.notes.every(note => note && typeof note.id === 'string' && typeof note.title === 'string' && typeof note.body === 'string' && Array.isArray(note.tags) && note.tags.every(tag => typeof tag === 'string') && Object.prototype.hasOwnProperty.call(memoColors, note.color)
    && (note.priority === undefined || ['high', 'medium', 'low', 'none'].includes(note.priority)));
}
export const localToolDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const toolId = () => `mini-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
