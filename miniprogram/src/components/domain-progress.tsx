import { Text, View } from '@tarojs/components';
import LibraryIcon from './library-icon';
import { displayedDomainGoal, domainIcon, type Domain, type DomainState } from '../lib/domain-data';
import { domainDisplayName } from '../lib/domain-fallback';
import { domainActionIndex } from '../lib/domain-progress';
import { trimTextEnd } from '../lib/text-whitespace';
import './domain-progress.css';

export function DomainActionIndex({ domain }: { domain: Pick<Domain, 'positiveRecords' | 'negativeRecords'> }) {
  return <View className='domain-action-index'>
    <Text className='domain-action-label'>行动指数</Text>
    <Text className='domain-action-value'>{domainActionIndex(domain)}</Text>
  </View>;
}

/** The caller owns the card button and navigation. */
export function DomainProgressSummary({ domain, state, sorting }: { domain: Domain; state: DomainState; sorting: boolean }) {
  const goal = displayedDomainGoal(state, domain.id, 'shortTerm');
  const completed = goal?.status === 'completed';
  return <View className={`domain-progress-summary without-goals${sorting ? ' without-progress' : ''}`}>
    <LibraryIcon name={domainIcon(domain)} className='domain-progress-icon' />
    <View className='domain-progress-body'>
      <Text className='domain-progress-name'>{trimTextEnd(domainDisplayName(domain.name))}</Text>
      {!sorting && <DomainActionIndex domain={domain} />}
    </View>
    <View className={`domain-progress-goal domain-progress-card-goal${completed ? ' is-completed' : ''}`} ariaLabel={`短期目标：${goal?.content || '未设置'}${completed ? '，已完成' : ''}`}>
      <View className='domain-progress-goal-bullet' aria-hidden />
      <Text className='domain-progress-goal-content'>{trimTextEnd(goal?.content || '未设置')}</Text>
      {completed && <Text className='domain-progress-goal-status'>已完成</Text>}
    </View>
  </View>;
}
