import { useEffect, useRef, useState } from 'react';
import EditorHeading from './editor-heading';
import EditorFieldsLayout from './editor-fields-layout';
import { FilterFieldHeading } from './filter-popover';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from './ui-button';
import { type TodoRecurrence } from '../lib/tool-records';
import { clockTime, copyTodoSchedule, localReminderParts, makeLocalReminder, recurrenceLabel, reminderDays, reminderTimes, reminderDay, reminderDayLabel, reminderSelection, relativeReminder, type TodoSchedule } from '../lib/todo-schedule';
import './todo-schedule-sheet.css';
import SheetActions from './sheet-actions';
import { ResetSymbol } from './manage-symbol';
import { ChoicePopover, PopoverHeading, PopoverActions, SingleChoiceField } from './form-options';
import ScheduleNumberInput from './schedule-number-input';
import { NumericInputRow } from './single-line-input';
import ScheduleCalendar, { safeCalendarMonth, selectableCalendarDate } from './todo-schedule-calendar';
import { SelectChevron } from './select-trigger';

let nextScheduleId = 0;
const repeatChoices = [
  { unit: 'day', label: '每天' }, { unit: 'week', label: '每周' }, { unit: 'month', label: '每月' },
  { unit: 'year', label: '每年' }, { unit: 'weekday', label: '工作日' },
] as const;
const repeatUnits = [{ unit: 'day', label: '天' }, { unit: 'week', label: '周' }, { unit: 'month', label: '月' }, { unit: 'year', label: '年' }, { unit: 'weekday', label: '工作日' }] as const;
const digits = (value: string, length = 2) => value.replace(/\D/g, '').slice(0, length);
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
  const [reminderPart, setReminderPart] = useState<'time' | null>(null);
  const [expanded, setExpanded] = useState<'time' | 'reminder' | 'repeat' | null>(null);
  const [hasTime, setHasTime] = useState(!!initial.dueTime);
  const [hour, setHour] = useState(initial.dueTime?.slice(0, 2) || '09');
  const [minute, setMinute] = useState(initial.dueTime?.slice(3) || '00');
  const [timeHour, setTimeHour] = useState(initial.dueTime?.slice(0, 2) || '09');
  const [timeMinute, setTimeMinute] = useState(initial.dueTime?.slice(3) || '00');
  const [timeError, setTimeError] = useState('');
  const [hasReminder, setHasReminder] = useState(!!initial.reminderAt);
  const [reminderExact, setReminderExact] = useState(initial.reminderAt);
  const [reminderDate, setReminderDate] = useState(originalReminder.date || initial.dueDate || today);
  const [reminderHour, setReminderHour] = useState(originalReminder.time.slice(0, 2) || initial.dueTime?.slice(0, 2) || '09');
  const [reminderMinute, setReminderMinute] = useState(originalReminder.time.slice(3) || initial.dueTime?.slice(3) || '00');
  const [reminderView] = useState(() => reminderSelection(initial.reminderAt, initial.dueDate || today, initial.dueTime || '09:00'));
  const [reminderAnchor, setReminderAnchor] = useState(reminderView.anchor);
  const [reminderPreset, setReminderPreset] = useState(reminderView.preset);
  const [reminderQuick, setReminderQuick] = useState<{ anchor: string; id: string; minutes: number } | null>(null);
  const reminderNeedsTime = hasReminder && !!reminderQuick && !hasTime;
  const [reminderTimeHour, setReminderTimeHour] = useState(reminderHour);
  const [reminderTimeMinute, setReminderTimeMinute] = useState(reminderMinute);
  const [reminderTimeError, setReminderTimeError] = useState('');
  const [repeat, setRepeat] = useState<TodoRecurrence | undefined>(initial.recurrence);
  const [customRepeat, setCustomRepeat] = useState(!!initial.recurrence && initial.recurrence.interval !== 1);
  const [interval, setInterval] = useState(String(initial.recurrence?.interval || 1));
  const [error, setError] = useState('');
  const timeInitial = useRef('');
  const reminderTimeInitial = useRef('');
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
  function customizeReminder() { if (!reminderNeedsTime && reminderPreset !== 'none') { setReminderPreset('custom'); setReminderAnchor(reminderDate); } }
  function changeDueDate(value: string) { if (value !== date) customizeReminder(); setDate(value); if (!hasReminder) { setReminderDate(value || today); setReminderAnchor(value || today); } }
  function changeHasTime(value: boolean) { if (value !== hasTime) customizeReminder(); setHasTime(value); }
  function changeHour(value: string) { if (value !== hour) customizeReminder(); setHour(value); if (!hasReminder) { setReminderHour(value); setReminderTimeHour(value); } }
  function changeMinute(value: string) { if (value !== minute) customizeReminder(); setMinute(value); if (!hasReminder) { setReminderMinute(value); setReminderTimeMinute(value); } }
  function selectDate(day: string) {
    if (busy || !selectableCalendarDate(day)) return;
    changeDueDate(day);
    setMonth(safeCalendarMonth(day, today)); setError('');
  }
  function setSection(section: 'time' | 'reminder' | 'repeat', open: boolean) {
    if (open && section === 'time') timeInitial.current = JSON.stringify([hour, minute]);
    setExpanded(open ? section : null); setReminderPart(null); setError('');
  }
  function changeSection(section: 'time' | 'reminder' | 'repeat', open: boolean) {
    if (!open && section === 'time') timeClose.requestClose();
    else setSection(section, open);
  }
  function openReminderPart(part: 'time' | null) {
    if (part === 'time') reminderTimeInitial.current = JSON.stringify([reminderHour, reminderMinute]);
    setReminderPart(part);
  }
  function applyReminder(parts: { date: string; time: string; at?: string }, anchor: string, preset: string) {
    setReminderExact(parts.at);
    setReminderDate(parts.date); setReminderHour(parts.time.slice(0, 2)); setReminderMinute(parts.time.slice(3));
    setReminderTimeHour(parts.time.slice(0, 2)); setReminderTimeMinute(parts.time.slice(3)); setReminderTimeError('');
    setReminderAnchor(anchor); setReminderPreset(preset); setError('');
  }
  function unsetReminder() {
    setReminderQuick(null); setHasReminder(false); applyReminder({ date: date || today, time: hasTime ? `${hour}:${minute}` : '09:00' }, date || today, 'none'); setReminderPart(null);
  }
  function reminderClockLabel(minutes: number) {
    if (!hasTime) return '';
    try { return relativeReminder(date || today, `${hour}:${minute}`, minutes).time; } catch { return ''; }
  }
  function setReminderChoice(choice: string, days?: number) {
    if (busy) return;
    try {
      const anchor = days === undefined ? reminderAnchor : reminderDay(date || today, days);
      const preset = reminderTimes.find(item => item.id === choice);
      if (preset) {
        const parts = hasTime ? relativeReminder(anchor, clockTime(hour, minute), preset.minutes) : { date: anchor, time: clockTime(reminderHour, reminderMinute) };
        applyReminder(parts, anchor, choice); setReminderQuick({ anchor, id: choice, minutes: preset.minutes }); setHasReminder(true);
      } else { makeLocalReminder(anchor, clockTime(reminderHour, reminderMinute)); setReminderExact(undefined); setReminderDate(anchor); setReminderAnchor(anchor); setError(''); }
      setReminderPart(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '请检查提醒设置。'); }
  }
  function repeatWithAnchor(rule: TodoRecurrence): TodoRecurrence { return repeat?.unit === rule.unit ? { ...repeat, ...rule } : { ...rule }; }
  function chooseRepeat(rule?: TodoRecurrence) { setRepeat(rule ? repeatWithAnchor(rule) : undefined); setCustomRepeat(false); setInterval(String(rule?.interval || 1)); setError(''); }
  function clear() {
    setTimeHour('09'); setTimeMinute('00'); setTimeError('');
    setReminderQuick(null); setHasReminder(false); applyReminder({ date: today, time: '09:00' }, today, 'none'); setReminderPart(null);
    setDate(''); setHasTime(false); setRepeat(undefined); setCustomRepeat(false); setInterval('1'); setExpanded(null); setError('');
  }
  function schedule(): TodoSchedule {
    if (reminderNeedsTime) throw new Error('还未设置具体时间');
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
    if (busy) return;
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
      <ActionButton appearance='primary' size='compact' ariaLabel={`完成${title}设置`} disabled={busy} onClick={() => { if (section === 'reminder' && reminderNeedsTime) { setError('还未设置具体时间'); return; } setSection(section, false); }}>完成</ActionButton>
    </PopoverActions>;
  }
  function completeTime(reminder = false) {
    if (busy) return;
    try {
      const time = clockTime(reminder ? reminderTimeHour : timeHour, reminder ? reminderTimeMinute : timeMinute);
      if (reminder) {
        makeLocalReminder(reminderDate, time); applyReminder({ date: reminderDate, time }, reminderDate, 'custom'); setReminderQuick(null); setHasReminder(true); setReminderPart(null);
      } else {
        const pending = reminderNeedsTime && reminderQuick ? { ...reminderQuick, parts: relativeReminder(reminderQuick.anchor, time, reminderQuick.minutes) } : null;
        changeHour(time.slice(0, 2)); changeMinute(time.slice(3)); changeHasTime(true);
        if (!date) changeDueDate(today);
        if (pending) applyReminder(pending.parts, pending.anchor, pending.id);
        setTimeHour(time.slice(0, 2)); setTimeMinute(time.slice(3)); setTimeError(''); setSection('time', false);
      }
    } catch (reason) { (reminder ? setReminderTimeError : setTimeError)(reason instanceof Error ? reason.message : '请填写有效时间。'); }
  }
  function clockFields(reminder = false) {
    const changeHour = reminder ? setReminderTimeHour : setTimeHour, changeMinute = reminder ? setReminderTimeMinute : setTimeMinute, clearError = reminder ? setReminderTimeError : setTimeError;
    const prefix = reminder ? '提醒' : '任务';
    return <View className='todo-schedule-time-fields'><NumericInputRow className='todo-schedule-clock-input'>
      <ScheduleNumberInput ariaLabel={`${prefix}小时`} type='number' disabled={busy} maxlength={3} value={reminder ? reminderTimeHour : timeHour} cursorSpacing={96} adjustPosition onInput={event => { changeHour(event.detail.value); clearError(''); }} /><Text>时</Text>
      <ScheduleNumberInput ariaLabel={`${prefix}分钟`} type='number' disabled={busy} maxlength={3} value={reminder ? reminderTimeMinute : timeMinute} cursorSpacing={96} adjustPosition onInput={event => { changeMinute(event.detail.value); clearError(''); }} /><Text>分</Text>
    </NumericInputRow></View>;
  }
  function timeFooter(reminder = false) {
    const message = reminder ? reminderTimeError : timeError;
    return <PopoverActions className='todo-schedule-popover-actions'>
      <View className='todo-schedule-time-error' role={message ? 'alert' : undefined} aria-live='polite'><Text>{message}</Text></View>
      <ActionButton appearance='primary' size='compact' ariaLabel={reminder ? '完成提醒时间设置' : '完成时间设置'} disabled={busy} onClick={() => completeTime(reminder)}>完成</ActionButton>
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
  const scheduleClose = useEditorCloseGuard({ scope: id, hasChanges: localChanged, blocked: busy, onSave: confirm, onClose });
  const timeClose = useEditorCloseGuard({
    scope: expanded === 'time' ? `${id}:time` : '',
    hasChanges: JSON.stringify([timeHour, timeMinute]) !== timeInitial.current, blocked: busy,
    onSave: () => completeTime(), onClose: () => setSection('time', false),
  });
  const reminderTimeClose = useEditorCloseGuard({
    scope: expanded === 'reminder' && reminderPart === 'time' ? `${id}:reminder-time` : '',
    hasChanges: JSON.stringify([reminderTimeHour, reminderTimeMinute]) !== reminderTimeInitial.current, blocked: busy,
    onSave: () => completeTime(true), onClose: () => setReminderPart(null),
  });
  return <View className='todo-schedule-overlay'>
    <View className='todo-schedule-backdrop' catchMove onClick={scheduleClose.requestClose} />
    <View className={`todo-schedule-sheet${!error || expanded === 'reminder' ? ' is-overview' : ''}`} role='dialog' ariaLabel='日期、提醒和重复'>
      <EditorHeading className='todo-schedule-heading' title='日期' actions={<ActionButton appearance='icon' ariaLabel='关闭日期设置' disabled={busy} onClick={scheduleClose.requestClose}>×</ActionButton>} />
      <ScrollView scrollY className='todo-schedule-scroll' showScrollbar={false} enhanced bounces={false}><View className='todo-schedule-body'>
        <ScheduleCalendar month={month} onMonthChange={setMonth} selectedDate={date || (hasTime ? today : '')} today={today} busy={busy} onSelect={selectDate}
          onClear={() => { changeDueDate(''); changeHasTime(false); setError(''); }} />
        <View className='todo-schedule-options'>
          {settingRow('time', '时间', hasTime, hasTime ? `${hour}:${minute}` : '未设置', () => { changeHasTime(false); setTimeHour(hour); setTimeMinute(minute); setTimeError(''); })}
          {settingRow('reminder', '提醒', hasReminder, reminderNeedsTime ? '还未设置具体时间' : hasReminder ? `${Number(reminderDate.slice(5, 7))}月${Number(reminderDate.slice(8))}日 ${reminderHour}:${reminderMinute}` : '未设置', unsetReminder)}
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
          <ChoicePopover anchorId={`${id}-reminder`} ariaLabel='设置提醒' open={expanded === 'reminder'} onOpenChange={open => setSection('reminder', open)} disabled={busy}
            panelClassName='todo-schedule-popover todo-schedule-reminder-popover' panelWidth={360} placement='center' maxHeightRatio={1} contentKey={`${hasReminder}-${localChanged}-${hasTime}-${reminderNeedsTime}-${reminderPreset}-${error}`}
            heading={optionHeading('提醒', 'reminder')} footer={<>
              {hasReminder && <View className='todo-schedule-reminder-status'><Text>{localChanged ? '确认并保存任务后开启微信提醒' : '微信提醒'}</Text><ActionButton compact className='todo-reminder-authorize' ariaLabel={reminderLabel === '已开启' ? '微信提醒已开启' : '开启微信提醒'} disabled={busy || !canAuthorize || reminderLocked || localChanged} loading={busy} onClick={onAuthorize}>{localChanged ? '保存后开启' : reminderLabel}</ActionButton></View>}
              {optionFooter('提醒', 'reminder')}</>}>
            <EditorFieldsLayout topSpace={false}>
              <View>
                <FilterFieldHeading label='提醒时间' caption='快捷项按任务当天时间计算' />
                <View className='todo-schedule-choices is-reminders'>
                  {reminderTimes.map(choice => { const clock = reminderClockLabel(choice.minutes); return <ChoiceButton key={choice.id} className='todo-reminder-time-choice' ariaLabel={choice.label} selected={reminderPart !== 'time' && hasReminder && reminderPreset === choice.id} disabled={busy} onClick={() => setReminderChoice(choice.id, 0)}><Text>{choice.label}</Text>{!!clock && <Text className='todo-reminder-time-caption'>{clock}</Text>}</ChoiceButton>; })}
                  <ChoiceButton id={`${id}-reminder-time`} className='todo-reminder-time-choice' size='compact' selected={reminderPart === 'time' || hasReminder && reminderPreset === 'custom'} ariaLabel='设置提醒时刻' aria-expanded={reminderPart === 'time'} disabled={busy} onClick={() => { if (reminderPart === 'time') reminderTimeClose.requestClose(); else openReminderPart('time'); }}><Text>自定义时间</Text>{hasReminder && reminderPreset === 'custom' && <Text className='todo-reminder-time-caption'>{reminderHour}:{reminderMinute}</Text>}</ChoiceButton>
                </View>
              </View>
              <View>
                <FilterFieldHeading label='提醒日期' />
                <View className='todo-schedule-choices todo-schedule-reminder-days-inline'>
                  {reminderDays.map(day => <ChoiceButton key={day.days} size='compact' ariaLabel={day.label} selected={reminderDayLabel(date || today, reminderAnchor) === day.label} disabled={busy} onClick={() => setReminderChoice(reminderPreset, day.days)}>{day.label}</ChoiceButton>)}
                </View>
              </View>
              <View className='todo-schedule-reminder-preview' aria-live='polite'>
                <FilterFieldHeading label='实际提醒' />
                <Text className='todo-schedule-reminder-preview-value'>{reminderNeedsTime ? '还未设置具体时间' : hasReminder ? `${Number(reminderDate.slice(0, 4))}年${Number(reminderDate.slice(5, 7))}月${Number(reminderDate.slice(8))}日 ${reminderHour}:${reminderMinute}` : '未设置'}</Text>
                {reminderNeedsTime && <ActionButton appearance='secondary' size='compact' width='fill' className='todo-reminder-set-time' ariaLabel='设置任务时间' disabled={busy} onClick={() => setSection('time', true)}>设置任务时间</ActionButton>}
              </View>
            </EditorFieldsLayout>
          </ChoicePopover>
          <ChoicePopover anchorId={`${id}-reminder-time`} ariaLabel='设置提醒时刻' open={expanded === 'reminder' && reminderPart === 'time'} disabled={busy} onOpenChange={open => { if (open) openReminderPart('time'); else reminderTimeClose.requestClose(); }} panelClassName='todo-schedule-popover todo-schedule-time-popover todo-schedule-reminder-time' panelWidth={300}
            heading={<PopoverHeading title='提醒时间' actions={<ActionButton appearance='icon' ariaLabel='关闭提醒时刻设置' disabled={busy} onClick={reminderTimeClose.requestClose}>×</ActionButton>} />} footer={timeFooter(true)}>
            {clockFields(true)}
          </ChoicePopover>
          <ChoicePopover anchorId={`${id}-repeat`} ariaLabel='设置重复' open={expanded === 'repeat'} onOpenChange={open => setSection('repeat', open)} disabled={busy}
            panelClassName='todo-schedule-popover todo-schedule-repeat-popover' panelWidth={360} placement={customRepeat ? 'center' : 'anchor'} maxHeightRatio={1} contentKey={`${customRepeat}-${repeat?.unit}`}
            heading={optionHeading('重复', 'repeat')} footer={optionFooter('重复', 'repeat')}>
            <View className='todo-schedule-section'>
              <View className='todo-schedule-choices is-repeats'>
                {repeatChoices.map(choice => <ChoiceButton key={choice.unit} aria-pressed={!customRepeat && repeat?.unit === choice.unit && repeat.interval === 1} disabled={busy} onClick={() => chooseRepeat({ unit: choice.unit, interval: 1 })}>{choice.label}</ChoiceButton>)}
                <ChoiceButton aria-pressed={customRepeat} disabled={busy} onClick={() => { setCustomRepeat(true); setRepeat(repeat || { unit: 'day', interval: 1 }); }}>自定义重复</ChoiceButton>
              </View>
              {customRepeat && repeat && <>
                <NumericInputRow className='todo-schedule-repeat-input'><Text>每</Text><ScheduleNumberInput ariaLabel='重复间隔' type='number' disabled={busy} maxlength={3} value={interval} cursorSpacing={96} adjustPosition onInput={event => setInterval(digits(event.detail.value, 3))} /><SingleChoiceField ariaLabel='选择重复单位' size='compact' width='content' disabled={busy} options={repeatUnits.map(unit => ({ value: unit.unit, label: unit.label }))} value={repeat.unit} onChange={unit => setRepeat(repeatWithAnchor({ unit, interval: Number(interval) }))} /></NumericInputRow>
              </>}
              {repeat?.unit === 'weekday' && <Text className='todo-schedule-hint'>工作日：周一至周五，不考虑节假日</Text>}
            </View>
          </ChoicePopover>
    </View>
    {scheduleClose.dialog}{timeClose.dialog}{reminderTimeClose.dialog}
  </View>;
}
