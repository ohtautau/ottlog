import type { LibraryIconId } from './icon-library';

/** Canonical identities shared by the directory, shortcut selection and icons. */
export const homeFeatureCatalog = [
  { key: 'create', name: '创建任务', color: 'blue', tab: true, type: 'action', icon: 'goal' },
  { key: 'memos', name: '创建便签', color: 'lilac', tab: false, type: 'action', icon: 'write' },
  { key: 'create-habit', name: '创建习惯', color: 'yellow', tab: true, type: 'action', icon: 'plant' },
  { key: 'create-domain', name: '创建领域', color: 'mint', tab: true, type: 'action', icon: 'work' },
  { key: 'pomodoro', name: '开始番茄钟', color: 'mint', tab: false, type: 'action', icon: 'focus' },
  { key: 'todos', name: '任务', color: 'blue', tab: true, type: 'page', icon: 'calendar' },
  { key: 'memo-list', name: '便签', color: 'lilac', tab: false, type: 'page', icon: 'notes' },
  { key: 'statistics', name: '统计', color: 'blue', tab: false, type: 'page', icon: 'measure' },
  { key: 'daily', name: '习惯', color: 'yellow', tab: true, type: 'page', icon: 'plant' },
  { key: 'domains', name: '领域', color: 'mint', tab: true, type: 'page', icon: 'work' },
  { key: 'growth', name: '领域', color: 'rose', tab: false, type: 'page', icon: 'goal' },
  { key: 'pomodoro-page', name: '番茄钟', color: 'mint', tab: false, type: 'page', icon: 'focus' },
  { key: 'meals', name: '饮食记录', color: 'peach', tab: false, type: 'page', icon: 'food' },
  { key: 'choose', name: '选境', color: 'rose', tab: false, type: 'page', icon: 'explore' },
  { key: 'posts', name: '读点什么', color: 'mint', tab: false, type: 'page', icon: 'book' },
  { key: 'categories', name: '文章分类', color: 'yellow', tab: false, type: 'page', icon: 'tidy' },
  { key: 'favorites', name: '收藏', color: 'lilac', tab: true, type: 'page', icon: 'star' },
  { key: 'journal', name: '个人空间', color: 'rose', tab: false, type: 'page', icon: 'home' },
] as const satisfies readonly { key: string; name: string; color: string; tab: boolean; type: 'action' | 'page'; icon: LibraryIconId }[];

export type HomeFeature = typeof homeFeatureCatalog[number];
export type HomeFeatureKey = HomeFeature['key'];
export type HomeFeatureGroup = { title: string; items: readonly HomeFeature[] };
const readingKeys = new Set<HomeFeatureKey>(['categories', 'favorites', 'journal']);
export const homeFeatureGroups: HomeFeatureGroup[] = [
  { title: '快捷操作', items: homeFeatureCatalog.filter(item => item.type === 'action') },
  // Keep old saved identities valid; show one domain destination in the directory.
  { title: '功能界面', items: homeFeatureCatalog.filter(item => item.type === 'page' && item.key !== 'posts' && item.key !== 'domains' && !readingKeys.has(item.key)) },
  { title: '阅读与空间', items: homeFeatureCatalog.filter(item => readingKeys.has(item.key)) },
];
