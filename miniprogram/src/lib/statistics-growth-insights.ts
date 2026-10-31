import { growthPoints, type GrowthState } from './growth-data';
import { trimTextEnd } from './text-whitespace';
import { insightChange, insightDay, insightNumber, insightWindow, type StatisticsInsight, type StatisticsPeriod } from './statistics-insight-model';

const dayLabel = (day: string) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

/** Growth has its own domain IDs and 1/3/5 point weights, including archived domains. */
export function growthStatisticsInsight(state: GrowthState, now: Date, period: StatisticsPeriod): StatisticsInsight {
  const window = insightWindow(now, period), end = now.getTime();
  const currentDays = new Set(window.days), previousDays = new Set(window.previousDays);
  const retained = state.events.filter(event => Number.isFinite(Date.parse(event.createdAt)) && Date.parse(event.createdAt) <= end);
  const current = retained.filter(event => currentDays.has(insightDay(event.createdAt)));
  const previous = retained.filter(event => previousDays.has(insightDay(event.createdAt)));
  const total = current.reduce((sum, event) => sum + growthPoints[event.size], 0);
  const previousTotal = previous.reduce((sum, event) => sum + growthPoints[event.size], 0);
  const activeDays = new Set(current.map(event => insightDay(event.createdAt))).size;
  const activeDomains = new Set(current.map(event => event.domainId)).size;
  const completed = state.completedGoals.filter(goal => Date.parse(goal.completedAt) <= end && currentDays.has(insightDay(goal.completedAt))).length;
  const ranking = state.domains.map((domain, index) => {
    const events = current.filter(event => event.domainId === domain.id);
    return { domain, index, count: events.length, value: events.reduce((sum, event) => sum + growthPoints[event.size], 0) };
  }).filter(item => item.count > 0).sort((a, b) => b.value - a.value || a.index - b.index);
  const shown = ranking.slice(0, 6), others = ranking.slice(6);
  const occupied = new Set(state.domains.map(domain => domain.id));
  let remainingKey = 'remaining-growth-domains';
  while (occupied.has(remainingKey)) remainingKey = `_${remainingKey}`;
  const archivedValue = ranking.filter(item => item.domain.archived).reduce((sum, item) => sum + item.value, 0);
  const sizes = (['small', 'medium', 'large'] as const).map(size => current.filter(event => event.size === size).length);
  const findings = [`成长值：${insightChange(total, previousTotal, '点')}。`];
  if (current.length) {
    const top = ranking[0], ties = ranking.filter(item => item.value === top.value).length;
    findings.push(`贡献最多的成长领域：${trimTextEnd(top.domain.name)}${top.domain.archived ? '（已归档）' : ''}，${top.value} 点${ties > 1 ? `（${ties} 个领域并列）` : ''}。`);
    findings.push(`小进步 ${sizes[0]} 次、中等进步 ${sizes[1]} 次、大进步 ${sizes[2]} 次。`);
    findings.push(archivedValue ? `已归档成长领域贡献 ${archivedValue} 点，仍计入本期统计。` : `有记录的 ${activeDays} 天平均成长 ${insightNumber(total / activeDays)} 点。`);
  } else {
    findings.push(`本期暂无成长记录${completed ? `，已完成 ${completed} 个目标` : '或已完成目标'}。`);
  }
  return {
    title: '成长记录分析',
    metrics: [
      { label: '期间成长值', value: String(total), unit: '点', caption: `近 ${period} 天` },
      { label: '成长记录', value: String(current.length), unit: '次' },
      { label: '有记录天数', value: String(activeDays), unit: '天' },
      { label: '已完成目标', value: String(completed), unit: '个' },
      { label: '有记录领域', value: String(activeDomains), unit: '个' },
      { label: '活跃日日均成长', value: activeDays ? insightNumber(total / activeDays) : '—', unit: '点' },
    ],
    charts: [{
      id: 'growth-daily-points', title: '每日成长值', unit: '点', kind: 'daily',
      series: [{ label: '成长值', color: '#b9dbca' }],
      points: window.days.map(day => {
        const events = current.filter(event => insightDay(event.createdAt) === day);
        return { key: day, label: dayLabel(day), values: [events.reduce((sum, event) => sum + growthPoints[event.size], 0)], detail: `${day} · ${events.length} 次成长记录` };
      }),
      caption: '按设备本地日期归属；未来时间的记录不计入。',
    }, {
      id: 'growth-domain-contributions', title: '成长领域贡献', unit: '点', kind: 'bars',
      series: [{ label: '期间成长值', color: '#99b8ec' }],
      points: [
        ...shown.map(item => ({ key: item.domain.id, label: `${trimTextEnd(item.domain.name)}${item.domain.archived ? '（已归档）' : ''}`, values: [item.value], detail: `${item.count} 次成长记录` })),
        ...(others.length ? [{ key: remainingKey, label: `其余 ${others.length} 个成长领域`, values: [others.reduce((sum, item) => sum + item.value, 0)], detail: `${others.reduce((sum, item) => sum + item.count, 0)} 次成长记录` }] : []),
      ],
      caption: '展示贡献最多的六个领域，其余合并；同名领域按原 ID 分别计算。',
    }],
    findings,
    note: '仅基于保留的成长记录，小／中／大进步分别为 1／3／5 点，包含归档领域。成长与领域统计使用各自存档。',
  };
}
