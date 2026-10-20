export type TimerMode = "focus" | "shortBreak" | "longBreak";
export type TimerTransitionMode = "autoBreak" | "manual";
export type TimerSettings = { focus: number; shortBreak: number; longBreak: number; longEvery: number; transitionMode?: TimerTransitionMode };
export type TimerSelection = { taskId: string | null; habitId?: string | null; title: string; domainId?: string | null };
export type ActiveTimer = {
  id: string; mode: TimerMode; totalSeconds: number; remainingSeconds: number;
  running: boolean; deadline: number | null; startedAt: string; selection: TimerSelection;
  rootRunId?: string; originFocusId?: string;
};
export type FocusSession = {
  id: string; mode: TimerMode; durationSeconds: number; plannedSeconds: number;
  startedAt: string; endedAt: string; completed: boolean; taskId: string | null; habitId?: string | null; title: string; domainId?: string | null;
  rootRunId?: string; originFocusId?: string;
};
export type PomodoroState = {
  version: 1; settings: TimerSettings; mode: TimerMode; selection: TimerSelection;
  active: ActiveTimer | null; sessions: FocusSession[];
  completedFocusCount?: number;
};
export const timerModes: { id: TimerMode; label: string }[] = [
  { id: "focus", label: "专注" },
  { id: "shortBreak", label: "短休息" },
  { id: "longBreak", label: "长休息" },
];
export const initialPomodoroState: PomodoroState = {
  version: 1, settings: { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4, transitionMode: "autoBreak" },
  mode: "focus", selection: { taskId: null, habitId: null, title: "" }, active: null, sessions: [], completedFocusCount: 0,
};
/** Mini-program navigation passes URI-encoded values through page options. */
export function decodeTimerRouteValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  try { return decodeURIComponent(value); } catch { return value; }
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const integer = (value: unknown, fallback: number, max: number, min = 1) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback;
const mode = (value: unknown): TimerMode => value === "shortBreak" || value === "longBreak" ? value : "focus";
const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : "";
const selection = (value: unknown): TimerSelection => {
  const data = object(value), taskId = text(data.taskId, 100) || null;
  return { ...data, taskId, habitId: taskId ? null : text(data.habitId, 100) || null, title: text(data.title, 100),
    ...(data.domainId === undefined ? {} : { domainId: text(data.domainId, 80) || null }) };
};

export function isPomodoroState(value: unknown): value is PomodoroState {
  const data = object(value), settings = object(data.settings);
  const validMode = (value: unknown) => value === 'focus' || value === 'shortBreak' || value === 'longBreak';
  const validSelection = (value: unknown) => { const data = object(value); return (data.taskId === null || typeof data.taskId === 'string')
    && (data.habitId === undefined || data.habitId === null || typeof data.habitId === 'string')
    && (data.domainId === undefined || data.domainId === null || typeof data.domainId === 'string') && typeof data.title === 'string'; };
  const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
  const validTimestamp = (value: unknown) => typeof value === 'string' && !!timestamp(value);
  const active = object(data.active);
  return data.version === 1 && validMode(data.mode) && validSelection(data.selection)
    && ['focus', 'shortBreak', 'longBreak', 'longEvery'].every(key => finite(settings[key]))
    && (data.active === null || typeof active.id === 'string' && !!active.id && validMode(active.mode) && finite(active.totalSeconds) && finite(active.remainingSeconds)
      && typeof active.running === 'boolean' && (active.deadline === null || finite(active.deadline)) && validTimestamp(active.startedAt) && validSelection(active.selection))
    && Array.isArray(data.sessions) && data.sessions.every(value => { const row = object(value); return typeof row.id === 'string' && !!row.id && validMode(row.mode)
      && finite(row.durationSeconds) && finite(row.plannedSeconds) && validTimestamp(row.startedAt) && validTimestamp(row.endedAt)
      && typeof row.completed === 'boolean' && validSelection(row); });
}

