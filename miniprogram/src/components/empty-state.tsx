import { Text, View } from '@tarojs/components';
import './empty-state.css';

const messages = {
  habits: '暂无习惯', memos: '暂无便签', domains: '暂无领域', records: '暂无进展记录',
  positive: '暂无正向记录', negative: '暂无待改进记录', goals: '暂无已完成目标',
  focus: '暂无专注记录', mottos: '暂无格言', activity: '暂无近期活动',
  statistics: '暂无统计数据', habitStatistics: '暂无习惯统计', domainStatistics: '暂无领域统计', growthStatistics: '暂无成长统计',
  articles: '暂无文章', favorites: '暂无收藏', comments: '暂无评论', logs: '暂无留言',
} as const;

/** Real empty state only: no invented entities, sample content or chart values. */
export default function EmptyState({kind, compact = false, inline = false}: {kind: keyof typeof messages; compact?: boolean; inline?: boolean}) {
  return <View className={`empty-state is-${kind}${compact ? ' is-compact' : ''}${inline ? ' is-inline' : ''}`}><Text>{messages[kind]}</Text></View>;
}
