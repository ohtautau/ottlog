import { trimTextEnd } from '../lib/text-whitespace';
import { Text, View } from '@tarojs/components';
import LibraryIcon from './library-icon';
import { displayedDomainGoal, domainIcon, type Domain, type DomainState, type Goal } from '../lib/domain-data';
import type { DomainCompletionCounts } from '../lib/domain-completion';
import { domainProgressSegments } from '../lib/domain-progress';
import './domain-progress.css';

const progressClass = { longTermGoals: 'long', shortTermGoals: 'short', habits: 'habit' } as const;

export function DomainProgressLine({ counts, scale }: { counts: DomainCompletionCounts | null; scale: number }) {
  if (!counts) return <View className='domain-progress-track is-pending' ariaLabel='完成记录尚未就绪' />;
  return <View className='domain-progress-track' ariaLabel={`长期目标累计完成 ${counts.longTermGoals} 个，短期目标累计完成 ${counts.shortTermGoals} 个，今日习惯完成 ${counts.habits} 个；长度按长期 6、短期 3、习惯 1 比较`}>
    {domainProgressSegments(counts, scale).filter(segment => segment.count > 0).map(segment => <View key={segment.kind} className={`domain-progress-segment domain-progress-${progressClass[segment.kind]}-line`} style={{ width: `${segment.width}%` }} />)}
  </View>;
}

function GoalSummary({ label, kind, goal, className = '', showLabel = true, showBullet = false }: { label: string; kind: 'long' | 'short'; goal: Goal | null; className?: string; showLabel?: boolean; showBullet?: boolean }) {
  return <View className={`domain-progress-goal domain-progress-${kind}-goal${goal?.status === 'completed' ? ' is-completed' : ''} ${className}`} ariaLabel={`${label}目标：${goal?.content || '未设置'}${goal?.status === 'completed' ? '，已完成' : ''}`}>
    {showLabel && <Text className='domain-progress-goal-label'>{label}</Text>}
    {showBullet && <View className='domain-progress-goal-bullet' aria-hidden />}
    <Text className='domain-progress-goal-content'>{trimTextEnd(goal?.content || '未设置')}</Text>
    {goal?.status === 'completed' && <Text className='domain-progress-goal-status'>已完成</Text>}
  </View>;
}

/** Shared read-only row body. Its caller owns the card button and navigation. */
export function DomainProgressSummary({ domain, state, counts, scale, showGoals = true, showShortTermGoal = false, showProgress = true, className = '' }: { domain: Domain; state: DomainState; counts: DomainCompletionCounts | null; scale: number; showGoals?: boolean; showShortTermGoal?: boolean; showProgress?: boolean; className?: string }) {
  const showInlineGoals = showGoals && !showShortTermGoal;
  return <View className={`domain-progress-summary${showInlineGoals ? '' : ' without-goals'}${showProgress ? '' : ' without-progress'} ${className}`}>
    <LibraryIcon name={domainIcon(domain)} className='domain-progress-icon' />
    <View className='domain-progress-body'>
      <View className='domain-progress-amounts'>
        <View className='domain-progress-heading'>
          <Text className='domain-progress-name'>{trimTextEnd(domain.name)}</Text>
          {showProgress && <View className='domain-progress-counts' ariaLabel={counts ? '长期、短期、习惯完成数' : '完成记录尚未就绪'}>
            <Text className='domain-progress-long-count'>{counts?.longTermGoals ?? '—'}</Text>
            <Text className='domain-progress-short-count'>{counts?.shortTermGoals ?? '—'}</Text>
            <Text className='domain-progress-habit-count'>{counts?.habits ?? '—'}</Text>
          </View>}
        </View>
        {showProgress && <DomainProgressLine counts={counts} scale={scale} />}
      </View>
      {showInlineGoals && <View className='domain-progress-goals'>
        <GoalSummary label='长期' kind='long' goal={displayedDomainGoal(state, domain.id, 'longTerm')} />
        <GoalSummary label='短期' kind='short' goal={displayedDomainGoal(state, domain.id, 'shortTerm')} />
      </View>}
    </View>
    {showShortTermGoal && <GoalSummary label='短期' kind='short' goal={displayedDomainGoal(state, domain.id, 'shortTerm')} className='domain-progress-card-goal' showLabel={false} showBullet />}
  </View>;
}
