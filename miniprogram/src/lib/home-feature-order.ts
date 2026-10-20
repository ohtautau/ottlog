import { homeFeatureGroups, type HomeFeatureKey } from './home-feature-catalog';
import { moveAdjacentItem } from './card-order';

export type HomeFeatureOrder = { version: 1; keys: HomeFeatureKey[] };
export const homeFeatureOrderStorageKey = 'ottlog.home-feature-order.v1';
export function normalizeHomeFeatureOrder(value: unknown): HomeFeatureOrder {
  const stored = value as { version?: unknown; keys?: unknown } | null;
  const raw = stored?.version === 1 && Array.isArray(stored.keys) ? stored.keys : [];
  const keys: HomeFeatureKey[] = [];
  for (const group of homeFeatureGroups) {
    const defaults = group.items.map(item => item.key);
    const selected = raw.filter((key): key is HomeFeatureKey => defaults.includes(key));
    keys.push(...new Set([...selected, ...defaults]));
  }
  return { version: 1, keys };
}
export function orderedHomeFeatureGroups(order: HomeFeatureOrder) {
  return homeFeatureGroups.map(group => ({ ...group, items: [...group.items].sort((a, b) => order.keys.indexOf(a.key) - order.keys.indexOf(b.key)) }));
}
export function moveHomeFeature(order: HomeFeatureOrder, key: HomeFeatureKey, direction: -1 | 1): HomeFeatureOrder {
  const group = orderedHomeFeatureGroups(order).find(group => group.items.some(item => item.key === key));
  if (!group) return order;
  const ids = group.items.map(item => item.key), moved = moveAdjacentItem(ids, key, direction);
  if (moved === ids) return order;
  const members = new Set(ids);
  let index = 0;
  return { version: 1, keys: order.keys.map(item => members.has(item) ? moved[index++] : item) };
}
