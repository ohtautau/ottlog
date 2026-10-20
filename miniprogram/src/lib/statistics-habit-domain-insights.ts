import { type DomainState } from './domain-data';
import { habitCompletionStats } from './habit-reflections';
import { cleanState, habitDayIndex, hasHabitDay, type ReminderState } from './reminder-data';
import { trimTextEnd } from './text-whitespace';
import {
  insightChange, insightDay, insightNumber, insightWindow,
  type InsightPoint, type StatisticsInsight, type StatisticsPeriod,
} from './statistics-insight-model';

const CHECK_IN_COLOR = '#a9d9b9';
const POSITIVE_COLOR = '#a9d9b9';
const NEGATIVE_COLOR = '#e8b7ad';

/** Preserve totals when the chart folds lower-ranked entities into its final row. */
function rankedPoints(points: InsightPoint[]): InsightPoint[] {
  const ranked = points.map((point, index) => ({ point, index }))
    .sort((a, b) => b.point.values.reduce((sum, value) => sum + value, 0)
      - a.point.values.reduce((sum, value) => sum + value, 0) || a.index - b.index)
    .map(row => row.point);
  if (ranked.length <= 6) return ranked;
  const remaining = ranked.slice(5);
  let aggregateKey = 'remaining';
  while (points.some(point => point.key === aggregateKey)) aggregateKey = `_${aggregateKey}`;
  return [...ranked.slice(0, 5), {
    key: aggregateKey, label: `其余 ${remaining.length} 项`,
    values: remaining.reduce((totals, point) => totals.map((value, index) => value + point.values[index]), ranked[0].values.map(() => 0)),
    detail: remaining.map(point => `${point.label}：${point.values.reduce((sum, value) => sum + value, 0)}`).join('；'),
  }];
}

/** Count retained calendar history, including archived habits, without inventing past schedules. */
export function habitStatisticsInsight(value: ReminderState, now: Date, period: StatisticsPeriod): StatisticsInsight {
  const state = cleanState(value), window = insightWindow(now, period);
  const daily = (days: string[]) => days.map(day => {
    const ordinal = habitDayIndex(day)!;
    return { key: day, label: day.slice(5).replace('-', '/'),
      values: [state.items.filter(item => hasHabitDay(state.completionHistory?.[item.id], ordinal)).length] };
  });
  const points = daily(window.days), previous = daily(window.previousDays);
  const total = points.reduce((sum, point) => sum + point.values[0], 0);
  const previousTotal = previous.reduce((sum, point) => sum + point.values[0], 0);
  const activeDays = points.filter(point => point.values[0] > 0).length;
  const ranked = state.items.map(item => ({
    key: item.id, label: `${trimTextEnd(item.title)}${item.enabled ? '' : '（已归档）'}`,
    values: [window.days.filter(day => hasHabitDay(state.completionHistory?.[item.id], habitDayIndex(day)!)).length],
  }));
  const participating = ranked.filter(point => point.values[0] > 0).length;
  const active = state.items.filter(item => item.enabled).length;
  const streaks = state.items.map(item => ({ item, streak: habitCompletionStats(state, item.id, now.getTime()).streak }));
  const longest = [...streaks].sort((a, b) => b.streak - a.streak)[0];
  const peak = points.reduce<InsightPoint | undefined>((best, point) => !best || point.values[0] > best.values[0] ? point : best, undefined);
  const best = [...ranked].sort((a, b) => b.values[0] - a.values[0])[0];
  const findings = [insightChange(total, previousTotal, '次打卡')];
  if (peak && peak.values[0] > 0) findings.push(`${peak.key} 打卡最多，共 ${peak.values[0]} 次。`);
  if (best && best.values[0] > 0) findings.push(`本期打卡最多的习惯：${best.label}，${best.values[0]} 次。`);
  if (longest && longest.streak > 0) findings.push(`${trimTextEnd(longest.item.title)}当前连续打卡 ${longest.streak} 天${longest.item.enabled ? '。' : '（已归档）。'}`);
  if (findings.length === 1) findings.push('本期没有打卡记录。');
  return {
    title: `近 ${period} 天习惯概览`,
    metrics: [
      { label: '打卡次数', value: String(total), unit: '次', caption: '包含已归档习惯' },
      { label: '记录天数', value: String(activeDays), unit: '天', caption: `近 ${period} 天有打卡的日期` },
      { label: '日均打卡', value: insightNumber(total / period), unit: '次', caption: '含无记录日期' },
      { label: '打卡习惯', value: String(participating), unit: '个', caption: '本期至少打卡一次' },
      { label: '进行中习惯', value: String(active), unit: '个', caption: `当前快照；已归档 ${state.items.length - active} 个` },
      { label: '最长当前连续', value: String(longest?.streak ?? 0), unit: '天', caption: '沿用累计历史的连续口径' },
    ],
    charts: [
      { id: 'habit-daily', title: '每日打卡次数', kind: 'daily', unit: '次', series: [{ label: '打卡', color: CHECK_IN_COLOR }], points,
        caption: '同一习惯每天计一次，已归档习惯保留历史。' },
      { id: 'habit-ranking', title: '习惯打卡分布', kind: 'bars', unit: '次', series: [{ label: '打卡', color: CHECK_IN_COLOR }], points: rankedPoints(ranked),
        caption: '按本期打卡次数排列，其余项目合并并保留总数。' },
    ],
    findings,
    note: '打卡次数读取现有习惯的保留日期区间，显式撤销优先；已删除习惯及未来日期不计入。不推算过去应做数量，今日完成与单习惯月历沿原口径。',
  };
}

