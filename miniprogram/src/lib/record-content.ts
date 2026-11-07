/** Optional scores are read without migrating historical records. */
export type ScoredRecord = { content: string; images?: readonly unknown[]; effortScore?: number };
export const validEffortScore = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export const validOptionalEffortScore = (value: unknown) => value === undefined || validEffortScore(value);
export const recordEffortScore = (record: { effortScore?: number }) => validEffortScore(record.effortScore) ? record.effortScore : 0;
export const hasRecordContent = (record: ScoredRecord) => !!record.content.trim() || !!record.images?.length || recordEffortScore(record) > 0;
export function adjustEffortScore(record: { effortScore?: number }, delta: -1 | 1): number {
  const score = recordEffortScore(record);
  return delta > 0 ? Math.min(Number.MAX_SAFE_INTEGER, score + 1) : Math.max(0, score - 1);
}
