import type { Domain } from './domain-data';
import { alignHabitDomain } from './habit-domains';
import { habitTimePeriod, isHabitPriority, isHabitTimePeriod, type HabitPriority } from './habit-metadata';
import { getLibraryIcon, type LibraryIconId } from './icon-library';
import { cleanState, type Reminder, type ReminderState } from './reminder-data';

export type HabitDetailChange = { field: 'domain'; value: string } | { field: 'icon'; value: LibraryIconId } | { field: 'priority'; value: HabitPriority };

/** Inline choices merge into the latest original, without full-editor normalization. */
export function patchHabitDetails(state: ReminderState, id: string, change: HabitDetailChange, domains: readonly Domain[]): ReminderState {
  const existing = state.items.find(item => item.id === id);
  if (!existing) throw new Error('这个习惯已移除，请重新打开。');
  let patch: Partial<Reminder>;
  if (change.field === 'domain') {
    const domain = domains.find(item => item.id === change.value);
    if (change.value && !domain) throw new Error('这个领域已变化，请重新选择。');
    patch = { domainId: domain?.id, group: domain?.name || '未分类' };
  } else if (change.field === 'icon') {
    const icon = getLibraryIcon(change.value);
    if (!icon) throw new Error('这个图标不可用，请重新选择。');
    patch = { iconId: icon.id, kind: icon.fallback, backgroundKind: undefined };
  } else {
    if (!isHabitPriority(change.value)) throw new Error('请选择习惯优先度。');
    patch = { priority: change.value };
  }
  const changed = { ...existing, ...patch };
  if (JSON.stringify(changed) === JSON.stringify(existing)) return state;
  return { ...state, items: state.items.map(item => item.id === id ? changed : item) };
}

export function prepareHabitEdit(draft: Reminder, domains: readonly Domain[]): Reminder {
  if (!draft.title.trim()) throw new Error('写下想养成的习惯。');
  if (draft.timePeriod !== undefined && !isHabitTimePeriod(draft.timePeriod)) throw new Error('请选择习惯时段。');
  const domain = domains.find(domain => domain.id === draft.domainId) || domains.find(domain => domain.name === draft.group);
  if (!domain && draft.group !== '未分类') throw new Error('这个领域已变化，请重新选择。');
  return { ...draft, title: draft.title.trim().slice(0, 60), note: draft.note.trim().slice(0, 240),
    group: domain?.name || '未分类', domainId: domain?.id, priority: draft.priority || 'none', timePeriod: habitTimePeriod(draft) };
}

/** Update only editor fields; keep current identity, lifecycle and check-in data. */
export function saveHabitEdit(value: ReminderState, item: Reminder, domains: readonly Domain[], create = false): ReminderState {
  if (item.timePeriod !== undefined && !isHabitTimePeriod(item.timePeriod)) throw new Error('请选择习惯时段。');
  const state = cleanState(value);
  const existing = state.items.find(row => row.id === item.id);
  if (create) {
    if (existing) throw new Error('这个习惯已经存在，请重新打开。');
    if (state.items.length >= 80) throw new Error('已保存 80 个习惯，请先移除不再需要的习惯。');
    return { ...state, items: [...state.items, { ...item, timePeriod: habitTimePeriod(item) }] };
  }
  if (!existing) throw new Error('这个习惯已移除，请重新打开。');
  const updated = { ...existing, title: item.title, note: item.note, group: item.group, domainId: item.domainId,
    priority: item.priority, timePeriod: habitTimePeriod(item), iconId: item.iconId, kind: item.kind, backgroundKind: item.backgroundKind };
  return { ...state, items: state.items.map(row => row.id === item.id ? updated : alignHabitDomain(row, domains)) };
}

/** Keep the existing cleanup semantics and allow a volatile deletion to retry. */
export function removeHabit(value: ReminderState, id: string): ReminderState {
  if (!id) throw new Error('请先保存习惯。');
  const state = cleanState(value);
  return cleanState({ ...state, items: state.items.filter(item => item.id !== id) });
}
