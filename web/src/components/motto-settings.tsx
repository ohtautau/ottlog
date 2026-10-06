"use client";

import { useEffect, useRef, useState } from "react";
import { accountRequest } from "@/lib/account";
import styles from "./motto-settings.module.css";

export default function MottoSettings() {
  const [mottos, setMottos] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [addition, setAddition] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    accountRequest<{ mottos: string[] }>("/api/mottos").then(data => {
      if (active) { setMottos(data.mottos); setLoaded(true); setMessage(""); }
    }).catch(error => { if (active) setMessage(error instanceof Error ? error.message : "加载失败"); });
    return () => { active = false; };
  }, [attempt]);

  async function save(next: string[], success: string) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await accountRequest<{ mottos: string[] }>("/api/mottos", "PUT", { mottos: next });
      setMottos(result.mottos);
      window.dispatchEvent(new Event("ottlog-mottos"));
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请重试");
      return false;
    } finally { saving.current = false; setBusy(false); }
  }

  function valid(text: string, index?: number) {
    if (!text || text.length > 120) { setMessage("请输入 1–120 个字符的格言"); return false; }
    if (mottos.some((motto, i) => i !== index && motto === text)) { setMessage("这句格言已经存在"); return false; }
    return true;
  }

  return <section className={`motto-settings ${styles.panel}`} aria-label="首页格言管理">
    <div className={styles.heading}><h2>首页格言</h2><span>{mottos.length} / 50 句</span></div>
    <p className="hint">逐句添加、编辑或删除，操作后自动保存。每句最多 120 个字符，首页随机轮播，相邻两次不重复。</p>
    <form className={styles.add} onSubmit={async event => {
      event.preventDefault();
      const text = addition.trim();
      if (!loaded || busy || editing !== null || !valid(text)) return;
      if (mottos.length >= 50) { setMessage("最多保存 50 句格言"); return; }
      if (await save([...mottos, text], "已添加这句格言")) setAddition("");
    }}>
      <label>新增一句<input value={addition} maxLength={120} placeholder="写下一句想反复看到的话…" disabled={!loaded || busy || editing !== null} onChange={event => setAddition(event.target.value)} /></label>
      <button className="button" disabled={!loaded || busy || editing !== null || !addition.trim() || mottos.length >= 50}>添加格言 ＋</button>
    </form>
    {!loaded && <button type="button" className="button secondary" onClick={() => setAttempt(value => value + 1)}>重新加载</button>}
    <p role="status" className={styles.status}>{busy ? "正在保存…" : message}</p>
    <ol className={styles.list}>
      {mottos.map((motto, index) => <li key={index} className={styles.row}>
        <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
        {editing === index ? <form className={styles.editor} onSubmit={async event => {
          event.preventDefault();
          const text = draft.trim();
          if (!valid(text, index)) return;
          if (await save(mottos.map((item, i) => i === index ? text : item), "已保存这句格言")) setEditing(null);
        }}>
          <label>编辑第 {index + 1} 句<input autoFocus value={draft} maxLength={120} disabled={busy} onChange={event => setDraft(event.target.value)} /></label>
          <div className={styles.actions}><button className="button" disabled={busy || !draft.trim()}>保存</button><button type="button" className="button secondary" disabled={busy} onClick={() => setEditing(null)}>取消</button></div>
        </form> : <>
          <p className={styles.text}>{motto}</p>
          <div className={styles.actions}>
            <button type="button" className="button secondary" disabled={busy || editing !== null} aria-label={`编辑第 ${index + 1} 句`} onClick={() => { setDraft(motto); setEditing(index); setMessage(""); }}>编辑</button>
            <button type="button" className={`button secondary ${styles.delete}`} disabled={busy || editing !== null} aria-label={`删除第 ${index + 1} 句`} onClick={async () => {
              const prompt = mottos.length === 1 ? "删除最后一句将恢复默认格言，确定继续吗？" : `确定删除这句格言？\n${motto}`;
              if (window.confirm(prompt)) await save(mottos.filter((_, i) => i !== index), mottos.length === 1 ? "已恢复默认格言" : "已删除这句格言");
            }}>删除</button>
          </div>
        </>}
      </li>)}
    </ol>
  </section>;
}
