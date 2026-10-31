import { useEffect, useRef, useState } from 'react';
import EditorHeading from './editor-heading';
import EditorFieldsLayout from './editor-fields-layout';
import { FilterFieldHeading } from './filter-popover';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from './ui-button';
import { type TodoRecurrence } from '../lib/tool-records';
import { clockTime, copyTodoSchedule, localReminderParts, makeLocalReminder, recurrenceLabel, type TodoSchedule } from '../lib/todo-schedule';
import './todo-schedule-sheet.css';
import SheetActions from './sheet-actions';
import { ResetSymbol } from './manage-symbol';
import { ChoicePopover, PopoverHeading, PopoverActions } from './form-options';
import ScheduleCalendar, { safeCalendarMonth, selectableCalendarDate } from './todo-schedule-calendar';
import { SelectChevron } from './select-trigger';
import TimeWheelPicker from './time-wheel-picker';
import DateTimeWheelPicker from './date-time-wheel-picker';
import WheelPicker, { wheelNumbers } from './wheel-picker';
import { reminderCalendarLabel, reminderLeadLabel } from '../lib/wheel-time-data';

let nextScheduleId = 0;
const repeatChoices = [
  { unit: 'day', label: '每天' }, { unit: 'week', label: '每周' }, { unit: 'month', label: '每月' },
  { unit: 'year', label: '每年' }, { unit: 'weekday', label: '工作日' },
] as const;
const repeatUnits = [{ unit: 'day', label: '天' }, { unit: 'week', label: '周' }, { unit: 'month', label: '月' }, { unit: 'year', label: '年' }, { unit: 'weekday', label: '工作日' }] as const;
export function ScheduleSymbol({ kind = 'date' }: { kind?: 'date' | 'time' | 'reminder' | 'repeat' }) {
  return <View className={`todo-schedule-symbol is-${kind}`} aria-hidden><View /></View>;
}

