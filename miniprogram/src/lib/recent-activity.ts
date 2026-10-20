import { isTodoState, isMemoState, localToolDay } from './tool-records';
import { isReminderState, cleanState, habitDayIndex } from './reminder-data';
import { isPomodoroState, normalizePomodoroState, advanceTimer } from './pomodoro-data';
import { isMealLibrary } from './meal-data';
import { isDomainState } from './domain-data';

export type ActivitySource = { owner: string; ready: boolean; value: unknown };
export type ActivitySources = Record<'todos' | 'memos' | 'pomodoro' | 'reminders' | 'meals' | 'domains', ActivitySource>;
export type ActivityTarget = 'task' | 'memos' | 'pomodoro' | 'daily' | 'meals' | 'domain';
export type RecentActivity = {
  id: string; title: string; label: string; icon: string; day: string;
  /** Day-only source records deliberately have no invented clock time. */
  occurredAt: string | null; target: ActivityTarget; targetId?: string; action: string;
};
export function activitySourcesReady(sources: ActivitySources): boolean {
  const values = Object.values(sources), owner = values[0]?.owner;
  return !!owner && values.every(source => source.ready && source.owner === owner);
}

/** Project a bounded feed from the existing stores; never write synthetic events. */
export function recentActivity(now: Date, sources: ActivitySources): RecentActivity[] {
  if (!Number.isFinite(now.getTime()) || !activitySourcesReady(sources)) return [];
  const today = localToolDay(now), endDay = habitDayIndex(today)!;
  const items = new Map<string, RecentActivity>();
  type Entry = Omit<RecentActivity, 'day' | 'occurredAt'>;
  function add(entry: Entry, stamp: unknown, dayOnly = false) {
    if (typeof stamp !== 'string' || !entry.title.trim()) return;
    let day: string, occurredAt: string | null;
    if (dayOnly) {
      if (habitDayIndex(stamp) === null || stamp > today) return;
      day = stamp; occurredAt = null;
    } else {
      const time = Date.parse(stamp);
      if (!stamp.includes('T') || habitDayIndex(stamp.slice(0, 10)) === null || !Number.isFinite(time) || time > now.getTime()) return;
      day = localToolDay(new Date(time)); occurredAt = new Date(time).toISOString();
    }
    if (!items.has(entry.id)) items.set(entry.id, { ...entry, day, occurredAt });
  }
  const todoState = sources.todos.value;
  if (isTodoState(todoState)) for (const task of todoState.tasks) {
    const entry = { title: task.title, icon: 'notes', target: 'task' as const, targetId: task.id, action: '查看' };
    add({ ...entry, id: `task-created:${task.id}`, label: '创建任务' }, task.createdAt);
    add({ ...entry, id: `task-completed:${task.id}`, label: '完成任务' }, task.completedAt);
  }
  const memoState = sources.memos.value;
  if (isMemoState(memoState)) for (const note of memoState.notes) {
    const entry = { title: note.title.trim() || note.body.trim().split('\n')[0] || '无标题便签', icon: note.iconId || 'write', target: 'memos' as const, action: '查看' };
    add({ ...entry, id: `memo-created:${note.id}`, label: '创建便签' }, note.createdAt);
    if (Date.parse(note.updatedAt) > Date.parse(note.createdAt)) add({ ...entry, id: `memo-updated:${note.id}`, label: '修改便签' }, note.updatedAt);
  }
  const timerState = sources.pomodoro.value;
  if (isPomodoroState(timerState)) for (const session of advanceTimer(normalizePomodoroState(timerState), now.getTime()).sessions) {
    if (session.mode !== 'focus' || session.durationSeconds <= 0 || Date.parse(session.startedAt) > Date.parse(session.endedAt)) continue;
    add({ id: `focus:${session.id}`, title: session.title || '专注', label: `${session.completed ? '完成专注' : '专注记录'} · ${session.durationSeconds < 60 ? '不足 1' : Math.round(session.durationSeconds / 60)} 分钟`, icon: 'focus', target: 'pomodoro', action: '查看' }, session.endedAt);
  }
  const reminderState = sources.reminders.value;
  if (isReminderState(reminderState)) {
    const state = cleanState(reminderState);
    for (const habit of state.items) {
      const days = new Set<string>();
      // Each habit contributes at most the latest 30 dates from each compact range.
      for (const [start, end] of state.completionHistory?.[habit.id] || []) {
        const latest = Math.min(end, endDay);
        for (let ordinal = latest; ordinal >= Math.max(start, latest - 29); ordinal--) days.add(new Date(ordinal * 86_400_000).toISOString().slice(0, 10));
      }
      for (const [day, ids] of Object.entries(state.done)) { if (ids.includes(habit.id)) days.add(day); else days.delete(day); }
      for (const day of days) add({ id: `habit:${habit.id}:${day}`, title: habit.title, label: '习惯', icon: habit.iconId || habit.kind, target: 'daily', action: '查看' }, day, true);
    }
  }
  const mealState = sources.meals.value;
  if (isMealLibrary(mealState)) for (const meal of mealState.nutrition || []) add({ id: `meal:${meal.id}`, title: meal.name, label: '饮食记录', icon: 'food', target: 'meals', action: '查看' }, meal.date, true);
  const domainState = sources.domains.value;
  if (isDomainState(domainState)) {
    for (const domain of domainState.domains) {
      for (const [kind, records] of [['正记录', domain.positiveRecords], ['负记录', domain.negativeRecords]] as const) for (const record of records) {
        add({ id: `domain-record:${record.id}`, title: record.content.trim() || '图片记录', label: `${domain.name} · ${kind}`, icon: 'write', target: 'domain', targetId: domain.id, action: '查看' }, record.createdAt);
      }
      for (const habit of domain.habits) for (const day of habit.startedDates) add({ id: `domain-habit:${habit.id}:${day}`, title: habit.name, label: `${domain.name} · 习惯已开始`, icon: 'plant', target: 'domain', targetId: domain.id, action: '查看' }, day, true);
    }
    for (const goal of domainState.completedGoals) {
      const domain = domainState.domains.find(item => item.id === goal.domainId);
      add({ id: `domain-goal:${goal.id}`, title: goal.content, label: `${domain?.name || '领域'} · 完成目标`, icon: 'goal', target: 'domain', targetId: goal.domainId, action: '查看' }, goal.completedAt);
    }
  }
  return [...items.values()].sort((a, b) => b.day.localeCompare(a.day)
    || (a.occurredAt && b.occurredAt ? Date.parse(b.occurredAt) - Date.parse(a.occurredAt) : a.occurredAt ? -1 : b.occurredAt ? 1 : 0)
    || a.id.localeCompare(b.id)).slice(0, 30);
}

export function activityDateLabel(day: string, now: Date): string {
  if (day === localToolDay(now)) return '今天';
  const previous = new Date(now); previous.setDate(previous.getDate() - 1);
  if (day === localToolDay(previous)) return '昨天';
  return `${day.slice(0, 4)}.${day.slice(5, 7)}.${day.slice(8, 10)}`;
}
export function activityTimeLabel(item: RecentActivity): string {
  if (!item.occurredAt) return '按日记录';
  const date = new Date(item.occurredAt);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
