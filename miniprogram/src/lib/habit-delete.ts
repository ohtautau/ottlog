import type { PersonalToolSetter } from './use-personal-tool-state';
import { hasVolatilePersonalTool } from './use-personal-tool-state';
import { isReminderState, type Reminder, type ReminderState } from './reminder-data';
import { removeHabit } from './habit-edit';

/** Both editor hosts confirm and delete the same record through the shared store. */
export async function confirmHabitDelete({ item, owner, isCurrent, setValue, confirmed = false }: {
  item: Reminder; owner: string; isCurrent: () => boolean; setValue: PersonalToolSetter<ReminderState>; confirmed?: boolean;
}): Promise<boolean> {
  if (!confirmed || !owner || !item.id || !isCurrent()) return false;
  await setValue(previous => {
    if (!isCurrent() || !isReminderState(previous)) throw new Error('账号或习惯已变化，请重新打开');
    return removeHabit(previous, item.id);
  });
  if (!isCurrent()) return false;
  if (hasVolatilePersonalTool('reminders', owner)) throw new Error('本机存储不可用，删除尚未保存，请重试。');
  return true;
}
