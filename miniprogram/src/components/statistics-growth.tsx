import { trimTextEnd } from '../lib/text-whitespace';
import SectionTitle from './section-title';
import { useMemo } from 'react';
import { Text, View } from '@tarojs/components';
import { growthDomainStats, growthOverview, type GrowthState } from '../lib/growth-data';
import LibraryIcon from './library-icon';
import './statistics-growth.css';

export function GrowthStatistics({ state, now }: { state: GrowthState; now: Date }) {
  const timestamp = now.getTime();
  const { overview, domains, scale } = useMemo(() => {
    const at = new Date(timestamp);
    const domains = state.domains.map(domain => ({ domain, counts: growthDomainStats(state, domain.id, at) }));
    return { overview: growthOverview(state, at), domains, scale: Math.max(100, Math.ceil(Math.max(0, ...domains.map(item => item.counts.recentMonths)) / 100) * 100) };
  }, [state, timestamp]);

  return <View className='statistics-growth'>
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
