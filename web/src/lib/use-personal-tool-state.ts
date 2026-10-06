"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { accountRequest, type Session } from "./account";

type Cache<T> = { data: T; pending: boolean };
const ownerOf = (s: Session) => s.authenticated ? `${s.isAdmin ? "admin" : "reader"}:${s.userName}` : "guest";
// A navigation can remount the hook while a previous PUT is still committing.
// Keep the write order across instances so an older request cannot win last.
const writes = new Map<string, Promise<void>>();
const volatileCaches = new Map<string, Cache<unknown>>();
export type PersonalToolKey = "meals" | "reminders" | "todos" | "pomodoro" | "memos" | "dining";
export type PersonalToolSetter<T> = (next: SetStateAction<T>) => Promise<void>;

async function withBrowserWriteLock(key: string, write: () => Promise<void>) {
  if (navigator.locks) await navigator.locks.request(`ottlog-save:${key}`, write);
  else await write();
}

function readCache<T>(key: string): Cache<T> | null {
  if (volatileCaches.has(key)) return volatileCaches.get(key) as Cache<T>;
  try {
    const raw = localStorage.getItem(key);
    const cache = raw ? JSON.parse(raw) : null;
    return cache && typeof cache === "object" && "data" in cache && typeof cache.pending === "boolean" ? cache : null;
  } catch { return null; }
}

function writeCache<T>(key: string, data: T, pending: boolean): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ data, pending }));
    volatileCaches.delete(key);
    window.dispatchEvent(new CustomEvent("ottlog-tool-cache", { detail: key }));
    return true;
  } catch {
    // Keep retries and same-tab navigation usable even when browser storage is full/disabled.
    volatileCaches.set(key, { data, pending }); return false;
  }
}

