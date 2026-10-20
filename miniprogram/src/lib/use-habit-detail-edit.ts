import { useEffect, useRef, useState } from 'react';
import type { Domain } from './domain-data';
import { patchHabitDetails, type HabitDetailChange } from './habit-edit';
import { isReminderState, type ReminderState } from './reminder-data';
import { hasVolatilePersonalTool, type PersonalToolSetter } from './use-personal-tool-state';

type Target = { owner: string; id: string; change: HabitDetailChange };

/** Both detail hosts share an absolute choice and merge through their original queue. */
export default function useHabitDetailEdit({ state, habitId, owner, domains, writable, setValue }: {
  state: ReminderState; habitId: string; owner: string; domains: readonly Domain[]; writable: boolean; setValue: PersonalToolSetter<ReminderState>;
}) {
  const context = useRef({ state, habitId, owner, domains, writable, setValue });
  context.current = { state, habitId, owner, domains, writable, setValue };
  const mounted = useRef(true), pendingRef = useRef<Target | null>(null), saving = useRef<Target | null>(null);
  const [pending, setPending] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { pendingRef.current = null; saving.current = null; setPending(null); setBusy(false); setError(''); }, [owner, habitId]);
  const isCurrent = (target: Target) => mounted.current && pendingRef.current === target && context.current.owner === target.owner && context.current.habitId === target.id;

  async function save(target: Target) {
    if (!isCurrent(target) || saving.current || !context.current.writable) return;
    saving.current = target; setBusy(true); setError('');
    try {
      await context.current.setValue(latest => {
        if (!isCurrent(target) || !context.current.writable || !isReminderState(latest)) throw new Error('账号或习惯已变化，请重新打开');
        return patchHabitDetails(latest, target.id, target.change, context.current.domains);
      });
      if (!isCurrent(target)) return;
      if (hasVolatilePersonalTool('reminders', target.owner)) throw new Error('本机存储不可用，修改已保留，请重试保存');
      pendingRef.current = null; setPending(null);
    } catch (reason) {
      if (isCurrent(target)) {
        setError(reason instanceof Error ? reason.message : '修改未能保存，请重试');
        if (!hasVolatilePersonalTool('reminders', target.owner)) { pendingRef.current = null; setPending(null); }
      }
    } finally {
      if (saving.current === target) { saving.current = null; if (mounted.current) setBusy(false); }
    }
  }
  function change(choice: HabitDetailChange) {
    const current = context.current;
    if (!current.owner || !current.habitId || !current.writable || pendingRef.current || saving.current) return;
    try {
      if (patchHabitDetails(current.state, current.habitId, choice, current.domains) === current.state) return;
    } catch (reason) { setError(reason instanceof Error ? reason.message : '请选择有效选项'); return; }
    const target = { owner: current.owner, id: current.habitId, change: choice };
    pendingRef.current = target; setPending(target); void save(target);
  }
  return { busy, pending: !!pending && pending.owner === owner && pending.id === habitId, locked: busy || !!pending && pending.owner === owner && pending.id === habitId,
    error, change, retry: () => { if (pendingRef.current) void save(pendingRef.current); }, isLocked: () => !!pendingRef.current || !!saving.current };
}
