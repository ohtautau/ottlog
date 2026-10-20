import { trimTextEnd } from '../lib/text-whitespace';
import SectionTitle from './section-title';
import { useMemo, useState } from 'react';
import { Picker, Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import { growthDomainStats, growthOverview, type GrowthState } from '../lib/growth-data';
import { type MealLibrary } from '../lib/meal-data';
import LibraryIcon from './library-icon';
import './statistics-food-growth.css';

const nutrients = [['carbs', '碳水', '#b9dbca'], ['protein', '蛋白质', '#99b8ec'], ['fat', '脂肪', '#e1c699']] as const;
const rounded = (value: number) => Math.round(value * 10) / 10;

function shiftedDate(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

export function DietStatistics({ state, today }: { state: MealLibrary; today: string }) {
  // A null selection follows today across midnight; a chosen history day stays selected.
  const [selection, setSelection] = useState<string | null>(null);
  const date = selection ?? today;
  const entries = state.nutrition || [];
  const daily = entries.filter(entry => entry.date === date);
  const totals = daily.reduce((total, entry) => ({ carbs: total.carbs + entry.carbs, protein: total.protein + entry.protein, fat: total.fat + entry.fat }), { carbs: 0, protein: 0, fat: 0 });
  const selectDate = (value: string) => setSelection(value === today ? null : value);

  return <View className='statistics-food-growth statistics-diet'>
    <View className='statistics-fg-heading'><SectionTitle inRow>每日营养</SectionTitle><Text>共 {entries.length} 条记录</Text></View>
    <View className='statistics-diet-date'>
      <ActionButton appearance='icon' className='button-label statistics-date-arrow' ariaLabel='前一天' onClick={() => selectDate(shiftedDate(date, -1))}>‹</ActionButton>
      <Picker mode='date' value={date} onChange={event => selectDate(String(event.detail.value))}>
        <View className='statistics-date-value'><Text>{date === today ? '今天' : `${date.slice(5, 7)}月${date.slice(8)}日`}</Text><Text>{date} · 选择日期</Text></View>
      </Picker>
      <ActionButton appearance='icon' className='button-label statistics-date-arrow' ariaLabel='后一天' onClick={() => selectDate(shiftedDate(date, 1))}>›</ActionButton>
    </View>
    <View className='statistics-diet-totals'>{nutrients.map(([key, label, color]) => <View className='statistics-fg-metric' key={key}>
      <Text style={{ color }}>{label}</Text><Text>{rounded(totals[key])}<Text> g</Text></Text><View className='statistics-nutrient-line' style={{ backgroundColor: color }} />
    </View>)}</View>
    <View className='statistics-fg-heading statistics-diet-count'><SectionTitle inRow>这一天 · {daily.length} 餐</SectionTitle>{date !== today && <ActionButton className='button-label statistics-today-button' onClick={() => setSelection(null)}>今天</ActionButton>}</View>
    {!daily.length && <Text className='statistics-fg-note'>这一天暂无饮食记录。</Text>}
  </View>;
}

export function GrowthStatistics({ state, now }: { state: GrowthState; now: Date }) {
  const timestamp = now.getTime();
  const { overview, domains, scale } = useMemo(() => {
    const at = new Date(timestamp);
    const domains = state.domains.map(domain => ({ domain, counts: growthDomainStats(state, domain.id, at) }));
    return { overview: growthOverview(state, at), domains, scale: Math.max(100, Math.ceil(Math.max(0, ...domains.map(item => item.counts.recentMonths)) / 100) * 100) };
  }, [state, timestamp]);

  return <View className='statistics-food-growth statistics-growth'>
    <View className='statistics-growth-overview growth-overview'>
      <View className='statistics-fg-metric'><Text>{overview.total}</Text><Text>累计成长值</Text></View>
      <View className='statistics-fg-metric'><Text>+{overview.week}</Text><Text>本周成长值</Text></View>
      <View className='statistics-fg-metric'><Text>{overview.completedGoalCount}</Text><Text>已完成目标</Text></View>
    </View>
    <View className='statistics-growth-legend growth-legend'><View><View className='is-recent' /><Text>近三个月</Text></View><View><View className='is-month' /><Text>本月</Text></View><View><View className='is-week' /><Text>本周</Text></View><Text>统一刻度 {scale}</Text></View>
    {state.domains.some(domain => domain.archived) && <Text className='statistics-fg-note'>统计包含已归档领域。</Text>}
    <View className='statistics-growth-domains'>{domains.map(({ domain, counts }) => <View className='statistics-growth-domain growth-domain-card' key={domain.id}>
      <View className='statistics-growth-domain-heading'><LibraryIcon name={domain.iconId} className='statistics-growth-icon' /><Text className='statistics-growth-name growth-domain-name'>{trimTextEnd(domain.name)}</Text>{domain.archived && <Text className='statistics-growth-archived'>已归档</Text>}</View>
      <View className='statistics-growth-values growth-domain-values' ariaLabel={`近三个月 ${counts.recentMonths}，本月 ${counts.month}，本周 ${counts.week}`}><Text className='is-recent growth-total-value'>{counts.recentMonths}</Text><Text className='is-month growth-month-value'>{counts.month}</Text><Text className='is-week growth-week-value'>{counts.week}</Text></View>
      <View className='growth-progress' ariaLabel={`近三个月 ${counts.recentMonths}、本月 ${counts.month}、本周 ${counts.week}，统一刻度 ${scale}`}><View className='statistics-growth-track growth-track'>
        <View className='is-recent growth-progress-recent' style={{ width: `${counts.recentMonths / scale * 100}%` }} />
        <View className='is-month growth-progress-month' style={{ width: `${counts.month / scale * 100}%` }} />
        <View className='is-week growth-progress-week' style={{ width: `${counts.week / scale * 100}%` }} />
        {counts.month > 0 && <View className='statistics-growth-month-marker growth-month-marker' style={{ left: `${counts.month / scale * 100}%` }} />}
      </View>
      </View>
      <Text className='statistics-growth-total'>累计 {counts.total} · {counts.recordCount} 次记录 · 已完成目标 {counts.completedGoalCount}</Text>
    </View>)}</View>
    {!domains.length && <Text className='statistics-fg-note'>暂无成长记录。</Text>}
  </View>;
}
