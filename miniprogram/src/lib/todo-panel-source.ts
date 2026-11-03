import { todoQuadrants, todoQuadrant, type Todo, type TodoState, type TodoPanelId, type TodoPanelSource } from './tool-records';
import { moveTodo, orderTodos, saveTodoOrder, retryTodoMove, parseTodoTags } from './todo-data';

export const todoPrimaryTag = (task: Todo) => typeof task.primaryTag === 'string' ? task.primaryTag : task.tags?.[0] ?? '';
export const taskTagNames = (state: TodoState) => [...new Set([...state.tasks.flatMap(task => [...(task.tags || []), todoPrimaryTag(task)]), ...Object.keys(state.tagStyles || {})].filter(Boolean))];
export function getTodoPanelSource(state: TodoState, slot: TodoPanelId): TodoPanelSource {
  const source = state.panelSources?.[slot];
  if (source?.kind === 'tag' && typeof source.tag === 'string' && source.tag.trim()) return source;
  if (source?.kind === 'quadrant' && todoQuadrants.some(item => item.id === source.quadrantId)) return source;
  return { kind: 'quadrant', quadrantId: slot };
}
export function todoPanelPresentation(state: TodoState, slot: TodoPanelId) {
  const source = getTodoPanelSource(state, slot);
  const quadrant = source.kind === 'quadrant' ? todoQuadrants.find(item => item.id === source.quadrantId)! : null;
  return { source, title: quadrant ? quadrant.title : source.kind === 'tag' ? source.tag : '', caption: quadrant?.caption ?? '主要标签', color: quadrant?.color ?? '#b9dbca', iconId: source.kind === 'tag' ? state.tagStyles?.[source.tag]?.iconId : undefined };
}
export const todoMatchesPanel = (task: Todo, source: TodoPanelSource) => source.kind === 'quadrant' ? todoQuadrant(task).id === source.quadrantId : todoPrimaryTag(task) === source.tag;
export function setTodoPanelSource(state: TodoState, slot: TodoPanelId, source: TodoPanelSource): TodoState {
  if (!source || !['quadrant', 'tag'].includes(source.kind) || !todoQuadrants.some(item => item.id === slot) || source.kind === 'quadrant' && !todoQuadrants.some(item => item.id === source.quadrantId) || source.kind === 'tag' && !source.tag.trim()) throw new Error('请选择有效的显示方式');
  return JSON.stringify(getTodoPanelSource(state, slot)) === JSON.stringify(source) ? state : { ...state, panelSources: { ...state.panelSources, [slot]: source } };
}
export function saveTodoTag(state: TodoState, draft: { originalName?: string; name: string; iconId: string }): TodoState {
  const name = draft.name.trim(), old = draft.originalName;
  if (!name || name.length > 32 || parseTodoTags(name).length !== 1 || parseTodoTags(name)[0] !== name) throw new Error('标签需要1至32字，不含空格或分隔符');
  if (old && !taskTagNames(state).includes(old)) { if (state.tagStyles?.[name]?.iconId === draft.iconId) return state; throw new Error('这个标签已不存在，请重新打开'); }
  if (name !== old && taskTagNames(state).includes(name)) { if (!old && state.tagStyles?.[name]?.iconId === draft.iconId) return state; throw new Error('已有同名标签'); }
  const tagStyles = { ...state.tagStyles };
  if (old && old !== name) delete tagStyles[old];
  tagStyles[name] = { iconId: draft.iconId };
  const rename = old && old !== name;
  const panelSources = { ...state.panelSources };
  for (const slot of todoQuadrants) { const source = panelSources[slot.id as TodoPanelId]; if (rename && source?.kind === 'tag' && source.tag === old) panelSources[slot.id as TodoPanelId] = { kind: 'tag', tag: name }; }
  return { ...state, tagStyles, panelSources, tasks: rename ? state.tasks.map(task => ({ ...task, tags: task.tags?.map(tag => tag === old ? name : tag), ...(todoPrimaryTag(task) === old ? { primaryTag: name } : {}) })) : state.tasks };
}
export function deleteTodoTag(state: TodoState, tag: string): TodoState {
  const tagStyles = { ...state.tagStyles }; delete tagStyles[tag];
  const panelSources = { ...state.panelSources };
  for (const slot of todoQuadrants) if (panelSources[slot.id as TodoPanelId]?.kind === 'tag' && (panelSources[slot.id as TodoPanelId] as {tag:string}).tag === tag) delete panelSources[slot.id as TodoPanelId];
  return { ...state, tagStyles, panelSources, tasks: state.tasks.map(task => task.tags?.includes(tag) || todoPrimaryTag(task) === tag ? { ...task, tags: task.tags?.filter(item => item !== tag), ...(todoPrimaryTag(task) === tag ? { primaryTag: '' } : {}) } : task) };
}
export function moveTodoToPanel(state: TodoState, id: string, slot: TodoPanelId, beforeId: string | null, visibleIds?: readonly string[]): TodoState {
  const source = getTodoPanelSource(state, slot);
  if (source.kind === 'quadrant') return moveTodo(state, id, source.quadrantId, beforeId, visibleIds);
  const task = state.tasks.find(item => item.id === id);
  if (!task || beforeId === id) return state;
  const ordered = orderTodos(state), visible = new Set(visibleIds ?? ordered.map(item => item.id));
  const sameGroup = (item: Todo) => todoMatchesPanel(item, source) && !!item.completedAt === !!task.completedAt;
  if (!visible.has(id) || beforeId && !ordered.some(item => item.id === beforeId && visible.has(item.id) && sameGroup(item))) return state;
  const shown = ordered.filter(item => visible.has(item.id)), group = shown.filter(sameGroup);
  if (sameGroup(task) && beforeId === (group[group.findIndex(item => item.id === id) + 1]?.id ?? null)) return state;
  const moved = { ...task, primaryTag: source.tag, tags: [...new Set([...(task.tags || []), source.tag])], updatedAt: new Date().toISOString() };
  const tasks = shown.filter(item => item.id !== id);
  const at = beforeId ? tasks.findIndex(item => item.id === beforeId) : tasks.reduce((last, item, index) => sameGroup(item) ? index + 1 : last, tasks.length);
  tasks.splice(at, 0, moved); let index = 0;
  return saveTodoOrder(state, ordered.map(item => visible.has(item.id) ? tasks[index++] : item), 'custom');
}
export function retryTodoPanelMove(state: TodoState, target: TodoState, id: string, slot: TodoPanelId): TodoState {
  const source = getTodoPanelSource(target, slot), moved = target.tasks.find(item => item.id === id);
  if (source.kind === 'quadrant') return retryTodoMove(state, target, id);
  if (!moved || !state.tasks.some(item => item.id === id)) throw new Error('任务已不存在');
  const reordered = retryTodoMove(state, target, id), latest = state.tasks.find(item => item.id === id)!;
  return { ...reordered, tasks: reordered.tasks.map(task => task.id === id ? { ...task, important: latest.important, urgent: latest.urgent, primaryTag: source.tag, tags: [...new Set([...(latest.tags || []), source.tag])] } : task) };
}
