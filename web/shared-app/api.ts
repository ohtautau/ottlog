// Browser transport for the shared personal tools. Cookies stay HttpOnly and same-origin.
export type Post = { slug: string; title: string; description: string; date: string; category: string; tags: string[]; minutes: number; coverUrl: string; content: string };
export type Comment = { id: string; name: string; text: string; createdAt: string };
export type Session = { authenticated: boolean; userName?: string; isAdmin?: boolean; csrfToken: string };
export const origin = '';
export const websiteOrigin = '';
export let browserOwner = '';
export function imageUrl(source: string): string {
  const value = source?.trim() || '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (!value || /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('#')) return '';
  return value === '/images/quiet-hills.svg' ? '/images/default-cover.png' : `/${value.replace(/^\/+/, '')}`;
}
export async function api<T>(path: string, method = 'GET', data?: object, expectedOwner?: string): Promise<T> {
  if (path === '/wechat/reminders/config') return { enabled: false, reason: '提醒时间可在网页设置；微信通知请在小程序中授权。', requiresSubscription: true } as T;
  if (path === '/wechat/pomodoro/config') return { enabled: false, reason: '微信通知请在小程序中授权。', requiresSubscription: true, templates: [] } as T;
  if (method === 'PUT' && path.startsWith('/personal-tools/') && expectedOwner && navigator.locks) {
    const key = `ottlog-tool-v1:${expectedOwner}:${path.slice('/personal-tools/'.length)}`;
    return navigator.locks.request(`ottlog-save:${key}`, async () => {
      // Another tab may have edited the cache while this write waited for the lock.
      // Send its latest absolute state so a delayed old request cannot win last.
      let latest = data;
      try { const cached = JSON.parse(localStorage.getItem(key) || 'null'); if (cached?.data && cached.pending) latest = { data: cached.data }; } catch { /* The original durable target remains retryable. */ }
      return request<T>(path, method, latest, expectedOwner);
    });
  }
  return request<T>(path, method, data, expectedOwner);
}
async function request<T>(path: string, method: string, data?: object, expectedOwner?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (method !== 'GET') {
    const session = await api<Session>('/account/session');
    const owner = session.authenticated ? `${session.isAdmin ? 'admin' : 'reader'}:${session.userName}` : 'guest';
    if (expectedOwner && expectedOwner !== owner) throw new Error('账号已切换，请重新打开页面');
    headers['X-CSRF-TOKEN'] = session.csrfToken;
  }
  const response = await fetch(`/api${path}`, { method, headers, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000), body: data === undefined ? undefined : JSON.stringify(data) });
  const result = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(result?.title || (response.status === 401 ? '请先登录账号' : '暂时无法连接，请稍后重试'));
  if (path === '/account/session' || path === '/account/profile') browserOwner = result?.authenticated ? `${result.isAdmin ? 'admin' : 'reader'}:${result.userName}` : 'guest';
  return result;
}
export function favorites() { return api<Pick<Post, 'slug' | 'title'>[]>('/favorites'); }
