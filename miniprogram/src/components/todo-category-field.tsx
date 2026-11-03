import { useEffect, useRef } from 'react';
import { initialTodoState, isTodoState } from '../lib/tool-records';
import { deleteTodoCategory, saveTodoCategory } from '../lib/todo-categories';
import { hasVolatilePersonalTool, usePersonalToolState } from '../lib/use-personal-tool-state';
import TodoCategoryPicker from './todo-category-picker';

/** Both task hosts use the same owner-bound category queue and picker. */
export default function TodoCategoryField({ value, onChange, owner, disabled = false }: {
  value: string; onChange: (id: string) => void; owner: string; disabled?: boolean;
}) {
  const source = usePersonalToolState('todos', initialTodoState);
  const latest = useRef({ value, owner, onChange }); latest.current = { value, owner, onChange };
  useEffect(() => { source.retry(); }, [source.retry]);
  const writable = source.ready && source.owner === owner && isTodoState(source.value);
  async function mutate(update: (state: typeof initialTodoState) => typeof initialTodoState) {
    const expectedOwner = owner;
    if (!writable || disabled) throw new Error('分类数据尚未就绪');
    await source.setValue(previous => {
      if (latest.current.owner !== expectedOwner || !isTodoState(previous)) throw new Error('账号或分类数据已变化');
      return update(previous);
    });
    if (hasVolatilePersonalTool('todos', expectedOwner)) throw new Error('分类尚未保存，请重试');
  }
  return <TodoCategoryPicker categories={writable ? source.value.categories : []} value={value} owner={owner} disabled={disabled || !writable}
    onChange={onChange} onUpsert={draft => mutate(previous => saveTodoCategory(previous, draft))}
    onDelete={async id => { const expectedOwner = owner; await mutate(previous => deleteTodoCategory(previous, id)); if (latest.current.owner === expectedOwner && latest.current.value === id) latest.current.onChange(''); }} />;
}
