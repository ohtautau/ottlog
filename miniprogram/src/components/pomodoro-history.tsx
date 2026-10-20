import { trimTextEnd } from '../lib/text-whitespace';
import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { Picker, ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from './ui-button';
import BackButton from './back-button';
import SectionTitle from './section-title';
import AppDialog from './app-dialog';
import { hasVolatilePersonalTool, type PersonalToolSetter } from '../lib/use-personal-tool-state';
import { durationLabel, isPomodoroState, normalizePomodoroState, timerModes, type PomodoroState } from '../lib/pomodoro-data';
import { localToolDay, type Todo } from '../lib/tool-records';
import { recentDays } from '../lib/reminder-data';
import './pomodoro-history.css';

const sessionTime = (value: string) => { const date = new Date(value); return `${localToolDay(date).slice(5).replace('-', '/')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };
const historyKinds = [{ id: 'focus', label: '专注' }, { id: 'break', label: '休息' }, { id: 'all', label: '全部' }] as const;

export default function PomodoroHistory({ state, owner, setValue, tasks, today }: {
  state: PomodoroState; owner: string; setValue: PersonalToolSetter<PomodoroState>; tasks: readonly Todo[]; today: string;
}) {
  const [selectedDay, setSelectedDay] = useState(today);
  const [showAll, setShowAll] = useState(false);
  const [historyKind, setHistoryKind] = useState<'focus' | 'break' | 'all'>('focus');
  const [limit, setLimit] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true), operation = useRef(false), pending = useRef(false);
  const ownerRef = useRef(owner); ownerRef.current = owner;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const records = state.sessions.filter(session => (showAll || localToolDay(new Date(session.endedAt)) === selectedDay) && (historyKind === 'all' || (historyKind === 'focus' ? session.mode === 'focus' : session.mode !== 'focus')));
  function closeDelete() { if (!operation.current && !pending.current) { setDeleteId(null); setError(''); } }
  async function removeRecord() {
    if (!deleteId || operation.current || ownerRef.current !== owner) return;
    const id = deleteId, capturedOwner = owner;
    operation.current = true; setBusy(true); setError('');
    try {
      await setValue(previous => {
        if (!mounted.current || ownerRef.current !== capturedOwner) throw new Error('账号已切换');
        if (!isPomodoroState(previous)) throw new Error('计时数据格式暂不兼容');
        const latest = normalizePomodoroState(previous);
        return { ...latest, sessions: latest.sessions.filter(session => session.id !== id) };
      });
      pending.current = hasVolatilePersonalTool('pomodoro', capturedOwner);
      if (pending.current) throw new Error('本机尚未保存，请重试删除。');
      if (mounted.current && ownerRef.current === capturedOwner) setDeleteId(null);
    } catch (cause) {
      if (mounted.current && ownerRef.current === capturedOwner) setError(cause instanceof Error ? cause.message : '暂时未能保存，请重试删除。');
    } finally { operation.current = false; if (mounted.current) setBusy(false); }
  }
  return <View id='focus-history-delete' className='statistics-card focus-history-card'>
    <SectionTitle>投入记录</SectionTitle>
    <ScrollView scrollX className='focus-history-day-scroll' showScrollbar={false}><View className='focus-record-filters focus-history-days'>{recentDays(today).map(day => <ChoiceButton key={day} size='compact' selected={!showAll && selectedDay === day} ariaLabel={`查看${day}计时记录`} aria-pressed={!showAll && selectedDay === day} onClick={() => { setSelectedDay(day); setShowAll(false); setLimit(10); }}>{day === today ? '今天' : day.slice(5).replace('-', '/')}</ChoiceButton>)}</View></ScrollView>
    <View className='focus-history-heading'><Picker mode='date' value={selectedDay} end={today} onChange={event => { setSelectedDay(String(event.detail.value)); setShowAll(false); setLimit(10); }}><View className='focus-date-select'>{showAll ? '全部日期' : selectedDay.replace(/-/g, ' / ')}</View></Picker>{showAll ? <BackButton ariaLabel='返回选中日' onClick={() => { setShowAll(false); setLimit(10); }} /> : <ActionButton size='compact' className='focus-all-records' onClick={() => { setShowAll(true); setLimit(10); }}>查看全部</ActionButton>}</View>
    <View className='focus-record-filters'>{historyKinds.map(filter => <ChoiceButton key={filter.id} size='compact' selected={historyKind === filter.id} aria-pressed={historyKind === filter.id} onClick={() => { setHistoryKind(filter.id); setLimit(10); }}>{filter.label}</ChoiceButton>)}<Text>{records.length} 条</Text></View>
    {!records.length ? <View className='tool-empty'><View>暂无记录</View><ActionButton appearance='secondary' size='compact' onClick={() => { void Taro.navigateTo({ url: '/pages/pomodoro/index' }); }}>去开始一轮</ActionButton></View> : <View className='focus-record-list'>{records.slice(0, limit).map(session => <View className='focus-record' key={session.id}><View className={session.mode === 'focus' ? 'focus-record-mark' : 'focus-record-mark is-break'}>{session.mode === 'focus' ? '◷' : '∿'}</View><View className='focus-record-body'><View className='focus-record-top'><Text className='focus-record-title'>{trimTextEnd(session.title || timerModes.find(mode => mode.id === session.mode)!.label)}</Text><Text className='focus-record-duration'>{durationLabel(session.durationSeconds)}</Text></View><Text className='focus-record-meta'>{sessionTime(session.endedAt)} · {session.completed ? '完整一轮' : '提前结束'}</Text>{session.taskId && tasks.some(task => task.id === session.taskId) && <ActionButton appearance='quiet' size='compact' className='focus-record-link' onClick={() => { Taro.setStorageSync('ottlog.todos.focus', session.taskId); void Taro.switchTab({ url: '/pages/todos/index' }); }}>查看关联待办 ↗</ActionButton>}</View><ActionButton appearance='icon' size='compact' className='focus-record-delete' ariaLabel={`删除${session.title || '计时'}记录`} disabled={!!deleteId || busy} onClick={() => { pending.current = false; setError(''); setDeleteId(session.id); }}>×</ActionButton></View>)}</View>}
    {records.length > limit && <ActionButton appearance='secondary' size='compact' width='fill' className='focus-load-more' onClick={() => setLimit(previous => previous + 10)}>加载更多</ActionButton>}
    <Text className='focus-background-hint'>保留最近 1,000 条计时记录。跨日计时计入结束当天。</Text>
    <AppDialog open={!!deleteId} title='删除这条记录？' ariaLabel='删除计时记录' closeLabel='关闭删除确认' onClose={closeDelete} busy={busy || pending.current} error={error} panelClassName='focus-delete-window' actions={<ActionButton appearance='danger' size='large' width='fill' loading={busy} disabled={busy} onClick={() => { void removeRecord(); }}>删除</ActionButton>}><Text>对应的专注时长和当天轮数统计也会更新。</Text></AppDialog>
  </View>;
}
