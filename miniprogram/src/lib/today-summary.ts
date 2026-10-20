import { localToolDay, type TodoState, type MemoState } from './tool-records';
import { habitDayIndex, hasHabitDay, type ReminderState } from './reminder-data';
import { advanceTimer, type PomodoroState } from './pomodoro-data';

export function todaySummary(date: Date, todos: TodoState, pomodoro: PomodoroState, habits: ReminderState, memos: MemoState) {
  const day = localToolDay(date), ordinal = habitDayIndex(day)!;
  const onDay = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) && localToolDay(new Date(value)) === day;
  const tasks = todos.tasks.filter(task => onDay(task.completedAt)).sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
  // A hidden timer page stops ticking. Project an elapsed round for this summary
  // without writing state or requiring a return to the timer page first.
  const sessions = advanceTimer(pomodoro, date.getTime()).sessions.filter(session => session.mode === 'focus' && session.durationSeconds > 0 && onDay(session.endedAt)).sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt));
  const done = Object.prototype.hasOwnProperty.call(habits.done, day) ? new Set(habits.done[day]) : null;
  const checkedHabits = habits.items.filter(item => done ? done.has(item.id) : hasHabitDay(habits.completionHistory?.[item.id], ordinal));
  const notes = memos.notes.filter(note => onDay(note.createdAt)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const completedFocus = sessions.filter(session => session.completed).length;
  return { day, tasks, sessions, habits: checkedHabits, notes, completedFocus, focusSeconds: sessions.reduce((sum, session) => sum + session.durationSeconds, 0) };
}
