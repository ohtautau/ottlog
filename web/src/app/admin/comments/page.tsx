"use client";
import { useCallback, useEffect, useState } from "react";
import AdminNavigation from "@/components/admin-navigation";
import { useRouter } from "next/navigation";
type Comment = { id: string; name: string; text: string; approved: boolean; postTitle: string; createdAt: string };
export default function Moderation() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [csrf, setCsrf] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const session = await (await fetch("/api/auth/session", { cache: "no-store" })).json();
    if (!session.authenticated) { setAllowed(false); router.replace("/account"); return; }
    setAllowed(true);
    setCsrf(session.csrfToken);
    const response = await fetch("/api/admin/comments", { cache: "no-store" });
    if (!response.ok) throw new Error("无法加载评论");
    setComments(await response.json());
  }, [router]);
  // Initial state updates happen only after asynchronous API responses.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load().catch(() => setMessage("评论加载失败，请刷新重试")); }, [load]);
  async function act(comment: Comment, remove: boolean) {
    if (remove && !window.confirm("确定永久删除这条评论？")) return;
    setBusy(true);
    try { const result = await fetch(`/api/admin/comments/${comment.id}`, { method: remove ? "DELETE" : "PUT", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf }, body: remove ? undefined : JSON.stringify({ approved: !comment.approved }) }); if (!result.ok) throw new Error(); await load(); setMessage("已更新"); }
    catch { setMessage("操作失败，请刷新或重新登录"); } finally { setBusy(false); }
  }
  if (!allowed) return <p>{message || "正在验证账号权限…"}</p>;
  return <section className="admin"><AdminNavigation /><h1>评论审核</h1><p role="status">{message}</p>{comments.length === 0 && <p>暂无评论</p>}{comments.map(comment => <article className="comment" key={comment.id}><p className="eyebrow">{comment.postTitle} · {comment.approved ? "已公开" : "待审核"}</p><strong>{comment.name}</strong><p>{comment.text}</p><div className="admin-actions"><button disabled={busy} onClick={() => act(comment, false)}>{comment.approved ? "隐藏" : "通过审核"}</button><button disabled={busy} onClick={() => act(comment, true)}>删除</button></div></article>)}</section>;
}
