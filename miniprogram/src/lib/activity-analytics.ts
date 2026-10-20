import { localToolDay, todoQuadrant, todoQuadrants, type Todo } from './tool-records';
import type { FocusSession } from './pomodoro-data';
import { validInsightDate } from './statistics-insight-model';

export function analysisDays(now: Date, count: number) {
  return Array.from({ length: count }, (_, index) => { const day = new Date(now); day.setDate(day.getDate() - count + index + 1); return localToolDay(day); });
}
export function taskAnalysis(tasks: Todo[], days: string[], now: Date) {
  const today = localToolDay(now), clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const completed = tasks.filter(task => task.completedAt && Number.isFinite(Date.parse(task.completedAt))
    && Date.parse(task.completedAt) <= now.getTime() && days.includes(localToolDay(new Date(task.completedAt))));
  const open = tasks.filter(task => !task.completedAt);
  const overdue = open.filter(task => validInsightDate(task.dueDate) && (task.dueDate < today || task.dueDate === today && /^([01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime || '') && task.dueTime! < clock));
  return { completed, open, overdue,
    daily: days.map(day => ({ key: day, label: `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`, value: completed.filter(task => localToolDay(new Date(task.completedAt!)) === day).length })),
    groups: todoQuadrants.map(q => ({ key: q.id, label: q.title, value: open.filter(task => todoQuadrant(task).id === q.id).length })),
  };
}
export function focusAnalysis(sessions: FocusSession[], days: string[], now?: Date) {
  const selected = sessions.filter(session => session.mode === 'focus' && days.includes(localToolDay(new Date(session.endedAt)))
    && (!now || Number.isFinite(Date.parse(session.startedAt)) && Number.isFinite(Date.parse(session.endedAt))
      && Date.parse(session.startedAt) <= Date.parse(session.endedAt) && Date.parse(session.endedAt) <= now.getTime()
      && Number.isFinite(session.durationSeconds) && session.durationSeconds > 0));
  const total = selected.reduce((sum, session) => sum + session.durationSeconds, 0);
  const byTitle = new Map<string, number>();
  selected.forEach(session => { const title = session.title || '自由专注'; byTitle.set(title, (byTitle.get(title) || 0) + session.durationSeconds); });
  return { selected, total, completed: selected.filter(session => session.completed).length,
    daily: days.map(day => ({ key: day, label: `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`, value: selected.filter(session => localToolDay(new Date(session.endedAt)) === day).reduce((sum, session) => sum + session.durationSeconds, 0) / 60 })),
    groups: [...byTitle].map(([title, seconds]) => ({ key: title, label: title, value: seconds / 60 })).sort((a, b) => b.value - a.value),
  };
}
