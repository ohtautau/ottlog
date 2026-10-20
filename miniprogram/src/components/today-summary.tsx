import { trimTextEnd } from '../lib/text-whitespace';
import { showAppMessage } from '../lib/app-dialog';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import LibraryIcon from './library-icon';
import DomainQuickRecord from './domain-quick-record';
import { usePersonalToolState } from '../lib/use-personal-tool-state';
import { initialTodoState, initialMemoState } from '../lib/tool-records';
import { initialReminders } from '../lib/reminder-data';
import { initialPomodoroState } from '../lib/pomodoro-data';
import { initialMealLibrary } from '../lib/meal-data';
import { initialDomainState } from '../lib/domain-data';
import { openPomodoro } from '../lib/pomodoro-navigation';
import { recentActivity, activitySourcesReady, activityDateLabel, activityTimeLabel, type RecentActivity } from '../lib/recent-activity';
import './today-summary.css';

export default function TodaySummary({ date, disabled = false }: { date: Date; disabled?: boolean }) {
  const todos = usePersonalToolState('todos', initialTodoState);
  const memos = usePersonalToolState('memos', initialMemoState);
  const pomodoro = usePersonalToolState('pomodoro', initialPomodoroState);
  const reminders = usePersonalToolState('reminders', initialReminders);
  const meals = usePersonalToolState('meals', initialMealLibrary);
  const domains = usePersonalToolState('domains', initialDomainState);
  const sources = { todos, memos, pomodoro, reminders, meals, domains };
  // A write can arrive between the parent page's minute ticks.
  const now = new Date(), ready = activitySourcesReady(sources), items = recentActivity(now, sources);
  const [capture, setCapture] = useState(false);
  const recordStatus = /不可用|暂存|失败|离线/.test(domains.status) ? domains.status : '';
  useEffect(() => { if (!ready || disabled) setCapture(false); }, [ready, disabled, todos.owner]);
  useEffect(() => { setCapture(false); }, [todos.owner]);
  const stop = (event: { stopPropagation?: () => void }) => event.stopPropagation?.();
  const report = () => { void showAppMessage({ title: '暂时无法打开，请重试', icon: 'none' }); };
  function quick(action: string) {
    if (disabled) return;
    if (action === 'record') { setCapture(true); return; }
    if (action === 'task') { Taro.setStorageSync('ottlog.todo-create', true); void Taro.switchTab({ url: '/pages/todos/index' }).catch(report); return; }
    if (action === 'focus') { void openPomodoro().catch(report); return; }
    if (action === 'habit') { void Taro.switchTab({ url: '/pages/daily/index' }).catch(report); return; }
    void Taro.navigateTo({ url: action === 'memo' ? '/pages/memos/index?create=1' : '/pages/meals/index' }).catch(report);
  }
  function open(item: RecentActivity) {
    if (disabled) return;
    if (item.target === 'task') { Taro.setStorageSync('ottlog.todos.focus', item.targetId); void Taro.switchTab({ url: '/pages/todos/index' }).catch(report); return; }
    if (item.target === 'pomodoro') { void openPomodoro().catch(report); return; }
    if (item.target === 'daily') { void Taro.switchTab({ url: '/pages/daily/index' }).catch(report); return; }
    const url = item.target === 'domain' ? `/pages/domain-detail/index?id=${encodeURIComponent(item.targetId || '')}` : `/pages/${item.target}/index`;
    void Taro.navigateTo({ url }).catch(report);
  }
  const shortcuts = [
    { id: 'task', title: '创建任务', icon: 'notes' }, { id: 'record', title: '记录进展', icon: 'write' },
    { id: 'memo', title: '写便签', icon: 'book' }, { id: 'habit', title: '习惯', icon: 'plant' },
    { id: 'focus', title: '番茄钟', icon: 'focus' }, { id: 'meal', title: '饮食', icon: 'food' },
  ];
  return <>
    <View className='today-summary'>
      <View className='summary-heading'><Text className='summary-title'>最近活动</Text><Text className='summary-date'>{date.getMonth() + 1} 月 {date.getDate()} 日</Text></View>
      <View className='summary-quick-actions'>{shortcuts.map(action => <Button key={action.id} className='summary-quick-action' ariaLabel={action.title} disabled={disabled || (action.id === 'record' && !ready)} onClick={() => quick(action.id)}><LibraryIcon name={action.icon} /><Text>{trimTextEnd(action.title)}</Text></Button>)}</View>
      {recordStatus && <View className='summary-record-status'><Text>{recordStatus}</Text><Button className='button-label' ariaLabel='重试保存记录' disabled={disabled} onClick={domains.retry}>重试</Button></View>}
      <ScrollView id='today-summary-scroll' className='summary-scroll' scrollY showScrollbar={false} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop} onTouchCancel={stop} onScroll={stop}>
        {!ready && <View className='summary-empty'><Text>正在读取记录…</Text><Button className='summary-retry button-label' onClick={() => Object.values(sources).forEach(source => source.retry())}>重新读取</Button></View>}
        {ready && !items.length && <View className='summary-empty'><Text>暂无活动记录</Text></View>}
        {ready && items.map((item, index) => <View key={item.id}>
          {(index === 0 || items[index - 1].day !== item.day) && <Text className='summary-day'>{activityDateLabel(item.day, now)}</Text>}
          <Button className='summary-activity' ariaLabel={`${item.action}：${item.label}，${item.title}`} disabled={disabled} onClick={() => open(item)}>
            <View className='summary-activity-icon'><LibraryIcon name={item.icon} /></View>
            <View className='summary-activity-content'><Text className='summary-activity-title'>{trimTextEnd(item.title)}</Text><Text className='summary-activity-meta'>{item.label} · {activityTimeLabel(item)}</Text></View>
            <Text className='summary-activity-action'>{item.action} ↗</Text>
          </Button>
        </View>)}
      </ScrollView>
    </View>
    {capture && <DomainQuickRecord onClose={() => setCapture(false)} />}
  </>;
}
