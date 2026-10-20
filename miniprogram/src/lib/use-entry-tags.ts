import { useEffect, useMemo } from 'react';
import { entryTagCatalog, type EntryTagCatalog } from './entry-tags';
import { initialMemoState, initialTodoState } from './tool-records';
import { usePersonalToolState } from './use-personal-tool-state';

/** Shared suggestions use the original stores; this hook never saves a tag library. */
export function useEntryTags(): EntryTagCatalog {
  const todo = usePersonalToolState('todos', initialTodoState);
  const memo = usePersonalToolState('memos', initialMemoState);
  // Popups mount after the containing page's onShow has already fired.
  useEffect(() => { todo.retry(); memo.retry(); }, [todo.retry, memo.retry]);
  return useMemo(() => entryTagCatalog(todo, memo), [todo.value, todo.owner, todo.ready, memo.value, memo.owner, memo.ready]);
}
