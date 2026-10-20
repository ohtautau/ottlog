import { trimTextEnd } from '../lib/text-whitespace';
import SectionTitle from './section-title';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Image, ScrollView, Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import CalendarMonthNavigation from './calendar-month-navigation';
import CalendarDayContent, { useCalendarDateDetails } from './calendar-day-content';
import { SelectChevron } from './select-trigger';
import { habitMonthCalendar } from '../lib/habit-calendar';
import { habitCalendarDayEditable } from '../lib/habit-calendar-edit';
import { localDate, weekday, type Reminder, type ReminderState } from '../lib/reminder-data';
import PriorityFlag from './priority-flag';
import EntityTitleRow, { EntityIconPreview, EntityTitleText } from './entity-title-field';
import HabitNoteField from './habit-note-field';
import DomainChoiceField from './domain-choice-field';
import type { Domain } from '../lib/domain-data';
import { alignHabitDomain } from '../lib/habit-domains';
import { habitIconId } from '../lib/icon-library';
import { habitPriorities, habitPriorityColors, habitPriorityLabels } from '../lib/habit-metadata';
import type { HabitDetailChange } from '../lib/habit-edit';
import IconLibrarySheet from './icon-library-sheet';
import PrioritySelect from './priority-select';
import './habit-calendar.css';

export function habitDetailSheetClass({ title, note }: { title: string; note: string }) {
  const longTitle = title.length > 32, longNote = note.length > 48 || note.includes('\n');
  return `habit-calendar-editor${longTitle || longNote ? ' has-reading-summary' : ''}${longTitle ? ' has-long-title' : ''}${longNote ? ' has-long-note' : ''}`;
}

export function HabitProgress({ days, streak, className = '' }: { days: number; streak: number; className?: string }) {
  return <View className={`habit-progress ${className}`}>
    <View className='habit-progress-total' ariaLabel={`累计打卡 ${days} 天`}><Image className='habit-progress-bolt' src='/assets/habit-progress/bolt.png' mode='aspectFit' showMenuByLongpress={false} aria-hidden /><Text>{days} 天</Text></View>
    <View className='habit-progress-streak' ariaLabel={`连续打卡 ${streak} 天`}><Image className='habit-progress-fire' src='/assets/habit-progress/fire.png' mode='aspectFit' showMenuByLongpress={false} aria-hidden /><Text>{streak} 天</Text></View>
  </View>;
}

