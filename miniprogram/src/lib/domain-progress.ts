import type { Domain } from './domain-data';
import { recordEffortScore } from './record-content';

export function domainActionIndex(domain: Pick<Domain, 'positiveRecords' | 'negativeRecords'>): string {
  // The total can exceed a safe integer. Sum the two decimal parts separately.
  const base = 1_000_000;
  let high = 0;
  let low = 0;
  for (const records of [domain.positiveRecords, domain.negativeRecords]) {
    for (const record of records) {
      const score = recordEffortScore(record);
      const remainder = score % base;
      high += (score - remainder) / base;
      low += remainder;
    }
  }
  high += Math.floor(low / base);
  const tail = String(low % base);
  return high ? `${high}${tail.padStart(6, '0')}` : tail;
}
