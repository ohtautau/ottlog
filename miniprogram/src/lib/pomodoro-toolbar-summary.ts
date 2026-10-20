import type { FocusSession } from './pomodoro-data';
import { localToolDay } from './tool-records';

/** Read the current account's existing history, independently of the history filters. */
export default function pomodoroToolbarSummary(sessions: readonly FocusSession[], now: number) {
  const today = localToolDay(new Date(now));
  let completedToday = 0, latestAt = -Infinity;
  let latest: FocusSession | undefined;
  for (const session of sessions) {
    const ended = Date.parse(session.endedAt), started = Date.parse(session.startedAt);
    if (session.mode !== 'focus' || !Number.isFinite(ended) || !Number.isFinite(started) || started > ended || ended > now) continue;
    if (session.completed && localToolDay(new Date(ended)) === today) completedToday++;
    if (ended > latestAt || ended === latestAt && session.id.localeCompare(latest!.id) < 0) { latest = session; latestAt = ended; }
  }
  return { completedToday, recentTitle: latest?.title.trim() || undefined };
}
