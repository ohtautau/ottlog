import type { Todo, TodoState } from './tool-records';
import type { FocusSession, PomodoroState } from './pomodoro-data';
import { insightChange, insightDay, insightNumber, insightWindow, validInsightDate as validDay, type StatisticsInsight, type StatisticsPeriod } from './statistics-insight-model';

const hour = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const knownTime = (value: string | undefined) => !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

function onOrBeforeNow(timestamp: string | null, now: Date) {
  return !!timestamp && Number.isFinite(Date.parse(timestamp)) && Date.parse(timestamp) <= now.getTime();
}

function beforeDeadline(task: Todo, date: Date) {
  const day = insightDay(date.getTime());
  return task.dueDate > day || task.dueDate === day && (!knownTime(task.dueTime) || hour(date) <= task.dueTime!);
}

export function taskStatisticsInsight(state: TodoState, now: Date, period: StatisticsPeriod): StatisticsInsight {
  const window = insightWindow(now, period), days = new Set(window.days), previousDays = new Set(window.previousDays);
  const retainedCompleted = state.tasks.filter(task => onOrBeforeNow(task.completedAt, now));
  const completed = retainedCompleted.filter(task => days.has(insightDay(task.completedAt!)));
  const previous = retainedCompleted.filter(task => previousDays.has(insightDay(task.completedAt!)));
  const open = state.tasks.filter(task => !task.completedAt);
  const overdue = open.filter(task => validDay(task.dueDate) && !beforeDeadline(task, now));
  const endNextWeek = new Date(now);
  endNextWeek.setDate(endNextWeek.getDate() + 7);
  const nextWeekDay = insightDay(endNextWeek.getTime()), clock = hour(now);
  const buckets = [
    { key: 'overdue', label: '已逾期', tasks: overdue, detail: '当前已超过日程日期或具体时刻的待办' },
    { key: 'today', label: '今天', tasks: open.filter(task => validDay(task.dueDate) && task.dueDate === window.today && (!knownTime(task.dueTime) || task.dueTime! >= clock)), detail: '今天到期且尚未超过具体时刻；未设时刻按当天计算' },
    { key: 'next-week', label: '未来7天', tasks: open.filter(task => validDay(task.dueDate) && task.dueDate > window.today && task.dueDate <= nextWeekDay), detail: '明天至第7天到期的当前待办，不含今天' },
    { key: 'later', label: '更晚', tasks: open.filter(task => validDay(task.dueDate) && task.dueDate > nextWeekDay), detail: '第7天之后到期的当前待办' },
    { key: 'unscheduled', label: '未排期', tasks: open.filter(task => !validDay(task.dueDate)), detail: '未设置有效日程日期的当前待办' },
  ];
  const elapsed = completed.flatMap(task => {
    const created = Date.parse(task.createdAt), ended = Date.parse(task.completedAt!);
    return Number.isFinite(created) && ended >= created ? [(ended - created) / 3_600_000] : [];
  });
  const scheduledCompleted = completed.filter(task => validDay(task.dueDate));
  const onTime = scheduledCompleted.filter(task => beforeDeadline(task, new Date(task.completedAt!))).length;
  const activeDays = new Set(completed.map(task => insightDay(task.completedAt!))).size;
  const daily = window.days.map(day => ({ day, count: completed.filter(task => insightDay(task.completedAt!) === day).length }));
  const peak = daily.reduce((best, item) => item.count > best.count ? item : best, daily[0]);
  const averageHours = elapsed.length ? elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length : null;
  return {
    title: '任务自动统计',
    metrics: [
      { label: '期间完成', value: String(completed.length), unit: '件' },
      { label: '完成活跃天', value: String(activeDays), unit: '天', caption: `近${period}天中有完成记录的日期` },
      { label: '平均完成用时', value: averageHours === null ? '—' : insightNumber(averageHours), unit: averageHours === null ? undefined : '小时', caption: `${elapsed.length}件有效创建至完成的经过时间` },
      { label: '按时完成率', value: scheduledCompleted.length ? insightNumber(onTime / scheduledCompleted.length * 100) : '—', unit: scheduledCompleted.length ? '%' : undefined, caption: `期间${scheduledCompleted.length}件有日程的完成任务` },
      { label: '当前待办', value: String(open.length), unit: '件', caption: '当前快照，不随统计期间变化' },
      { label: '当前逾期', value: String(overdue.length), unit: '件', caption: '当前快照，不随统计期间变化' },
    ],
    charts: [{
      id: 'task-current-schedule', title: '当前待办日程分布', unit: '件', kind: 'bars',
      series: [{ label: '待办任务', color: '#99b8ec' }],
      points: buckets.map(bucket => ({ key: bucket.key, label: bucket.label, values: [bucket.tasks.length], detail: bucket.detail })),
      caption: '当前快照；今天已过具体时刻的任务归入已逾期，未来7天不含今天。',
    }],
    findings: [
      `${insightChange(completed.length, previous.length, '件完成任务')}。`,
      completed.length ? `近${period}天有${activeDays}天完成任务；${peak.day}完成最多，共${peak.count}件。` : `近${period}天没有完成记录。`,
      `当前有${open.filter(task => task.important).length}件重要待办，其中${overdue.filter(task => task.important).length}件已逾期；未来7天有${buckets[2].tasks.length}件到期。`,
      scheduledCompleted.length ? `期间有日程的${scheduledCompleted.length}件已完成任务中，${onTime}件按时完成；未排期任务不计入按时率。` : '期间没有有日程的完成任务，暂不计算按时率。',
    ],
    note: '完成按设备本地完成日统计，截至当前时刻；比较前一等长期间。仅基于保留任务，已删除任务不计入。完成用时是创建至完成的经过时间，不代表实际工作时长；按时率按当前保留日程的日期／分钟判断。',
  };
}

