import { useEffect, useRef, useState } from 'react';
import { useDidHide, useDidShow } from '@tarojs/taro';
import { isTodoState, type TodoState } from './tool-records';
import type { PersonalToolEdit } from './tool-state-store';
import { subscribePersonalToolEdits } from './use-personal-tool-state';
import { todoOperationLabel } from './todo-undo';

export type TodoUndoEdit = { owner: string; before: TodoState; after: TodoState };
type Notice = { id: number; message: string; undo?: TodoUndoEdit; expires: number };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export default function useTodoUndo(owner: string, blocked: boolean, restore: (edit: TodoUndoEdit) => Promise<void>) {
  const [pending, setPending] = useState<TodoUndoEdit | null>(null), [notice, setNotice] = useState<Notice | null>(null), [busy, setBusy] = useState(false);
  const latest = useRef({ owner, restore }); latest.current = { owner, restore };
  const active = useRef(true), restoring = useRef(false), sequence = useRef(0), operation = useRef(0), failed = useRef<TodoUndoEdit | null>(null);
  function clear() { setPending(null); setNotice(null); failed.current = null; }
  useDidShow(() => { active.current = true; });
  useDidHide(() => { active.current = false; ++operation.current; restoring.current = false; setBusy(false); clear(); });
  useEffect(() => {
    ++operation.current; clear(); restoring.current = false; setBusy(false);
    if (!owner) return;
    const unsubscribe = subscribePersonalToolEdits('todos', owner, (event: PersonalToolEdit) => {
      if (!active.current || restoring.current || !isTodoState(event.before) || !isTodoState(event.after)) return;
      const edit = { owner, before: copy(failed.current?.before ?? event.before), after: copy(event.after) };
      if (!event.durable) { failed.current = edit; return; }
      failed.current = null;
      if (JSON.stringify(edit.before) !== JSON.stringify(edit.after)) setPending(edit);
    });
    return () => { ++operation.current; unsubscribe(); };
  }, [owner]);
  useEffect(() => {
    if (!pending || blocked || pending.owner !== owner) return;
    setNotice({id: ++sequence.current, message: todoOperationLabel(pending.before, pending.after), undo: pending, expires: Date.now() + 5000});
    setPending(null);
  }, [pending, blocked, owner]);
  useEffect(() => {
    if (!notice || busy) return;
    const timer = setTimeout(() => setNotice(previous => previous?.id === notice.id ? null : previous), Math.max(0, notice.expires - Date.now()));
    return () => clearTimeout(timer);
  }, [notice, busy]);
  async function undo() {
    const target = notice?.undo;
    if (!target || restoring.current || blocked || target.owner !== latest.current.owner) return;
    const request = ++operation.current;
    restoring.current = true; setBusy(true);
    try {
      await latest.current.restore(target);
      if (active.current && request === operation.current && latest.current.owner === target.owner) setNotice({id: ++sequence.current, message: '已撤销此操作', expires: Date.now() + 5000});
    } catch (error) {
      if (active.current && request === operation.current && latest.current.owner === target.owner) setNotice({id: ++sequence.current, message: error instanceof Error ? error.message : '撤销未能保存，请重试', undo: target, expires: Date.now() + 5000});
    } finally { if (request === operation.current) { restoring.current = false; setBusy(false); } }
  }
  return {notice: notice && (busy || !blocked) ? notice : null, busy, undo};
}
