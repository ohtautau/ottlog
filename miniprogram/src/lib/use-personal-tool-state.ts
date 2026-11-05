import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { api, Session } from '../api';
import { createPersonalToolStore, toolCacheKey, type PersonalToolKey, type ToolLoad } from './tool-state-store';
import { toolPageStatus } from './tool-status-display';
import { previewMode, previewStorageKey } from './development-preview';
import type { PersonalToolEdit } from './tool-state-store';

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

/** Local edit events only; reads, account refreshes and upload acknowledgements do not emit. */
export function subscribePersonalToolEdits(key: PersonalToolKey, owner: string, listener: (edit: PersonalToolEdit) => void) {
  return store.subscribeEdits(edit => { if (edit.key === key && edit.owner === owner) listener(edit); });
}

/** A reminder must never be scheduled against an edit that only exists locally. */
export async function syncPersonalTool(key: PersonalToolKey, owner: string, pendingMessage = '任务还未同步到账号，请联网同步后再开启提醒'): Promise<void> {
  if (!owner || owner === 'guest') throw new Error('请先从今日右上角登录，再开启微信提醒');
  await store.flush(key, owner);
  const current = store.cache(toolCacheKey(owner, key));
  if (!current || current.pending) throw new Error(pendingMessage);
}

export function usePersonalToolState<T>(key: PersonalToolKey, initial: T): {
  value: T; setValue: PersonalToolSetter<T>; ready: boolean; status: string; retry: () => void; owner: string;
} {
  const defaults = useRef(initial);
  const context = useRef<ToolLoad<T> | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const active = useRef(false), loading = useRef(false);
  const [value, update] = useState(initial);
  const [ready, setReady] = useState(false);
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState('正在读取…');
  const load = useCallback(async (silent = false) => {
    if (silent && loading.current) return;
    if (silent && !context.current) silent = false;
    const current = ++generation.current;
    loading.current = true;
    if (!silent) {
      context.current = null;
      setReady(false); setOwner(''); setStatus('正在读取…'); update(defaults.current);
    }
    try {
      const result = silent && context.current ? await store.refresh(key, defaults.current, context.current) : await store.load(key, defaults.current, cached => {
        if (!mounted.current || generation.current !== current) return;
        context.current = cached;
        update(cached.value); setOwner(cached.owner); setStatus(cached.status); setReady(true);
      });
      if (!mounted.current || generation.current !== current) return;
      context.current = result;
      update(previous => JSON.stringify(previous) === JSON.stringify(result.value) ? previous : result.value); setOwner(result.owner); setStatus(result.status); setReady(true);
      if (result.cloud) void store.flush(key, result.owner);
    } catch (error) {
      if (mounted.current && generation.current === current) setStatus(error instanceof Error ? error.message : '读取失败，请重试');
    } finally { if (generation.current === current) loading.current = false; }
  }, [key]);
  useDidShow(() => { active.current = true; void load(!!context.current); });
  useDidHide(() => { active.current = false; });
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
    const refresh = () => { if (active.current && context.current?.owner !== 'guest') void load(true); };
    const network = (result: { isConnected: boolean }) => { if (result.isConnected) refresh(); };
    const timer = setInterval(refresh, 5000);
    Taro.onNetworkStatusChange?.(network);
    Taro.eventCenter.on('ottlog-session', reload);
    Taro.eventCenter.on('ottlog-tools-refresh', refresh);
    return () => { mounted.current = false; active.current = false; ++generation.current; context.current = null; clearInterval(timer); Taro.offNetworkStatusChange?.(network); unsubscribe(); Taro.eventCenter.off('ottlog-session', reload); Taro.eventCenter.off('ottlog-tools-refresh', refresh); };
  }, [key, load]);
  const setValue: PersonalToolSetter<T> = useCallback(async next => {
    const current = context.current;
    if (!current) throw new Error('数据还未就绪，请稍后重试');
    try { const result = store.edit(key, current, next); current.value = result; update(result); }
    catch (error) { void load(); throw error; }
  }, [key, load]);
  return { value, setValue, ready, status: toolPageStatus(status), retry: useCallback(() => { void load(); }, [load]), owner };
}