/** Separate browser caches by account; failed uploads remain recoverable on reload. */
export function usePersonalToolState<T>(key: PersonalToolKey, initial: T): {
  value: T; setValue: PersonalToolSetter<T>; ready: boolean; status: string; retry: () => void; owner: string;
} {
  const defaults = useRef(initial);
  const [value, update] = useState(initial);
  const [ready, setReady] = useState(false);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("正在读取…");
  const currentValue = useRef(initial);
  const context = useRef({ owner: "", cacheKey: "", cloud: false, generation: 0, writable: false });
  const saved = useRef("");
  const reload = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const generation = ++context.current.generation;
      context.current = { owner: "", cacheKey: "", cloud: false, generation, writable: false };
      setReady(false);
      setOwner("");
      setStatus("正在读取…");
      currentValue.current = defaults.current;
      update(defaults.current);
      let session: Session;
      try { session = await accountRequest<Session>("/api/account/profile"); }
      catch {
        if (alive && context.current.generation === generation)
          setStatus("暂时无法确认登录状态 · 请连接网络后重试");
        return;
      }
      if (!alive || context.current.generation !== generation) return;
      const owner = ownerOf(session);
      const cacheKey = `ottlog-tool-v1:${owner}:${key}`;
      // Let any write started before navigation finish before reading its cloud result.
      await writes.get(cacheKey);
      if (!alive || context.current.generation !== generation) return;
      let cache = readCache<T>(cacheKey);
      let data = cache?.data ?? defaults.current;
      let cloud = false;
      let message = "保存在此浏览器 · 登录后可使用账号同步";
      if (session.authenticated) {
        try {
          const beforeRead = JSON.stringify(cache);
          const remote = await accountRequest<{ data: T | null }>(`/api/personal-tools/${key}`);
          cache = readCache<T>(cacheKey);
          // A delayed GET must not replace an edit another tab has already saved.
          const changedDuringRead = JSON.stringify(cache) !== beforeRead;
          data = cache && (cache.pending || changedDuringRead) ? cache.data : remote.data ?? data;
          cloud = true;
          message = "已连接账号 · 修改自动保存";
        } catch { message = "账号暂时无法同步 · 修改先保存在此浏览器，恢复后刷新重试"; }
      }
      if (!alive || context.current.generation !== generation) return;
      context.current = { owner, cacheKey, cloud, generation, writable: true };
      saved.current = cache?.pending && cloud ? "" : JSON.stringify(data);
      if (cloud && !cache?.pending) writeCache(cacheKey, data, false);
      currentValue.current = data;
      update(data); setStatus(message); setOwner(owner); setReady(true);
    };
    reload.current = load;
    void load();
    window.addEventListener("ottlog-session", load);
    window.addEventListener("online", load);
    return () => {
      alive = false; ++context.current.generation; context.current.writable = false;
      if (reload.current === load) reload.current = null;
      window.removeEventListener("ottlog-session", load); window.removeEventListener("online", load);
    };
  }, [key]);

  useEffect(() => {
    const receive = () => {
      const { writable, cacheKey, cloud } = context.current;
      if (!writable || !cacheKey) return;
      const cache = readCache<T>(cacheKey);
      if (!cache) return;
      const serialized = JSON.stringify(cache.data);
      if (serialized === JSON.stringify(currentValue.current)) {
        if (!cache.pending && cloud) setStatus("已保存到账号");
        return;
      }
      currentValue.current = cache.data;
      saved.current = cache.pending && cloud ? "" : serialized;
      update(cache.data);
      setStatus(cache.pending && cloud ? "已接收最新修改 · 正在同步" : "已同步此浏览器的最新修改");
    };
    const local = (event: Event) => { if ((event as CustomEvent<string>).detail === context.current.cacheKey) receive(); };
    const external = (event: StorageEvent) => { if (event.key === context.current.cacheKey) receive(); };
    window.addEventListener("ottlog-tool-cache", local);
    window.addEventListener("storage", external);
    return () => { window.removeEventListener("ottlog-tool-cache", local); window.removeEventListener("storage", external); };
  }, []);

  useEffect(() => {
    if (!ready || !context.current.writable) return;
    const serialized = JSON.stringify(value);
    if (serialized !== JSON.stringify(currentValue.current)) return;
    if (saved.current === serialized) return;
    const { owner, cacheKey, cloud, generation } = context.current;
    const newest = readCache<T>(cacheKey);
    if (newest && JSON.stringify(newest.data) !== serialized) {
      currentValue.current = newest.data;
      saved.current = newest.pending && cloud ? "" : JSON.stringify(newest.data);
      update(newest.data);
      return;
    }
    saved.current = serialized;
    const pending = owner !== "guest";
    const localSaved = writeCache(cacheKey, value, pending);
    if (!cloud) {
      setStatus(localSaved ? (pending ? "已在此浏览器暂存 · 恢复连接后刷新同步" : "已保存在此浏览器 · 登录后可使用账号同步") : "浏览器存储不可用 · 请保持此页面打开");
      return;
    }
    setStatus("正在保存到账号…");
    const task = (writes.get(cacheKey) ?? Promise.resolve()).then(async () => {
      if (context.current.generation !== generation) return;
      try {
        await withBrowserWriteLock(cacheKey, async () => {
        if (context.current.generation !== generation) return;
        const queuedCache = readCache<T>(cacheKey);
        // Another tab may have changed the task/timer while this write waited.
        if (queuedCache && (!queuedCache.pending || JSON.stringify(queuedCache.data) !== serialized)) {
          if (!queuedCache.pending && saved.current === serialized) setStatus("已保存到账号");
          return;
        }
        const session = await accountRequest<Session>("/api/account/session");
        if (context.current.generation !== generation) return;
        if (ownerOf(session) !== owner) throw new Error("账号已切换，请刷新页面");
        const response = await fetch(`/api/personal-tools/${key}`, {
          method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": session.csrfToken },
          body: JSON.stringify({ data: value }),
        });
        if (!response.ok) {
          const problem = await response.json().catch(() => ({}));
          throw new Error(problem.title || "暂时无法同步");
        }
        if (context.current.generation !== generation || saved.current !== serialized) return;
        const latest = readCache<T>(cacheKey);
        if (latest && JSON.stringify(latest.data) === serialized) writeCache(cacheKey, value, false);
        setStatus("已保存到账号");
        });
      } catch (error) {
        if (context.current.generation === generation && saved.current === serialized)
          setStatus(localSaved ? `已在此浏览器暂存 · ${error instanceof Error ? error.message : "暂时无法同步"}，可重试同步` : "保存未成功 · 请保持此页面打开后重试修改");
      }
    });
    writes.set(cacheKey, task);
    void task.finally(() => { if (writes.get(cacheKey) === task) writes.delete(cacheKey); });
  }, [value, ready, key]);

  const setValue: PersonalToolSetter<T> = useCallback(async next => {
    const { writable, cacheKey, owner, generation } = context.current;
    if (!writable || !cacheKey) return;
    const fallback = currentValue.current;
    const commit = () => {
      // Yielding for the local edit lock also lets the browser receive other
      // renderers' storage updates after a busy tab. This lock never waits on API I/O.
      const cache = readCache<T>(cacheKey);
      const previous = cache ? cache.data : fallback;
      const value = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
      const mounted = context.current.generation === generation && context.current.writable;
      if (mounted) currentValue.current = value;
      // Keep an already-authorized edit recoverable even after SPA navigation.
      if (JSON.stringify(previous) !== JSON.stringify(value)) writeCache(cacheKey, value, owner !== "guest");
      if (mounted) update(value);
    };
    if (navigator.locks) await navigator.locks.request(`ottlog-edit:${cacheKey}`, commit);
    else await new Promise<void>((resolve, reject) => window.setTimeout(() => {
      try { commit(); resolve(); } catch (error) { reject(error); }
    }, 0));
  }, []);
  const retry = useCallback(() => { void reload.current?.(); }, []);
  return { value, setValue, ready, status, retry, owner };
}