/** Remote state and browser caches can be stale or malformed. Keep timer math finite. */
export function normalizePomodoroState(value: unknown): PomodoroState {
  const data = object(value), rawSettings = object(data.settings);
  const settings: TimerSettings = {
    ...rawSettings,
    focus: integer(rawSettings.focus, 25, 120), shortBreak: integer(rawSettings.shortBreak, 5, 60),
    longBreak: integer(rawSettings.longBreak, 15, 120), longEvery: integer(rawSettings.longEvery, 4, 12),
    transitionMode: rawSettings.transitionMode === "manual" ? "manual" : "autoBreak",
  };
  const seen = new Set<string>();
  const sessions = (Array.isArray(data.sessions) ? data.sessions : []).flatMap(item => {
    const row = object(item), id = text(row.id, 100), startedAt = timestamp(row.startedAt), endedAt = timestamp(row.endedAt);
    if (!id || !startedAt || !endedAt || seen.has(id) || endedAt < startedAt) return [];
    seen.add(id);
    const plannedSeconds = integer(row.plannedSeconds, 1500, 7200);
    return [{ ...selection(row), id, mode: mode(row.mode), durationSeconds: integer(row.durationSeconds, 0, plannedSeconds, 0), plannedSeconds, startedAt, endedAt, completed: row.completed === true,
      ...(text(row.rootRunId, 100) ? { rootRunId: text(row.rootRunId, 100) } : {}),
      ...(text(row.originFocusId, 100) ? { originFocusId: text(row.originFocusId, 100) } : {}) }];
  }).sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, 1000);
  const rawActive = object(data.active), activeId = text(rawActive.id, 100), startedAt = timestamp(rawActive.startedAt);
  let active: ActiveTimer | null = null;
  if (activeId && startedAt && !seen.has(activeId)) {
    const totalSeconds = integer(rawActive.totalSeconds, 1500, 7200);
    const remainingSeconds = integer(rawActive.remainingSeconds, totalSeconds, totalSeconds, 0);
    const validDeadline = typeof rawActive.deadline === "number" && Number.isFinite(rawActive.deadline) && rawActive.deadline > 0 && rawActive.deadline < 8.64e15;
    const running = rawActive.running === true && validDeadline;
    active = { ...rawActive, id: activeId, mode: mode(rawActive.mode), totalSeconds, remainingSeconds, running, deadline: running ? rawActive.deadline as number : null, startedAt, selection: selection(rawActive.selection),
      rootRunId: text(rawActive.rootRunId, 100) || activeId,
      ...(text(rawActive.originFocusId, 100) ? { originFocusId: text(rawActive.originFocusId, 100) } : {}) };
  }
  const historicalFocusCount = sessions.filter(item => item.mode === "focus" && item.completed).length;
  const completedFocusCount = Math.max(historicalFocusCount, integer(data.completedFocusCount, historicalFocusCount, Number.MAX_SAFE_INTEGER, 0));
  return { ...data, version: 1, settings, mode: mode(data.mode), selection: selection(data.selection), active, sessions, completedFocusCount };
}

export function remainingSeconds(timer: ActiveTimer, now: number): number {
  return timer.running && timer.deadline !== null ? Math.max(0, Math.min(timer.remainingSeconds, Math.ceil((timer.deadline - now) / 1000))) : timer.remainingSeconds;
}

