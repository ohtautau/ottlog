import { View } from '@tarojs/components';
import { habitPriorityLabels, habitPriorityColors, type HabitPriority } from '../lib/habit-metadata';
import './habit-priority-corner.css';

export default function HabitPriorityCorner({ priority = 'none', color = habitPriorityColors[priority] }: { priority?: HabitPriority; color?: string }) {
  return <View className={`habit-priority is-${priority}`} style={{ borderTopColor: color }} role='img' ariaLabel={`优先度${habitPriorityLabels[priority]}`} />;
}
