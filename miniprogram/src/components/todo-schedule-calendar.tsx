import { useMemo } from 'react';
import { Button, Text, View } from '@tarojs/components';
import { ChoiceButton } from './ui-button';
import CalendarMonthNavigation from './calendar-month-navigation';
import CalendarDayContent, { useCalendarDateDetails } from './calendar-day-content';
import { calendarMonthDays, shiftCalendarMonth } from '../lib/todo-schedule';
import { localToolDay } from '../lib/tool-records';

const firstMonth = '1000-01', lastMonth = '9999-12';
function validMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value) || value < firstMonth || value > lastMonth) return false;
  try { return shiftCalendarMonth(value, 0) === value; } catch { return false; }
}
export function safeCalendarMonth(value: string, today: string) {
  const candidate = value.slice(0, 7), fallback = today.slice(0, 7);
  return validMonth(candidate) ? candidate : validMonth(fallback) ? fallback : localToolDay().slice(0, 7);
}
export function selectableCalendarDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= `${firstMonth}-01` && value <= `${lastMonth}-31`;
}

/** Task and reminder calendars share date semantics without sharing a view month. */
export default function ScheduleCalendar({ month, onMonthChange, selectedDate, today, busy, onSelect, onClear, reminder = false }: {
  month: string; onMonthChange: (month: string) => void; selectedDate: string; today: string; busy: boolean;
  onSelect: (date: string) => void; onClear?: () => void; reminder?: boolean;
}) {
  const { showDate, details } = useCalendarDateDetails();
  const days = useMemo(() => calendarMonthDays(month), [month]);
  const quickDates = useMemo(() => [{ label: '今天', offset: 0 }, { label: '明天', offset: 1 }, { label: '下周', offset: 7 }].map(choice => {
    const next = new Date(`${today}T12:00:00`);
    next.setDate(next.getDate() + choice.offset);
    return { label: choice.label, date: localToolDay(next) };
  }), [today]);
  const prefix = reminder ? '提醒' : '';
  return <>
    <View className={`todo-schedule-quick${reminder ? ' is-reminder-calendar' : ''}`}>
      {quickDates.map(choice => <ChoiceButton key={choice.label} ariaLabel={`选择${prefix}${choice.label}`} aria-pressed={selectedDate === choice.date} className={selectedDate === choice.date ? 'is-selected' : ''} disabled={busy} onClick={() => onSelect(choice.date)}>{choice.label}</ChoiceButton>)}
      {!!onClear && <ChoiceButton ariaLabel='选择无日期' aria-pressed={!selectedDate} className={!selectedDate ? 'is-selected' : ''} disabled={busy} onClick={onClear}>无日期</ChoiceButton>}
    </View>
    <CalendarMonthNavigation className='todo-schedule-month' month={month} onMonthChange={onMonthChange} currentMonth={safeCalendarMonth(today, today)} disabled={busy} prefix={prefix} />
    <View className='todo-schedule-weekdays'>{['日', '一', '二', '三', '四', '五', '六'].map(day => <Text key={day}>{day}</Text>)}</View>
    <View className='todo-schedule-calendar'>{days.map(day => <Button key={day.date} className={`button-label todo-schedule-day${day.inMonth ? '' : ' is-outside'}${day.date === selectedDate ? ' is-selected' : ''}${day.date === today ? ' is-today' : ''}`} ariaLabel={`选择${prefix}日期${day.date}`} aria-pressed={day.date === selectedDate} disabled={busy || !selectableCalendarDate(day.date)} onClick={() => onSelect(day.date)} onLongPress={() => { if (!busy) showDate(day.date); }}>
      <CalendarDayContent date={day.date} number={day.day} />
    </Button>)}</View>
    {details}
  </>;
}
