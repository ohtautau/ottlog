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
  item: Reminder; done: boolean; disabled?: boolean; progress: { days: number; streak: number };
  onCheck: () => void; onOpen: () => void;
  viewProps?: ComponentProps<typeof View>; className?: string;
};

export default function HabitCard({ item, done, disabled, progress, onCheck, onOpen, viewProps, className = '' }: Props) {
  return <View {...viewProps} className={`daily-suggestion ${habitTone(item)}${done ? ' is-done' : ''} ${className}`}>
    <Button className='daily-suggestion-check' disabled={disabled} aria-pressed={done} ariaLabel={`${item.title} 今天${done ? '撤销打卡' : '打卡'}`} onClick={onCheck}><View className='daily-suggestion-icon'><HabitIcon name={habitIconId(item)} />{done && <View className='daily-done-badge'><View className='daily-small-check' /></View>}</View></Button>
    <Button className='daily-suggestion-open' ariaLabel={`查看习惯：${item.title}`} onClick={onOpen}><View className='daily-suggestion-title'><Text>{trimTextEnd(item.title)}</Text></View><HabitProgress {...progress} className='daily-suggestion-days' /></Button>
    <HabitPriorityCorner priority={item.priority} />
  </View>;
}
