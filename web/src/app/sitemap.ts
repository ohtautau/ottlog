import type { MetadataRoute } from 'next';
import { getPosts } from '@/lib/posts';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  return [{ url: 'https://ohtautau.com', changeFrequency: 'weekly' }, { url: 'https://ohtautau.com/posts', changeFrequency: 'weekly' }, ...posts.map(post => ({ url: `https://ohtautau.com/posts/${post.slug}`, lastModified: post.date }))];
}
