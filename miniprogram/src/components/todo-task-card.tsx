import { trimTextEnd } from '../lib/text-whitespace';
import type { ComponentProps, ReactNode } from 'react';
import { Button, Text, View } from '@tarojs/components';
import { localToolDay, type Todo } from '../lib/tool-records';
import './todo-task-card.css';

/** The page owns completion, editing, selection and drag guards; both hosts share the row. */
export default function TodoTaskCard({ task, now, checked = !!task.completedAt, leading, rootProps, className = '', contentClassName = '', pressed, disabled, ariaLabel, onOpen }: {
  task: Todo; now: number; checked?: boolean; leading?: (check: ReactNode) => ReactNode;
  rootProps?: Omit<ComponentProps<typeof View>, 'children' | 'className'>; className?: string;
  contentClassName?: string; pressed?: boolean;
  disabled?: boolean; ariaLabel: string; onOpen: NonNullable<ComponentProps<typeof Button>['onClick']>;
}) {
  const date = new Date(now), today = localToolDay(date);
  const time = date.toTimeString().slice(0, 5);
  const overdue = !task.completedAt && !!task.dueDate && (task.dueDate < today || task.dueDate === today && !!task.dueTime && task.dueTime < time);
  const [year, month, day] = task.dueDate.split('-');
  const dateLabel = task.dueDate ? `${year === today.slice(0, 4) ? '' : `${year}年`}${Number(month)}月${Number(day)}日` : '';
  const count = task.nextTasks?.length;
  const check = <View className={`todo-check${checked ? ' checked' : ''}${count ? ' has-count' : ''}`}>{count || (checked ? '✓' : '')}</View>;
  const classes = `todo-task${task.completedAt ? ' is-done' : ''}${overdue ? ' is-overdue' : ''} ${className}`;
  return <View {...rootProps} className={classes}>{leading && leading(check)}<Button className={`todo-task-content ${contentClassName}`} ariaLabel={ariaLabel} aria-pressed={pressed} disabled={disabled} onClick={onOpen}><View className='todo-task-title'>{trimTextEnd(task.title)}</View>{task.dueDate && <View className='todo-task-meta'><Text className={`todo-task-date${overdue ? ' is-overdue' : !task.completedAt && task.dueDate === today ? ' is-today' : ''}`}>{dateLabel}{task.dueTime ? ` ${task.dueTime}` : ''}</Text></View>}</Button></View>;
}
