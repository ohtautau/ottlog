import { todoQuadrants, todoQuadrant, type Todo, type TodoState, type TodoPanelId, type TodoPanelSource } from './tool-records';
import { moveTodo, orderTodos, saveTodoOrder, retryTodoMove } from './todo-data';
import { TODO_INBOX, todoCategory, todoCategoryChoices } from './todo-categories';

export const todoPanelSourceKey=(source:TodoPanelSource)=>source.kind==='quadrant'?`quadrant:${source.quadrantId}`:`category:${source.categoryId}`;
export function allTodoPanelSources(state:Pick<TodoState,'categories'>):TodoPanelSource[]{return [...todoQuadrants.map(item=>({kind:'quadrant' as const,quadrantId:item.id})),...todoCategoryChoices(state).map(item=>({kind:'category' as const,categoryId:item.id}))];}
export function getTodoPanelQueue(state:TodoState,slot:TodoPanelId):TodoPanelSource[]{
 const available=allTodoPanelSources(state),keys=new Set(available.map(todoPanelSourceKey)),seen=new Set<string>();
 const raw=state.panelQueues?.[slot];
 const queue=(Array.isArray(raw)?raw:[{kind:'quadrant' as const,quadrantId:slot}]).filter(source=>{if(!source||!['quadrant','category'].includes(source.kind))return false;const key=todoPanelSourceKey(source);if(!keys.has(key)||seen.has(key))return false;seen.add(key);return true;});
 return queue.length?queue:[{kind:'quadrant',quadrantId:slot}];
}
export function setTodoPanelQueue(state:TodoState,slot:TodoPanelId,queue:readonly TodoPanelSource[]):TodoState{
 const allowed=new Set(allTodoPanelSources(state).map(todoPanelSourceKey));
 if(!todoQuadrants.some(item=>item.id===slot)||!queue.length||queue.length>allowed.size||queue.some(source=>!allowed.has(todoPanelSourceKey(source)))||new Set(queue.map(todoPanelSourceKey)).size!==queue.length)throw new Error('请至少选择一个有效显示项');
 const current=getTodoPanelSource(state,slot),source=queue.some(item=>todoPanelSourceKey(item)===todoPanelSourceKey(current))?current:queue[0];
 if(JSON.stringify(state.panelQueues?.[slot])===JSON.stringify(queue)&&todoPanelSourceKey(source)===todoPanelSourceKey(current))return state;
 return {...state,panelQueues:{...state.panelQueues,[slot]:[...queue]},panelSources:{...state.panelSources,[slot]:source}};
}
export function cycleTodoPanelSource(state: TodoState, slot: TodoPanelId, direction: number): TodoState {
 const sources=getTodoPanelQueue(state,slot),selected=todoPanelSourceKey(getTodoPanelSource(state,slot)),at=sources.findIndex(item=>todoPanelSourceKey(item)===selected);
 return setTodoPanelSource(state,slot,sources[(at+(direction<0?-1:1)+sources.length)%sources.length]);
}

export function getTodoPanelSource(state: TodoState, slot: TodoPanelId): TodoPanelSource {
  const source = state.panelSources?.[slot];
  if (source?.kind === 'category' && typeof source.categoryId === 'string' && (!source.categoryId || state.categories.some(item => item.id === source.categoryId))) return source;
  if (source?.kind === 'quadrant' && todoQuadrants.some(item => item.id === source.quadrantId)) return source;
  return { kind: 'quadrant', quadrantId: slot };
}
export function todoPanelPresentation(state: TodoState, slot: TodoPanelId) {
  const source = getTodoPanelSource(state, slot);
  const quadrant = source.kind === 'quadrant' ? todoQuadrants.find(item => item.id === source.quadrantId)! : null;
  const category = source.kind === 'category' ? todoCategory(state, source) : null;
  return { source, title: quadrant?.title ?? category!.name, caption: quadrant?.caption ?? '分类', color: quadrant?.color ?? (category?.color || TODO_INBOX.color), iconId: category?.iconId };
}
export const todoMatchesPanel = (task: Todo, source: TodoPanelSource) => source.kind === 'quadrant' ? todoQuadrant(task).id === source.quadrantId : task.categoryId === source.categoryId;
export function setTodoPanelSource(state: TodoState, slot: TodoPanelId, source: TodoPanelSource): TodoState {
  if (!source || !['quadrant', 'category'].includes(source.kind) || !todoQuadrants.some(item => item.id === slot) || source.kind === 'quadrant' && !todoQuadrants.some(item => item.id === source.quadrantId) || source.kind === 'category' && (typeof source.categoryId !== 'string' || !!source.categoryId && !state.categories.some(item => item.id === source.categoryId))) throw new Error('请选择有效的显示方式');
  return JSON.stringify(getTodoPanelSource(state, slot)) === JSON.stringify(source) ? state : { ...state, panelSources: { ...state.panelSources, [slot]: source } };
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
  const moved = { ...task, categoryId: source.categoryId, updatedAt: new Date().toISOString() };
  const tasks = shown.filter(item => item.id !== id);
  const at = beforeId ? tasks.findIndex(item => item.id === beforeId) : tasks.reduce((last, item, index) => sameGroup(item) ? index + 1 : last, tasks.length);
  tasks.splice(at, 0, moved); let index = 0;
  return saveTodoOrder(state, ordered.map(item => visible.has(item.id) ? tasks[index++] : item), 'custom');
}
export function retryTodoPanelMove(state: TodoState, target: TodoState, id: string, slot: TodoPanelId): TodoState {
  const source = getTodoPanelSource(target, slot), moved = target.tasks.find(item => item.id === id);
  if (source.kind === 'quadrant') return retryTodoMove(state, target, id);
  if (!moved || !state.tasks.some(item => item.id === id)) throw new Error('任务已不存在');
  if (source.categoryId && !state.categories.some(item => item.id === source.categoryId)) throw new Error('分类已不存在，请重新选择');
  const reordered = retryTodoMove(state, target, id), latest = state.tasks.find(item => item.id === id)!;
  return { ...reordered, tasks: reordered.tasks.map(task => task.id === id ? { ...task, important: latest.important, urgent: latest.urgent, categoryId: source.categoryId } : task) };
}
