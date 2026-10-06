"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { automaticCover } from "@/lib/automatic-cover";
import AdminNavigation from "@/components/admin-navigation";
import CategoryPicker from "@/components/category-picker";
import MarkdownEditor, { ImagePicker } from "@/components/markdown-editor";
import SortDirection from "@/components/sort-direction";

type Session = { authenticated: boolean; needsSetup: boolean; userName?: string; csrfToken: string };
type Article = { id?: string; slug: string; title: string; description: string; date: string; category: string; tags: string[]; content: string; coverUrl: string; published: boolean; publishedMini: boolean; autoCover: boolean; version?: string };
const blank = (): Article => ({ slug: "", title: "", description: "", date: new Date().toISOString().slice(0, 10), category: "随笔", tags: [], content: "", coverUrl: "", published: false, publishedMini: false, autoCover: true });

async function read<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store", credentials: "same-origin" });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(response.status === 401 ? "登录已失效或账号密码错误，请重新登录" : response.status === 429 ? "操作过于频繁，请稍后重试" : problem.title ?? `操作失败（${response.status}）`);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export default function Admin() {
  const router = useRouter();
  const [session, setSession] = useState<Session>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article>();
  const [tagsText, setTagsText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [customSlug, setCustomSlug] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [sort, setSort] = useState<"date" | "title">("date");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [channel, setChannel] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const listRef = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    const current = await read<Session>("/api/auth/session");
    if (!current.authenticated && !current.needsSetup) router.replace("/account");
    setSession(current);
    if (current.authenticated) setArticles(await read<Article[]>("/api/admin/posts"));
    else setArticles([]);
    window.dispatchEvent(new Event("ottlog-session"));
  }, [router]);
  // Initial state updates happen only after asynchronous API responses.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh().catch(error => setMessage(error.message)); }, [refresh]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function mutate<T>(path: string, method: string, body?: unknown) {
    const current = await read<Session>("/api/auth/session");
    return read<T>(path, { method, headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": current.csrfToken }, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  async function action(task: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await task(); } catch (error) { setMessage(error instanceof Error ? error.message : "操作失败"); }
    finally { setBusy(false); }
  }
  function edit(post: Article) {
    if (dirty && !window.confirm("当前修改尚未保存，确定放弃吗？")) return;
    setEditing({ ...post }); setTagsText(post.tags.join(", ")); setDirty(false); setCustomSlug(false); setMessage("");
  }
  function update<K extends keyof Article>(key: K, value: Article[K]) {
    setEditing(post => post ? { ...post, [key]: value } : post); setDirty(true);
  }
  async function upload(file: File, cover: boolean) {
    await action(async () => {
      const data = new FormData(); data.append("file", file);
      const result = await read<{ url: string }>("/api/admin/uploads", { method: "POST", headers: { "X-CSRF-TOKEN": session?.csrfToken ?? "" }, body: data });
      setEditing(post => post ? cover ? { ...post, coverUrl: result.url, autoCover: false } : { ...post, content: `${post.content}\n\n![图片说明](${result.url})\n` } : post);
      setDirty(true); setMessage("图片已上传，保存文章后生效");
    });
  }

  const visibleArticles = articles.filter(p => `${p.title} ${p.slug} ${p.category} ${p.tags.join(" ")}`.toLowerCase().includes(filter.toLowerCase())).filter(p => !categoryFilter || p.category === categoryFilter).filter(p => channel === "all" || (channel === "draft" ? !p.published && !p.publishedMini : channel === "web" ? p.published : p.publishedMini)).sort((a, b) => {
    const compared = sort === "title" ? a.title.localeCompare(b.title, "zh-CN") : a.date.localeCompare(b.date);
    return (direction === "asc" ? 1 : -1) * compared || a.slug.localeCompare(b.slug);
  });
  const pageCount = Math.max(1, Math.ceil(visibleArticles.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  function turnPage(next: number) { setPage(next); listRef.current?.scrollTo({ top: 0 }); }

  if (!session) return <section className="archive"><h1>文章管理</h1><p role="status">{message || "正在连接…"}</p>{message && <button className="button" onClick={() => action(refresh)}>重试</button>}</section>;
  if (!session.authenticated && !session.needsSetup) return <p>正在前往账号页面…</p>;
  if (!session.authenticated) return <section className="admin-login"><p className="eyebrow">OTTLOG / ADMIN</p><h1>{"初始化站点账号"}</h1><p className="intro">{session.needsSetup ? "首次使用，请设置你的账号和密码。" : "登录后管理你的文章与图片。"}</p>
    <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); action(async () => {
      await mutate(`/api/auth/${session.needsSetup ? "setup" : "login"}`, "POST", { userName: form.get("username"), password: form.get("password") });
      await refresh(); setMessage("");
    }); }}>
      <label>账号<input name="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_-]+" autoComplete="username" /></label>
      <label>密码<input name="password" type="password" required minLength={session.needsSetup ? 12 : 1} maxLength={128} autoComplete={session.needsSetup ? "new-password" : "current-password"} /></label>
      {session.needsSetup && <p className="hint">账号使用英文字母、数字、下划线或短横线，密码至少 12 位。</p>}
      <button className="button" disabled={busy}>{busy ? "处理中…" : session.needsSetup ? "创建账号" : "登录"}</button>
    </form><p role="alert">{message}</p></section>;

  return <section className="admin">
    <AdminNavigation onLeave={() => !dirty || window.confirm("当前文章尚未保存，确定离开并放弃修改吗？")} />
    <div className="admin-heading"><div><p className="eyebrow">OTTLOG / WORKSPACE</p><h1>文章管理</h1><p className="intro">{articles.length} 篇文章 · {articles.filter(p => p.published || p.publishedMini).length} 篇已发布</p></div></div>
    <p className="admin-message" role="status" aria-live="polite">{message}</p>
    <div className="admin-grid"><aside className="admin-sidebar"><button className="button" disabled={busy} onClick={() => edit(blank())}>＋ 新建文章</button><label className="filter-label">查找文章<input value={filter} onChange={e => { setFilter(e.target.value); turnPage(1); }} placeholder="标题、地址或标签" /></label>
      <label>发布筛选<select value={channel} onChange={e => { setChannel(e.target.value); turnPage(1); }}><option value="all">全部状态</option><option value="draft">仅草稿</option><option value="web">已发布到博客</option><option value="mini">已发布到小程序</option></select></label>
      <label>分类筛选<select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); turnPage(1); }}><option value="">全部分类</option>{Array.from(new Set(articles.map(p => p.category))).sort().map(c => <option key={c}>{c}</option>)}</select></label>
      <div className="article-sort-controls"><label>排序依据<select value={sort} onChange={e => { setSort(e.target.value as "date" | "title"); turnPage(1); }}><option value="date">日期</option><option value="title">标题</option></select></label><SortDirection value={direction} onChange={next => { setDirection(next); turnPage(1); }} /></div>
