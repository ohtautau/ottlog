export type Session = { authenticated: boolean; userName?: string; isAdmin: boolean; csrfToken: string };
export type Favorite = { slug: string; title: string };
export async function accountRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (method !== "GET") headers["X-CSRF-TOKEN"] = (await accountRequest<Session>("/api/account/session")).csrfToken;
  const response = await fetch(path, { method, headers, credentials: "same-origin", cache: "no-store", body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) { const problem = await response.json().catch(() => ({})); throw new Error(response.status === 401 ? "请先登录账号" : response.status === 429 ? "操作过于频繁，请稍后重试" : problem.title || "操作失败，请稍后重试"); }
  return response.status === 204 ? undefined as T : response.json();
}
