"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { accountRequest, type Favorite } from "@/lib/account";
export default function Favorites() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [message, setMessage] = useState("正在加载…");
  const [busy, setBusy] = useState(false);
  useEffect(() => { accountRequest<Favorite[]>("/api/favorites").then(data => { setItems(data); setMessage(""); }).catch(e => setMessage(e.message)); }, []);
  return <section className="archive"><p className="eyebrow">SAVED FOR LATER</p><h1>我的收藏</h1><p className="intro">收藏保存在账号中，换设备登录后仍可查看。已下架或未在博客公开的文章暂不显示。</p><p role="status">{message}</p>{message === "请先登录账号" && <Link className="button" href="/account">登录 / 注册</Link>}{!message && !items.length && <p>还没有收藏，去<Link href="/posts">发现文章</Link></p>}{items.map(item => <div className="favorite-row" key={item.slug}><Link href={`/posts/${item.slug}`}>{item.title}</Link><button disabled={busy} onClick={async () => { setBusy(true); try { await accountRequest(`/api/favorites/${item.slug}`, "DELETE"); setItems(items.filter(p => p.slug !== item.slug)); } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); } }}>移除</button></div>)}</section>;
}
