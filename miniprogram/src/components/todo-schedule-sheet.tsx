import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import EditorHeading from './editor-heading';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import ActionButton, { ChoiceButton } from './ui-button';
import type { TodoRecurrence } from '../lib/tool-records';
import { clockTime, copyTodoSchedule, localReminderParts, makeLocalReminder, recurrenceLabel, type TodoSchedule } from '../lib/todo-schedule';
import { scheduleCalendarMarks } from '../lib/todo-schedule-preview';
import SheetActions from './sheet-actions';
import { ResetSymbol } from './manage-symbol';
import { ChoicePopover, PopoverHeading, PopoverActions } from './form-options';
import ScheduleCalendar, { safeCalendarMonth, selectableCalendarDate } from './todo-schedule-calendar';
import TimeWheelPicker from './time-wheel-picker';
import WheelPicker, { wheelNumbers } from './wheel-picker';
import { reminderCalendarLabel, reminderLeadLabel } from '../lib/wheel-time-data';
import './todo-schedule-sheet.css';

let nextScheduleId = 0;
const repeatChoices = [{unit:'day',label:'每天'},{unit:'week',label:'每周'},{unit:'month',label:'每月'},{unit:'year',label:'每年'},{unit:'weekday',label:'工作日'}] as const;
const repeatUnits = [{unit:'day',label:'天'},{unit:'week',label:'周'},{unit:'month',label:'月'},{unit:'year',label:'年'},{unit:'weekday',label:'工作日'}] as const;
export function ScheduleSymbol({ kind = 'date' }: { kind?: 'date' | 'time' | 'reminder' | 'repeat' }) {
  return <View className={`todo-schedule-symbol is-${kind}`} aria-hidden><View /></View>;
}

