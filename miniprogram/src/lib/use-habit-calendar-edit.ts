import { useEffect, useRef, useState } from 'react';
import { isReminderState, type ReminderState } from './reminder-data';
import { habitCalendarDayCompleted, habitCalendarDayEditable, setHabitCalendarDay } from './habit-calendar-edit';
import { hasVolatilePersonalTool, type PersonalToolSetter } from './use-personal-tool-state';

export default function useHabitCalendarEdit({ state, habitId, owner, writable, setValue }: {
  state: ReminderState; habitId: string; owner: string; writable: boolean; setValue: PersonalToolSetter<ReminderState>;
}) {
  const context = useRef({ state, habitId, owner, writable });
  context.current = { state, habitId, owner, writable };
  const mounted = useRef(true), saving = useRef(false);
  const pending = useRef(new Map<string, { owner: string; completed: boolean }>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ owner: string; habitId: string; text: string } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function clearSaved(owner: string) {
    for (const [key, operation] of pending.current) if (operation.owner === owner) pending.current.delete(key);
  }

  async function toggleDay(day: string) {
    const captured = context.current;
    if (!captured.owner || !captured.habitId || !captured.writable || saving.current || !habitCalendarDayEditable(day)) return;
    const key = `${captured.owner}:${captured.habitId}:${day}`;
    if (!hasVolatilePersonalTool('reminders', captured.owner)) clearSaved(captured.owner);
    const previous = pending.current.get(key);
    const completed = previous?.owner === captured.owner ? previous.completed : !habitCalendarDayCompleted(captured.state, captured.habitId, day);
    pending.current.set(key, { owner: captured.owner, completed });
    saving.current = true; setBusy(true); setError(null);
    const isCurrent = () => mounted.current && context.current.owner === captured.owner && context.current.habitId === captured.habitId;
    try {
      await setValue(latest => {
        if (!isCurrent() || !context.current.writable || !isReminderState(latest)) throw new Error('账号或习惯已变化，请重新打开');
        return setHabitCalendarDay(latest, captured.habitId, day, completed);
      });
      if (!isCurrent()) return;
      if (hasVolatilePersonalTool('reminders', captured.owner)) throw new Error('打卡尚未保存，请再次点击同一天重试');
      clearSaved(captured.owner);
    } catch (reason) {
      if (isCurrent()) setError({ owner: captured.owner, habitId: captured.habitId, text: reason instanceof Error ? reason.message : '打卡未能保存，请重试' });
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return { busy, toggleDay, error: error?.owner === owner && error.habitId === habitId ? error.text : '' };
}
