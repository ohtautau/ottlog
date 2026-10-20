import { isReminderState, splitDefaultExerciseHabit } from './reminder-data';

// dining remains a legacy archive key; the retired food chooser never reads or writes it.
export type PersonalToolKey = 'meals' | 'reminders' | 'todos' | 'pomodoro' | 'memos' | 'dining' | 'mottos' | 'growth' | 'domains';
export type ToolSession = { authenticated: boolean; userName?: string; isAdmin?: boolean };
export type ToolCache<T> = { data: T; pending: boolean; revision: number };
type Identity = { owner: string; fingerprint: string };
export type ToolLoad<T> = Identity & { value: T; cloud: boolean; status: string };
type Adapter = {
  read: (key: string) => unknown;
  write: (key: string, value: unknown) => void;
  fingerprint: () => string;
  session: () => Promise<ToolSession>;
  get: <T>(key: PersonalToolKey) => Promise<{ data: T | null }>;
  put: <T>(key: PersonalToolKey, value: T, owner: string) => Promise<unknown>;
};
export const toolOwner = (session: ToolSession) => session.authenticated && session.userName ? `${session.isAdmin ? 'admin' : 'reader'}:${session.userName}` : session.authenticated ? '' : 'guest';
const identityKey = 'ottlog-mini-tool-identity-v1';
export const toolCacheKey = (owner: string, key: PersonalToolKey) => `ottlog-mini-tool-v1:${owner}:${key}`;
const offlineStatus = (owner: string) => owner === 'guest' ? '保存在本机 · 登录后可使用账号同步' : '账号离线 · 修改暂存在本机，联网后重试同步';

