"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { accountRequest, type Session } from "@/lib/account";
import styles from "./quick-note.module.css";

export default function QuickNote() {
  const [session, setSession] = useState<Session>();
  useEffect(() => {
    let active = true;
    const load = () => { accountRequest<Session>("/api/account/profile").then(value => { if (active) setSession(value); }).catch(() => { if (active) setSession(undefined); }); };
    load(); window.addEventListener("ottlog-session", load); window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("ottlog-session", load); window.removeEventListener("focus", load); };
  }, []);
  if (!session?.authenticated || !session.isAdmin) return null;
  return <QuickMotto key={session.userName} />;
}

function QuickMotto() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const locked = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  function close() { if (!locked.current) { setOpen(false); trigger.current?.focus({ preventScroll: true }); } }
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    const outside = (event: PointerEvent) => { if (!locked.current && event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motto = text.trim();
    if (locked.current || !motto) return;
    locked.current = true; setBusy(true); setMessage("");
    try {
      if (motto.length > 120) throw new Error("每句格言最多 120 个字符");
      const session = await accountRequest<Session>("/api/account/profile");
      if (!session.authenticated || !session.isAdmin) throw new Error("请先登录管理员账号");
      const { mottos } = await accountRequest<{ mottos: string[] }>("/api/mottos");
      if (mottos.includes(motto)) throw new Error("这句格言已经存在");
      if (mottos.length >= 50) throw new Error("已有 50 句格言，请先到格言管理中整理");
      await accountRequest("/api/mottos", "PUT", { mottos: [...mottos, motto] });
      setText(""); setMessage("已加入自定义格言，首页随机轮播已更新");
      window.dispatchEvent(new Event("ottlog-mottos"));
      input.current?.focus();
    } catch (error) { setMessage(error instanceof Error ? error.message : "添加失败，输入已保留，请重试"); }
    finally { locked.current = false; setBusy(false); }
  }
  return <div className={styles.root} ref={root} onKeyDown={event => { if (event.key === "Escape" && !event.nativeEvent.isComposing) { event.stopPropagation(); close(); } }}>
    <button ref={trigger} type="button" className={styles.trigger} aria-label="快速添加格言" aria-expanded={open} aria-controls={panelId} disabled={busy} onClick={() => setOpen(previous => !previous)}>＋ 添加格言</button>
    {open && <section id={panelId} className={styles.panel} aria-label="快速添加格言">
      <div className={styles.heading}><strong>写一句格言</strong><button type="button" className={styles.close} aria-label="收起格言输入" disabled={busy} onClick={close}>×</button></div>
      <form onSubmit={save}>
        <div className={styles.entry}><label className={styles.input}><span className={styles.srOnly}>新增格言</span><input ref={input} maxLength={120} value={text} disabled={busy} placeholder="写一句想反复看到的话…" onChange={event => { setText(event.target.value); setMessage(""); }} onKeyDown={event => { if (event.key === "Enter" && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault(); }} /></label><button className={styles.save} disabled={busy || !text.trim()}>{busy ? "正在添加" : "添加格言"}</button></div>
        <div className={styles.meta}><span>{text.length} / 120</span><span>Enter 添加到轮播</span><Link href="/admin/mottos">管理格言</Link></div>
      </form><p className={styles.status} role="status">{message}</p>
    </section>}
  </div>;
}
