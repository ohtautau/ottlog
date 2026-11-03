import { saveTodo, parseTodoTags } from './todo-data';
import { resumeEditorInput } from './resume-editor-input';
import type { Todo, TodoState } from './tool-records';
import { visibleSubtasks } from './todo-subtasks';

/** Timestamp changes are acknowledgements, never another edit to save. */
export function todoEditSnapshot(task: Todo): string {
  const { updatedAt: _, ...editable } = task;
  return JSON.stringify({ ...editable, title: task.title.trim(), nextTasks: task.nextTasks?.filter(row => row.title.trim()), subtasks: task.subtasks ? visibleSubtasks(task.subtasks) : undefined });
}

/** Apply only fields edited in this window to the latest same-owner archive. */
export function autoSaveTodo(state: TodoState, baseline: Todo | null, draft: Todo, tags: string): TodoState {
  if (baseline && baseline.id !== draft.id) throw new Error('任务编号已变化，请重新打开');
  const latest = state.tasks.find(task => task.id === draft.id);
  if (baseline && !latest) throw new Error('这件任务已删除，未覆盖其他数据');
  const captured = { ...draft, tags: parseTodoTags(tags),
    nextTasks: draft.nextTasks?.filter(row => row.title.trim()), subtasks: draft.subtasks ? visibleSubtasks(draft.subtasks) : undefined };
  const next = latest && baseline ? resumeEditorInput(latest, baseline, captured) : captured;
  if (next.categoryId && !state.categories.some(category => category.id === next.categoryId)) next.categoryId = '';
  return saveTodo(state, next);
}
