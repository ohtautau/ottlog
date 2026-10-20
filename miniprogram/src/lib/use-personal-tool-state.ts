import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { api, Session } from '../api';
import { createPersonalToolStore, toolCacheKey, type PersonalToolKey, type ToolLoad } from './tool-state-store';
import { toolPageStatus } from './tool-status-display';
import { previewMode, previewStorageKey } from './development-preview';

export type { PersonalToolKey } from './tool-state-store';
export type PersonalToolSetter<T> = (next: SetStateAction<T>) => Promise<void>;
const store = createPersonalToolStore({
  read: key => Taro.getStorageSync(previewStorageKey(key)),
  write: (key, value) => Taro.setStorageSync(previewStorageKey(key), value),
  fingerprint: () => {
    if (previewMode) return '';
    const cookies = Taro.getStorageSync('ottlog.cookies') || {};
    return Object.keys(cookies).sort().map(key => cookies[key]).join(';');
  },
  session: () => previewMode ? Promise.resolve({ authenticated: false }) : api<Session>('/account/session'),
  get: key => previewMode ? Promise.resolve({ data: null }) : api(`/personal-tools/${key}`),
  put: (key, data, owner) => previewMode ? Promise.resolve() : api(`/personal-tools/${key}`, 'PUT', { data }, owner),
});

export function hasVolatilePersonalTool(key: PersonalToolKey, owner: string): boolean {
  return store.isVolatile(toolCacheKey(owner, key));
}

/** A reminder must never be scheduled against an edit that only exists locally. */
export async function syncPersonalTool(key: PersonalToolKey, owner: string): Promise<void> {
  if (!owner || owner === 'guest') throw new Error('请先到「我的」登录，再开启微信提醒');
  await store.flush(key, owner);
  const current = store.cache(toolCacheKey(owner, key));
  if (!current || current.pending) throw new Error('任务还未同步到账号，请联网同步后再开启提醒');
}

export function usePersonalToolState<T>(key: PersonalToolKey, initial: T): {
  value: T; setValue: PersonalToolSetter<T>; ready: boolean; status: string; retry: () => void; owner: string;
} {
  const defaults = useRef(initial);
  const context = useRef<ToolLoad<T> | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const [value, update] = useState(initial);
  const [ready, setReady] = useState(false);
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState('正在读取…');
  const load = useCallback(async () => {
    const current = ++generation.current;
    context.current = null;
    setReady(false); setOwner(''); setStatus('正在读取…'); update(defaults.current);
    try {
      const result = await store.load(key, defaults.current);
      if (!mounted.current || generation.current !== current) return;
      context.current = result;
      update(result.value); setOwner(result.owner); setStatus(result.status); setReady(true);
      if (result.cloud) void store.flush(key, result.owner);
    } catch (error) {
      if (mounted.current && generation.current === current) setStatus(error instanceof Error ? error.message : '读取失败，请重试');
    }
  }, [key]);
  useDidShow(() => { void load(); });
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = store.subscribe((cacheKey, message) => {
      const current = context.current;
      if (!current || toolCacheKey(current.owner, key) !== cacheKey) return;
      const cache = store.cache<T>(cacheKey);
      if (cache) { current.value = cache.data; update(cache.data); }
      setStatus(message);
    });
    const reload = () => { void load(); };
    Taro.eventCenter.on('ottlog-session', reload);
    return () => { mounted.current = false; ++generation.current; context.current = null; unsubscribe(); Taro.eventCenter.off('ottlog-session', reload); };
  }, [key, load]);
  const setValue: PersonalToolSetter<T> = useCallback(async next => {
    const current = context.current;
    if (!current) throw new Error('数据还未就绪，请稍后重试');
    try { const result = store.edit(key, current, next); current.value = result; update(result); }
    catch (error) { void load(); throw error; }
  }, [key, load]);
  return { value, setValue, ready, status: toolPageStatus(status), retry: useCallback(() => { void load(); }, [load]), owner };
}
