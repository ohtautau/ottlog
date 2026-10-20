import type { Post } from '../api';

export const POST_FILTER_STORAGE_KEY = 'ottlog.post-filter';
export type PostSort = 'date' | 'title' | 'minutes';
export type PostDirection = 'asc' | 'desc';
export type PostFilter = { q: string; category: string; tag: string; sort: PostSort; direction: PostDirection };
export type PostFilterLink = { q?: string; category?: string; tag?: string };
export const defaultPostFilter: PostFilter = { q: '', category: '', tag: '', sort: 'date', direction: 'desc' };

export function readPostFilterLink(value: unknown): PostFilterLink | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result: PostFilterLink = {};
  for (const key of ['q', 'category', 'tag'] as const) {
    const item = (value as Record<string, unknown>)[key];
    if (typeof item === 'string') result[key] = item.trim().slice(0, 100);
  }
  return result;
}

export function filterPosts(posts: readonly Post[], filter: PostFilter): Post[] {
  const words = filter.q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const direction = filter.direction === 'asc' ? 1 : -1;
  return posts.filter(post => {
    if (filter.category && post.category !== filter.category) return false;
    if (filter.tag && !post.tags.includes(filter.tag)) return false;
    const searchable = [post.title, post.description, post.category, ...post.tags].join(' ').toLocaleLowerCase();
    return words.every(word => searchable.includes(word));
  }).sort((left, right) => {
    let comparison = 0;
    if (filter.sort === 'title') comparison = left.title.localeCompare(right.title, 'zh-CN');
    else if (filter.sort === 'minutes') comparison = left.minutes - right.minutes;
    else comparison = (Date.parse(left.date) || 0) - (Date.parse(right.date) || 0);
    return direction * comparison || left.slug.localeCompare(right.slug);
  });
}

export function postGroups(posts: readonly Post[]) {
  const categories = new Map<string, number>();
  const tags = new Map<string, number>();
  for (const post of posts) {
    if (post.category) categories.set(post.category, (categories.get(post.category) || 0) + 1);
    for (const tag of new Set(post.tags)) if (tag) tags.set(tag, (tags.get(tag) || 0) + 1);
  }
  const sort = (groups: Map<string, number>) => Array.from(groups, ([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  return { categories: sort(categories), tags: sort(tags) };
}
