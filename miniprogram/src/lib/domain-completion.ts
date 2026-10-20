import { localDateKey, type CompletedGoal, type DomainState } from './domain-data';
import { alignHabitDisplayDomain } from './habit-domains';
import { cleanState, habitDayIndex, hasHabitDay, type ReminderState } from './reminder-data';

export type DomainCompletionCounts = {
  domainId: string;
  shortTermGoals: number;
  longTermGoals: number;
  habits: number;
};

export type DomainToolbarSummary = {
  createdToday: number;
  recentShortTermGoal: CompletedGoal | undefined;
};

/** Read the current domain records and goal history without mutating either array. */
export function domainToolbarSummary(state: DomainState, now: Date): DomainToolbarSummary {
  const nowTime = now.getTime();
  let createdToday = 0;
  let recentShortTermGoal: CompletedGoal | undefined;
  let recentTime = -Infinity;
  if (!Number.isFinite(nowTime)) return { createdToday, recentShortTermGoal };
  const domainIds = new Set(state.domains.map(domain => domain.id));
  for (const domain of state.domains) {
    for (const records of [domain.positiveRecords, domain.negativeRecords]) {
      for (const record of records) {
        const createdAt = new Date(record.createdAt), createdTime = createdAt.getTime();
        if (Number.isFinite(createdTime) && createdTime <= nowTime && createdAt.getFullYear() === now.getFullYear()
          && createdAt.getMonth() === now.getMonth() && createdAt.getDate() === now.getDate()) createdToday++;
      }
    }
  }
  for (const goal of state.completedGoals) {
    if (goal.status !== 'completed' || goal.kind !== 'shortTerm' || !domainIds.has(goal.domainId)) continue;
    const completedTime = Date.parse(goal.completedAt ?? '');
    if (!Number.isFinite(completedTime) || completedTime > nowTime) continue;
    // Stable IDs keep the title unchanged when equal-time history or domains are reordered.
    if (completedTime > recentTime || completedTime === recentTime && goal.id > (recentShortTermGoal?.id ?? '')) {
      recentTime = completedTime;
      recentShortTermGoal = goal;
    }
  }
  return { createdToday, recentShortTermGoal };
}

/** Read current domain achievements without copying or changing either tool's records. */
export function domainCompletionCounts(
  domains: DomainState,
  reminders: ReminderState,
  now = new Date(),
  goalPeriod: 'all' | 'today' = 'all',
): DomainCompletionCounts[] {
  const today = localDateKey(now), day = habitDayIndex(today)!;
  const counts = domains.domains.map(domain => ({ domainId: domain.id, shortTermGoals: 0, longTermGoals: 0, habits: 0 }));
  const byId = new Map(counts.map(count => [count.domainId, count]));
  const completedIds = new Set<string>();
  for (const goal of domains.completedGoals) {
    const count = byId.get(goal.domainId), completedAt = new Date(goal.completedAt ?? '');
    if (!count || completedIds.has(goal.id) || goal.status !== 'completed' || !Number.isFinite(completedAt.getTime())
      || completedAt.getTime() > now.getTime() || goalPeriod === 'today' && (completedAt.getFullYear() !== now.getFullYear()
        || completedAt.getMonth() !== now.getMonth() || completedAt.getDate() !== now.getDate())) continue;
    completedIds.add(goal.id);
    if (goal.kind === 'shortTerm') count.shortTermGoals++;
    else if (goal.kind === 'longTerm') count.longTermGoals++;
  }
  const habits = cleanState(reminders);
  for (const item of habits.items) {
    if (!item.enabled || !hasHabitDay(habits.completionHistory?.[item.id], day)) continue;
    const domainId = alignHabitDisplayDomain(item, domains.domains).domainId;
    const count = domainId === undefined ? undefined : byId.get(domainId);
    if (count) count.habits++;
  }
  return counts;
}