/** Explicit completion never starts another timer. Automatic expiry uses advanceTimer. */
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
    ...(linked.domainId === undefined ? {} : { domainId: linked.domainId }),
    rootRunId: active.rootRunId || active.id,
    ...(active.originFocusId ? { originFocusId: active.originFocusId } : {}),
  };
  const sessions = durationSeconds > 0 ? [session, ...state.sessions.filter(item => item.id !== active.id)].slice(0, 1000) : state.sessions;
  const recordedFocusCount = state.sessions.filter(item => item.mode === "focus" && item.completed).length;
  const previousCount = Math.max(state.completedFocusCount || 0, recordedFocusCount);
  const counted = state.sessions.some(item => item.id === active.id && item.mode === "focus" && item.completed);
  const rounds = previousCount + (active.mode === "focus" && completed && !counted ? 1 : 0);
  const nextMode: TimerMode = active.mode === "focus" && completed ? (rounds % state.settings.longEvery === 0 ? "longBreak" : "shortBreak") : "focus";
  return { ...state, active: null, mode: nextMode, sessions, completedFocusCount: rounds };
}

/** Stable ids make repeated recovery of an expired focus round idempotent. */
export function automaticBreakId(focusId: string): string {
  if (focusId.length <= 94) return `break:${focusId}`;
  let hash = 2166136261;
  for (let index = 0; index < focusId.length; index++) hash = Math.imul(hash ^ focusId.charCodeAt(index), 16777619);
  return `break:${focusId.slice(0, 80)}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/** Catch up only the current focus and its rest; never invent unattended focus rounds. */
export function advanceTimer(state: PomodoroState, now: number): PomodoroState {
  const active = state.active;
  if (!active?.running || remainingSeconds(active, now) > 0) return state;
  const finished = finishTimer(state, now);
  if (active.mode !== "focus" || state.settings.transitionMode === "manual") return finished;
  const breakId = automaticBreakId(active.id);
  if (finished.sessions.some(session => session.id === breakId)) return { ...finished, mode: "focus" };
  const breakStartedAt = Math.max(Date.parse(active.startedAt), active.deadline as number);
  const resting = startTimer(finished, breakStartedAt, breakId, { ...state.selection,
    ...(active.selection.domainId === undefined ? {} : { domainId: active.selection.domainId }) });
  if (!resting.active) return finished;
  const linkedRest: PomodoroState = { ...resting, active: { ...resting.active, rootRunId: active.rootRunId || active.id, originFocusId: active.id } };
  return remainingSeconds(linkedRest.active!, now) === 0 ? finishTimer(linkedRest, now) : linkedRest;
}

export function pauseTimer(state: PomodoroState, now: number): PomodoroState {
  if (!state.active?.running) return state;
  if (remainingSeconds(state.active, now) === 0) {
    const advanced = advanceTimer(state, now);
    return advanced.active ? pauseTimer(advanced, now) : advanced;
  }
  return { ...state, active: { ...state.active, running: false, remainingSeconds: remainingSeconds(state.active, now), deadline: null } };
}

export function resumeTimer(state: PomodoroState, now: number): PomodoroState {
  if (!state.active || state.active.running) return state;
  return { ...state, active: { ...state.active, running: true, deadline: now + state.active.remainingSeconds * 1000 } };
}

export function startTimer(state: PomodoroState, now: number, id: string, linked: TimerSelection, minutes?: number): PomodoroState {
  if (state.active) return state;
  // A one-round override uses the existing active duration; regular settings stay intact.
  const max = state.mode === 'shortBreak' ? 60 : 120;
  const totalSeconds = (Number.isInteger(minutes) && minutes! >= 1 && minutes! <= max ? minutes! : state.settings[state.mode]) * 60;
  const nextSelection = selection({ ...state.selection, ...linked, habitId: linked.habitId ?? null });
  return { ...state, selection: nextSelection, active: { id, rootRunId: id, mode: state.mode, totalSeconds, remainingSeconds: totalSeconds, running: true, deadline: now + totalSeconds * 1000, startedAt: new Date(now).toISOString(), selection: state.mode === "focus" ? nextSelection : { taskId: null, habitId: null, title: "", ...(nextSelection.domainId === undefined ? {} : { domainId: nextSelection.domainId }) } } };
}

export function durationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60), remainder = seconds % 60;
  if (!minutes) return `${remainder} 秒`;
  if (minutes < 60) return remainder ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分钟`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}