export function HabitDetailTitle({ title, className = '', children }: { title: string; className?: string; children?: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  if (title.length <= 32) return <><EntityTitleText className={className}>{title}</EntityTitleText>{children}</>;
  return <Button className='habit-detail-title-toggle' ariaLabel={`${expanded ? '收起' : '展开'}习惯名称：${title}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><View className='habit-detail-title-content'><EntityTitleText className={`habit-detail-title-copy${expanded ? '' : ' is-summary'} ${className}`}>{title}</EntityTitleText>{children}</View><SelectChevron expanded={expanded} /></Button>;
}

export function HabitDetailHeader({ item, domains, onChange, disabled = false, className = '' }: { item: Reminder; domains: readonly Domain[]; onChange?: (change: HabitDetailChange) => void; disabled?: boolean; className?: string }) {
  const [iconPicker, setIconPicker] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  useEffect(() => {
    if (!iconPicker || typeof document === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setIconPicker(false); } };
    document.addEventListener('keydown', close, true);
    return () => document.removeEventListener('keydown', close, true);
  }, [iconPicker]);
  const priority = item.priority || 'none';
  const aligned = alignHabitDomain(item, domains);
  const selectedDomain = domains.find(domain => domain.id === aligned.domainId)?.id || '';
  const icon = <EntityIconPreview iconId={habitIconId(item)} backgroundImage={item.backgroundImage} className='habit-detail-header-art daily-detail-art' iconClassName='habit-icon' />;
  return <><View className='habit-detail-domain-field'><DomainChoiceField domains={domains} value={selectedDomain} ariaLabel={onChange ? '选择习惯领域' : '习惯领域'} disabled={disabled} {...(onChange ? { onChange: value => onChange({ field: 'domain', value }) } : { readOnly: true as const })} /></View><EntityTitleRow className={`habit-detail-header ${className}`}>
    {onChange ? <ActionButton appearance='icon' ariaLabel='选择习惯图标' className='habit-detail-icon-picker' disabled={disabled} onClick={() => { setPriorityOpen(false); setIconPicker(true); }}>{icon}</ActionButton> : icon}
    <View className='habit-detail-header-copy'>
      <HabitDetailTitle title={item.title} className='habit-detail-header-title daily-detail-title'>
        {!item.enabled && <View className='habit-detail-header-meta'><Text>已归档</Text></View>}
      </HabitDetailTitle>
    </View>
    {onChange ? <PrioritySelect ariaLabel={`选择习惯优先度：${habitPriorityLabels[priority]}`} className='habit-detail-header-priority' open={priorityOpen} onOpenChange={setPriorityOpen} disabled={disabled} options={habitPriorities.map(value => ({ value, label: habitPriorityLabels[value], ariaLabel: `优先度${habitPriorityLabels[value]}`, color: habitPriorityColors[value], outlined: value === 'none' }))} value={priority} onChange={value => onChange({ field: 'priority', value })} /> : <View className='habit-detail-header-priority' role='img' ariaLabel={`优先度${habitPriorityLabels[priority]}`}><PriorityFlag color={habitPriorityColors[priority]} outlined={priority === 'none'} /></View>}
  </EntityTitleRow>
    {iconPicker && onChange && !disabled && <IconLibrarySheet selectedId={habitIconId(item)} onClose={() => setIconPicker(false)} onSelect={id => { if (id) { setIconPicker(false); onChange({ field: 'icon', value: id }); } }} />}
  </>;
}

export function HabitDetailNote({ note }: { note: string }) {
  if (!note) return null;
  return <View className='habit-detail-note-section'>
    <HabitNoteField className='habit-detail-note' ariaLabel='习惯备注' value={note} readOnly />
  </View>;
}

export default function HabitCalendar({ state, habitId, now, layout = 'page', detailAction, onDayToggle, disabled = false, error }: { state: ReminderState; habitId: string; now: number; layout?: 'page' | 'detail'; detailAction?: ReactNode; onDayToggle?: (day: string) => void; disabled?: boolean; error?: string }) {
  const today = localDate(new Date(now)), currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [logLimit, setLogLimit] = useState(10);
  useEffect(() => { setLogLimit(10); }, [habitId, month]);
  const { showDate, details } = useCalendarDateDetails();
  const calendar = useMemo(() => habitMonthCalendar(state, habitId, month, now), [state, habitId, month, now]);
  const interactive = layout === 'detail' && !!onDayToggle;
  const enabled = state.items.some(item => item.id === habitId && item.enabled);
  const logContent = <>
    {calendar.logs.length ? calendar.logs.slice(0, logLimit).map(entry => <View key={entry.day} className='habit-calendar-log-row'><View className='habit-calendar-log-mark'><View className='daily-small-check' /></View><View className='habit-calendar-log-copy'><View><Text>{Number(entry.day.slice(5, 7))}月{Number(entry.day.slice(8))}日</Text><Text>{weekday(entry.day)}</Text></View><Text className='habit-calendar-log-text'>{trimTextEnd(entry.text)}</Text></View></View>) : <Text className='habit-calendar-log-empty'>这个月还没有打卡留言</Text>}
    {calendar.logs.length > logLimit && <ActionButton className='habit-calendar-log-more' size='compact' width='fill' onClick={() => setLogLimit(previous => previous + 10)}>更多</ActionButton>}
  </>;
  return <View className={`habit-calendar${layout === 'detail' ? ' is-detail' : ''}${interactive ? ' is-interactive' : ''}`}>
    <View className='habit-calendar-stats'>
      <View><Text className='habit-calendar-stat-number'>{calendar.completed}<Text>天</Text></Text><Text className='habit-calendar-stat-label'>月打卡</Text></View>
      <View><Text className='habit-calendar-stat-number'>{calendar.stats.days}<Text>天</Text></Text><Text className='habit-calendar-stat-label'>总打卡</Text></View>
      <View><Text className='habit-calendar-stat-number'>{calendar.rate}<Text>%</Text></Text><Text className='habit-calendar-stat-label'>月完成率</Text></View>
      <View><Text className='habit-calendar-stat-number'>{calendar.stats.streak}<Text>天</Text></Text><Text className='habit-calendar-stat-label'>当前连续</Text></View>
    </View>
    <Text className='habit-calendar-streak-note'>{calendar.stats.streak ? `连续打卡截至${calendar.stats.daysSinceLast === 0 ? '今天' : '昨天'}` : '连续打卡可从今天或昨天接续'}</Text>
    <View className='habit-calendar-panel'>
      <CalendarMonthNavigation className='habit-calendar-navigation' labelClassName='habit-calendar-month' month={month} onMonthChange={setMonth} currentMonth={currentMonth} minMonth='0000-01' maxMonth={currentMonth} disabled={disabled} prefix='打卡' scopeKey={habitId} previousLabel='查看上个月打卡' currentLabel='回到本月打卡' nextLabel='查看下个月打卡' />
      <View className='habit-calendar-weekdays'>{['日', '一', '二', '三', '四', '五', '六'].map(day => <Text key={day}>{day}</Text>)}</View>
      <View className='habit-calendar-grid'>{calendar.days.map(day => {
        const className = `habit-calendar-day${day.inMonth ? '' : ' is-outside'}${day.completed ? ' is-completed' : ''}${day.today ? ' is-today' : ''}${day.future ? ' is-future' : ''}`;
        const ariaLabel = `${day.day}${day.today ? ' 今天' : ''}${day.completed ? ' 已打卡' : day.future ? ' 尚未到来' : ' 未打卡'}`;
        const content = <CalendarDayContent date={day.day} number={day.date} circleClass='habit-calendar-day-circle'>{day.completed && <View className='habit-calendar-check'><View className='daily-small-check' /></View>}</CalendarDayContent>;
        return interactive ? <Button key={day.day} className={className} ariaLabel={ariaLabel} aria-pressed={day.completed} disabled={disabled || !enabled || !habitCalendarDayEditable(day.day, now)} hoverClass='habit-calendar-day-pressed' onClick={() => onDayToggle?.(day.day)} onLongPress={() => { if (!disabled) showDate(day.day); }}>{content}</Button> : <View key={day.day} className={className} ariaLabel={ariaLabel} onLongPress={() => showDate(day.day)}>{content}</View>;
      })}</View>
    </View>
    {error && <View className='habit-calendar-error' role='alert'><Text>{error}</Text></View>}
    <View className='habit-calendar-log'><View className='habit-calendar-log-heading'><SectionTitle inRow>月打卡日志</SectionTitle><Text className='habit-calendar-log-count'>{calendar.logs.length} 条</Text>{layout === 'detail' && detailAction}</View>
      {layout === 'detail' ? <ScrollView key={`logs:${habitId}:${month}`} className='habit-calendar-log-scroll' scrollY enhanced bounces={false} showScrollbar={false}>{logContent}</ScrollView> : logContent}
    </View>
    {details}
  </View>;
}
