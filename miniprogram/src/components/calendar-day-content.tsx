import { trimTextEnd } from '../lib/text-whitespace';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { calendarDateLabel } from '../lib/calendar-date-label';
import ActionButton from './ui-button';
import SheetBackdrop from './sheet-backdrop';
import EditorHeading from './editor-heading';
import './calendar-day-content.css';

export default function CalendarDayContent({ date, number, circleClass = '', children }: { date: string; number: number; circleClass?: string; children?: ReactNode }) {
  const info = calendarDateLabel(date);
  return <>
    <View className={`calendar-date-circle ${circleClass}`}><Text>{number}</Text>{children}</View>
    <View className={`calendar-date-note${info.holidays.length ? ' is-holiday' : ''}`} ariaLabel={info.description}><Text>{info.label}</Text></View>
  </>;
}
/** Long press reads full names without changing selection or check-ins. */
export function useCalendarDateDetails() {
  const [date, showDate] = useState('');
  useEffect(() => {
    if (!date || typeof window === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopImmediatePropagation(); showDate(''); } };
    // Capture before document-level option windows so only this top layer closes.
    window.addEventListener('keydown', close, true);
    return () => window.removeEventListener('keydown', close, true);
  }, [date]);
  const info = calendarDateLabel(date);
  const details = date ? <View className='calendar-date-overlay' catchMove onClick={event => event.stopPropagation()}>
    <SheetBackdrop onClose={() => showDate('')} />
    <View className='calendar-date-details' role='dialog' ariaLabel='日期详情' aria-modal>
      <EditorHeading embedded className='calendar-date-details-heading' title={date} actions={<ActionButton appearance='icon' ariaLabel='关闭日期详情' onClick={() => showDate('')}>×</ActionButton>} />
      <Text>{info.lunar?.full || '该日期暂无农历资料'}</Text>
      {info.holidays.map(item => <View key={item.name}><Text>{trimTextEnd(item.name)}</Text><Text className='calendar-date-region'>{item.regions.join('、')}</Text></View>)}
      {!info.covered && <Text className='calendar-date-region'>该年份节假日尚未收录</Text>}
    </View>
  </View> : null;
  return { showDate, details };
}
