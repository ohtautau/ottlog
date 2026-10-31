// One mapping for shared tool actions, native links, and old mini-style bookmarks.
export function browserRouteParams(page, query) {
  const values = Object.fromEntries(new URLSearchParams(query));
  // These two mini-program fields explicitly decode their incoming values.
  // Re-encode once after URLSearchParams so literal plus/percent signs survive.
  if (page === 'pomodoro') for (const key of ['event', 'task']) if (key in values) values[key] = encodeURIComponent(values[key]);
  return values;
}
export function websiteRoute(url) {
  const [path, query = ''] = url.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  if (path.includes('/domain-detail/')) return `/domains/${params.get('uncategorized') === '1' ? 'uncategorized' : encodeURIComponent(params.get('id') || '')}`;
  if (path.includes('/detail/')) return `/posts/${encodeURIComponent(params.get('slug') || '')}`;
  const page = path.match(/(?:^|\/)pages\/([^/]+)\/index$/)?.[1];
  const target = { index: '/today', todos: '/todos', domains: '/domains', daily: '/daily', memos: '/memos', articles: '/articles', pomodoro: '/pomodoro', mottos: '/mottos', statistics: '/statistics', posts: '/posts', categories: '/posts', journal: '/articles', favorites: '/favorites' }[page];
  return target ? `${target}${query ? `?${query}` : ''}` : '/today';
}
