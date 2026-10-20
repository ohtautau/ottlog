import { trimTextEnd } from '../lib/text-whitespace';
import SectionTitle from './section-title';
import { useMemo, useState } from 'react';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import { ChoiceButton } from './ui-button';
import HabitCalendar from './habit-calendar';
import HabitIcon from './habit-icon';
import DomainGoalCount from './domain-goal-count';
import LibraryIcon from './library-icon';
import { cleanState, localDate, type ReminderState } from '../lib/reminder-data';
import { sortHabits } from '../lib/habit-metadata';
import { completedGoalCount, domainIcon, type DomainState } from '../lib/domain-data';
import { habitIconId } from '../lib/icon-library';
import './statistics-habits-domains.css';

export function HabitStatistics({ state, now }: { state: ReminderState; now: Date }) {
  const habits = useMemo(() => cleanState(state), [state]);
  const items = useMemo(() => sortHabits(habits.items), [habits]);
  const [selection, setSelection] = useState('');
  const selected = items.find(item => item.id === selection) || items[0];
  const today = localDate(now), enabled = items.filter(item => item.enabled);
  const completed = enabled.filter(item => habits.done[today]?.includes(item.id)).length;
  return <View className='statistics-habits'>
    <View className='statistics-habit-summary statistics-card'><SectionTitle className='statistics-section-title'>今日完成</SectionTitle><View><Text className='statistics-today-completed'>{completed}</Text><Text className='statistics-summary-divider'> / </Text><Text className='statistics-today-total'>{enabled.length}</Text><Text className='statistics-summary-unit'> 个习惯</Text></View><View className='statistics-today-track' aria-hidden><View style={{ width: `${enabled.length ? completed / enabled.length * 100 : 0}%` }} /></View></View>
    {items.length ? <>
      <SectionTitle className='statistics-section-title'>打卡日历</SectionTitle>
      <ScrollView scrollX className='statistics-selection-scroll' showScrollbar={false}><View className='statistics-habit-choices'>{items.map(item => <ChoiceButton key={item.id} className={`button-label statistics-habit-choice${selected.id === item.id ? ' is-active' : ''}`} ariaLabel={`查看${item.title}统计`} aria-pressed={selected.id === item.id} onClick={() => setSelection(item.id)}><HabitIcon name={habitIconId(item)} /><View><Text>{trimTextEnd(item.title)}</Text>{!item.enabled && <Text className='statistics-paused'>已归档</Text>}</View></ChoiceButton>)}</View></ScrollView>
      <Text className='statistics-selected-name'>{trimTextEnd(selected.title)}</Text>
      <HabitCalendar key={selected.id} state={habits} habitId={selected.id} now={now.getTime()} />
    </> : <View className='statistics-empty'>暂无习惯记录</View>}
  </View>;
}

function completionDate(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日` : '';
}

export function DomainStatistics({ state }: { state: DomainState }) {
  const [selection, setSelection] = useState('');
  const selected = state.domains.find(domain => domain.id === selection) || state.domains[0];
  const history = state.completedGoals.filter(goal => goal.domainId === selected?.id).slice().reverse();
  return <View className='statistics-domains'>
    <SectionTitle className='statistics-section-title'>累计完成目标</SectionTitle>
    <View className='statistics-domain-choices'>{state.domains.map(domain => <Button key={domain.id} className={`statistics-domain-choice${domain.id === selected?.id ? ' is-active' : ''}`} ariaLabel={`查看${domain.name}统计`} aria-pressed={domain.id === selected?.id} onClick={() => setSelection(domain.id)}><LibraryIcon name={domainIcon(domain)} /><Text>{trimTextEnd(domain.name)}</Text><DomainGoalCount className='statistics-domain-goals' count={completedGoalCount(state, domain.id)} /></Button>)}</View>
    {selected ? <View className='statistics-domain-history statistics-card'><SectionTitle className='statistics-section-title'>{trimTextEnd(selected.name)} · 已完成目标</SectionTitle>{history.length ? history.map(goal => <View key={goal.id} className='statistics-completed-goal'><View className='statistics-goal-meta'><Text className='statistics-goal-kind'>{goal.kind === 'longTerm' ? '长期目标' : '短期目标'}</Text><Text className='statistics-goal-date'>{completionDate(goal.completedAt)}</Text></View><Text className='statistics-goal-title'>{trimTextEnd(goal.content)}</Text></View>) : <Text className='statistics-empty'>暂无已完成目标</Text>}</View> : <View className='statistics-empty'>暂无领域记录</View>}
  </View>;
}
