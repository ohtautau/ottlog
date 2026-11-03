import { isTodoState, type TodoState } from './tool-records';
import { MAX_TODO_TASKS } from './todo-data';

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const ids = (state: TodoState) => state.tasks.map(task => task.id);
export function todoOperationLabel(before: TodoState, after: TodoState): string {
  const old = new Map(before.tasks.map(task => [task.id, task]));
  const changed = after.tasks.filter(task => old.has(task.id) && !same(task, old.get(task.id)));
  const completed = changed.find(task => !old.get(task.id)!.completedAt && !!task.completedAt);
  if (completed) return `已完成：${completed.title.trim()}`;
  if (changed.some(task => !!old.get(task.id)!.completedAt && !task.completedAt)) return '已重新打开任务';
  if (before.tasks.some(task => !after.tasks.some(next => next.id === task.id))) return '已删除任务';
  if (after.tasks.some(task => !old.has(task.id))) return '已创建任务';
  if (changed.some(task => task.important !== old.get(task.id)!.important || task.urgent !== old.get(task.id)!.urgent || task.categoryId !== old.get(task.id)!.categoryId)) return '已移动任务';
  if (!same(ids(before), ids(after)) || before.sort !== after.sort) return '已调整排序';
  return '已修改任务';
}

/** Reverse the latest local operation while preserving unrelated subsequent records. */
export function undoTodoOperation(current: TodoState, before: TodoState, after: TodoState): TodoState {
  if (![current, before, after].every(isTodoState)) throw new Error('任务格式已变化，无法撤销');
  const beforeMap = new Map(before.tasks.map(task => [task.id, task]));
  const afterMap = new Map(after.tasks.map(task => [task.id, task]));
  const currentMap = new Map(current.tasks.map(task => [task.id, task]));
  if (beforeMap.size !== before.tasks.length || afterMap.size !== after.tasks.length || currentMap.size !== current.tasks.length) throw new Error('任务编号不兼容，无法撤销');
  const affected = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].filter(id => !same(beforeMap.get(id), afterMap.get(id)));
  const stateFields = (['categories', 'sort', 'panelSources'] as const).filter(key => !same(before[key], after[key]));
  const reordered = before.tasks.length === after.tasks.length && before.tasks.every(task => afterMap.has(task.id)) && !same(ids(before), ids(after));
  const orderMatches = (reference: TodoState) => same(current.tasks.filter(task => afterMap.has(task.id)).map(task => task.id), reference.tasks.filter(task => currentMap.has(task.id)).map(task => task.id));
  // Retrying a failed local write can see the already-restored memory snapshot.
  if (affected.every(id => same(currentMap.get(id), beforeMap.get(id))) && stateFields.every(key => same(current[key], before[key])) && (!reordered || orderMatches(before))) return current;
  if (affected.some(id => !same(currentMap.get(id), afterMap.get(id))) || stateFields.some(key => !same(current[key], after[key])) || reordered && !orderMatches(after)) throw new Error('任务已发生其他修改，无法撤销这次操作');
  const changed = new Set(affected);
  let tasks = current.tasks.flatMap(task => changed.has(task.id) ? beforeMap.has(task.id) ? [beforeMap.get(task.id)!] : [] : [task]);
  for (let index = 0; index < before.tasks.length; index++) {
    const task = before.tasks[index];
    if (!changed.has(task.id) || afterMap.has(task.id)) continue;
    const following = before.tasks.slice(index + 1).find(candidate => tasks.some(item => item.id === candidate.id));
    const position = following ? tasks.findIndex(item => item.id === following.id) : tasks.length;
    tasks.splice(position, 0, task);
  }
  if (reordered) {
    const restored = new Map(tasks.map(task => [task.id, task]));
    const ordered = before.tasks.filter(task => restored.has(task.id)).map(task => restored.get(task.id)!);
    tasks = tasks.map(task => beforeMap.has(task.id) ? ordered.shift()! : task);
  }
  const next: TodoState = { ...current, tasks };
  for (const field of stateFields) {
    if (field === 'categories') next.categories = before.categories;
    else if (before[field] === undefined) delete next[field];
    else Object.assign(next, { [field]: before[field] });
  }
  if (tasks.length > MAX_TODO_TASKS || !isTodoState(next)) throw new Error('当前任务数量或格式不允许撤销');
  return next;
}
