import { growthPoints, type GrowthState } from './growth-data';
import type { MealLibrary } from './meal-data';
import { trimTextEnd } from './text-whitespace';
import { insightChange, insightDay, insightNumber, insightWindow, type StatisticsInsight, type StatisticsPeriod } from './statistics-insight-model';

const nutrients = [
  { key: 'carbs', label: '碳水', color: '#b9dbca' },
  { key: 'protein', label: '蛋白质', color: '#99b8ec' },
  { key: 'fat', label: '脂肪', color: '#e1c699' },
] as const;
const dayLabel = (day: string) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

/** Missing nutrition days are unknown intake, while a recorded zero remains a real zero. */
export function dietStatisticsInsight(state: MealLibrary, now: Date, period: StatisticsPeriod): StatisticsInsight {
  const window = insightWindow(now, period);
  const entries = state.nutrition || [];
  const currentDays = new Set(window.days), previousDays = new Set(window.previousDays);
  const current = entries.filter(entry => currentDays.has(entry.date));
  const previous = entries.filter(entry => previousDays.has(entry.date));
  const recordedDays = new Set(current.map(entry => entry.date)).size;
  const previousRecordedDays = new Set(previous.map(entry => entry.date)).size;
  const daily = window.days.map(day => {
    const records = current.filter(entry => entry.date === day);
    const values = nutrients.map(nutrient => records.reduce((total, entry) => total + entry[nutrient.key], 0));
    return { day, count: records.length, values };
  });
  const totals = nutrients.map((_, index) => daily.reduce((total, day) => total + day.values[index], 0));
  const busiest = daily.filter(day => day.count > 0).sort((a, b) => b.count - a.count || b.day.localeCompare(a.day));
  const findings = [
    `已记录 ${recordedDays} / ${period} 天；未记录 ${period - recordedDays} 天。`,
    `记录餐数：${insightChange(current.length, previous.length, '餐')}。`,
    `记录天数：${insightChange(recordedDays, previousRecordedDays, '天')}。`,
  ];
  if (busiest.length) {
    const ties = busiest.filter(day => day.count === busiest[0].count).length;
    findings.push(`记录最多的日期：${busiest[0].day}，${busiest[0].count} 餐${ties > 1 ? `（${ties} 天并列）` : ''}。`);
  }
  return {
    title: '饮食记录分析',
    metrics: [
      { label: '记录天数', value: String(recordedDays), unit: '天', caption: `近 ${period} 天` },
      { label: '记录餐数', value: String(current.length), unit: '餐' },
      ...nutrients.map((nutrient, index) => ({ label: `日均${nutrient.label}`, value: recordedDays ? insightNumber(totals[index] / recordedDays) : '—', unit: 'g', caption: '仅已记录日' })),
      { label: '每记录日餐数', value: recordedDays ? insightNumber(current.length / recordedDays) : '—', unit: '餐' },
    ],
    charts: [{
      id: 'diet-daily-nutrients', title: '每日已记录营养', unit: 'g', kind: 'daily',
      series: nutrients.map(({ label, color }) => ({ label, color })),
      points: daily.map(day => ({ key: day.day, label: dayLabel(day.day), values: day.values, missing: day.count === 0,
        detail: `${day.day} · ${day.count ? `${day.count} 餐记录` : '未记录'}` })),
      caption: '未记录日留空；已记录的 0 g 保留为零。三种营养分别按克数统计。',
    }],
    findings,
    note: '仅汇总保留的饮食记录；日均按已记录天数计算，未记录不代表未进食。',
  };
}

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