export default function TodoScheduleSheet({ value, today, busy, reminderLabel, canAuthorize, reminderLocked, onAuthorize, onConfirm, onClose }: {
  value: TodoSchedule; today: string; busy: boolean; reminderLabel: string; canAuthorize: boolean; reminderLocked: boolean;
  onAuthorize: () => void; onConfirm: (schedule: TodoSchedule) => void; onClose: () => void;
}) {
  const [id] = useState(() => `todo-schedule-${++nextScheduleId}`);
  const [initial] = useState(() => copyTodoSchedule(value));
  const originalReminder = localReminderParts(initial.reminderAt);
  const [date, setDate] = useState(initial.dueDate);
  const [month, setMonth] = useState(() => safeCalendarMonth(initial.dueDate, today));
  const [expanded, setExpanded] = useState<'time' | 'reminder' | 'repeat' | null>(null);
  const [hasTime, setHasTime] = useState(!!initial.dueTime);
  const [hour, setHour] = useState(initial.dueTime?.slice(0, 2) || '09');
  const [minute, setMinute] = useState(initial.dueTime?.slice(3) || '00');
  const [timeHour, setTimeHour] = useState(initial.dueTime?.slice(0, 2) || '09');
  const [timeMinute, setTimeMinute] = useState(initial.dueTime?.slice(3) || '00');
  const [timeError, setTimeError] = useState('');
  const [timeWheelMoving, setTimeWheelMoving] = useState(false);
  const [hasReminder, setHasReminder] = useState(!!initial.reminderAt);
  const [reminderExact, setReminderExact] = useState(initial.reminderAt);
  const [reminderDate, setReminderDate] = useState(originalReminder.date || (selectableCalendarDate(initial.dueDate) ? initial.dueDate : today));
  const [reminderHour, setReminderHour] = useState(originalReminder.time.slice(0, 2) || initial.dueTime?.slice(0, 2) || '09');
  const [reminderMinute, setReminderMinute] = useState(originalReminder.time.slice(3) || initial.dueTime?.slice(3) || '00');
  const [repeat, setRepeat] = useState<TodoRecurrence | undefined>(initial.recurrence);
  const [customRepeat, setCustomRepeat] = useState(!!initial.recurrence && initial.recurrence.interval !== 1);
  const [interval, setInterval] = useState(String(initial.recurrence?.interval || 1));
  const [error, setError] = useState('');
  const timeInitial = useRef('');
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!busy) scheduleClose.requestClose();
    };
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, [busy, onClose, date, hasTime, hour, minute, hasReminder, reminderDate, reminderHour, reminderMinute, repeat, interval, customRepeat]);
  function changeDueDate(value: string) { setDate(value); if (!hasReminder) setReminderDate(value || today); }
  function changeHasTime(value: boolean) { setHasTime(value); }
  function changeHour(value: string) { setHour(value); if (!hasReminder) setReminderHour(value); }
  function changeMinute(value: string) { setMinute(value); if (!hasReminder) setReminderMinute(value); }
  function selectDate(day: string) {
    if (busy || !selectableCalendarDate(day)) return;
    changeDueDate(day);
    setMonth(safeCalendarMonth(day, today)); setError('');
  }
  function setSection(section: 'time' | 'reminder' | 'repeat', open: boolean) {
    if (open && section === 'time') timeInitial.current = JSON.stringify([hour, minute]);
    setExpanded(open ? section : null); setTimeWheelMoving(false); setError('');
  }
  function changeSection(section: 'time' | 'reminder' | 'repeat', open: boolean) {
    if (busy || timeWheelMoving) return;
    if (!open && section === 'time') timeClose.requestClose();
    else setSection(section, open);
  }
  function applyReminder(parts: { date: string; time: string; at?: string }) {
    setReminderExact(parts.at);
    setReminderDate(parts.date); setReminderHour(parts.time.slice(0, 2)); setReminderMinute(parts.time.slice(3));
    setError('');
  }
  function unsetReminder() {
    setHasReminder(false); applyReminder({ date: date || today, time: hasTime ? `${hour}:${minute}` : '09:00' });
  }
  function repeatWithAnchor(rule: TodoRecurrence): TodoRecurrence { return repeat?.unit === rule.unit ? { ...repeat, ...rule } : { ...rule }; }
  function chooseRepeat(rule?: TodoRecurrence) { setRepeat(rule ? repeatWithAnchor(rule) : undefined); setCustomRepeat(false); setInterval(String(rule?.interval || 1)); setError(''); }
  function clear() {
    setTimeHour('09'); setTimeMinute('00'); setTimeError('');
    setHasReminder(false); applyReminder({ date: today, time: '09:00' });
    setDate(''); setHasTime(false); setRepeat(undefined); setCustomRepeat(false); setInterval('1'); setExpanded(null); setError('');
  }
  function schedule(): TodoSchedule {
    const dueTime = hasTime ? clockTime(hour, minute) : undefined;
    const recurrence = repeat ? { ...repeat, interval: customRepeat ? Number(interval) : repeat.interval } : undefined;
    if (recurrence && (!/^\d{1,3}$/.test(customRepeat ? interval : String(recurrence.interval)) || recurrence.interval < 1 || recurrence.interval > 365)) throw new Error('重复间隔请填写 1–365。');
    const reminderTime = hasReminder ? clockTime(reminderHour, reminderMinute) : '';
    const reminderAt = !hasReminder ? undefined : reminderExact || (reminderDate === originalReminder.date && reminderTime === originalReminder.time
      ? initial.reminderAt : makeLocalReminder(reminderDate, reminderTime));
    return { dueDate: hasTime ? date || today : date, dueTime, reminderAt, recurrence };
  }
  let localChanged = true;
  try { localChanged = JSON.stringify(schedule()) !== JSON.stringify({ ...initial, dueTime: initial.dueTime || undefined, reminderAt: initial.reminderAt || undefined }); } catch { /* Invalid local inputs remain editable. */ }
  function confirm() {
    if (busy || timeWheelMoving) return;
    try {
      const next = schedule();
      if (next.reminderAt && next.reminderAt !== initial.reminderAt && new Date(next.reminderAt).getTime() <= Date.now()) throw new Error('请选择未来的提醒时间。');
      onConfirm(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '请检查日期设置。'); }
  }

  function optionHeading(title: string, section: 'time' | 'reminder' | 'repeat') {
    return <PopoverHeading className='todo-schedule-popover-heading' title={title} actions={<ActionButton appearance='icon' size='compact' ariaLabel={`关闭${title}设置`} disabled={busy} onClick={() => changeSection(section, false)}>×</ActionButton>} />;
  }
  function optionFooter(title: string, section: 'time' | 'reminder' | 'repeat') {
    return <PopoverActions className='todo-schedule-popover-actions'>
      {section === 'reminder' && <View className='todo-schedule-time-error' role={error ? 'alert' : undefined} aria-live='polite'><Text>{error}</Text></View>}
      <ActionButton appearance='primary' size='compact' ariaLabel={`完成${title}设置`} disabled={busy || timeWheelMoving} onClick={() => {
        if (section === 'reminder' && !hasReminder && !changeReminderWheel(reminderDate, reminderHour, reminderMinute)) return;
        setSection(section, false);
      }}>完成</ActionButton>
    </PopoverActions>;
  }
  function completeTime() {
    if (busy || timeWheelMoving) return;
    try {
      const time = clockTime(timeHour, timeMinute);
      changeHour(time.slice(0, 2)); changeMinute(time.slice(3)); changeHasTime(true);
      if (!date) changeDueDate(today);
      setTimeHour(time.slice(0, 2)); setTimeMinute(time.slice(3)); setTimeError(''); setSection('time', false);
    } catch (reason) { setTimeError(reason instanceof Error ? reason.message : '请选择有效时间。'); }
  }
  function clockFields() {
    return <TimeWheelPicker label='任务' hour={timeHour} minute={timeMinute} disabled={busy}
      onMovingChange={setTimeWheelMoving} onChange={(hour, minute) => { setTimeHour(hour); setTimeMinute(minute); setTimeError(''); }} />;
  }
  function timeFooter() {
    const message = timeError;
    return <PopoverActions className='todo-schedule-popover-actions'>
      <View className='todo-schedule-time-error' role={message ? 'alert' : undefined} aria-live='polite'><Text>{message}</Text></View>
      <ActionButton appearance='primary' size='compact' ariaLabel='完成时间设置' disabled={busy || timeWheelMoving} onClick={completeTime}>完成</ActionButton>
    </PopoverActions>;
  }
  function settingRow(kind: 'time' | 'reminder' | 'repeat', label: string, selected: boolean, summary: string, onClear: () => void) {
    const open = expanded === kind;
    return <View className='todo-schedule-clearable-row'>
      <ActionButton id={`${id}-${kind}`} appearance='quiet' size='compact' className={`todo-schedule-row${open ? ' is-open' : ''}`} ariaLabel={`设置${label}`} aria-expanded={open} disabled={busy} onClick={() => changeSection(kind, !open)}>
        <ScheduleSymbol kind={kind} /><Text>{label}</Text><Text className='todo-schedule-row-value'>{summary}</Text>
      </ActionButton>
      <ActionButton appearance='icon' size='compact' className={`todo-schedule-setting-clear todo-${kind}-clear`} ariaLabel={`${selected ? '清除' : '展开'}${label}设置`} aria-expanded={selected ? undefined : open} disabled={busy} onClick={() => { if (!busy) { if (selected) { onClear(); setSection(kind, false); } else changeSection(kind, !open); } }}>
        {selected ? <Text aria-hidden>×</Text> : <SelectChevron expanded={open} />}
      </ActionButton>
    </View>;
  }
  const scheduleClose = useEditorCloseGuard({ scope: id, hasChanges: localChanged, blocked: busy || timeWheelMoving, onSave: confirm, onClose });
  const timeClose = useEditorCloseGuard({
    scope: expanded === 'time' ? `${id}:time` : '',
    hasChanges: JSON.stringify([timeHour, timeMinute]) !== timeInitial.current, blocked: busy || timeWheelMoving,
    onSave: () => completeTime(), onClose: () => setSection('time', false),
  });
  function changeReminderWheel(nextDate: string, nextHour: string, nextMinute: string): boolean {
    try {
      const time = clockTime(nextHour, nextMinute);
      const at = nextDate === originalReminder.date && time === originalReminder.time && initial.reminderAt ? initial.reminderAt : makeLocalReminder(nextDate, time);
      applyReminder({ date: nextDate, time, at }); setHasReminder(true);
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : '请选择有效的提醒时间'); return false; }
  }
  let reminderPreviewAt: string | undefined;
  try { reminderPreviewAt = reminderExact || makeLocalReminder(reminderDate, clockTime(reminderHour, reminderMinute)); } catch { /* Keep invalid old data readable. */ }
  return <View className='todo-schedule-overlay'>
    <View className='todo-schedule-backdrop' catchMove onClick={scheduleClose.requestClose} />
    <View className={`todo-schedule-sheet${!error || expanded === 'reminder' ? ' is-overview' : ''}`} role='dialog' ariaLabel='日期、提醒和重复'>
      <EditorHeading className='todo-schedule-heading' title='日期' actions={<ActionButton appearance='icon' ariaLabel='关闭日期设置' disabled={busy} onClick={scheduleClose.requestClose}>×</ActionButton>} />
      <ScrollView scrollY className='todo-schedule-scroll' showScrollbar={false} enhanced bounces={false}><View className='todo-schedule-body'>
        <ScheduleCalendar month={month} onMonthChange={setMonth} selectedDate={date || (hasTime ? today : '')} today={today} busy={busy} onSelect={selectDate}
          onClear={() => { changeDueDate(''); changeHasTime(false); setError(''); }} />
        <View className='todo-schedule-options'>
          {settingRow('time', '时间', hasTime, hasTime ? `${hour}:${minute}` : '未设置', () => { changeHasTime(false); setTimeHour(hour); setTimeMinute(minute); setTimeError(''); })}
          {settingRow('reminder', '提醒', hasReminder, hasReminder ? `${Number(reminderDate.slice(5, 7))}月${Number(reminderDate.slice(8))}日 ${reminderHour}:${reminderMinute}` : '未设置', unsetReminder)}
          {settingRow('repeat', '重复', !!repeat, customRepeat && repeat ? `每 ${interval} ${repeatUnits.find(unit => unit.unit === repeat.unit)?.label}` : repeat ? recurrenceLabel(repeat) : '未设置', () => chooseRepeat())}
        </View>
      </View></ScrollView>
      {!!error && expanded !== 'reminder' && <View className='todo-schedule-error' role='alert'>{error}</View>}
      <SheetActions className='todo-schedule-footer' leading={<ActionButton appearance='icon' size='compact' ariaLabel='清除日期设置' disabled={busy} onClick={clear}><ResetSymbol /></ActionButton>}>
        <ActionButton appearance='primary' size='large' width='fill' ariaLabel='确认日期设置' disabled={busy} onClick={confirm}>确认</ActionButton>
      </SheetActions>
      <ChoicePopover anchorId={`${id}-time`} ariaLabel='设置时间' open={expanded === 'time'} onOpenChange={open => changeSection('time', open)} disabled={busy}
            panelClassName='todo-schedule-popover todo-schedule-time-popover' panelWidth={300}
            heading={optionHeading('时间', 'time')} footer={timeFooter()}>
            {clockFields()}
          </ChoicePopover>
          <ChoicePopover anchorId={`${id}-reminder`} ariaLabel='设置提醒' open={expanded === 'reminder'} onOpenChange={open => changeSection('reminder', open)} disabled={busy}
            panelClassName='todo-schedule-popover todo-schedule-reminder-popover' panelWidth={360} placement='center' maxHeightRatio={1} contentKey={`${hasReminder}-${localChanged}-${hasTime}-${error}`}
            heading={optionHeading('提醒', 'reminder')} footer={<>
              {hasReminder && <View className='todo-schedule-reminder-status'><Text>{localChanged ? '确认并保存任务后开启微信提醒' : '微信提醒'}</Text><ActionButton compact className='todo-reminder-authorize' ariaLabel={reminderLabel === '已开启' ? '微信提醒已开启' : '开启微信提醒'} disabled={busy || !canAuthorize || reminderLocked || localChanged} loading={busy} onClick={onAuthorize}>{localChanged ? '保存后开启' : reminderLabel}</ActionButton></View>}
              {optionFooter('提醒', 'reminder')}</>}>
            <EditorFieldsLayout topSpace={false}>
              <DateTimeWheelPicker date={reminderDate} hour={reminderHour} minute={reminderMinute} label='提醒' disabled={busy}
                onMovingChange={setTimeWheelMoving} onChange={changeReminderWheel} />
              <View className='todo-schedule-reminder-preview' aria-live='polite'>
                <FilterFieldHeading label='实际提醒' />
                <Text className='todo-schedule-reminder-preview-value'>{`${Number(reminderDate.slice(0, 4))}年${Number(reminderDate.slice(5, 7))}月${Number(reminderDate.slice(8))}日 ${reminderHour}:${reminderMinute}`}</Text>
                <View className='todo-schedule-reminder-description'>
                  {!!date && <Text className='todo-schedule-reminder-relative'>{reminderCalendarLabel(date, reminderPreviewAt)}</Text>}
                  <Text className='todo-schedule-reminder-lead'>{reminderLeadLabel(date, hasTime ? `${hour}:${minute}` : undefined, reminderPreviewAt)}</Text>
                </View>
                {(!date || !hasTime) && <ActionButton appearance='secondary' size='compact' width='fill' className='todo-reminder-set-time' ariaLabel='设置任务时间' disabled={busy} onClick={() => setSection('time', true)}>设置任务时间</ActionButton>}
              </View>
            </EditorFieldsLayout>
          </ChoicePopover>
          <ChoicePopover anchorId={`${id}-repeat`} ariaLabel='设置重复' open={expanded === 'repeat'} onOpenChange={open => changeSection('repeat', open)} disabled={busy}
            panelClassName='todo-schedule-popover todo-schedule-repeat-popover' panelWidth={360} placement={customRepeat ? 'center' : 'anchor'} maxHeightRatio={1} contentKey={`${customRepeat}-${repeat?.unit}`}
            heading={optionHeading('重复', 'repeat')} footer={optionFooter('重复', 'repeat')}>
            <View className='todo-schedule-section'>
              <View className='todo-schedule-choices is-repeats'>
                {repeatChoices.map(choice => <ChoiceButton key={choice.unit} aria-pressed={!customRepeat && repeat?.unit === choice.unit && repeat.interval === 1} disabled={busy} onClick={() => chooseRepeat({ unit: choice.unit, interval: 1 })}>{choice.label}</ChoiceButton>)}
                <ChoiceButton aria-pressed={customRepeat} disabled={busy} onClick={() => { setCustomRepeat(true); setRepeat(repeat || { unit: 'day', interval: 1 }); }}>自定义重复</ChoiceButton>
              </View>
              {customRepeat && repeat && <WheelPicker label='自定义重复' prefix='每隔' disabled={busy} onMovingChange={setTimeWheelMoving}
                columns={[
                  { label: '数字', ariaLabel: '重复间隔', values: wheelNumbers(1, 365), value: interval },
                  { label: '单位', ariaLabel: '重复单位', values: repeatUnits.map(item => item.label), value: repeatUnits.find(item => item.unit === repeat.unit)!.label },
                ]} onChange={values => {
                  const unit = repeatUnits.find(item => item.label === values[1])!.unit;
                  setInterval(values[0]); setRepeat(repeatWithAnchor({ unit, interval: Number(values[0]) }));
                }} />}
              {repeat?.unit === 'weekday' && <Text className='todo-schedule-hint'>工作日：周一至周五，不考虑节假日</Text>}
            </View>
          </ChoicePopover>
    </View>
    {scheduleClose.dialog}{timeClose.dialog}
  </View>;
}
