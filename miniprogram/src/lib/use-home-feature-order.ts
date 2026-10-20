import { useMemo, useRef, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { homeFeatureOrderStorageKey, moveHomeFeature, normalizeHomeFeatureOrder, orderedHomeFeatureGroups, type HomeFeatureOrder } from './home-feature-order';
import type { HomeFeatureKey } from './home-feature-catalog';

function readOrder() {
  try { return normalizeHomeFeatureOrder(Taro.getStorageSync(homeFeatureOrderStorageKey)); }
  catch { return normalizeHomeFeatureOrder(null); }
}
/** Commit each move; failed writes retry the same absolute order. */
export default function useHomeFeatureOrder() {
  const [order, setOrder] = useState(readOrder);
  const [pending, setPending] = useState<HomeFeatureOrder | null>(null);
  const current = useRef(order), target = useRef(pending);
  useDidShow(() => { if (!target.current) { const next = readOrder(); current.current = next; setOrder(next); } });
  function persist(next: HomeFeatureOrder) {
    try {
      Taro.setStorageSync(homeFeatureOrderStorageKey, next);
      current.current = next; setOrder(next); target.current = null; setPending(null);
      return true;
    } catch { target.current = next; setPending(next); return false; }
  }
  function move(key: HomeFeatureKey, direction: -1 | 1) {
    if (target.current) return;
    const next = moveHomeFeature(current.current, key, direction);
    if (next !== current.current) persist(next);
  }
  return { groups: useMemo(() => orderedHomeFeatureGroups(order), [order]), pending: !!pending, move,
    retry: () => target.current ? persist(target.current) : true };
}