/** One calendar and clock edit separate due/reminder drafts; authorization stays independent. */
export default function TodoScheduleSheet({ value, today, busy, reminderLabel, canAuthorize, reminderLocked, onAuthorize, onConfirm, onClose }: {
  value: TodoSchedule; today: string; busy: boolean; reminderLabel: string; canAuthorize: boolean; reminderLocked: boolean;
  onAuthorize: () => void; onConfirm: (schedule: TodoSchedule) => void; onClose: () => void;
}) {
  const [id] = useState(() => `todo-schedule-${++nextScheduleId}`), [initial] = useState(() => copyTodoSchedule(value));
  const originalReminder = localReminderParts(initial.reminderAt);
  const [mode,setMode] = useState<'due'|'reminder'>('due');
  const [date,setDate] = useState(initial.dueDate), [month,setMonth] = useState(() => safeCalendarMonth(initial.dueDate,today));
  const [hasTime,setHasTime] = useState(!!initial.dueTime), [hour,setHour] = useState(initial.dueTime?.slice(0,2)||'09'), [minute,setMinute] = useState(initial.dueTime?.slice(3)||'00');
  const [hasReminder,setHasReminder] = useState(!!initial.reminderAt), [reminderExact,setReminderExact] = useState(initial.reminderAt);
  const [reminderDate,setReminderDate] = useState(originalReminder.date||(selectableCalendarDate(initial.dueDate)?initial.dueDate:today));
  const [reminderHour,setReminderHour] = useState(originalReminder.time.slice(0,2)||initial.dueTime?.slice(0,2)||'09'), [reminderMinute,setReminderMinute] = useState(originalReminder.time.slice(3)||initial.dueTime?.slice(3)||'00');
  const [repeat,setRepeat] = useState<TodoRecurrence|undefined>(initial.recurrence), [repeatOpen,setRepeatOpen] = useState(false);
  const [customRepeat,setCustomRepeat] = useState(!!initial.recurrence&&initial.recurrence.interval!==1), [interval,setInterval] = useState(String(initial.recurrence?.interval||1));
  const [moving,setMoving] = useState(false), [error,setError] = useState('');
  const blocked = busy||moving;
  function schedule(): TodoSchedule {
    const recurrence = repeat ? {...repeat,interval:customRepeat?Number(interval):repeat.interval} : undefined;
    if(recurrence&&(!Number.isInteger(recurrence.interval)||recurrence.interval<1||recurrence.interval>365))throw new Error('重复间隔请选择1至365');
    const reminderTime = clockTime(reminderHour,reminderMinute);
    const reminderAt = !hasReminder ? undefined : reminderExact || (reminderDate===originalReminder.date&&reminderTime===originalReminder.time?initial.reminderAt:makeLocalReminder(reminderDate,reminderTime));
    return {dueDate:hasTime?date||today:date,dueTime:hasTime?clockTime(hour,minute):undefined,reminderAt,recurrence};
  }
  let localChanged = true, reminderAt: string|undefined;
  try { const next=schedule(); reminderAt=next.reminderAt; localChanged=JSON.stringify(next)!==JSON.stringify({...initial,dueTime:initial.dueTime||undefined,reminderAt:initial.reminderAt||undefined}); } catch { /* Keep an invalid old draft editable. */ }
  function confirm() {
    if(blocked)return false;
    try { const next=schedule(); if(next.reminderAt&&next.reminderAt!==initial.reminderAt&&new Date(next.reminderAt).getTime()<=Date.now())throw new Error('请选择未来的提醒时间'); onConfirm(next); return true; }
    catch(reason){setError(reason instanceof Error?reason.message:'请检查日期设置');return false;}
  }
  const close = useEditorCloseGuard({scope:id,hasChanges:localChanged,blocked,onSave:confirm,onClose});
  useEffect(()=>{
    if(typeof document==='undefined')return;
    const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!repeatOpen){event.preventDefault();event.stopImmediatePropagation();close.requestClose();}};
    document.addEventListener('keydown',cancel);return()=>document.removeEventListener('keydown',cancel);
  });
  function changeMode(next:'due'|'reminder') {
    if(blocked)return;
    setMode(next);setError('');
    const selected=next==='due'?date:hasReminder?reminderDate:'';
    if(selected)setMonth(safeCalendarMonth(selected,today));
  }
  function changeReminder(day:string,h=reminderHour,m=reminderMinute) {
    if(blocked)return;
    try { const time=clockTime(h,m), at=day===originalReminder.date&&time===originalReminder.time?initial.reminderAt||makeLocalReminder(day,time):makeLocalReminder(day,time);
      setReminderExact(at);setReminderDate(day);setReminderHour(h);setReminderMinute(m);setHasReminder(true);setMonth(safeCalendarMonth(day,today));setError('');
    }catch(reason){setError(reason instanceof Error?reason.message:'请选择有效提醒时间');}
  }
  function selectDate(day:string) {
    if(blocked||!selectableCalendarDate(day))return;
    if(mode==='reminder')changeReminder(day);
    else {setDate(day);setMonth(safeCalendarMonth(day,today));if(!hasReminder)setReminderDate(day);setError('');}
  }
  function changeClock(h:string,m:string) {
    // Wheel changes arrive before the corresponding moving=false acknowledgement.
    if(busy)return;
    if(mode==='reminder') {
      try { const time=clockTime(h,m), at=reminderDate===originalReminder.date&&time===originalReminder.time?initial.reminderAt||makeLocalReminder(reminderDate,time):makeLocalReminder(reminderDate,time);
        setReminderExact(at);setReminderHour(h);setReminderMinute(m);setHasReminder(true);setError('');
      }catch(reason){setError(reason instanceof Error?reason.message:'请选择有效提醒时间');}
    } else {setHour(h);setMinute(m);setHasTime(true);if(!date){setDate(today);setMonth(safeCalendarMonth(today,today));}if(!hasReminder){setReminderHour(h);setReminderMinute(m);}setError('');}
  }
  function unsetReminder(){if(blocked)return;setHasReminder(false);setReminderExact(undefined);setError('');}
  function clearDate(){if(blocked)return;if(mode==='reminder')unsetReminder();else{setDate('');setHasTime(false);setError('');}}
  function clearClock(){if(blocked)return;if(mode==='reminder')unsetReminder();else{setHasTime(false);setError('');}}
  function clear(){if(blocked)return;setDate('');setHasTime(false);setHasReminder(false);setReminderExact(undefined);setRepeat(undefined);setCustomRepeat(false);setInterval('1');setRepeatOpen(false);setError('');}
  function repeatWithAnchor(rule:TodoRecurrence):TodoRecurrence{return repeat?.unit===rule.unit?{...repeat,...rule}:{...rule};}
  function chooseRepeat(rule?:TodoRecurrence){setRepeat(rule?repeatWithAnchor(rule):undefined);setCustomRepeat(false);setInterval(String(rule?.interval||1));setError('');}
  const marks=useMemo(()=>scheduleCalendarMarks({dueDate:hasTime?date||today:date,dueTime:hasTime?`${hour}:${minute}`:undefined,reminderAt,
    recurrence:repeat?{...repeat,interval:Number(interval),...(date!==initial.dueDate?{anchorDay:undefined}:{})}:undefined},month),[date,hasTime,hour,minute,reminderAt,repeat,interval,month,today,initial.dueDate]);
  const activeHour=mode==='due'?hour:reminderHour, activeMinute=mode==='due'?minute:reminderMinute, activeTime=mode==='due'?hasTime:hasReminder;
  return <View className='todo-schedule-overlay'>
    <View className='todo-schedule-backdrop' catchMove onClick={close.requestClose}/>
    <View className='todo-schedule-sheet is-overview has-inline-time' role='dialog' ariaLabel='日期、提醒和重复'>
      <EditorHeading className='todo-schedule-heading' title={null} titleContent={<View className='todo-schedule-modes'><ChoiceButton variant='category' ariaLabel='编辑任务日期' selected={mode==='due'} disabled={blocked} onClick={()=>changeMode('due')}>待办日期</ChoiceButton><ChoiceButton variant='category' ariaLabel='编辑提醒日期' selected={mode==='reminder'} disabled={blocked} onClick={()=>changeMode('reminder')}>提醒</ChoiceButton></View>} actions={<ActionButton appearance='icon' ariaLabel='关闭日期设置' disabled={blocked} onClick={close.requestClose}>×</ActionButton>}/>
      <ScrollView scrollY className='todo-schedule-scroll' showScrollbar={false} enhanced bounces={false}><View className='todo-schedule-body'>
        <View className='todo-schedule-calendar-pane'><ScheduleCalendar month={month} onMonthChange={setMonth} selectedDate={mode==='due'?date:hasReminder?reminderDate:''} today={today} busy={blocked} onSelect={selectDate} onClear={clearDate} reminder={mode==='reminder'} marks={marks}/></View>
        <View className='todo-schedule-controls'>
          <View className='todo-schedule-legend'><Text className='due-mark'>● 待办</Text><Text className='reminder-mark'>● 提醒</Text><Text className='repeat-mark'>● 重复</Text></View>
          <View className='todo-schedule-inline-heading'><ScheduleSymbol kind='time'/><Text>{mode==='due'?'任务时间':'提醒时间'}</Text><Text className='todo-schedule-clock-value'>{activeTime?`${activeHour}:${activeMinute}`:'未设置'}</Text><ActionButton appearance='icon' ariaLabel={mode==='due'?'清除任务时间':'清除提醒时间'} disabled={blocked||!activeTime} onClick={clearClock}>×</ActionButton></View>
          <TimeWheelPicker key={mode} label={mode==='due'?'任务':'提醒'} hour={activeHour} minute={activeMinute} disabled={busy} onMovingChange={setMoving} onChange={changeClock}/>
          {!activeTime&&<ActionButton appearance='quiet' size='compact' className='todo-schedule-use-clock' ariaLabel={mode==='due'?'使用当前任务时间':'使用当前提醒时间'} disabled={blocked} onClick={()=>changeClock(activeHour,activeMinute)}>{`使用 ${activeHour}:${activeMinute}`}</ActionButton>}
          <View className='todo-schedule-clearable-row'><ActionButton id={`${id}-repeat`} appearance='quiet' size='compact' className='todo-schedule-row' ariaLabel='设置重复' aria-expanded={repeatOpen} disabled={blocked} onClick={()=>setRepeatOpen(true)}><ScheduleSymbol kind='repeat'/><Text>重复</Text><Text className='todo-schedule-row-value'>{repeat?recurrenceLabel({...repeat,interval:Number(interval)}):'不重复'}</Text></ActionButton><ActionButton appearance='icon' ariaLabel='清除重复设置' disabled={blocked||!repeat} onClick={()=>chooseRepeat()}>×</ActionButton></View>
          {mode==='reminder'&&<View className='todo-schedule-reminder-preview' aria-live='polite'><Text className='todo-schedule-reminder-preview-value'>{hasReminder?`${reminderDate} ${reminderHour}:${reminderMinute}`:'选择提醒日期和时间'}</Text>{hasReminder&&<View className='todo-schedule-reminder-description'>{!!date&&<Text className='todo-schedule-reminder-relative'>{reminderCalendarLabel(date,reminderAt)}</Text>}<Text className='todo-schedule-reminder-lead'>{reminderLeadLabel(date,hasTime?`${hour}:${minute}`:undefined,reminderAt)}</Text></View>}{(!date||!hasTime)&&<ActionButton appearance='quiet' size='compact' ariaLabel='设置任务时间' disabled={blocked} onClick={()=>changeMode('due')}>设置任务时间</ActionButton>}{hasReminder&&<View className='todo-schedule-reminder-status'><Text>{localChanged?'确认并保存任务后开启微信提醒':'微信提醒'}</Text><ActionButton compact ariaLabel={reminderLabel==='已开启'?'微信提醒已开启':'开启微信提醒'} disabled={blocked||!canAuthorize||reminderLocked||localChanged} onClick={onAuthorize}>{localChanged?'保存后开启':reminderLabel}</ActionButton></View>}</View>}
        </View>
      </View></ScrollView>
      {!!error&&<View className='todo-schedule-error' role='alert'>{error}</View>}
      <SheetActions className='todo-schedule-footer' leading={<ActionButton appearance='icon' ariaLabel='清除日期设置' disabled={blocked} onClick={clear}><ResetSymbol/></ActionButton>}><ActionButton appearance='primary' size='large' width='fill' ariaLabel='确认日期设置' disabled={blocked} onClick={confirm}>确认</ActionButton></SheetActions>
          <ChoicePopover anchorId={`${id}-repeat`} ariaLabel='设置重复' open={repeatOpen} onOpenChange={open => { if (!moving && !busy) setRepeatOpen(open); }} disabled={busy}
            panelClassName='todo-schedule-popover todo-schedule-repeat-popover' panelWidth={360} placement={customRepeat ? 'center' : 'anchor'} maxHeightRatio={1} contentKey={`${customRepeat}-${repeat?.unit}`}
            heading={<PopoverHeading title='重复' actions={<ActionButton appearance='icon' ariaLabel='关闭重复设置' disabled={busy || moving} onClick={() => setRepeatOpen(false)}>×</ActionButton>} />} footer={<PopoverActions><ActionButton appearance='primary' disabled={busy || moving} ariaLabel='完成重复设置' onClick={() => setRepeatOpen(false)}>完成</ActionButton></PopoverActions>}>
            <View className='todo-schedule-section'>
              <View className='todo-schedule-choices is-repeats'>
                {repeatChoices.map(choice => <ChoiceButton key={choice.unit} aria-pressed={!customRepeat && repeat?.unit === choice.unit && repeat.interval === 1} disabled={busy} onClick={() => chooseRepeat({ unit: choice.unit, interval: 1 })}>{choice.label}</ChoiceButton>)}
                <ChoiceButton aria-pressed={customRepeat} disabled={busy} onClick={() => { setCustomRepeat(true); setRepeat(repeat || { unit: 'day', interval: 1 }); }}>自定义重复</ChoiceButton>
              </View>
              {customRepeat && repeat && <WheelPicker label='自定义重复' prefix='每隔' disabled={busy} onMovingChange={setMoving}
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
    {close.dialog}
  </View>;
}
