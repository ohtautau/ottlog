import { useState } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import SectionTitle from './section-title';
import { ChoiceButton } from './ui-button';
import { insightNumber, type InsightChart, type InsightPoint, type StatisticsInsight, type StatisticsPeriod } from '../lib/statistics-insight-model';
import './statistics-insights.css';

let nextChartId = 0;
const value = (number: number) => Number.isFinite(number) ? Math.max(0, number) : 0;
const total = (point: InsightPoint) => point.values.reduce((sum, number) => sum + value(number), 0);
const describe = (chart: InsightChart, point: InsightPoint) => point.missing
  ? `${point.key} 未记录`
  : `${point.key} ${chart.series.map((series, index) => `${series.label} ${insightNumber(value(point.values[index]))} ${chart.unit}`).join('，')}`;

function InsightChartView({ chart }: { chart: InsightChart }) {
  const [id] = useState(() => `statistics-chart-${++nextChartId}`);
  const [selection, setSelection] = useState('');
  const selected = chart.points.find(point => point.key === selection) || (chart.kind === 'daily' ? chart.points[chart.points.length - 1] : chart.points[0]);
  const maximum = chart.kind === 'daily'
    ? Math.max(0, ...chart.points.flatMap(point => point.values.map(value)))
    : Math.max(0, ...chart.points.map(total));
  const scale = maximum || 1;
  return <View className={`statistics-insight-chart is-${chart.kind}`} role='group' ariaLabel={chart.title}>
    <View className='statistics-insight-chart-heading'><SectionTitle inRow>{chart.title}</SectionTitle><Text className='statistics-insight-unit'>{chart.unit}</Text></View>
    <View className='statistics-insight-legend'>{chart.series.map(series => <View key={series.label}><View className='statistics-insight-swatch' style={{ backgroundColor: series.color }} /><Text>{series.label}</Text></View>)}</View>
    <Text className='statistics-insight-scale'>{chart.points.some(point => !point.missing) ? `最高 ${insightNumber(maximum)} ${chart.unit}` : '暂无已记录数值'}</Text>
    {chart.kind === 'daily' ? <ScrollView className='statistics-insight-day-scroll' scrollX showScrollbar={false} scrollIntoView={`${id}-${Math.max(0, chart.points.findIndex(point => point.key === selected?.key))}`} scrollWithAnimation>
      <View className='statistics-insight-columns'>{chart.points.map((point, index) => <ChoiceButton key={point.key} id={`${id}-${index}`} className='statistics-insight-column' size='compact' selected={selected?.key === point.key} ariaLabel={describe(chart, point)} onClick={() => setSelection(point.key)}>
        <View className='statistics-insight-day-track' aria-hidden>{point.missing ? <Text className='statistics-insight-missing'>—</Text> : chart.series.map((series, seriesIndex) => <View key={series.label} className='statistics-insight-day-bar' style={{ height: `${value(point.values[seriesIndex]) / scale * 100}%`, backgroundColor: series.color }} />)}</View>
        <Text className='statistics-insight-day-label'>{point.label}</Text>
      </ChoiceButton>)}</View>
    </ScrollView> : <View className='statistics-insight-distribution'>{chart.points.map(point => <ChoiceButton key={point.key} className='statistics-insight-bar-choice' size='compact' width='fill' selected={selected?.key === point.key} ariaLabel={describe(chart, point)} onClick={() => setSelection(point.key)}>
      <View className='statistics-insight-bar-heading'><Text>{point.label}</Text><Text>{insightNumber(total(point))} {chart.unit}</Text></View>
      <View className='statistics-insight-bar-track' aria-hidden>{chart.series.map((series, index) => <View key={series.label} style={{ width: `${value(point.values[index]) / scale * 100}%`, backgroundColor: series.color }} />)}</View>
    </ChoiceButton>)}</View>}
    {selected ? <View className='statistics-insight-point' aria-live='polite'><Text className='statistics-insight-point-title'>{chart.kind === 'daily' ? selected.key : selected.label}</Text>{selected.missing ? <Text>未记录</Text> : chart.series.map((series, index) => <Text key={series.label}>{series.label} {insightNumber(value(selected.values[index]))} {chart.unit}</Text>)}{selected.detail && <Text className='statistics-insight-point-note'>{selected.detail}</Text>}</View> : <Text className='statistics-insight-empty'>暂无记录</Text>}
    {chart.caption && <Text className='statistics-insight-note'>{chart.caption}</Text>}
  </View>;
}

export default function StatisticsInsights({ insight, period, onPeriodChange }: { insight: StatisticsInsight; period: StatisticsPeriod; onPeriodChange: (value: StatisticsPeriod) => void }) {
  return <View className='statistics-insights statistics-card'>
    <View className='statistics-insight-heading'><SectionTitle inRow>{insight.title}</SectionTitle><View className='statistics-insight-period'>{([7, 30] as const).map(days => <ChoiceButton key={days} className='statistics-insight-period-choice' size='compact' selected={period === days} onClick={() => onPeriodChange(days)}>近{days}天</ChoiceButton>)}</View></View>
    <View className='statistics-insight-metrics'>{insight.metrics.map(metric => <View key={metric.label} className='statistics-insight-metric'><View><Text className='statistics-insight-metric-value'>{metric.value}</Text>{metric.unit && <Text className='statistics-insight-metric-unit'>{metric.unit}</Text>}</View><Text className='statistics-insight-metric-label'>{metric.label}</Text>{metric.caption && <Text className='statistics-insight-metric-caption'>{metric.caption}</Text>}</View>)}</View>
    {insight.charts.map(chart => <InsightChartView key={`${chart.id}:${period}`} chart={chart} />)}
    <View className='statistics-insight-findings'><SectionTitle>自动发现</SectionTitle>{insight.findings.map(finding => <Text key={finding}>{finding}</Text>)}</View>
    <Text className='statistics-insight-note'>{insight.note} 包含今天，今天尚未结束。</Text>
  </View>;
}
