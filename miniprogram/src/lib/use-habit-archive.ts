import { useEffect, useRef, useState } from 'react';
import { isReminderState, type ReminderState } from './reminder-data';
import { hasVolatilePersonalTool, type PersonalToolSetter } from './use-personal-tool-state';

/** Save only lifecycle state; retain the editor's other unsaved fields. */
export default function useHabitArchive({ state, id, owner, writable, setValue, onSaved }: {
  state: ReminderState; id: string; owner: string; writable: boolean; setValue: PersonalToolSetter<ReminderState>;
  onSaved: (enabled: boolean) => void;
}) {
  const context = useRef({ state, id, owner, writable, onSaved });
  context.current = { state, id, owner, writable, onSaved };
  const mounted = useRef(true), saving = useRef(false);
  const pending = useRef(new Map<string, boolean>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ owner: string; id: string; text: string } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const key = `${owner}:${id}`;
  const retrying = pending.current.has(key) && hasVolatilePersonalTool('reminders', owner);
  const enabled = state.items.find(item => item.id === id)?.enabled;
  const label = retrying ? pending.current.get(key) ? '重试恢复' : '重试归档' : enabled === false ? '恢复习惯' : '归档习惯';
  async function toggle() {
    const captured = context.current;
    if (!captured.owner || !captured.id || !captured.writable || saving.current) return;
    const item = captured.state.items.find(row => row.id === captured.id);
    if (!item) return;
    const key = `${captured.owner}:${captured.id}`;
    const target = hasVolatilePersonalTool('reminders', captured.owner) && pending.current.has(key) ? pending.current.get(key)! : !item.enabled;
    pending.current.set(key, target);
    saving.current = true; setBusy(true); setError(null);
    const isCurrent = () => mounted.current && context.current.owner === captured.owner && context.current.id === captured.id;
    try {
      await setValue(latest => {
        if (!isCurrent() || !context.current.writable || !isReminderState(latest) || !latest.items.some(row => row.id === captured.id)) throw new Error('账号或习惯已变化，请重新打开');
        return { ...latest, items: latest.items.map(row => row.id === captured.id ? { ...row, enabled: target } : row) };
      });
      if (!isCurrent()) return;
      if (hasVolatilePersonalTool('reminders', captured.owner)) throw new Error('尚未保存，请重试');
      pending.current.delete(key);
      context.current.onSaved(target);
    } catch (reason) {
      if (isCurrent()) setError({ owner: captured.owner, id: captured.id, text: reason instanceof Error ? reason.message : '暂时未能保存，请重试' });
    } finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  return { busy, retrying, label, toggle, error: error?.owner === owner && error.id === id ? error.text : '' };
}
