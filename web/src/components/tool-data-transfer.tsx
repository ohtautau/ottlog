"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createToolBackup, dataSignature, importToolData, maximumBackupBytes, parseToolBackup, toolDataSummary, toolNames, type ImportMode, type ToolBackup, type ToolData } from "@/lib/tool-backup";
import type { PersonalToolKey, PersonalToolSetter } from "@/lib/use-personal-tool-state";
import styles from "./tool-data-transfer.module.css";

type Props<K extends PersonalToolKey> = {
  tool: K; value: ToolData[K]; setValue: PersonalToolSetter<ToolData[K]>;
  ready: boolean; status: string; owner: string; beforeTransfer?: () => void; onImported?: () => void;
};

export default function ToolDataTransfer<K extends PersonalToolKey>({ tool, value, setValue, ready, status, owner, beforeTransfer, onImported }: Props<K>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const reading = useRef(0);
  const applying = useRef(false);
  const titleId = useId();
  const [candidate, setCandidate] = useState<{ backup: ToolBackup<K>; name: string; original: string } | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const plan = useMemo(() => {
    if (!candidate) return null;
    try { return { summary: toolDataSummary(tool, importToolData(tool, value, candidate.backup.data, mode)), error: "" }; }
    catch (error) { return { summary: "", error: error instanceof Error ? error.message : "无法导入这份数据。" }; }
  }, [candidate, tool, value, mode]);

  function exportData() {
    try {
      beforeTransfer?.();
      const backup = createToolBackup(tool, value);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `ottlog-${tool}-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError(""); setMessage("备份文件已生成，包含当前工具的已保存数据。");
    } catch (error) { setError(error instanceof Error ? error.message : "暂时无法导出，请重试。"); }
  }

  async function readFile(file?: File) {
    if (!file) return;
    const request = ++reading.current;
    setBusy(true); setCandidate(null); setConfirmed(false); setMessage(""); setError("");
    try {
      beforeTransfer?.();
      if (file.size > maximumBackupBytes) throw new Error("文件不能超过 8 MB。");
      const text = await file.text();
      if (!mounted.current || request !== reading.current) return;
      const backup = parseToolBackup(text, tool);
      setCandidate({ backup, name: file.name, original: dataSignature(value) }); setMode("merge");
    } catch (error) {
      if (mounted.current && request === reading.current) setError(error instanceof Error ? error.message : "无法读取这个备份文件。");
    } finally {
      if (mounted.current && request === reading.current) setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function applyImport() {
    if (!candidate || !ready || applying.current || (mode === "replace" && !confirmed)) return;
    applying.current = true; setBusy(true); setError(""); setMessage("");
    try {
      beforeTransfer?.();
      let applied = false;
      await setValue(previous => {
        beforeTransfer?.();
        if (mode === "replace" && dataSignature(previous) !== candidate.original) throw new Error("当前数据刚有更新。请重新核对后，再确认替换。");
        const next = importToolData(tool, previous, candidate.backup.data, mode);
        applied = true;
        return next;
      });
      if (!mounted.current) return;
      if (!applied) throw new Error("登录状态正在变化，请稍后重新导入。");
      onImported?.(); setCandidate(null); setConfirmed(false);
      setMessage("导入已应用，保存与账号同步状态见下方。");
    } catch (error) {
      if (mounted.current) { setError(error instanceof Error ? error.message : "导入失败，原数据未替换。"); setConfirmed(false); }
    } finally { applying.current = false; if (mounted.current) setBusy(false); }
  }

  return <div className={styles.bar} data-tool-transfer>
    <button className={styles.trigger} type="button" disabled={!ready} onClick={() => dialog.current?.showModal()}>数据导入 / 导出 <span aria-hidden="true">↕</span></button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { if (busy) event.preventDefault(); }} onClick={event => { if (!busy && event.target === event.currentTarget) dialog.current?.close(); }}>
      <header><div><p>KEEP YOUR EVERYDAY</p><h2 id={titleId}>{toolNames[tool]}<span>数据备份</span></h2></div><button type="button" aria-label="关闭数据备份" disabled={busy} onClick={() => dialog.current?.close()}>×</button></header>
      <div className={styles.content}>
        <p className={styles.scope}>{owner === "guest" ? "当前浏览器" : "当前登录账号"} · {toolDataSummary(tool, value)}</p>
        <section className={styles.export}><div><h3>把数据带走。</h3><p>导出此工具的完整已保存数据，可在另一台设备或账号中还原。</p></div><button type="button" disabled={!ready || busy} onClick={exportData}>导出 JSON <span aria-hidden="true">↓</span></button></section>
        {tool === "memos" && <p className={styles.hint}>编辑中的备忘请先保存；本机未保存草稿不包含在备份中。</p>}
        {tool === "pomodoro" && <p className={styles.hint}>备份中的未结束计时以导出时的进度暂停保存；当前页面继续计时。先导入待办备份，可恢复原有事项关联。</p>}
        <section className={styles.import} aria-label="导入备份">
          <div className={styles.importHeading}><h3>把记录接回来。</h3><span>JSON · 最大 8 MB</span></div>
          <div className={styles.filePicker}><button type="button" disabled={!ready || busy} onClick={() => input.current?.click()}>选择 JSON 文件 <span aria-hidden="true">↑</span></button><span title={candidate?.name}>{busy ? "正在处理…" : candidate?.name ?? "未选择备份"}</span><input ref={input} type="file" hidden accept=".json,application/json" aria-label="选择备份文件" disabled={!ready || busy} onChange={event => { void readFile(event.target.files?.[0]); }} /></div>
          {candidate && <div className={styles.preview}>
            <div className={styles.file}><strong>{candidate.name}</strong><span>{toolDataSummary(tool, candidate.backup.data)}</span><time dateTime={candidate.backup.exportedAt}>{new Date(candidate.backup.exportedAt).toLocaleString("zh-CN", { hour12: false })}</time></div>
            <fieldset disabled={busy}><legend>如何放入当前数据？</legend>
              <label><input type="radio" name={`${titleId}-mode`} checked={mode === "merge"} onChange={() => { setMode("merge"); setError(""); setConfirmed(false); }} /><span><strong>合并记录</strong><small>保留当前内容，新增备份中未出现过的记录；相同编号保留当前版本。</small></span></label>
              <label><input type="radio" name={`${titleId}-mode`} checked={mode === "replace"} onChange={() => { setMode("replace"); setError(""); setConfirmed(false); }} /><span><strong>替换当前数据</strong><small>仅替换此工具的已保存数据，其他工具不受影响。</small></span></label>
            </fieldset>
            {mode === "merge" && tool === "pomodoro" && <p className={styles.hint}>合并只新增历史记录，保留当前时间设置和当前计时。</p>}
            {mode === "merge" && tool === "reminders" && <p className={styles.hint}>同一天的完成记录合并保留，最多保存 90 天。</p>}
            {plan?.summary && <p className={styles.result}>导入后：{plan.summary}</p>}
            {mode === "replace" && <><label className={styles.confirm}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /><span>我确认覆盖当前工具的数据，已保留需要的备份。</span></label><button className={styles.recheck} type="button" disabled={busy} onClick={() => { setCandidate({ ...candidate, original: dataSignature(value) }); setConfirmed(false); setError(""); }}>重新核对当前数据</button></>}
            {plan?.error && <p className={styles.error} role="alert">{plan.error}</p>}
            <div className={styles.actions}><button type="button" disabled={busy} onClick={() => { setCandidate(null); setError(""); }}>取消导入</button><button type="button" className={styles.primary} disabled={busy || !ready || !!plan?.error || (mode === "replace" && !confirmed)} onClick={() => { void applyImport(); }}>{busy ? "正在导入…" : "确认导入"} </button></div>
          </div>}
        </section>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.message} role="status">{message}</p>}
        <p className={styles.status}>{status}</p>
      </div>
    </dialog>
  </div>;
}
