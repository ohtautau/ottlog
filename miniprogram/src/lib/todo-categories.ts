import type { Todo, TodoCategory, TodoState } from './tool-records';

export const TODO_INBOX: TodoCategory = { id: '', name: '收集箱', color: '#b9dbca', iconId: 'notes' };
export type TodoCategoryDraft = { id: string; name: string; iconId: string; existing?: boolean };
export const todoCategoryChoices = (state: { categories: readonly TodoCategory[] }) => [TODO_INBOX, ...state.categories.filter(item => !!item.id)];
export const todoCategory = (state: { categories: readonly TodoCategory[] }, task: Pick<Todo, 'categoryId'>) => state.categories.find(item => !!item.id && item.id === task.categoryId) || TODO_INBOX;

/** Stable IDs keep assignment and panel sources independent of names and tags. */
export function saveTodoCategory(state: TodoState, draft: TodoCategoryDraft): TodoState {
  const name = draft.name.trim();
  if (!draft.id || !name || name.length > 32 || /[\u0000-\u001f]/.test(name)) throw new Error('分类名称需要1至32字');
  if (name === TODO_INBOX.name || state.categories.some(item => item.id !== draft.id && item.name === name)) throw new Error('已有同名分类');
  const previous = state.categories.find(item => item.id === draft.id);
  if (draft.existing && !previous) throw new Error('这个分类已被移除，请重新打开');
  if (previous?.name === name && previous.iconId === draft.iconId) return state;
  const category = { ...previous, id: draft.id, name, iconId: draft.iconId, color: previous?.color || TODO_INBOX.color };
  return { ...state, categories: previous ? state.categories.map(item => item.id === category.id ? category : item) : [...state.categories, category] };
}

/** Removing a category never deletes tasks or modifies their tags/priority. */
export function deleteTodoCategory(state: TodoState, id: string): TodoState {
  if (!id) throw new Error('收集箱不能删除');
  if (!state.categories.some(item => item.id === id)) return state;
  const panelSources = { ...state.panelSources };
  for (const slot of Object.keys(panelSources) as (keyof typeof panelSources)[]) {
    const source = panelSources[slot];
    if (source?.kind === 'category' && source.categoryId === id) delete panelSources[slot];
  }
  const panelQueues=state.panelQueues&&Object.fromEntries(Object.entries(state.panelQueues).map(([slot,queue])=>[slot,queue?.filter(source=>source.kind!=='category'||source.categoryId!==id)]));
  return { ...state, ...(panelQueues?{panelQueues}:{}), categories: state.categories.filter(item => item.id !== id), panelSources,
    tasks: state.tasks.map(task => task.categoryId === id ? { ...task, categoryId: '' } : task) };
}