const focusPeriods = [
  { key: 'morning', label: '上午', until: 11, detail: '结束时刻00:00–10:59' },
  { key: 'noon', label: '中午', until: 13, detail: '结束时刻11:00–12:59' },
  { key: 'afternoon', label: '下午', until: 18, detail: '结束时刻13:00–17:59' },
  { key: 'night', label: '夜晚', until: 24, detail: '结束时刻18:00–23:59' },
];

export function focusStatisticsInsight(state: PomodoroState, now: Date, period: StatisticsPeriod): StatisticsInsight {
  const window = insightWindow(now, period), days = new Set(window.days), previousDays = new Set(window.previousDays);
  const retained = state.sessions.filter(session => session.mode === 'focus' && onOrBeforeNow(session.endedAt, now)
    && Number.isFinite(Date.parse(session.startedAt)) && Date.parse(session.endedAt) >= Date.parse(session.startedAt)
    && Number.isFinite(session.durationSeconds) && session.durationSeconds > 0);
  const selected = retained.filter(session => days.has(insightDay(session.endedAt)));
  const previous = retained.filter(session => previousDays.has(insightDay(session.endedAt)));
  const seconds = (sessions: FocusSession[]) => sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const total = seconds(selected), previousTotal = seconds(previous);
  const complete = selected.filter(session => session.completed).length, early = selected.length - complete;
  const activeDays = new Set(selected.map(session => insightDay(session.endedAt))).size;
  const points = focusPeriods.map((item, index) => ({
    key: item.key, label: item.label, detail: item.detail,
    values: [seconds(selected.filter(session => {
      const endedHour = new Date(session.endedAt).getHours();
      return endedHour < item.until && (index === 0 || endedHour >= focusPeriods[index - 1].until);
    })) / 60],
  }));
  const peakPeriod = points.reduce((best, point) => point.values[0] > best.values[0] ? point : best, points[0]);
  const daily = window.days.map(day => ({ day, seconds: seconds(selected.filter(session => insightDay(session.endedAt) === day)) }));
  const peakDay = daily.reduce((best, item) => item.seconds > best.seconds ? item : best, daily[0]);
  return {
    title: '专注自动统计',
    metrics: [
      { label: '专注分钟', value: insightNumber(total / 60), unit: '分钟' },
      { label: '投入天数', value: String(activeDays), unit: '天', caption: `近${period}天中有实际专注的日期` },
      { label: '完整结束率', value: selected.length ? insightNumber(complete / selected.length * 100) : '—', unit: selected.length ? '%' : undefined, caption: `${selected.length}轮有实际时长的专注记录` },
      { label: '平均每轮', value: selected.length ? insightNumber(total / selected.length / 60) : '—', unit: selected.length ? '分钟' : undefined, caption: '含提前结束的实际时长' },
      { label: '完整番茄', value: String(complete), unit: '轮' },
      { label: '提前结束', value: String(early), unit: '轮' },
    ],
    charts: [{
      id: 'focus-ending-period', title: '专注结束时段的投入分布', unit: '分钟', kind: 'bars',
      series: [{ label: '实际专注时长', color: '#abd0b2' }], points,
      caption: '整轮实际时长归入设备本地结束时段，跨时段的一轮不会拆分。',
    }],
    findings: [
      `${insightChange(total / 60, previousTotal / 60, '分钟专注')}。`,
      selected.length ? `近${period}天有${activeDays}天投入专注；${peakDay.day}投入最多，共${insightNumber(peakDay.seconds / 60)}分钟。` : `近${period}天没有已结束且有实际时长的专注记录。`,
      selected.length ? `${peakPeriod.label}结束的专注投入最多，共${insightNumber(peakPeriod.values[0])}分钟；按结束时段归属。` : '时段分布等待实际专注记录。',
      `共${selected.length}轮专注，${complete}轮完整结束、${early}轮提前结束；提前结束的${insightNumber(seconds(selected.filter(session => !session.completed)) / 60)}分钟实际投入已计入。`,
    ],
    note: '按设备本地结束日统计，截至当前时刻；休息、未结束及零时长计时不计入。仅基于保留的最近1000条计时记录，独立累计完整轮数不作为本期统计。',
  };
}
