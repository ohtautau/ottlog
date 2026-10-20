import { useEffect, useMemo, useState } from 'react';
import Taro, { useDidHide, useDidShow, useRouter } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import BackButton from '../../components/back-button';
import PageScroll from '../../components/page-scroll';
import { CategoryButton, CategoryRow } from '../../components/page-toolbar';
import ActivityAnalysis from '../../components/activity-analysis';
import StatisticsInsights from '../../components/statistics-insights';
import { type StatisticsPeriod } from '../../lib/statistics-insight-model';
import { taskStatisticsInsight, focusStatisticsInsight } from '../../lib/statistics-task-focus-insights';
import { habitStatisticsInsight, domainStatisticsInsight } from '../../lib/statistics-habit-domain-insights';
import { dietStatisticsInsight, growthStatisticsInsight } from '../../lib/statistics-food-growth-insights';
import PomodoroHistory from '../../components/pomodoro-history';
import PomodoroNotifications from '../../components/pomodoro-notifications';
import { HabitStatistics, DomainStatistics } from '../../components/statistics-habits-domains';
import { DietStatistics, GrowthStatistics } from '../../components/statistics-food-growth';
import { usePersonalToolState } from '../../lib/use-personal-tool-state';
import { initialTodoState, isTodoState, localToolDay } from '../../lib/tool-records';
import { initialPomodoroState, isPomodoroState, normalizePomodoroState } from '../../lib/pomodoro-data';
import { initialReminders, isReminderState } from '../../lib/reminder-data';
import { initialMealLibrary, isMealLibrary } from '../../lib/meal-data';
import { initialDomainState, isDomainState } from '../../lib/domain-data';
import { demoGrowthState, isGrowthState } from '../../lib/growth-data';
import { statisticsOwner, statisticsPanel, statisticsPanels, type StatisticsPanel } from '../../lib/statistics-data';
import './index.css';

export default function Statistics() {
  const route = useRouter();
  const [panel, setPanel] = useState<StatisticsPanel>(() => statisticsPanel(route.params.panel));
  const [now, setNow] = useState(() => new Date());
  const [visible, setVisible] = useState(true);
  const [period, setPeriod] = useState<StatisticsPeriod>(7);
  const growthDefaults = useMemo(() => demoGrowthState(), []);
  const todos = usePersonalToolState('todos', initialTodoState);
  const focus = usePersonalToolState('pomodoro', initialPomodoroState);
  const focusState = useMemo(() => normalizePomodoroState(focus.value), [focus.value]);
  const habits = usePersonalToolState('reminders', initialReminders);
  const meals = usePersonalToolState('meals', initialMealLibrary);
  const domains = usePersonalToolState('domains', initialDomainState);
  const growth = usePersonalToolState('growth', growthDefaults);
  const sources = { todos, focus, habits, meals, domains, growth };
  const cohort = statisticsPanels.map(item => sources[item.id]);
  const owner = statisticsOwner(cohort), selected = sources[panel];
  const valid = { todos: isTodoState(todos.value), focus: isPomodoroState(focus.value), habits: isReminderState(habits.value), meals: isMealLibrary(meals.value), domains: isDomainState(domains.value), growth: isGrowthState(growth.value) }[panel];
  const today = localToolDay(now);
  const insight = useMemo(() => {
    if (!owner || !valid) return null;
    switch (panel) {
      case 'todos': return taskStatisticsInsight(todos.value, now, period);
      case 'focus': return focusStatisticsInsight(focusState, now, period);
      case 'habits': return habitStatisticsInsight(habits.value, now, period);
      case 'meals': return dietStatisticsInsight(meals.value, now, period);
      case 'domains': return domainStatisticsInsight(domains.value, now, period);
      case 'growth': return growthStatisticsInsight(growth.value, now, period);
    }
  }, [owner, valid, panel, period, now, todos.value, focusState, habits.value, meals.value, domains.value, growth.value]);
  useEffect(() => { setPeriod(7); }, [owner]);
  useDidShow(() => { setVisible(true); setNow(new Date()); });
  useDidHide(() => { setVisible(false); });
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [visible]);
  function retryAll() { cohort.forEach(source => source.retry()); }
  function back() { void Taro.navigateBack().catch(() => Taro.switchTab({ url: '/pages/index/index' })); }
  return <PageScroll animateScroll={false} snapSections={[]}><View className='statistics-page'>
    <View className='statistics-header'><BackButton ariaLabel='返回上一页' onClick={back} /><Text className='statistics-date'>{now.getMonth() + 1}月{now.getDate()}日</Text></View>
    <CategoryRow className='statistics-tabs-scroll' contentClassName='statistics-tabs' ariaLabel='统计分类' scrollIntoView={`statistics-tab-${panel}`} scrollWithAnimation>{statisticsPanels.map(item => <CategoryButton key={item.id} id={`statistics-tab-${item.id}`} className={`button-label statistics-tab${panel === item.id ? ' is-active' : ''}`} ariaLabel={`${item.label}统计`} aria-pressed={panel === item.id} onClick={() => { setPanel(item.id); setNow(new Date()); }}>{item.label}</CategoryButton>)}</CategoryRow>
    {!owner ? <View className='statistics-state statistics-card'><Text>{cohort.every(source => source.ready) ? '正在确认记录所属账号…' : '正在读取统计记录…'}</Text>{statisticsPanels.filter(item => !sources[item.id].ready).map(item => <View key={item.id} className='statistics-source-status'><Text>{item.label} · {sources[item.id].status}</Text><ActionButton className='button-label' onClick={sources[item.id].retry}>重试</ActionButton></View>)}<ActionButton className='button-label tool-secondary' onClick={retryAll}>重新读取</ActionButton></View> : !valid ? <View className='statistics-state statistics-card'><Text>这份记录的格式暂不兼容，原始数据已保留。</Text><ActionButton className='button-label tool-secondary' onClick={selected.retry}>重新读取</ActionButton></View> : <View key={`${owner}:${panel}`} className='statistics-content'>
      {insight && <StatisticsInsights insight={insight} period={period} onPeriodChange={setPeriod} />}
      {panel === 'todos' && <ActivityAnalysis tasks={todos.value.tasks} period={period} now={now} />}
      {panel === 'focus' && <><ActivityAnalysis sessions={focusState.sessions} period={period} now={now} /><PomodoroHistory state={focusState} owner={owner} setValue={focus.setValue} tasks={isTodoState(todos.value) ? todos.value.tasks : []} today={today} /><PomodoroNotifications state={focusState} owner={owner} visible={visible} /></>}
      {panel === 'habits' && <HabitStatistics state={habits.value} now={now} />}
      {panel === 'meals' && <DietStatistics state={meals.value} today={today} />}
      {panel === 'domains' && <DomainStatistics state={domains.value} />}
      {panel === 'growth' && <GrowthStatistics state={growth.value} now={now} />}
      <View className='statistics-source-note'><Text>{selected.status}</Text>{/失败|暂存|离线|不可用|无法/.test(selected.status) && <ActionButton className='button-label' onClick={selected.retry}>重试同步</ActionButton>}</View>
    </View>}
  </View></PageScroll>;
}
