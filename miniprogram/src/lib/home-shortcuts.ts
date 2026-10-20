import { homeFeatureCatalog, type HomeFeatureKey } from './home-feature-catalog';
import { defaultShortcutIcon, normalizeShortcutIcon, type ShortcutIconKey } from './shortcut-icons';
import { isShortcutBackground, type ShortcutBackgroundKey } from './shortcut-backgrounds';
export const shortcutColors = [
  { key: 'peach', name: '蜜桃' }, { key: 'mint', name: '薄荷' },
  { key: 'blue', name: '晴蓝' }, { key: 'yellow', name: '奶黄' },
  { key: 'lilac', name: '浅紫' }, { key: 'rose', name: '玫瑰' },
] as const;
export type ShortcutColor = typeof shortcutColors[number]['key'];
export type ShortcutKind = 'card' | 'link';
export const shortcutCatalog = homeFeatureCatalog;
export type ShortcutKey = HomeFeatureKey;
export type HomeShortcut = { key: ShortcutKey; name: string; color: ShortcutColor; kind: ShortcutKind; rank?: number; background?: ShortcutBackgroundKey; icon?: ShortcutIconKey };
export type HomeShortcuts = { version: 1; items: HomeShortcut[] };
export const homeShortcutsStorageKey = 'ottlog.home-shortcuts.v1';
const previousShortcutNames: Partial<Record<ShortcutKey, readonly string[]>> = { daily: ['习惯养成'], memos: ['备忘录', '写备忘录'], domains: ['领域管理'], growth: ['成长足迹', '领域进展'], todos: ['查看任务'], favorites: ['我的收藏'] };
// Read the retired identity only to recognize untouched historical defaults.
// It never becomes a selectable feature or a returned shortcut.
const retiredFoodShortcut = { key: 'eat', name: '今日食选', color: 'peach' } as const;
type StoredShortcut = Omit<HomeShortcut, 'key'> & { key: ShortcutKey | 'eat' };
const storedRankLimit = Math.max(19, shortcutCatalog.length);
const previousDefaultOrder = ['eat', 'pomodoro', 'create', 'daily', 'memos', 'choose', 'todos', 'posts'];
const lastDefaultOrder = ['create', 'pomodoro', 'daily', 'memos', 'eat', 'choose', 'todos', 'posts'];
const previousSixDefaultOrder = ['create', 'pomodoro', 'daily', 'memos', 'growth', 'eat'];
const defaultShortcutOrder: ShortcutKey[] = ['memo-list', 'pomodoro', 'daily', 'statistics', 'growth', 'journal'];
export function makeShortcut(key: ShortcutKey, kind: ShortcutKind = 'card'): HomeShortcut {
  const item = shortcutCatalog.find(entry => entry.key === key)!;
  return { key, name: item.name, color: item.color, kind, icon: defaultShortcutIcon(key) };
}
export function defaultHomeShortcuts(): HomeShortcuts {
  return { version: 1, items: defaultShortcutOrder.map((key, index) => ({ ...makeShortcut(key), rank: index + 1 })) };
}
export function nextHomeShortcutRank(items: HomeShortcut[]): number {
  let rank = 1;
  while (items.some(item => item.rank === rank)) rank++;
  return rank;
}
export const groupHomeShortcuts = (items: HomeShortcut[]) => [...items].sort((a, b) => Number(a.kind === 'link') - Number(b.kind === 'link') || a.rank! - b.rank!);
// Keep intentional empty layouts, discard stale/duplicate entries, and never
// allow stored preferences to supply routes or arbitrary CSS class names.
export function normalizeHomeShortcuts(value: unknown): HomeShortcuts {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('items' in value) || !Array.isArray(value.items)) return defaultHomeShortcuts();
  const used = new Set<string>();
  const ranks = new Set<number>();
  const items: StoredShortcut[] = [];
  let hasPreviousName = false;
  let hasSelectedBackground = false;
  for (const item of value.items) {
    if (!item || typeof item !== 'object') continue;
    const original = item.key === 'eat' ? retiredFoodShortcut : shortcutCatalog.find(entry => entry.key === item.key);
    if (!original || used.has(original.key)) continue;
    used.add(original.key);
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    // Rename the former habit label without treating a custom order as an old default layout.
    const displayName = original.key === 'daily' && name === '习惯打卡' ? original.name : name;
    const previousName = original.key === 'eat' ? name === '吃什么' : previousShortcutNames[original.key]?.includes(name) === true;
    hasPreviousName ||= previousName;
    hasSelectedBackground ||= isShortcutBackground(item.background);
    const rank = Number.isInteger(item.rank) && item.rank > 0 && item.rank <= storedRankLimit && (original.key === 'eat' || !ranks.has(item.rank)) ? item.rank : undefined;
    if (rank && original.key !== 'eat') ranks.add(rank);
    const icon = normalizeShortcutIcon(item.icon);
    items.push({ key: original.key, kind: item.kind === 'link' ? 'link' : 'card', rank,
      ...(icon ? { icon } : {}),
      ...(isShortcutBackground(item.background) ? { background: item.background } : {}),
      name: previousName || !name ? original.name : Array.from(displayName).slice(0, 8).join(''),
      color: shortcutColors.some(color => color.key === item.color) ? item.color : original.color });
  }
  // Upgrade only the untouched six-card default, including its assigned ranks.
  if (!hasSelectedBackground && items.length === previousSixDefaultOrder.length && items.every((item, index) => {
    const original = item.key === 'eat' ? retiredFoodShortcut : makeShortcut(item.key);
    return item.key === previousSixDefaultOrder[index] && item.name === original.name && item.color === original.color && item.kind === 'card' && !item.icon && (!item.rank || item.rank === index + 1);
  })) return defaultHomeShortcuts();
  // Upgrade a saved older default layout; preserve customized order and styling.
  const oldOrders = hasPreviousName ? [previousDefaultOrder, lastDefaultOrder] : [lastDefaultOrder];
  if (!hasSelectedBackground && !items.some(item => item.rank || item.icon) && oldOrders.some(oldOrder => items.length === oldOrder.length && items.every((item, index) => {
    const original = item.key === 'eat' ? { ...retiredFoodShortcut, kind: index < 6 ? 'card' : 'link' } : makeShortcut(item.key, index < 6 ? 'card' : 'link');
    return item.key === oldOrder[index] && item.name === original.name && item.color === original.color && item.kind === original.kind;
  }))) return defaultHomeShortcuts();
  const activeItems = items.filter((item): item is HomeShortcut => item.key !== 'eat');
  for (const item of groupHomeShortcuts(activeItems)) {
    if (!item.rank) item.rank = nextHomeShortcutRank(activeItems);
  }
  for (const item of activeItems) item.kind = 'card';
  return { version: 1, items: activeItems.sort((a, b) => a.rank! - b.rank!) };
}
// Sorting preserves each entry's appearance and its existing size group.
export function moveHomeShortcut(items: HomeShortcut[], key: ShortcutKey, targetKey: ShortcutKey): HomeShortcut[] {
  const ordered = groupHomeShortcuts(items);
  const from = ordered.findIndex(item => item.key === key), to = ordered.findIndex(item => item.key === targetKey);
  if (from < 0 || to < 0 || from === to || ordered[from].kind !== ordered[to].kind) return items;
  const kind = ordered[from].kind;
  const ranks = ordered.filter(item => item.kind === kind).map(item => item.rank);
  ordered.splice(to, 0, ...ordered.splice(from, 1));
  let slot = 0;
  return ordered.map(item => item.kind === kind ? { ...item, rank: ranks[slot++] } : item).sort((a, b) => a.rank! - b.rank!);
}

/** Adjacent moves reuse the existing rank slots, including intentional gaps. */
export function moveHomeShortcutBy(items: HomeShortcut[], key: ShortcutKey, direction: -1 | 1): HomeShortcut[] {
  const ordered = groupHomeShortcuts(items), index = ordered.findIndex(item => item.key === key);
  const target = ordered[index + direction];
  return index < 0 || !target ? items : moveHomeShortcut(items, key, target.key);
}

/** Replace a function in its slot without duplicating an already selected entry. */
export function replaceHomeShortcut(items: HomeShortcut[], key: ShortcutKey, nextKey: ShortcutKey): HomeShortcut[] {
  if (key === nextKey || items.some(item => item.key === nextKey)) return items;
  const original = shortcutCatalog.find(item => item.key === key), next = shortcutCatalog.find(item => item.key === nextKey);
  if (!original || !next || !items.some(item => item.key === key)) return items;
  return items.map(item => item.key === key ? { ...item, key: nextKey,
    name: item.name === original.name ? next.name : item.name,
    icon: item.icon || defaultShortcutIcon(item.key),
  } : item);
}
