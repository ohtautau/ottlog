import { ScheduleSymbol } from './schedule-symbol';
import { useMemo } from 'react';
import { Text, View } from '@tarojs/components';
import ChoiceShortcutRail from './choice-shortcut-rail';
import CalendarMonthView from './calendar-month-view';
import { useCalendarDateDetails } from './calendar-day-content';
import { calendarMonthDays, shiftCalendarMonth, shiftScheduleDate } from '../lib/todo-schedule';
import { localToolDay } from '../lib/tool-records';
import type { ScheduleDayMark } from '../lib/todo-schedule-preview';

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
export default function ScheduleCalendar({ month, onMonthChange, selectedDate, today, busy, onSelect, onClear, reminder = false, reminderBase = '', marks = {}, readOnly = false }: {
  month: string; onMonthChange: (month: string) => void; selectedDate: string; today: string; busy: boolean; readOnly?:boolean;
  onSelect: (date: string) => void; onClear?: () => void; reminder?: boolean;reminderBase?:string; marks?: Readonly<Record<string, ScheduleDayMark>>;
}) {
  const { showDate, details } = useCalendarDateDetails();
  const days = useMemo(() => calendarMonthDays(month), [month]);
  const quickDates=useMemo(()=>{
    const choices=reminder?[{label:'前一天',offset:-1},{label:'前一周',offset:-7},{label:'前一月',offset:-1,unit:'month' as const}]:[{label:'今天',offset:0},{label:'明天',offset:1},{label:'下周',offset:7},{label:'下个月',offset:1,unit:'month' as const}];
    return [{label:reminder?'无提醒':'无日期',value:''},...choices.map(choice=>{let value='';try{value=shiftScheduleDate(reminder?reminderBase:today,choice.offset,choice.unit);}catch{/* Boundary or absent task date remains unavailable. */}return {label:choice.label,value:value||choice.label,disabled:!value};})];
  },[today,reminder,reminderBase]);
  const prefix = reminder ? '提醒' : '';
  const dualTimes = Object.values(marks).some(mark=>mark.dueTime&&mark.reminderTime&&mark.dueTime!==mark.reminderTime);
  return <>
    {!readOnly && <ChoiceShortcutRail leading={<ScheduleSymbol kind={reminder?'reminder':'date'}/>} label={reminder?'提醒快捷日期':'待办快捷日期'} options={quickDates.map(choice=>({...choice,ariaLabel:choice.value?`选择${prefix}${choice.label}`:reminder?'清除提醒日期':'选择无日期'}))} value={selectedDate} disabled={busy} onChange={day=>day?onSelect(day):onClear?.()}/>}
    <CalendarMonthView navigation={{ className:'todo-schedule-month', month, onMonthChange, currentMonth:safeCalendarMonth(today,today), disabled:busy, prefix }} weekdayClassName='todo-schedule-weekdays' gridClassName={`todo-schedule-calendar${reminder ? ' editing-reminder' : ''}${dualTimes ? ' has-dual-times' : ''}`} days={days.map(day => ({
      date:day.date, number:day.day, className:`button-label todo-schedule-day${day.inMonth ? '' : ' is-outside'}${day.date === selectedDate ? ' is-selected' : ''}${day.date === today ? ' is-today' : ''}${marks[day.date]?.due ? ' has-due' : ''}${marks[day.date]?.reminder ? ' has-reminder' : ''}${marks[day.date]?.repeat ? ' has-repeat' : ''}${marks[day.date]?.dueTime || marks[day.date]?.reminderTime ? ' has-day-time' : ''}`, ariaLabel:`选择${prefix}日期${day.date}`, pressed:day.date===selectedDate, readOnly,
      disabled:busy || !selectableCalendarDate(day.date), onClick:()=>{if(!busy && !readOnly && selectableCalendarDate(day.date))onSelect(day.date);}, onLongPress:()=>{if(!busy)showDate(day.date);},
      badge:(<View className='todo-schedule-day-times' aria-hidden>{marks[day.date]?.dueTime && <Text className={marks[day.date]?.repeat ? 'repeat-time' : 'due-time'}>{marks[day.date].dueTime}</Text>}{marks[day.date]?.reminderTime && marks[day.date]?.reminderTime!==marks[day.date]?.dueTime && <Text className='reminder-time'>{marks[day.date].reminderTime}</Text>}</View>)
    }))} />
    {details}
  </>;
}
