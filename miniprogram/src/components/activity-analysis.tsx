import { trimTextEnd } from '../lib/text-whitespace';
import SectionTitle from './section-title';
import { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import { analysisDays, focusAnalysis, taskAnalysis } from '../lib/activity-analytics';
import { localToolDay, todoQuadrant, type Todo } from '../lib/tool-records';
import type { FocusSession } from '../lib/pomodoro-data';
import './activity-analysis.css';

type Bar = { key: string; label: string; value: number };
export default function ActivityAnalysis({ tasks, sessions, period: suppliedPeriod, now: suppliedNow }: { tasks?: Todo[]; sessions?: FocusSession[]; period?: 7 | 30; now?: Date }) {
  const [localPeriod, setPeriod] = useState(7);
  const period = suppliedPeriod ?? localPeriod;
  const [picked, setPicked] = useState<{ kind: 'day' | 'group'; key: string } | null>(null);
  useEffect(() => { setPicked(null); }, [period]);
  const now = suppliedNow ?? new Date(), days = analysisDays(now, period), isFocus = !!sessions;
  const task = taskAnalysis(tasks || [], days, now), focus = focusAnalysis(sessions || [], days, now);
  const daily = isFocus ? focus.daily : task.daily;
  const groups = isFocus ? focus.groups.slice(0, 6) : task.groups;
  const unit = isFocus ? '分钟' : '件';
  const valueLabel = (value: number) => isFocus && value > 0 && value < 1 ? '<1' : String(Math.round(value * 10) / 10);
  const peak = daily.reduce((best, bar) => bar.value > best.value ? bar : best, daily[0]);
  const select = (kind: 'day' | 'group', bar: Bar) => setPicked(previous => previous?.kind === kind && previous.key === bar.key ? null : { kind, key: bar.key });
  const details = picked ? (isFocus ? focus.selected.filter(item => picked.kind === 'day' ? localToolDay(new Date(item.endedAt)) === picked.key : (item.title || '自由专注') === picked.key).map(item => ({ id: item.id, title: item.title || '自由专注', detail: `${valueLabel(item.durationSeconds / 60)} 分钟 · ${item.completed ? '完整番茄' : '提前结束'}` }))
    : (picked.kind === 'day' ? task.completed.filter(item => localToolDay(new Date(item.completedAt!)) === picked.key) : task.open.filter(item => todoQuadrant(item).id === picked.key)).map(item => ({ id: item.id, title: item.title, detail: item.completedAt ? '已完成' : '待完成' }))) : [];
  const selectedBar = picked && (picked.kind === 'day' ? daily : groups).find(bar => bar.key === picked.key);
  return <View className={'activity-analysis' + (isFocus ? ' is-focus' : '')}>
    <View className='analysis-heading'><View><SectionTitle className='analysis-title'>{isFocus ? '专注分析' : '任务分析'}</SectionTitle></View>{suppliedPeriod === undefined && <View className='analysis-period'>{[7, 30].map(count => <Button key={count} className={period === count ? 'is-active' : ''} onClick={() => { setPeriod(count); setPicked(null); }}>近{count}天</Button>)}</View>}</View>
    <View className='analysis-kpis'>{(isFocus ? [[valueLabel(focus.total / 60), '专注分钟'], [focus.completed, '完整番茄'], [focus.selected.length ? valueLabel(focus.total / focus.selected.length / 60) : '0', '平均每轮分钟']] : [[task.completed.length, '期间完成'], [task.open.length, '当前待办'], [task.overdue.length, '当前逾期']]).map(([value, label]) => <View key={String(label)}><Text>{value}</Text><Text>{label}</Text></View>)}</View>
    <SectionTitle className='analysis-chart-title'>{isFocus ? '每日专注时长' : '每日完成任务'} · {unit}</SectionTitle>
    <ScrollView scrollX className='analysis-chart-scroll' showScrollbar={false}><View className='analysis-columns'>{daily.map(bar => <Button key={bar.key} aria-label={`${bar.key} ${valueLabel(bar.value)} ${unit}`} className={'analysis-column' + (picked?.kind === 'day' && picked.key === bar.key ? ' is-selected' : '')} onClick={() => select('day', bar)}><Text>{valueLabel(bar.value)}</Text><View className='analysis-track'><View style={{ height: `${bar.value ? Math.max(3, bar.value / Math.max(1, peak.value) * 100) : 0}%` }} /></View><Text>{bar.label}</Text></Button>)}</View></ScrollView>
    <SectionTitle className='analysis-chart-title'>{isFocus ? '时间投入最多的事项 · 前 6 项' : '当前待办的优先级分布'}</SectionTitle>
    <View className='analysis-bars'>{groups.map(bar => <Button key={bar.key} className={'analysis-bar' + (picked?.kind === 'group' && picked.key === bar.key ? ' is-selected' : '')} onClick={() => select('group', bar)}><View><Text>{bar.label}</Text><Text>{valueLabel(bar.value)} {unit}</Text></View><View className='analysis-bar-track'><View style={{ width: `${bar.value / Math.max(1, ...groups.map(item => item.value)) * 100}%` }} /></View></Button>)}</View>
    {picked && <View className='analysis-details'><SectionTitle className='analysis-chart-title'>{selectedBar?.label} · {details.length} 条记录</SectionTitle><ScrollView scrollY className='analysis-detail-scroll'>{details.length ? details.map(item => <View key={item.id}><Text>{trimTextEnd(item.title)}</Text><Text>{item.detail}</Text></View>) : <Text>此项暂无记录</Text>}</ScrollView></View>}
    <View className='analysis-findings'><SectionTitle className='analysis-chart-title'>数据发现</SectionTitle><Text>{peak.value ? `这 ${period} 天中，${peak.label} ${isFocus ? '投入最多' : '完成最多'}：${valueLabel(peak.value)} ${unit}。` : `近 ${period} 天还没有${isFocus ? '专注' : '完成'}记录。`}</Text>{(!isFocus || focus.selected.length > 0) && <Text>{isFocus ? focus.selected.length ? `共 ${focus.selected.length} 轮专注，${focus.completed} 轮完整结束，${focus.selected.length - focus.completed} 轮提前结束；提前结束的实际时长已计入。` : '' : task.overdue.length ? `当前有 ${task.overdue.length} 件任务已逾期，其中 ${task.overdue.filter(item => item.important).length} 件为重要任务。` : `当前没有逾期任务；${task.open.filter(item => !item.dueDate).length} 件待办尚未设置日期。`}</Text>}</View>
    <Text className='analysis-caption'>{isFocus ? '按结束当天归属；休息与尚未结束的计时不计入。' : '完成趋势按完成日期统计；待办与逾期为当前状态，不随期间切换。已删除任务不计入。'}</Text>
  </View>;
}