/** Signed records remain separate facts; they are never converted into a growth score. */
export function domainStatisticsInsight(state: DomainState, now: Date, period: StatisticsPeriod): StatisticsInsight {
  const window = insightWindow(now, period), nowTime = now.getTime();
  const days = new Set(window.days), previousDays = new Set(window.previousDays);
  const points = window.days.map(day => ({ key: day, label: day.slice(5).replace('-', '/'), values: [0, 0] }));
  const byDay = new Map(points.map(point => [point.key, point]));
  const existing = new Map(state.domains.map(domain => [domain.id, domain]));
  const ranked: InsightPoint[] = [];
  const seenDomains = new Set<string>(), seenRecords = new Set<string>(), seenGoals = new Set<string>();
  const activeDomains = new Set<string>();
  let previousTotal = 0, longTerm = 0, shortTerm = 0;
  for (const domain of state.domains) {
    if (seenDomains.has(domain.id)) continue;
    seenDomains.add(domain.id);
    const counts = [0, 0];
    for (const [kind, records] of [domain.positiveRecords, domain.negativeRecords].entries()) {
      for (const record of records) {
        if (seenRecords.has(record.id)) continue;
        const stamp = Date.parse(record.createdAt);
        if (!Number.isFinite(stamp) || stamp > nowTime) continue;
        seenRecords.add(record.id);
        const day = insightDay(stamp);
        if (previousDays.has(day)) previousTotal++;
        const point = byDay.get(day);
        if (!point) continue;
        point.values[kind]++; counts[kind]++; activeDomains.add(domain.id);
      }
    }
    ranked.push({ key: domain.id, label: trimTextEnd(domain.name), values: counts });
  }
  for (const goal of state.completedGoals) {
    const stamp = Date.parse(goal.completedAt ?? '');
    if (!existing.has(goal.domainId) || seenGoals.has(goal.id) || goal.status !== 'completed'
      || !Number.isFinite(stamp) || stamp > nowTime || !days.has(insightDay(stamp))) continue;
    seenGoals.add(goal.id);
    if (goal.kind === 'longTerm') longTerm++;
    else if (goal.kind === 'shortTerm') shortTerm++;
    else continue;
    activeDomains.add(goal.domainId);
  }
  const positive = points.reduce((sum, point) => sum + point.values[0], 0);
  const negative = points.reduce((sum, point) => sum + point.values[1], 0);
  const total = positive + negative;
  const activeDays = points.filter(point => point.values[0] + point.values[1] > 0).length;
  const peak = points.reduce<InsightPoint | undefined>((best, point) => !best || point.values[0] + point.values[1] > best.values[0] + best.values[1] ? point : best, undefined);
  const best = [...ranked].sort((a, b) => b.values[0] + b.values[1] - a.values[0] - a.values[1])[0];
  const findings = [insightChange(total, previousTotal, '条记录')];
  if (peak && peak.values[0] + peak.values[1] > 0) findings.push(`${peak.key} 记录最多，共 ${peak.values[0] + peak.values[1]} 条。`);
  if (best && best.values[0] + best.values[1] > 0) findings.push(`本期记录最多的领域：${best.label}，正向 ${best.values[0]} 条、负向 ${best.values[1]} 条。`);
  findings.push(`本期完成长期目标 ${longTerm} 个、短期目标 ${shortTerm} 个。`);
  return {
    title: `近 ${period} 天领域概览`,
    metrics: [
      { label: '记录总数', value: String(total), unit: '条', caption: '正向与负向合计' },
      { label: '正向记录', value: String(positive), unit: '条' },
      { label: '负向记录', value: String(negative), unit: '条' },
      { label: '记录天数', value: String(activeDays), unit: '天', caption: `近 ${period} 天有记录的日期` },
      { label: '完成目标', value: String(longTerm + shortTerm), unit: '个', caption: `长期 ${longTerm} 个，短期 ${shortTerm} 个` },
      { label: '活跃领域', value: String(activeDomains.size), unit: '个', caption: '本期有记录或完成目标' },
    ],
    charts: [
      { id: 'domain-daily', title: '每日领域记录', kind: 'daily', unit: '条', series: [{ label: '正向', color: POSITIVE_COLOR }, { label: '负向', color: NEGATIVE_COLOR }], points,
        caption: '按记录日期归属，图片记录同样计入。' },
      { id: 'domain-ranking', title: '领域记录分布', kind: 'bars', unit: '条', series: [{ label: '正向', color: POSITIVE_COLOR }, { label: '负向', color: NEGATIVE_COLOR }], points: rankedPoints(ranked),
        caption: '按本期记录总数排列，正负记录分别呈现。' },
    ],
    findings,
    note: '仅统计现存领域保留的记录与目标历史，未分类按原领域身份计入；已删除领域与未来时间不计入。目标按完成日期归属，正负记录不换算为评分。',
  };
}