/** One shared queue per owner/tool keeps navigation and multiple mounted pages safe. */
export function createPersonalToolStore(adapter: Adapter) {
  const volatile = new Map<string, ToolCache<unknown>>();
  const writes = new Map<string, Promise<void>>();
  const listeners = new Set<(cacheKey: string, status: string) => void>();
  let knownIdentity: Identity | null = null;
  const emit = (cacheKey: string, status: string) => listeners.forEach(listener => listener(cacheKey, status));
  function cache<T>(cacheKey: string): ToolCache<T> | null {
    if (volatile.has(cacheKey)) return volatile.get(cacheKey) as ToolCache<T>;
    try {
      const data = adapter.read(cacheKey) as ToolCache<T> | undefined;
      return data && typeof data === 'object' && 'data' in data && typeof data.pending === 'boolean' ? data : null;
    } catch { return null; }
  }
  function save<T>(cacheKey: string, data: T, pending: boolean): boolean {
    const value = { data, pending, revision: (cache(cacheKey)?.revision || 0) + 1 };
    try { adapter.write(cacheKey, value); volatile.delete(cacheKey); return true; }
    catch { volatile.set(cacheKey, value); return false; }
  }
  async function identify(): Promise<Identity> {
    const session = await adapter.session();
    const owner = toolOwner(session);
    if (!owner) throw new Error('暂时无法确认账号，请重新登录');
    const identity = { owner, fingerprint: adapter.fingerprint() };
    knownIdentity = identity;
    try { adapter.write(identityKey, identity); } catch { /* In-memory identity still supports this session. */ }
    return identity;
  }
  function offlineIdentity(): Identity | null {
    let identity = knownIdentity;
    try { identity = (adapter.read(identityKey) as Identity) || identity; } catch { /* Use the confirmed identity in memory. */ }
    // With no cookie credentials and no previous identity, this installation can
    // only be a guest. Keep these first-launch offline edits in the guest cache.
    if (!identity && !adapter.fingerprint()) return { owner: 'guest', fingerprint: '' };
    return identity && typeof identity.owner === 'string' && identity.owner && identity.fingerprint === adapter.fingerprint() ? identity : null;
  }
  function flush(key: PersonalToolKey, owner: string): Promise<void> {
    if (owner === 'guest') return Promise.resolve();
    const cacheKey = toolCacheKey(owner, key);
    const task = (writes.get(cacheKey) || Promise.resolve()).then(async () => {
      const queued = cache<unknown>(cacheKey);
      if (!queued?.pending) return;
      const serialized = JSON.stringify(queued.data);
      emit(cacheKey, '正在同步到账号…');
      try {
        // The API adapter verifies this owner against the session that supplies CSRF.
        await adapter.put(key, queued.data, owner);
        const latest = cache<unknown>(cacheKey);
        if (latest && JSON.stringify(latest.data) === serialized) {
          const durable = save(cacheKey, latest.data, false);
          emit(cacheKey, durable ? '已保存到账号' : '已保存到账号 · 本机缓存不可用');
        }
      } catch (error) {
        const latest = cache<unknown>(cacheKey);
        if (latest?.pending && JSON.stringify(latest.data) === serialized)
          emit(cacheKey, volatile.has(cacheKey) ? '本机存储不可用 · 请保持小程序打开后重试' : `已在本机暂存 · ${error instanceof Error ? error.message : '同步失败'}，可重试`);
      }
    });
    writes.set(cacheKey, task);
    void task.finally(() => { if (writes.get(cacheKey) === task) writes.delete(cacheKey); });
    return task;
  }
  async function load<T>(key: PersonalToolKey, initial: T): Promise<ToolLoad<T>> {
    let identity: Identity, online = true;
    try { identity = await identify(); }
    catch {
      const offline = offlineIdentity();
      if (!offline) throw new Error('暂时无法确认登录状态 · 请联网后重试');
      identity = offline; online = false;
    }
    const cacheKey = toolCacheKey(identity.owner, key);
    await writes.get(cacheKey);
    let current = cache<T>(cacheKey);
    if (current && volatile.has(cacheKey)) {
      // Retrying a load must also retry durable storage, without changing data
      // or whether an account sync is pending.
      save(cacheKey, current.data, current.pending);
      current = cache<T>(cacheKey);
    }
    let value = current?.data ?? initial;
    let cloud = false, status = offlineStatus(identity.owner);
    if (online && identity.owner !== 'guest') {
      const before = JSON.stringify(current);
      try {
        const remote = await adapter.get<T>(key);
        // A GET can finish after login/logout. Never attach its payload to an old owner.
        const confirmed = await identify();
        if (confirmed.owner !== identity.owner) throw new Error('账号已切换，请重新读取');
        identity = confirmed;
        current = cache<T>(cacheKey);
        const changed = JSON.stringify(current) !== before;
        value = current && (current.pending || changed) ? current.data : remote.data ?? value;
        cloud = true;
        status = current?.pending ? '本机修改等待同步' : '已连接账号 · 修改自动保存';
        if (!current?.pending && !changed) save(cacheKey, value, false);
      } catch (error) {
        if (knownIdentity?.owner !== identity.owner || adapter.fingerprint() !== identity.fingerprint) throw new Error('账号状态已变化 · 请重新读取');
        status = offlineStatus(identity.owner);
      }
    }
    // Upgrade only the original combined default, through the same owner-bound
    // queue as normal edits. Every consumer then reads the same persisted IDs.
    if (key === 'reminders' && isReminderState(value) && splitDefaultExerciseHabit(value) !== value) {
      value = edit<T>(key, { ...identity, value, cloud, status }, previous =>
        isReminderState(previous) ? splitDefaultExerciseHabit(previous) as T : previous);
      status = cloud ? '本机修改等待同步' : offlineStatus(identity.owner);
    }
    if (volatile.has(cacheKey)) status = '本机存储不可用 · 请保持小程序打开';
    return { ...identity, value, cloud, status };
  }
  function edit<T>(key: PersonalToolKey, context: ToolLoad<T>, next: T | ((previous: T) => T)): T {
    if (adapter.fingerprint() !== context.fingerprint || knownIdentity && knownIdentity.owner !== context.owner) throw new Error('账号状态已变化 · 请重新读取');
    const cacheKey = toolCacheKey(context.owner, key);
    const previousCache = cache<T>(cacheKey);
    const previous = previousCache?.data ?? context.value;
    const value = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
    const unchanged = JSON.stringify(previous) === JSON.stringify(value);
    if (unchanged && !volatile.has(cacheKey)) return previous;
    // A same-ID retry still needs to persist memory-only data even when its content is identical.
    const durable = save(cacheKey, value, unchanged ? previousCache?.pending ?? context.owner !== 'guest' : context.owner !== 'guest');
    emit(cacheKey, durable ? context.cloud ? '正在同步到账号…' : offlineStatus(context.owner) : '本机存储不可用 · 请保持小程序打开');
    if (context.cloud) void flush(key, context.owner);
    return value;
  }
  return { load, edit, flush, cache, isVolatile: (cacheKey: string) => volatile.has(cacheKey),
    subscribe: (listener: (cacheKey: string, status: string) => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
}
