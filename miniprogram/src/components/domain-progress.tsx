import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import AppDialog from './app-dialog';
import LibraryIcon from './library-icon';
import { displayedDomainGoal, domainIcon, type Domain, type DomainState } from '../lib/domain-data';
import { domainDisplayName } from '../lib/domain-fallback';
import { domainActionProgress, type DomainActionProgress } from '../lib/domain-progress';
import { trimTextEnd } from '../lib/text-whitespace';
import './domain-progress.css';

function DomainActionBadge({ progress }: { progress: DomainActionProgress }) {
  return <View className={`domain-action-badge is-tier-${progress.tier}`} role='img'
    ariaLabel={`${progress.rank}五芒星，已完成${progress.completedHundreds}个百点，已点亮${progress.points}个星角`}>
    <View className='domain-action-emblem' aria-hidden />
    {Array.from({length:5},(_,index)=><View key={`base-${index}`} className='domain-action-point' style={{transform:`rotate(${index * 72}deg)`}} aria-hidden />)}
    {Array.from({length:progress.points},(_,index)=><View key={`lit-${index}`} className='domain-action-point is-lit' style={{transform:`rotate(${index * 72}deg)`}} aria-hidden />)}
  </View>;
}

/** Card triggers are siblings of the card's navigation button, never nested buttons. */
export function DomainActionBadgeControl({ progress, onInspect, floating = false, label = '查看行动阶位' }: { progress: DomainActionProgress; onInspect: () => void; floating?: boolean; label?: string }) {
  return <View className={`domain-action-badge-control${floating ? ' is-card-overlay' : ''}`}>
    <ActionButton appearance='icon' size='compact' className='domain-action-badge-trigger' ariaLabel={label} onClick={event=>{event.stopPropagation();onInspect();}}>
      {!floating && <DomainActionBadge progress={progress} />}
    </ActionButton>
  </View>;
}

export function DomainActionRankDialog({ progress, onClose }: { progress: DomainActionProgress; onClose: () => void }) {
  return <AppDialog title='行动阶位' closeLabel='关闭行动阶位' panelClassName='domain-rank-dialog' onClose={onClose} actions={<ActionButton appearance='primary' width='fill' onClick={onClose}>知道了</ActionButton>}>
    <View className='domain-rank-current'><View className='domain-rank-star'><DomainActionBadge progress={progress} /></View><Text className='domain-rank-name'>{progress.rank}</Text></View>
    <View className='domain-rank-stat'><Text>当前行动指数</Text><Text className='domain-rank-total'>{progress.total}</Text></View>
    {progress.nextRank ? <View className='domain-rank-next'><Text>下一阶 · {progress.nextRank}</Text><Text className='domain-rank-needed'>还需 {progress.remainingToNext} 点</Text><Text className='domain-rank-threshold'>累计达到 {progress.nextThreshold} 点晋升</Text></View> : <View className='domain-rank-next'><Text className='domain-rank-needed'>已达最高阶位</Text><Text>下个星角还需 {100 - progress.current} 点</Text></View>}
  </AppDialog>;
}

export function DomainActionIndex({ domain, progress = domainActionProgress(domain), showBadge = true, onInspect }: { domain: Pick<Domain, 'positiveRecords' | 'negativeRecords'>; progress?: DomainActionProgress; showBadge?: boolean; onInspect?: () => void }) {
  return <View className='domain-action-index'>
    <View className='domain-action-summary'>
      <Text className='domain-action-label'>行动指数</Text>
      <Text className='domain-action-value'>{progress.total}</Text>
      {showBadge && (onInspect ? <DomainActionBadgeControl progress={progress} onInspect={onInspect} /> : <DomainActionBadge progress={progress} />)}
    </View>
    <View className='domain-action-track' role='progressbar' ariaLabel={`当前百点行动进度，已完成${progress.completedHundreds}个百点`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.current}>
      <View className='domain-action-fill' style={{width:`${progress.current}%`}} />
    </View>
  </View>;
}

/** The caller owns the card button and navigation. */
export function DomainProgressSummary({ domain, state, sorting, progress = !sorting ? domainActionProgress(domain) : undefined }: { domain: Domain; state: DomainState; sorting: boolean; progress?: DomainActionProgress }) {
  const goal = displayedDomainGoal(state, domain.id, 'shortTerm');
  const completed = goal?.status === 'completed';
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
