import Taro from '@tarojs/taro';

type PomodoroEntry = { start?: string; launch?: string; task?: string; event?: string; minutes?: string };
let pending: PomodoroEntry | null = null;

/** Consume intent once on show, preserving existing callers and encoded titles. */
export function openPomodoro(options: PomodoroEntry = {}) {
  const entry = { ...options, ...(options.event !== undefined ? { event: encodeURIComponent(options.event) } : {}), ...(options.task !== undefined ? { task: encodeURIComponent(options.task) } : {}) };
  pending = entry;
  return Taro.navigateTo({ url: '/pages/pomodoro/index' }).catch(error => {
    if (pending === entry) pending = null;
    throw error;
  });
}

export function takePomodoroEntry(): PomodoroEntry | null {
  const entry = pending;
  pending = null;
  return entry;
}
