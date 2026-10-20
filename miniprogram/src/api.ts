import Taro from '@tarojs/taro';
export type Post = { slug: string; title: string; description: string; date: string; category: string; tags: string[]; minutes: number; coverUrl: string; content: string };
export type Comment = { id: string; name: string; text: string; createdAt: string };
export const origin = API_BASE_URL.replace(/\/$/, '');
export const websiteOrigin = 'https://ohtautau.com';
export function imageUrl(source: string): string {
  const value = source?.trim() || '';
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('#')) return '';
  const path = value === '/images/quiet-hills.svg' ? '/images/default-cover.png' : value;
  return origin + '/' + path.replace(/^\/+/, '');
}
export type Session = { authenticated: boolean; userName?: string; isAdmin?: boolean; csrfToken: string };
export async function api<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: object, expectedOwner?: string): Promise<T> {
  const cookies: Record<string, string> = Taro.getStorageSync('ottlog.cookies') || {};
  const header: Record<string, string> = { 'content-type': 'application/json', Cookie: Object.values(cookies).join('; ') };
  if (method !== 'GET' && !path.includes('/comments')) {
    const session = await api<Session>('/account/session');
    const owner = session.authenticated ? `${session.isAdmin ? 'admin' : 'reader'}:${session.userName}` : 'guest';
    if (expectedOwner && owner !== expectedOwner) throw new Error('账号已切换，请重新打开页面后重试');
    header['X-CSRF-TOKEN'] = session.csrfToken;
    header.Cookie = Object.values(Taro.getStorageSync('ottlog.cookies') || {}).join('; ');
  }
  let response: { statusCode: number; data: T; cookies?: string[] };
  try { response = await Taro.request<T>({ url: origin + '/api' + path + (path.includes('?') ? '&' : '?') + 'channel=mini', method, data, timeout: 10000, header }); }
  catch (error) {
    const reason = String((error as { errMsg?: string })?.errMsg || '');
    if (/domain|url not in domain|合法域名/i.test(reason)) throw new Error('本地接口被域名校验拦截。请在开发者工具「详情 → 本地设置」关闭合法域名校验，再重新编译。');
    throw new Error(/^https?:\/\/(localhost|127\.|192\.168\.|10\.)/i.test(origin) ? '暂时连接不上博客。请确认 VS 后端已启动；手机预览需要使用电脑的局域网地址。' : '暂时连接不上博客，请检查网络后重试。');
  }
  const jar: Record<string, string> = Taro.getStorageSync('ottlog.cookies') || {};
  const raw = response.cookies || [];
  for (const cookie of raw) { const pair = cookie.split(';')[0]; const index = pair.indexOf('='); if (index > 0) { if (!pair.slice(index + 1) || /max-age=0(?:;|$)/i.test(cookie)) delete jar[pair.slice(0,index)]; else jar[pair.slice(0,index)] = pair; } }
  Taro.setStorageSync('ottlog.cookies', jar);
  if (response.statusCode >= 400) throw new Error((response.data as { title?: string })?.title || (response.statusCode === 401 ? '请到「我的」登录账号' : response.statusCode === 404 ? '内容不存在或尚未公开' : response.statusCode === 429 ? '操作过于频繁，请稍后重试' : '请求失败，请稍后重试'));
  return response.data;
}
export function favorites() { return api<Pick<Post, 'slug' | 'title'>[]>('/favorites'); }
