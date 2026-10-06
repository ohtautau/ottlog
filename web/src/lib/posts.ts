import "server-only";
import { getApiOrigin } from "./api-origin";

export type PostSummary = {
  slug: string; title: string; description: string; date: string;
  category: string; tags: string[]; minutes: number; coverUrl: string;
};
export type Post = PostSummary & { content: string };
export type Category = { name: string; count: number };
const apiOrigin = getApiOrigin();

async function request(path: string): Promise<Response> {
  const response = await fetch(new URL(path, apiOrigin), {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok && response.status !== 404) throw new Error(`Article API returned ${response.status}`);
  return response;
}
export async function getPosts(filters: { q?: string; category?: string } = {}): Promise<PostSummary[]> {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.category) query.set("category", filters.category);
  const response = await request(`/api/posts?${query}`);
  if (!response.ok) throw new Error("Article list endpoint unavailable");
  return response.json();
}
export async function getPost(slug: string): Promise<Post | undefined> {
  const response = await request(`/api/posts/${encodeURIComponent(slug)}`);
  return response.status === 404 ? undefined : response.json();
}
export async function getCategories(): Promise<Category[]> {
  const response = await request("/api/categories");
  if (!response.ok) throw new Error("Category endpoint unavailable");
  return response.json();
}
export function formatDate(date: string) { return date.replaceAll("-", "."); }
