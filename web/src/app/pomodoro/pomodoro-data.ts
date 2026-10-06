export type TimerMode = "focus" | "shortBreak" | "longBreak";
export type TimerSettings = { focus: number; shortBreak: number; longBreak: number; longEvery: number };
export type TimerSelection = { taskId: string | null; habitId?: string | null; title: string };
export type ActiveTimer = {
  id: string; mode: TimerMode; totalSeconds: number; remainingSeconds: number;
  running: boolean; deadline: number | null; startedAt: string; selection: TimerSelection;
  rootRunId?: string; originFocusId?: string;
};
export type FocusSession = {
  id: string; mode: TimerMode; durationSeconds: number; plannedSeconds: number;
  startedAt: string; endedAt: string; completed: boolean; taskId: string | null; habitId?: string | null; title: string;
  rootRunId?: string; originFocusId?: string;
};
export type PomodoroState = {
  version: 1; settings: TimerSettings; mode: TimerMode; selection: TimerSelection;
  active: ActiveTimer | null; sessions: FocusSession[];
  completedFocusCount?: number;
};
export const timerModes: { id: TimerMode; label: string; caption: string }[] = [
  { id: "focus", label: "专注", caption: "留一段时间，只做眼前这一件事。" },
  { id: "shortBreak", label: "短休息", caption: "松松肩膀，让注意力慢慢回来。" },
  { id: "longBreak", label: "长休息", caption: "离开屏幕一会儿，也是一种前进。" },
];
export const initialPomodoroState: PomodoroState = {
  version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 },
  mode: "focus", selection: { taskId: null, habitId: null, title: "" }, active: null, sessions: [],
};
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const integer = (value: unknown, fallback: number, max: number, min = 1) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback;
const mode = (value: unknown): TimerMode => value === "shortBreak" || value === "longBreak" ? value : "focus";
const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : "";
const selection = (value: unknown): TimerSelection => {
  const data = object(value), taskId = text(data.taskId, 100) || null;
  return { ...data, taskId, habitId: taskId ? null : text(data.habitId, 100) || null, title: text(data.title, 100) };
};

/** Remote state and browser caches can be stale or malformed. Keep timer math finite. */
export function normalizePomodoroState(value: unknown): PomodoroState {
  const data = object(value), rawSettings = object(data.settings);
  const settings = {
    ...rawSettings,
    focus: integer(rawSettings.focus, 25, 120), shortBreak: integer(rawSettings.shortBreak, 5, 60),
    longBreak: integer(rawSettings.longBreak, 15, 120), longEvery: integer(rawSettings.longEvery, 4, 12),
  };
  const seen = new Set<string>();
  const sessions = (Array.isArray(data.sessions) ? data.sessions : []).flatMap(item => {
    const row = object(item), id = text(row.id, 100), startedAt = timestamp(row.startedAt), endedAt = timestamp(row.endedAt);
    if (!id || !startedAt || !endedAt || seen.has(id) || endedAt < startedAt) return [];
    seen.add(id);
    const plannedSeconds = integer(row.plannedSeconds, 1500, 7200);
    return [{ ...selection(row), id, mode: mode(row.mode), durationSeconds: integer(row.durationSeconds, 0, plannedSeconds, 0), plannedSeconds, startedAt, endedAt, completed: row.completed === true }];
  }).sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, 1000);
  const rawActive = object(data.active), activeId = text(rawActive.id, 100), startedAt = timestamp(rawActive.startedAt);
  let active: ActiveTimer | null = null;
  if (activeId && startedAt && !seen.has(activeId)) {
    const totalSeconds = integer(rawActive.totalSeconds, 1500, 7200);
    const remainingSeconds = integer(rawActive.remainingSeconds, totalSeconds, totalSeconds, 0);
    const validDeadline = typeof rawActive.deadline === "number" && Number.isFinite(rawActive.deadline) && rawActive.deadline > 0 && rawActive.deadline < 8.64e15;
    const running = rawActive.running === true && validDeadline;
    active = { ...rawActive, id: activeId, mode: mode(rawActive.mode), totalSeconds, remainingSeconds, running, deadline: running ? rawActive.deadline as number : null, startedAt, selection: selection(rawActive.selection) };
  }
  const completedFocusCount = Math.max(sessions.filter(item => item.mode === 'focus' && item.completed).length,
    typeof data.completedFocusCount === 'number' && Number.isSafeInteger(data.completedFocusCount) && data.completedFocusCount >= 0 ? data.completedFocusCount : 0);
  return { ...data, version: 1, settings, mode: mode(data.mode), selection: selection(data.selection), active, sessions, completedFocusCount };
}

