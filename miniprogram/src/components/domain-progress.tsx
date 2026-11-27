import { Text, View } from '@tarojs/components';
import LibraryIcon from './library-icon';
import { displayedDomainGoal, domainIcon, type Domain, type DomainState } from '../lib/domain-data';
import { domainDisplayName } from '../lib/domain-fallback';
import { domainActionProgress, type DomainActionProgress } from '../lib/domain-progress';
import { trimTextEnd } from '../lib/text-whitespace';
import './domain-progress.css';

function DomainActionBadge({ progress }: { progress: DomainActionProgress }) {
  return <View className={`domain-action-badge is-tier-${progress.tier}${progress.petals ? ' has-petals' : ''}`} role='img'
    ariaLabel={`${progress.rank}徽章，已完成${progress.completedHundreds}个百点，已点亮${progress.petals}片花瓣，五片成章后升阶`}>
    <View className='domain-action-emblem' aria-hidden />
    {Array.from({length:5},(_,index)=><View key={index} className={`domain-action-petal${index < progress.petals ? ' is-lit' : ''}`} style={{transform:`rotate(${index * 72}deg)`}} aria-hidden />)}
    <View className='domain-action-core' aria-hidden />
  </View>;
}

export function DomainActionIndex({ domain, progress = domainActionProgress(domain), showBadge = true }: { domain: Pick<Domain, 'positiveRecords' | 'negativeRecords'>; progress?: DomainActionProgress; showBadge?: boolean }) {
  return <View className='domain-action-index'>
    <View className='domain-action-summary'>
      <Text className='domain-action-label'>行动指数</Text>
      <Text className='domain-action-value'>{progress.total}</Text>
      {showBadge && <DomainActionBadge progress={progress} />}
    </View>
    <View className='domain-action-track' role='progressbar' ariaLabel={`当前百点行动进度，已完成${progress.completedHundreds}个百点`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.current}>
      <View className='domain-action-fill' style={{width:`${progress.current}%`}} />
    </View>
  </View>;
}

/** The caller owns the card button and navigation. */
export function DomainProgressSummary({ domain, state, sorting }: { domain: Domain; state: DomainState; sorting: boolean }) {
  const goal = displayedDomainGoal(state, domain.id, 'shortTerm');
  const completed = goal?.status === 'completed';
  const progress = !sorting ? domainActionProgress(domain) : undefined;
  return <View className={`domain-progress-summary without-goals${sorting ? ' without-progress' : ''}`}>
    <LibraryIcon name={domainIcon(domain)} className='domain-progress-icon' />
    <View className='domain-progress-body'>
      <View className='domain-progress-title'><Text className='domain-progress-name'>{trimTextEnd(domainDisplayName(domain.name))}</Text>{progress && <DomainActionBadge progress={progress} />}</View>
      {progress && <DomainActionIndex domain={domain} progress={progress} showBadge={false} />}
    </View>
    <View className={`domain-progress-goal domain-progress-card-goal${completed ? ' is-completed' : ''}`} ariaLabel={`短期目标：${goal?.content || '未设置'}${completed ? '，已完成' : ''}`}>
      <View className='domain-progress-goal-bullet' aria-hidden />
      <Text className='domain-progress-goal-content'>{trimTextEnd(goal?.content || '未设置')}</Text>
      {completed && <Text className='domain-progress-goal-status'>已完成</Text>}
    </View>
  </View>;
}
