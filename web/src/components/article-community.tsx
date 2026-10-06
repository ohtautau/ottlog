"use client";
import { useEffect, useState } from "react";
type Comment = { id: string; name: string; text: string; createdAt: string };
import Link from "next/link";
import { accountRequest, type Favorite, type Session } from "@/lib/account";
export default function ArticleCommunity({ slug }: { slug: string; title: string }) {
  const [saved, setSaved] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    async function load() {
      try { const session = await accountRequest<Session>("/api/account/session"); if (session.authenticated) setSaved((await accountRequest<Favorite[]>("/api/favorites")).some(p => p.slug === slug)); } catch { setMessage("收藏暂时无法加载"); }
      try { const result = await fetch(`/api/posts/${slug}/comments`); if (!result.ok) throw new Error(); setComments(await result.json()); }
      catch { setMessage("评论暂时无法加载，请刷新重试"); }
    }
    void load();
  }, [slug]);
  async function toggle() {
    setFavoriteBusy(true);
    try { await accountRequest(`/api/favorites/${slug}`, saved ? "DELETE" : "PUT"); setSaved(!saved); setMessage(saved ? "已取消收藏" : "已保存到你的账号"); }
    catch(e) { setMessage((e as Error).message); } finally { setFavoriteBusy(false); }
  }
  return <section className="community"><div className="community-actions"><button disabled={favoriteBusy} onClick={toggle} aria-pressed={saved}>{saved ? "★ 已收藏" : "☆ 收藏文章"}</button><button onClick={async () => { try { await navigator.clipboard.writeText(location.href); setMessage("文章链接已复制"); } catch { setMessage("请复制浏览器地址栏中的链接"); } }}>复制分享链接</button></div>{message === "请先登录账号" && <p><Link href="/account">登录 / 注册后收藏文章</Link></p>}<h2>读者留言</h2><p className="hint">文明交流，评论审核通过后公开展示。请勿留下私人联系方式。</p>
    {comments.length === 0 && <p className="intro">还没有公开留言，来写下你的想法吧。</p>}
    {comments.map(comment => <article className="comment" key={comment.id}><strong>{comment.name}</strong><time>{comment.createdAt.slice(0, 10)}</time><p>{comment.text}</p></article>)}
    <form className="comment-form" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); try {
      const result = await fetch(`/api/posts/${slug}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), text: data.get("text") }) });
      if (!result.ok) throw new Error(result.status === 429 ? "留言过于频繁，请稍后再试" : "提交失败，请稍后再试");
      setMessage("评论已提交，审核通过后展示"); form.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "提交失败"); } finally { setBusy(false); } }}><label>昵称<input name="name" required maxLength={40} /></label><label>留言<textarea name="text" required maxLength={2000} rows={4} /></label><button className="button" disabled={busy}>{busy ? "提交中…" : "提交评论"}</button></form><p role="status">{message}</p></section>;
}
