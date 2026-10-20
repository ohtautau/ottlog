import { useEffect, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import { ChoicePopover, PopoverActions, PopoverHeading } from './form-options';
import ScheduleNumberInput from './schedule-number-input';
import { NumericInputRow } from './single-line-input';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import { shiftCalendarMonth } from '../lib/todo-schedule';
import './calendar-month-navigation.css';

/** Calendar hosts own the viewed month and date semantics; navigation is shared. */
export default function CalendarMonthNavigation({ month, onMonthChange, currentMonth, minMonth = '1000-01', maxMonth = '9999-12', disabled = false, prefix = '', scopeKey = '', className = '', labelClassName = '', previousLabel, currentLabel, nextLabel }: {
  month: string; onMonthChange: (month: string) => void; currentMonth: string;
  minMonth?: string; maxMonth?: string; disabled?: boolean; prefix?: string; scopeKey?: string;
  className?: string; labelClassName?: string; previousLabel?: string; currentLabel?: string; nextLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(month.slice(0, 4));
  const [number, setNumber] = useState(String(Number(month.slice(5))));
  const [error, setError] = useState('');
  const initial = useRef('');
  useEffect(() => { setOpen(false); setError(''); }, [scopeKey]);
  function start() {
    const values = [month.slice(0, 4), String(Number(month.slice(5)))];
    initial.current = JSON.stringify(values);
    setYear(values[0]); setNumber(values[1]); setError(''); setOpen(true);
  }
  function submit() {
    const target = `${year}-${String(Number(number)).padStart(2, '0')}`;
    if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(number) || Number(number) < 1 || Number(number) > 12 || target < minMonth || target > maxMonth) {
      setError(minMonth === '1000-01' && maxMonth === '9999-12' ? '请填写 1000–9999 年和 1–12 月。' : `请选择 ${minMonth.replace('-', '年')}月至${maxMonth.replace('-', '年')}月内的有效年月。`);
      return;
    }
    onMonthChange(target); setOpen(false); setError('');
  }
  function step(offset: number) {
    if (disabled || offset < 0 && month <= minMonth || offset > 0 && month >= maxMonth) return;
    onMonthChange(shiftCalendarMonth(month, offset));
  }
  const close = useEditorCloseGuard({ scope: open ? `calendar-month:${scopeKey}:${prefix}` : '', hasChanges: JSON.stringify([year, number]) !== initial.current,
    blocked: disabled, onSave: submit, onClose: () => { setOpen(false); setError(''); } });
  return <>
    <View className={`calendar-month-navigation ${className}`}>
      <ChoicePopover ariaLabel={`选择${prefix}年月`} open={open} onOpenChange={next => next ? start() : close.requestClose()} disabled={disabled} triggerAppearance='quiet' triggerSize='compact'
        triggerClassName='calendar-month-trigger' panelClassName='calendar-month-popover todo-schedule-month-popover' panelWidth={300} contentKey={error}
        trigger={<Text className={`calendar-month-label ${labelClassName}`}>{Number(month.slice(0, 4))}年{Number(month.slice(5))}月</Text>}
        heading={<PopoverHeading title='选择年月' actions={<ActionButton appearance='icon' size='compact' ariaLabel={`关闭${prefix}年月选择`} disabled={disabled} onClick={close.requestClose}>×</ActionButton>} />}
        footer={<PopoverActions className='calendar-month-actions'><ActionButton appearance='primary' size='compact' disabled={disabled} onClick={submit}>查看月份</ActionButton></PopoverActions>}>
        <NumericInputRow className='calendar-month-inputs'>
          <ScheduleNumberInput ariaLabel={`${prefix}日历年份`} type='number' disabled={disabled} maxlength={4} value={year} onInput={event => setYear(event.detail.value.replace(/\D/g, '').slice(0, 4))} /><Text>年</Text>
          <ScheduleNumberInput ariaLabel={`${prefix}日历月份`} type='number' disabled={disabled} maxlength={2} value={number} onInput={event => setNumber(event.detail.value.replace(/\D/g, '').slice(0, 2))} /><Text>月</Text>
        </NumericInputRow>
        {!!error && <View className='calendar-month-error' role='alert'>{error}</View>}
      </ChoicePopover>
      <View className='calendar-month-buttons'>
        <ActionButton appearance='icon' size='compact' ariaLabel={previousLabel || `${prefix}上个月`} disabled={disabled || month <= minMonth} onClick={() => step(-1)}>‹</ActionButton>
        <ActionButton appearance='icon' size='compact' ariaLabel={currentLabel || `${prefix}回到今天`} disabled={disabled} onClick={() => onMonthChange(currentMonth)}>○</ActionButton>
        <ActionButton appearance='icon' size='compact' ariaLabel={nextLabel || `${prefix}下个月`} disabled={disabled || month >= maxMonth} onClick={() => step(1)}>›</ActionButton>
      </View>
    </View>
    {close.dialog}
  </>;
}
