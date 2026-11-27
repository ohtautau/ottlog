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

export function domainActionProgress(domain: Pick<Domain, 'positiveRecords' | 'negativeRecords'>) {
  const total = domainActionIndex(domain);
  const completedHundreds = total.length > 2 ? total.slice(0, -2) : '0';
  const current = Number(total.slice(-2));
  // Decimal slicing preserves large totals. Only the bounded visual tier uses Number.
  const petals = completedHundreds === '0' ? 0 : (Number(completedHundreds.slice(-1)) + 4) % 5 + 1;
  const tier = Math.floor(Math.max(0, Math.min(Number(completedHundreds), 26) - 1) / 5);
  const rank = ['萌芽', '新叶', '繁枝', '绽放', '璀璨', '星耀'][tier];
  return { total, completedHundreds, current, petals, tier, rank };
}
export type DomainActionProgress = ReturnType<typeof domainActionProgress>;
