import { trimTextEnd } from '../lib/text-whitespace';
import { Button, Text, View } from '@tarojs/components';
import type { ComponentProps } from 'react';
import HabitIcon from './habit-icon';
import { habitIconId } from '../lib/icon-library';
import { habitTone } from '../lib/habit-domains';
import HabitPriorityCorner from './habit-priority-corner';
import { HabitProgress } from './habit-calendar';
import type { Reminder } from '../lib/reminder-data';
import './habit-card.css';

type Props = {
  item: Omit<Reminder, 'id'>; done: boolean; disabled?: boolean; progress: { days: number; streak: number };
  onCheck?: () => void; onOpen?: () => void; readOnly?: boolean;
  viewProps?: ComponentProps<typeof View>; className?: string;
};

export default function HabitCard({ item, done, disabled, progress, onCheck, onOpen, readOnly = false, viewProps, className = '' }: Props) {
  const icon = <View className='daily-suggestion-icon'><HabitIcon name={habitIconId(item)} />{done && <View className='daily-done-badge'><View className='daily-small-check' /></View>}</View>;
  const copy = <><View className='daily-suggestion-title'><Text>{trimTextEnd(item.title)}</Text></View><HabitProgress {...progress} className='daily-suggestion-days' /></>;
  return <View {...viewProps} className={`daily-suggestion ${habitTone(item)}${done ? ' is-done' : ''} ${className}`}>
    {readOnly ? <View className='daily-suggestion-check'>{icon}</View> : <Button className='daily-suggestion-check' disabled={disabled} aria-pressed={done} ariaLabel={`${item.title} 今天${done ? '撤销打卡' : '打卡'}`} onClick={onCheck}>{icon}</Button>}
    {readOnly ? <View className='daily-suggestion-open'>{copy}</View> : <Button className='daily-suggestion-open' ariaLabel={`查看习惯：${item.title}`} onClick={onOpen}>{copy}</Button>}
    <HabitPriorityCorner priority={item.priority} />
  </View>;
}
