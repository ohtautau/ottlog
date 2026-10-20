import { DEFAULT_TODO_TAGS, parseTodoTags } from './todo-data';
import { isMemoState, isTodoState, type MemoState, type TodoState } from './tool-records';

export type EntryTagCatalog = { tags: string[]; ready: boolean; owner: string };
export type EntryTagSource = { value: unknown; ready: boolean; owner: string };
const emptyTodos: TodoState = { version: 1, tasks: [], categories: [] };
const emptyMemos: MemoState = { version: 1, notes: [] };
const normalizedTags = (values: readonly string[]) => [...new Set(values.flatMap(parseTodoTags))];

/** Each task or memo contributes at most one use of a normalized tag. */
export function rankedEntryTags(todo: TodoState, memo: MemoState): string[] {
  const counts = new Map<string, number>();
  const include = (values: readonly string[], used: boolean) => {
    for (const tag of normalizedTags(values)) counts.set(tag, (counts.get(tag) || 0) + Number(used));
  };
  include(DEFAULT_TODO_TAGS, false);
  include(todo.categories.map(category => category.name), false);
  const categories = new Map(todo.categories.map(category => [category.id, category.name.trim()]));
  for (const task of todo.tasks) {
    const legacy = task.categoryId ? categories.get(task.categoryId) || task.categoryId : '';
    include([...(task.tags || []), legacy], true);
  }
  for (const note of memo.notes) include(note.tags, true);
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!);
}

/** Read only confirmed sources; a conflicting identity has no usable catalog. */
export function entryTagCatalog(todo: EntryTagSource, memo: EntryTagSource): EntryTagCatalog {
  if (todo.owner && memo.owner && todo.owner !== memo.owner) return { tags: [...DEFAULT_TODO_TAGS], ready: false, owner: '' };
  const owner = todo.owner || memo.owner;
  if (!owner) return { tags: [...DEFAULT_TODO_TAGS], ready: false, owner: '' };
  const todoValue = todo.ready && todo.owner === owner && isTodoState(todo.value) ? todo.value : null;
  const memoValue = memo.ready && memo.owner === owner && isMemoState(memo.value) ? memo.value : null;
  return { tags: rankedEntryTags(todoValue || emptyTodos, memoValue || emptyMemos), ready: !!todoValue && !!memoValue, owner };
}