<label>每页显示<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); turnPage(1); }}><option value={10}>10 篇</option><option value={20}>20 篇</option><option value={50}>50 篇</option></select></label>
      <div className="admin-list" ref={listRef}>{visibleArticles.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(post => <button key={post.id} className={editing?.id === post.id ? "selected" : ""} onClick={() => edit(post)}><strong>{post.title}</strong><span>{[post.published && "博客", post.publishedMini && "小程序"].filter(Boolean).join(" · ") || "草稿"} · {post.date}</span></button>)}</div>
      {visibleArticles.length === 0 && <p className="hint">没有符合条件的文章</p>}
      <div className="admin-pagination" aria-label="文章列表分页">
        <p role="status">共 {visibleArticles.length} 篇 · 第 {currentPage} / {pageCount} 页</p>
        <div><button type="button" disabled={currentPage === 1} onClick={() => turnPage(currentPage - 1)}>上一页</button><button type="button" disabled={currentPage === pageCount} onClick={() => turnPage(currentPage + 1)}>下一页</button></div>
      </div></aside>
    {!editing ? <div className="editor-empty"><h2>让新的想法落在纸上。</h2><p>选择一篇文章，或新建第一篇记录。</p></div> : <form ref={formRef} className="editor" onSubmit={event => { event.preventDefault(); action(async () => {
      const saveAction = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") || "draft";
      if (saveAction === "publish" && !editing.published && !editing.publishedMini) throw new Error("请选择至少一个发布渠道");
      if (!editing.content.trim()) throw new Error("请填写正文");
      const body = { ...editing, category: editing.category.trim(), saveAction, published: saveAction === "publish" && editing.published, publishedMini: saveAction === "publish" && editing.publishedMini, slug: editing.slug || null, tags: tagsText.split(/[,，]/).map(t => t.trim()).filter(Boolean) };
      const saved = await mutate<Article>(editing.id ? `/api/admin/posts/${editing.id}` : "/api/admin/posts", editing.id ? "PUT" : "POST", body);
      setEditing(saved); setTagsText(saved.tags.join(", ")); setDirty(false); await refresh(); setMessage((saved.published || saved.publishedMini) ? "文章已发布到所选渠道" : "草稿已保存");
    }); }}>
      <div className="editor-toolbar"><h2>{editing.id ? "编辑文章" : "新建文章"}{dirty && <small> · 未保存</small>}</h2><div className="publish-actions"><button type="submit" name="saveAction" value="draft" className="draft-button" disabled={busy}>保存草稿</button><button type="submit" name="saveAction" value="publish" className="button" disabled={busy}>发布文章</button></div></div>
      <label>标题<input value={editing.title} required maxLength={160} onChange={e => update("title", e.target.value)} /></label>
      <div className="field-row"><label>文章地址<input value={editing.slug} disabled={!customSlug} required={customSlug} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="首次保存自动生成" onChange={e => update("slug", e.target.value)} /></label><label>日期<input type="date" value={editing.date} required onChange={e => update("date", e.target.value)} /></label></div>
      <label className="check-label"><input type="checkbox" checked={customSlug} onChange={e => setCustomSlug(e.target.checked)} />自定义文章地址</label><p className="hint">自动生成的地址保持稳定。修改已发布地址会使旧链接失效。</p>
      <label>摘要<textarea placeholder="可留空，自动截取正文" value={editing.description} maxLength={500} rows={2} onChange={e => update("description", e.target.value)} /></label>
      <div className="field-row"><CategoryPicker key={editing.id || "new"} value={editing.category} categories={articles.map(p => p.category)} onChange={value => update("category", value)} /><label>标签（逗号分隔）<input value={tagsText} onChange={e => { setTagsText(e.target.value); setDirty(true); }} /></label></div>
      <div className="tag-choices" aria-label="已有标签">{Array.from(new Set(articles.flatMap(p => p.tags))).sort().map(tag => { const selected = tagsText.split(/[,，]/).map(t => t.trim()).includes(tag); return <button type="button" key={tag} aria-pressed={selected} onClick={() => { const current = tagsText.split(/[,，]/).map(t => t.trim()).filter(Boolean); setTagsText((selected ? current.filter(t => t !== tag) : [...current, tag]).join(", ")); setDirty(true); }}>{selected ? "✓ " : "＋ "}{tag}</button>; })}</div>
      <label className="check-label"><input type="checkbox" checked={editing.autoCover} onChange={e => update("autoCover", e.target.checked)} />自动选择封面</label><p className="hint">未设置封面时，从 200 张 Unsplash 图片中自动分配，优先使用未被文章使用的图片。保存后固定，修改标题和地址不会换图。</p>
      <div className="admin-actions"><button type="button" disabled={busy} onClick={() => action(async () => {
        const result = await mutate<{coverUrl:string}>("/api/admin/posts/cover", "POST", {currentCover: editing.coverUrl || automaticCover(editing.slug)});
        setEditing(post => post ? {...post, coverUrl: result.coverUrl, autoCover: true} : post); setDirty(true);
      })}>换一张封面</button><span className="hint">预览满意后保存文章</span></div>
      <label>封面地址<input disabled={editing.autoCover} value={editing.coverUrl} placeholder="/images/…" onChange={e => update("coverUrl", e.target.value)} /></label><ImagePicker disabled={busy} onFile={file => upload(file, true)}>上传自定义封面</ImagePicker><p className="hint">PNG / JPEG / WebP，最多 5 MB</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cover-preview" alt="封面预览" src={(editing.coverUrl && editing.coverUrl !== "/images/quiet-hills.svg") ? editing.coverUrl : automaticCover(editing.slug)} />
      <MarkdownEditor key={editing.id || "new"} value={editing.content} onChange={text => update("content", text)} onImage={file => upload(file, false)} onSave={(intent) => { const button = formRef.current?.querySelector<HTMLButtonElement>(`button[value="${intent}"]`); if (button) formRef.current?.requestSubmit(button); }} busy={busy} />
      <fieldset className="publish-options"><legend>发布渠道</legend><label className="check-label"><input type="checkbox" checked={editing.published} onChange={e => update("published", e.target.checked)} />在博客网站公开（PC / 手机网页）</label><label className="check-label"><input type="checkbox" checked={editing.publishedMini} onChange={e => update("publishedMini", e.target.checked)} />在微信小程序公开</label></fieldset>
      <div className="editor-bottom"><button type="submit" name="saveAction" value="draft" className="draft-button" disabled={busy}>保存草稿</button><button type="submit" name="saveAction" value="publish" className="button" disabled={busy}>发布文章</button>{editing.id && <button type="button" className="danger" disabled={busy} onClick={() => { if (window.confirm(`确定删除“${editing.title}”？此操作无法撤销。`)) action(async () => { await mutate(`/api/admin/posts/${editing.id}?version=${editing.version}`, "DELETE"); setEditing(undefined); setDirty(false); await refresh(); setMessage("文章已删除"); }); }}>删除文章</button>}{editing.published && editing.id && <Link href={`/posts/${editing.slug}`} target="_blank">查看已发布版本 ↗</Link>}</div>
    </form>}</div>
  </section>;
}
