import type { DomainCompletionCounts } from './domain-completion';

/** Visual comparison units only; they do not change saved counts or imply a completion rate. */
export const DOMAIN_PROGRESS_WEIGHTS = { longTermGoals: 6, shortTermGoals: 3, habits: 1 } as const;

export function domainProgressWeight(counts: DomainCompletionCounts): number {
  return counts.longTermGoals * DOMAIN_PROGRESS_WEIGHTS.longTermGoals
    + counts.shortTermGoals * DOMAIN_PROGRESS_WEIGHTS.shortTermGoals
    + counts.habits * DOMAIN_PROGRESS_WEIGHTS.habits;
}

export function domainProgressScale(counts: DomainCompletionCounts[]): number {
  return Math.max(1, ...counts.map(domainProgressWeight));
}

export function domainProgressSegments(counts: DomainCompletionCounts, scale: number) {
  const denominator = Math.max(1, scale, domainProgressWeight(counts));
  return (Object.keys(DOMAIN_PROGRESS_WEIGHTS) as Array<keyof typeof DOMAIN_PROGRESS_WEIGHTS>).map(kind => ({
    kind,
    count: counts[kind],
    width: counts[kind] * DOMAIN_PROGRESS_WEIGHTS[kind] / denominator * 100,
  }));
}