export function remainingSeconds(timer: ActiveTimer, now: number): number {
  return timer.running && timer.deadline !== null ? Math.max(0, Math.min(timer.remainingSeconds, Math.ceil((timer.deadline - now) / 1000))) : timer.remainingSeconds;
}

/** Completion uses the original deadline, even if this tab resumes much later. */
export function finishTimer(state: PomodoroState, now: number, early = false): PomodoroState {
  const active = state.active;
  if (!active) return state;
  const remaining = remainingSeconds(active, now);
  if (!early && remaining > 0) return state;
  const completed = remaining === 0;
  const durationSeconds = completed ? active.totalSeconds : active.totalSeconds - remaining;
  const endedAt = completed && active.running && active.deadline ? active.deadline : now;
  const linked = selection(active.selection);
  const session: FocusSession = {
    id: active.id, mode: active.mode, durationSeconds, plannedSeconds: active.totalSeconds,
    startedAt: active.startedAt, endedAt: new Date(Math.max(Date.parse(active.startedAt), endedAt)).toISOString(), completed,
    taskId: linked.taskId, habitId: linked.habitId, title: linked.title,
    rootRunId: active.rootRunId, originFocusId: active.originFocusId,
  };
  const sessions = durationSeconds > 0 ? [session, ...state.sessions.filter(item => item.id !== active.id)].slice(0, 1000) : state.sessions;
  const counted = state.sessions.some(item => item.id === active.id && item.mode === 'focus' && item.completed);
  const rounds = Math.max(state.completedFocusCount || 0, state.sessions.filter(item => item.mode === 'focus' && item.completed).length)
    + Number(active.mode === 'focus' && completed && !counted);
  const nextMode: TimerMode = active.mode === "focus" && completed ? (rounds % state.settings.longEvery === 0 ? "longBreak" : "shortBreak") : "focus";
  return { ...state, active: null, mode: nextMode, sessions, completedFocusCount: rounds };
}

export function pauseTimer(state: PomodoroState, now: number): PomodoroState {
  if (!state.active?.running) return state;
  if (remainingSeconds(state.active, now) === 0) return finishTimer(state, now);
  return { ...state, active: { ...state.active, running: false, remainingSeconds: remainingSeconds(state.active, now), deadline: null } };
}

export function resumeTimer(state: PomodoroState, now: number): PomodoroState {
  if (!state.active || state.active.running) return state;
  return { ...state, active: { ...state.active, running: true, deadline: now + state.active.remainingSeconds * 1000 } };
}

export function startTimer(state: PomodoroState, now: number, id: string, linked: TimerSelection): PomodoroState {
  if (state.active) return state;
  const totalSeconds = state.settings[state.mode] * 60;
  const nextSelection = selection(linked);
  return { ...state, selection: nextSelection, active: { id, mode: state.mode, totalSeconds, remainingSeconds: totalSeconds, running: true, deadline: now + totalSeconds * 1000, startedAt: new Date(now).toISOString(), selection: state.mode === "focus" ? nextSelection : { taskId: null, habitId: null, title: "" } } };
}

export function durationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60), remainder = seconds % 60;
  if (!minutes) return `${remainder} 秒`;
  if (minutes < 60) return remainder ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分钟`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}
