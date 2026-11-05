import { View } from '@tarojs/components';
export function ScheduleSymbol({ kind = 'date' }: { kind?: 'date' | 'time' | 'reminder' | 'repeat' }) {
  return <View className={`todo-schedule-symbol is-${kind}`} aria-hidden><View /></View>;
}
