import { useEffect, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import SectionTitle from './section-title';
import type { PomodoroState } from '../lib/pomodoro-data';
import { eligiblePomodoroReminderTemplates, getPomodoroReminderConfig, getPomodoroReminders, pomodoroReminderMessage, requestPomodoroReminders, type PomodoroReminder, type PomodoroReminderConfig } from '../lib/pomodoro-reminders';
import './pomodoro-notifications.css';

const eventLabels = { focus_start: '专注开始', break_start: '休息开始', break_end: '休息结束' };
const reminderLabels = { pending: '已安排', paused: '已暂停', dispatching: '发送中', sent: '已发送', failed: '发送失败', cancelled: '已取消', unknown: '发送结果待确认' };

export default function PomodoroNotifications({ state, owner, visible }: { state: PomodoroState; owner: string; visible: boolean }) {
  const [config, setConfig] = useState<PomodoroReminderConfig | null>(null);
  const [error, setError] = useState('');
  const [reminders, setReminders] = useState<PomodoroReminder[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const mounted = useRef(true), operation = useRef(false), epoch = useRef(0), read = useRef(0);
  const active = state.active, runId = active?.rootRunId || active?.id || '';
  const context = useRef({ owner, runId, state, visible }); context.current = { owner, runId, state, visible };
  const currentReminders = reminders.filter(item => item.runId === runId);
  const eligible = eligiblePomodoroReminderTemplates(active, state.settings, config?.templates || [], now);
  const missing = eligible.filter(template => !currentReminders.some(item => item.event === template.event));
  const hasPlan = !!eligible.length && !missing.length;
  useEffect(() => {
    if (!visible) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible]);
  useEffect(() => {
    mounted.current = true;
    void getPomodoroReminderConfig().then(value => { if (mounted.current) setConfig(value); }).catch(() => { if (mounted.current) setError('暂时无法读取微信提醒配置，请稍后重新打开。'); });
    return () => { mounted.current = false; ++epoch.current; };
  }, []);
  useEffect(() => {
    ++epoch.current; setReminders([]); setMessage('');
    if (!visible || !owner || owner === 'guest') return;
    async function refresh() {
      const request = ++read.current, capturedEpoch = epoch.current;
      try {
        const result = await getPomodoroReminders(owner);
        if (mounted.current && context.current.owner === owner && context.current.runId === runId && context.current.visible && epoch.current === capturedEpoch && read.current === request) setReminders(result.reminders);
      } catch { /* Network failure does not alter the timer. */ }
    }
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    return () => { ++epoch.current; clearInterval(timer); };
  }, [owner, runId, visible]);
  async function enable() {
    const latest = context.current;
    if (!mounted.current || !latest.visible || latest.owner !== owner || latest.runId !== runId || operation.current || !latest.state.active?.running || !config?.enabled || owner === 'guest') return;
    const templates = eligiblePomodoroReminderTemplates(latest.state.active, latest.state.settings, config.templates).filter(template => !currentReminders.some(item => item.event === template.event));
    if (!templates.length) return;
    operation.current = true; ++epoch.current; setBusy(true); setMessage('');
    try {
      // Retain the original tap for WeChat consent, before network work.
      const result = await requestPomodoroReminders(runId, owner, { ...config, templates });
      if (!mounted.current || context.current.owner !== owner || context.current.runId !== runId) return;
      ++epoch.current;
      setReminders(previous => [...previous.filter(item => !result.reminders.some(next => next.runId === item.runId && next.event === item.event)), ...result.reminders]);
      setMessage(pomodoroReminderMessage(result));
    } catch (cause) {
      if (mounted.current && context.current.owner === owner && context.current.runId === runId) setMessage(cause instanceof Error ? cause.message : '微信提醒暂未开启，计时照常继续。');
    } finally { operation.current = false; if (mounted.current) setBusy(false); }
  }
  return <View className='statistics-card focus-reminders'>
    <View className='focus-reminder-heading'><SectionTitle inRow>微信提醒</SectionTitle><Text className={hasPlan ? 'focus-reminder-badge is-enabled' : 'focus-reminder-badge'}>{hasPlan ? '本轮已授权' : '按轮授权'}</Text></View>
    <Text className='focus-reminder-description'>专注开始、休息开始、休息结束时，发送你已同意订阅的微信提醒。新一轮需要重新授权。</Text>
    {!config ? <Text className='focus-reminder-note'>{error || '正在读取微信提醒配置…'}</Text> : !config.enabled ? <Text className='focus-reminder-note'>{config.reason || '微信提醒尚未配置，当前只进行计时。'}</Text> : owner === 'guest' ? <Text className='focus-reminder-note'>先到「我的」登录，即可为本轮开启微信提醒。</Text> : !active ? <Text className='focus-reminder-note'>开始一轮计时后，可开启本轮提醒。</Text> : <Text className='focus-reminder-note'>{active.running ? '微信仅发送本轮已授权的提醒；拒绝授权不影响计时。' : '计时已暂停，尚未发送的提醒会随继续计时重新安排。'}</Text>}
    {active && <ActionButton size='compact' width='fill' className='focus-reminder-enable' disabled={busy || !config?.enabled || owner === 'guest' || !missing.length || !active.running} onClick={() => { void enable(); }}>{busy ? '正在安排微信提醒…' : hasPlan ? '本轮可用提醒已授权' : config?.enabled && !eligible.length ? '当前没有可订阅的提醒' : currentReminders.length ? '补充本轮微信授权' : '开启本轮微信提醒'}</ActionButton>}
    {!!currentReminders.length && <View className='focus-reminder-statuses'>{currentReminders.map(item => <View key={`${item.runId}:${item.event}`}><Text>{eventLabels[item.event]}</Text><Text>{reminderLabels[item.status] || '状态待确认'}</Text></View>)}</View>}
    {!!message && <Text className='focus-reminder-note focus-reminder-feedback'>{message}</Text>}
  </View>;
}
