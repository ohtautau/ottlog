import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionMenu from './action-menu';
import ChoiceShortcutRail from './choice-shortcut-rail';
import ActionButton, { ChoiceButton } from './ui-button';
import type { TodoRecurrence } from '../lib/tool-records';
import { clockTime, copyTodoSchedule, localReminderParts, makeLocalReminder, recurrenceLabel, type TodoSchedule } from '../lib/todo-schedule';
import { scheduleCalendarMarks } from '../lib/todo-schedule-preview';
import ScheduleCalendar, { safeCalendarMonth, selectableCalendarDate } from './todo-schedule-calendar';
import TimeWheelPicker from './time-wheel-picker';
import './todo-schedule-sheet.css';

const repeatChoices=[{value:'none',label:'无重复'},{value:'day',label:'每天'},{value:'weekday',label:'每工作日'},{value:'week',label:'每周'},{value:'month',label:'每月'},{value:'year',label:'每年'}] as const;
export function ScheduleSymbol({ kind = 'date' }: { kind?: 'date' | 'time' | 'reminder' | 'repeat' }) {
  return <View className={`todo-schedule-symbol is-${kind}`} aria-hidden><View /></View>;
}

/** One calendar and clock edit separate due/reminder drafts; authorization stays independent. */
export default function TodoScheduleSheet({value,today,busy,onChange,onClose,saveError='',onRetry}:{
 value:TodoSchedule;today:string;busy:boolean;onChange:(schedule:TodoSchedule)=>void;onClose:()=>void;saveError?:string;onRetry?:()=>void;
}) {
  const [initial]=useState(()=>copyTodoSchedule(value));
  const published=useRef(JSON.stringify(copyTodoSchedule(value)));
  const originalReminder = localReminderParts(initial.reminderAt);
  const [mode,setMode] = useState<'due'|'reminder'>('due');
  const [date,setDate] = useState(initial.dueDate), [month,setMonth] = useState(() => safeCalendarMonth(initial.dueDate,today));
  const [hasTime,setHasTime] = useState(!!initial.dueTime), [hour,setHour] = useState(initial.dueTime?.slice(0,2)||'09'), [minute,setMinute] = useState(initial.dueTime?.slice(3)||'00');
  const [hasReminder,setHasReminder] = useState(!!initial.reminderAt), [reminderExact,setReminderExact] = useState(initial.reminderAt);
  const [reminderDate,setReminderDate] = useState(originalReminder.date||(selectableCalendarDate(initial.dueDate)?initial.dueDate:today));
  const [reminderHour,setReminderHour] = useState(originalReminder.time.slice(0,2)||initial.dueTime?.slice(0,2)||'09'), [reminderMinute,setReminderMinute] = useState(originalReminder.time.slice(3)||initial.dueTime?.slice(3)||'00');
  const [repeat,setRepeat] = useState<TodoRecurrence|undefined>(initial.recurrence), [moreOpen,setMoreOpen] = useState(false);
  const [moving,setMoving] = useState(false), [error,setError] = useState('');
  const blocked = busy||moving;
  function schedule(): TodoSchedule {
    const recurrence = repeat;
    if(recurrence&&(!Number.isInteger(recurrence.interval)||recurrence.interval<1||recurrence.interval>365))throw new Error('重复间隔请选择1至365');
    const reminderTime = clockTime(reminderHour,reminderMinute);
    const reminderAt = !hasReminder ? undefined : reminderExact || (reminderDate===originalReminder.date&&reminderTime===originalReminder.time?initial.reminderAt:makeLocalReminder(reminderDate,reminderTime));
    return {dueDate:hasTime?date||today:date,dueTime:hasTime?clockTime(hour,minute):undefined,reminderAt,recurrence};
  }
  let reminderAt:string|undefined;try{reminderAt=schedule().reminderAt;}catch{/* Invalid legacy input stays editable. */}
  function publish(){
    if(blocked)return false;
    try{const next=schedule(),encoded=JSON.stringify(next);if(encoded!==published.current){
      if(next.reminderAt&&next.reminderAt!==initial.reminderAt&&new Date(next.reminderAt).getTime()<=Date.now())throw new Error('请选择未来的提醒时间');
      onChange(next);published.current=encoded;
    }setError('');return true;}catch(reason){setError(reason instanceof Error?reason.message:'请检查日期设置');return false;}
  }
  const publishRef=useRef(publish);publishRef.current=publish;
  useEffect(()=>{if(!busy&&!moving)publishRef.current();},[date,hasTime,hour,minute,hasReminder,reminderExact,reminderDate,reminderHour,reminderMinute,repeat,busy,moving]);
  function requestClose(){if(!blocked&&!saveError&&publish())onClose();}
  useEffect(()=>{
    if(typeof document==='undefined')return;
    const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!moreOpen){event.preventDefault();event.stopImmediatePropagation();requestClose();}};
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
  function clear(){if(blocked)return;setDate('');setHasTime(false);setHasReminder(false);setReminderExact(undefined);setRepeat(undefined);setMoreOpen(false);setError('');}
  function repeatWithAnchor(rule:TodoRecurrence):TodoRecurrence{return repeat?.unit===rule.unit?{...repeat,...rule}:{...rule};}
  function chooseRepeat(rule?:TodoRecurrence){setRepeat(rule?repeatWithAnchor(rule):undefined);setError('');}
  const marks=useMemo(()=>scheduleCalendarMarks({dueDate:hasTime?date||today:date,dueTime:hasTime?`${hour}:${minute}`:undefined,reminderAt,
    recurrence:repeat?{...repeat,interval:repeat.interval,...(date!==initial.dueDate?{anchorDay:undefined}:{})}:undefined},month),[date,hasTime,hour,minute,reminderAt,repeat,month,today,initial.dueDate]);
  const activeHour=mode==='due'?hour:reminderHour, activeMinute=mode==='due'?minute:reminderMinute, activeTime=mode==='due'?hasTime:hasReminder;
  return <View className='todo-schedule-overlay'>
    <View className='todo-schedule-backdrop' catchMove onClick={requestClose}/>
    <View className={`todo-schedule-sheet is-overview has-inline-time${moving&&!busy?' is-wheel-moving':''}`} role='dialog' ariaLabel='日期、提醒和重复'>
      <View className='todo-schedule-top-actions'><ActionButton appearance='icon' ariaLabel='关闭日期设置' disabled={blocked} onClick={requestClose}>×</ActionButton><ActionMenu ariaLabel='日期更多操作' open={moreOpen} onOpenChange={setMoreOpen} disabled={blocked}><ActionButton appearance='quiet' ariaLabel='清除日期设置' disabled={blocked} onClick={clear}>重置</ActionButton></ActionMenu></View>
      <View className='todo-schedule-mode-heading'><View className='todo-schedule-modes'><ChoiceButton variant='category' ariaLabel='编辑任务日期' selected={mode==='due'} disabled={blocked} onClick={()=>changeMode('due')}>待办日期</ChoiceButton><ChoiceButton variant='category' ariaLabel='编辑提醒日期' selected={mode==='reminder'} disabled={blocked} onClick={()=>changeMode('reminder')}>提醒</ChoiceButton></View></View>
      <ScrollView scrollY className='todo-schedule-scroll' showScrollbar={false} enhanced bounces={false}><View className='todo-schedule-body'>
        <View className='todo-schedule-calendar-pane'><ScheduleCalendar month={month} onMonthChange={setMonth} selectedDate={mode==='due'?date:hasReminder?reminderDate:''} today={today} busy={blocked} onSelect={selectDate} onClear={clearDate} reminder={mode==='reminder'} reminderBase={date} marks={marks}/><View className='todo-schedule-legend'><Text className='due-mark'>● 待办</Text><Text className='reminder-mark'>● 提醒</Text><Text className='repeat-mark'>● 重复</Text></View></View>
        <View className='todo-schedule-controls'>
          <View className='todo-schedule-inline-heading'><ScheduleSymbol kind='time'/><Text>{mode==='due'?'任务时间':'提醒时间'}</Text><Text className='todo-schedule-clock-value'>{activeTime?`${activeHour}:${activeMinute}`:'未设置'}</Text><ActionButton appearance='icon' ariaLabel={mode==='due'?'清除任务时间':'清除提醒时间'} disabled={blocked||!activeTime} onClick={clearClock}>×</ActionButton></View>
          <TimeWheelPicker key={mode} label={mode==='due'?'任务':'提醒'} hour={activeHour} minute={activeMinute} disabled={busy} onMovingChange={setMoving} onChange={changeClock}/>

          <View className='todo-schedule-repeat-heading'><ScheduleSymbol kind='repeat'/><Text>重复</Text>{repeat&&repeat.interval!==1&&<Text>{recurrenceLabel(repeat)}</Text>}</View>
          <ChoiceShortcutRail label='重复快捷方式' options={repeatChoices} value={repeat?repeat.interval===1?repeat.unit:'custom':'none'} disabled={blocked} onChange={unit=>chooseRepeat(unit==='none'?undefined:{unit:unit as TodoRecurrence['unit'],interval:1})}/>

        </View>
      </View></ScrollView>
      {(error||saveError)&&<View className='todo-schedule-error' role='alert'><Text>{error||saveError}</Text>{saveError&&onRetry&&<ActionButton appearance='quiet' disabled={blocked} onClick={onRetry}>重试</ActionButton>}</View>}
    </View>
  </View>;
}
