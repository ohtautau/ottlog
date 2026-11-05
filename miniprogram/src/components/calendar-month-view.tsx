import type { ComponentProps, ReactNode } from 'react';
import { Button, Text, View } from '@tarojs/components';
import CalendarMonthNavigation from './calendar-month-navigation';
import CalendarDayContent from './calendar-day-content';
import './calendar-month-view.css';

export type CalendarMonthCell = {
  date: string; number: number; className?: string; ariaLabel: string;
  pressed?: boolean; readOnly?: boolean; disabled?: boolean; static?: boolean;
  onClick?: () => void; onLongPress?: () => void;
  badge?: ReactNode; children?: ReactNode; circleClass?: string;
};
/** Presentation only: hosts retain date validation, history and persistence. */
export default function CalendarMonthView({ navigation, days, gridClassName = '', weekdayClassName = '' }: {
  navigation: ComponentProps<typeof CalendarMonthNavigation>; days: readonly CalendarMonthCell[];
  gridClassName?: string; weekdayClassName?: string;
}) {
  return <View className='calendar-month-view'>
    <CalendarMonthNavigation {...navigation} />
    <View className={`calendar-month-weekdays ${weekdayClassName}`}>{['日','一','二','三','四','五','六'].map(day => <Text key={day}>{day}</Text>)}</View>
    <View className={`calendar-month-grid ${gridClassName}`}>{days.map(day => {
      const content = <>{day.badge}<CalendarDayContent date={day.date} number={day.number} circleClass={day.circleClass}>{day.children}</CalendarDayContent></>;
      return day.static ? <View key={day.date} className={`calendar-month-day ${day.className || ''}`} ariaLabel={day.ariaLabel} onLongPress={day.onLongPress}>{content}</View> : <Button key={day.date} className={`calendar-month-day ${day.className || ''}`} ariaLabel={day.ariaLabel} aria-pressed={day.pressed} aria-readonly={day.readOnly || undefined} disabled={day.disabled} onClick={day.onClick} onLongPress={day.onLongPress}>{content}</Button>;
    })}</View>
  </View>;
}
