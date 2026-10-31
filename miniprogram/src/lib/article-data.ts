import type { MemoImage } from './tool-records';
import { validNoteImages, noteStateFits } from './note-image-data';
import type { Post } from '../api';

export type PersonalArticle = { id: string; title: string; body: string; category: string; tags: string[]; images?: MemoImage[]; createdAt: string; updatedAt: string };
export type ArticleState = { version: 1; articles: PersonalArticle[] };
export const initialArticleState: ArticleState = { version: 1, articles: [] };
export function isArticleState(value: unknown): value is ArticleState {
  if (!value || typeof value !== 'object') return false;
  const state = value as ArticleState;
  return state.version === 1 && Array.isArray(state.articles) && state.articles.length <= 200 && new Set(state.articles.map(row => row?.id)).size === state.articles.length
    && state.articles.every(row => row && typeof row.id === 'string' && !!row.id && typeof row.title === 'string' && !!row.title.trim() && row.title.length <= 80
      && typeof row.body === 'string' && row.body.length <= 6000 && typeof row.category === 'string' && row.category.length <= 24
      && Array.isArray(row.tags) && row.tags.length <= 5 && row.tags.every(tag => typeof tag === 'string' && tag.length <= 20)
      && validNoteImages(row.images) && typeof row.createdAt === 'string' && typeof row.updatedAt === 'string' && Number.isFinite(Date.parse(row.createdAt)) && Number.isFinite(Date.parse(row.updatedAt)));
}
export function putArticle(state: ArticleState, article: PersonalArticle, creating: boolean): ArticleState {
  if (!isArticleState(state)) throw new Error('文章数据格式暂不兼容');
  const old = state.articles.find(row => row.id === article.id);
  if (!creating && !old) throw new Error('这篇文章已删除，请重新打开');
  const next = { ...state, articles: old ? state.articles.map(row => row.id === article.id ? { ...row, ...article } : row) : [article, ...state.articles] };
  if (!isArticleState(next)) throw new Error('文章标题最多80字、内容6000字、分类24字，最多5个标签及200篇文章');
  if (!noteStateFits(next)) throw new Error('文章空间不足，请减少图片或整理旧文章后重试');
  return next;
}
export function articleCardPost(article: PersonalArticle): Post {
  return { slug: article.id, title: article.title, description: article.body.replace(/[#*`>\[\]]/g, '').slice(0, 140), content: article.body,
    category: article.category.trim() || '未分类', tags: article.tags, coverUrl: '', date: article.createdAt, minutes: Math.max(1, Math.ceil(article.body.length / 300)) };
}
