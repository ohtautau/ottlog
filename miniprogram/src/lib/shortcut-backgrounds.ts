// Backgrounds are fixed design variants, never arbitrary asset paths or CSS.
export const shortcutBackgrounds = [
  { key: 'ripple', name: '涟漪' }, { key: 'arc', name: '拱门' },
  { key: 'orbit', name: '环绕' }, { key: 'diagonal', name: '斜影' },
  { key: 'grid', name: '方格' }, { key: 'dots', name: '星点' },
  { key: 'wave', name: '流线' }, { key: 'steps', name: '阶梯' },
  { key: 'petals', name: '花瓣' }, { key: 'fold', name: '折页' },
] as const;
export type ShortcutBackgroundKey = typeof shortcutBackgrounds[number]['key'];

export function isShortcutBackground(value: unknown): value is ShortcutBackgroundKey {
  return typeof value === 'string' && shortcutBackgrounds.some(background => background.key === value);
}

// Keep each function's background stable when its name, rank or color changes.
const defaultBackgrounds: Readonly<Record<string, ShortcutBackgroundKey>> = {
  create: 'diagonal', pomodoro: 'orbit', daily: 'ripple', memos: 'fold',
  growth: 'steps', eat: 'petals', todos: 'grid', posts: 'arc',
  choose: 'dots', meals: 'wave', categories: 'grid', favorites: 'petals',
  journal: 'arc', domains: 'steps', statistics: 'diagonal', 'memo-list': 'fold',
};

export function defaultShortcutBackground(key: string): ShortcutBackgroundKey {
  const background = defaultBackgrounds[key];
  return isShortcutBackground(background) ? background : 'ripple';
}
