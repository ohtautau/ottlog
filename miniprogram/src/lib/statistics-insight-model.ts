import { localToolDay } from './tool-records';

export type StatisticsPeriod = 7 | 30;
export type InsightMetric = { label: string; value: string; unit?: string; caption?: string };
export type InsightPoint = { key: string; label: string; values: number[]; missing?: boolean; detail?: string };
export type InsightChart = {
  id: string; title: string; unit: string; kind: 'daily' | 'bars';
  series: { label: string; color: string }[]; points: InsightPoint[]; caption?: string;
};
export type StatisticsInsight = { title: string; metrics: InsightMetric[]; charts: InsightChart[]; findings: string[]; note: string };

/** Device-local calendar boundaries, including today; never subtract 24h across DST. */
export function insightWindow(now: Date, period: StatisticsPeriod) {
  const days = Array.from({ length: period }, (_, i) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - period + 1 + i, 12);
    return localToolDay(day);
  });
  const previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - period, 12);
  const previousDays = Array.from({ length: period }, (_, i) => {
    const day = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate() - period + 1 + i, 12);
    return localToolDay(day);
  });
  return { days, previousDays, today: localToolDay(now), start: days[0], previousStart: previousDays[0] };
}

export function insightNumber(value: number) {
  return String(Math.round(value * 10) / 10);
}

export function insightDay(timestamp: string | number | undefined) {
  if (timestamp === undefined) return '';
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? localToolDay(date) : '';
}

/** Archive calendar dates must be real dates, rather than strings normalized by Date. */
export function validInsightDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number), date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function insightChange(current: number, previous: number, unit: string) {
  const delta = Math.round((current - previous) * 10) / 10;
  return previous === 0
    ? current === 0 ? '与前一等长期间均无记录' : `前一等长期间无记录，本期 ${insightNumber(current)} ${unit}`
    : delta === 0 ? '与前一等长期间相同' : `比前一等长期间${delta > 0 ? '增加' : '减少'} ${insightNumber(Math.abs(delta))} ${unit}`;
}
