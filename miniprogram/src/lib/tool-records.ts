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
export type TodoCategory = { id: string; name: string; color: string };
export type TodoSortMode = 'schedule' | 'created' | 'custom';
export type TodoState = { version: 1; tasks: Todo[]; categories: TodoCategory[]; sort?: TodoSortMode };
export const initialTodoState: TodoState = { version: 1, tasks: demoTodos(), categories: [{ id: 'work', name: '工作', color: '#8aafff' }, { id: 'life', name: '生活', color: '#a8ceae' }, { id: 'study', name: '学习', color: '#dfd4b4' }] };
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
export const memoColors = { blue: { label: '雾蓝', value: '#94b6e2', surface: '#2c3b4c' }, sage: { label: '鼠尾草', value: '#abd0b2', surface: '#33423a' }, sand: { label: '麦纸', value: '#e1c699', surface: '#443e33' }, rose: { label: '落日粉', value: '#dba8ad', surface: '#45373d' }, violet: { label: '淡紫', value: '#b5ade1', surface: '#3a394c' }, mint: { label: '薄荷', value: '#b9dbca', surface: '#34443f' } } as const;
export type MemoColor = keyof typeof memoColors;
export type MemoPriority = 'high' | 'medium' | 'low' | 'none';
export type MemoImage = { id: string; dataUrl: string };
export type Memo = { id: string; title: string; body: string; color: MemoColor; tags: string[]; priority?: MemoPriority; images?: MemoImage[]; iconId?: string; pinned: boolean; createdAt: string; updatedAt: string };
export type MemoState = { version: 1; notes: Memo[] };
export const initialMemoState: MemoState = { version: 1, notes: demoMemos() };
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

// Starter records are only used when no saved state exists. Editing or deleting
// them uses normal persistence, so a deliberately emptied list stays empty.
export function demoTodos(now = new Date()): Todo[] {
  const stamp = now.toISOString();
  const day = (offset: number) => {
    const date = new Date(now); date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  return [
    { title: '整理本周的工作重点', categoryId: 'work', important: true, urgent: true, dueDate: day(0), description: '选出最值得推进的三件事，先完成其中一件。', tags: ['示例', '工作'] },
    { title: '练习二十分钟英语口语', categoryId: 'study', important: true, urgent: false, dueDate: day(0), description: '选一个生活话题，录一段自己的表达。', tags: ['示例', '英语'] },
    { title: '给周末的摄影散步选条路线', categoryId: 'life', important: true, urgent: false, dueDate: day(2), description: '找一条有树影、街角和咖啡店的路线。', tags: ['示例', '摄影'] },
    { title: '下班顺路买水果和酸奶', categoryId: 'life', important: false, urgent: true, dueDate: day(0), description: '苹果、香蕉、无糖酸奶。', tags: ['示例', '采购'] },
    { title: '收拾书桌上的小物件', categoryId: 'life', important: false, urgent: false, dueDate: '', description: '留下一块可以安心阅读和写字的位置。', tags: ['示例', '整理'] },
    { title: '记下三个自媒体选题', categoryId: 'work', important: false, urgent: false, dueDate: day(3), description: '从最近学到的东西、踩过的坑和日常观察里找灵感。', tags: ['示例', '创作'] },
  ].map((task, index) => ({ ...task, id: `demo-todo-${index + 1}`, completedAt: null, createdAt: stamp, updatedAt: stamp }));
}

export function demoMemos(now = new Date()): Memo[] {
  const notes: Pick<Memo, 'title' | 'body' | 'color' | 'tags' | 'iconId' | 'pinned'>[] = [
    { title: '这一周，想慢慢做好三件事', body: '把工作推进一点，把身体照顾好一点，也留一点时间给喜欢的事。\n\n这些是可以自由编辑或删除的示例便签。', color: 'sage', tags: ['示例', '生活'], iconId: 'goal', pinned: true },
    { title: '周末的摄影灵感', body: '雨后的倒影、傍晚的树影、路边亮起的第一盏灯。\n带一支轻便镜头，走慢一点。', color: 'blue', tags: ['示例', '摄影'], iconId: 'camera', pinned: false },
    { title: '读书时想留下的一句话', body: '把注意力放回今天能做的小事，让答案在行动里慢慢变清楚。', color: 'sand', tags: ['示例', '阅读'], iconId: 'book', pinned: false },
    { title: '下次想做的晚餐', body: '番茄炒蛋、清炒西兰花，再煮一小锅米饭。\n饭后出去散步十分钟。', color: 'rose', tags: ['示例', '饮食'], iconId: 'cook', pinned: false },
    { title: '英语表达随手记', body: 'One step at a time.\n一步一步来。\n\n今天试着用这句话描述一个正在推进的小目标。', color: 'violet', tags: ['示例', '英语'], iconId: 'language', pinned: false },
    { title: '一个内容选题的开头', body: '如果只用一分钟，怎么讲清楚最近学会的一件事？\n先写一个具体场景，再分享自己的做法。', color: 'sage', tags: ['示例', '创作'], iconId: 'write', pinned: false },
  ];
  return notes.map((note, index) => {
    const stamp = new Date(now.getTime() - index * 30 * 60 * 1000).toISOString();
    return { ...note, id: `demo-memo-${index + 1}`, createdAt: stamp, updatedAt: stamp };
  });
}
