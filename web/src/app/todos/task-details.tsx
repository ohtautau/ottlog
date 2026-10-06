"use client";

import { useRef, useState, type PointerEvent } from "react";
import MarkdownContent from "@/components/markdown-content";
import { toolId } from "@/lib/tool-id";
import { type TodoSubtask } from "@/lib/todo-data";
import styles from "./todos.module.css";

type ChildDrag = { id: string; pointerId: number; y: number; overId: string; after: boolean; moved: boolean };

/** The parent form owns persistence; all edits remain a draft until Save. */
export default function TaskDetails({ description, subtasks }: { description: string; subtasks: TodoSubtask[] }) {
  const [text, setText] = useState(description);
  const [mode, setMode] = useState<"write" | "split" | "preview">("split");
  const [children, setChildren] = useState(subtasks);
  const [newChild, setNewChild] = useState("");
  const [dragging, setDragging] = useState("");
  const [target, setTarget] = useState<{ id: string; after: boolean } | null>(null);
  const drag = useRef<ChildDrag | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  function insert(before: string, after = "", sample = "文字") {
    const area = textarea.current;
    const start = area?.selectionStart ?? text.length, end = area?.selectionEnd ?? start;
    const value = text.slice(start, end) || sample;
    const next = text.slice(0, start) + before + value + after + text.slice(end);
    if (next.length > 10000) return;
    setText(next); if (mode === "preview") setMode("write");
    requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(start + before.length, start + before.length + value.length); });
  }
  function addChild() {
    const title = newChild.trim();
    if (!title || children.length >= 50) return;
    setChildren(items => [...items, { id: toolId(), title, completed: false }]); setNewChild("");
  }
  function moveChild(id: string, offset: number) {
    setChildren(items => { const index = items.findIndex(item => item.id === id), to = index + offset;
      if (index < 0 || to < 0 || to >= items.length) return items;
      const next = [...items]; [next[index], next[to]] = [next[to], next[index]]; return next;
    });
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id, pointerId: event.pointerId, y: event.clientY, overId: "", after: false, moved: false };
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current; if (!current || current.pointerId !== event.pointerId) return;
    if (!current.moved && Math.abs(event.clientY - current.y) < 5) return;
    current.moved = true; setDragging(current.id);
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-subtask-id]");
    if (!element || !list.current?.contains(element)) { current.overId = ""; setTarget(null); return; }
    current.overId = element.dataset.subtaskId!; current.after = event.clientY > element.getBoundingClientRect().top + element.offsetHeight / 2;
    setTarget({ id: current.overId, after: current.after });
    const dialog = element.closest("dialog");
    if (dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientY > bounds.bottom - 65) dialog.scrollTop += 18; else if (event.clientY < bounds.top + 65) dialog.scrollTop -= 18; }
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const current = drag.current; if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null; setDragging(""); setTarget(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancel && current.moved && current.overId && current.id !== current.overId) setChildren(items => {
      const source = items.find(item => item.id === current.id); if (!source) return items;
      const next = items.filter(item => item.id !== current.id), index = next.findIndex(item => item.id === current.overId);
      if (index < 0) return items; next.splice(index + (current.after ? 1 : 0), 0, source); return next;
    });
  }
  return <>
    <input type="hidden" name="description" value={text} />
    <input type="hidden" name="subtasks" value={JSON.stringify(children)} />
    <section className={styles.detailSection} aria-label="Markdown 任务详情">
      <div className={styles.detailHeading}><strong>任务详情</strong><div className={styles.detailModes} role="group" aria-label="详情编辑模式">{(["write", "split", "preview"] as const).map(item => <button type="button" key={item} aria-pressed={mode === item} onClick={() => setMode(item)}>{{ write: "编辑", split: "对照", preview: "预览" }[item]}</button>)}</div></div>
      {mode !== "preview" && <div className={styles.markdownToolbar} role="toolbar" aria-label="详情 Markdown 工具">
        <button type="button" title="标题" onClick={() => insert("## ", "", "标题")}>H₂</button>
        <button type="button" title="加粗" onClick={() => insert("**", "**")}><b>B</b></button>
        <button type="button" title="列表" onClick={() => insert("\n- ", "", "下一步")}>☷ 列表</button>
        <button type="button" title="检查项" onClick={() => insert("\n- [ ] ", "", "检查项")}>☑</button>
        <button type="button" title="链接" onClick={() => insert("[", "](https://)", "链接文字")}>链接</button>
        <button type="button" title="代码" onClick={() => insert("`", "`", "code")}>〈/〉</button>
      </div>}
      <div className={styles.detailPanes} data-mode={mode}>
        {mode !== "preview" && <textarea aria-label="任务详情 Markdown" ref={textarea} value={text} onChange={event => setText(event.target.value)} maxLength={10000} rows={8} placeholder={"把想法和步骤写下来…\n\n## 下一步\n- [ ] 一件可以开始的小事"} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") { event.preventDefault(); insert("**", "**"); } }} />}
        {mode !== "write" && <div className={styles.detailPreview} aria-label="任务详情预览"><MarkdownContent>{text || "在左边写下内容，这里会显示排版。"}</MarkdownContent></div>}
      </div>
      <p className={styles.detailHint}>支持 Markdown · 标题、清单、链接与公式 <span>{text.length} / 10000</span></p>
    </section>
    <section className={styles.detailSection} aria-label="子任务">
      <div className={styles.detailHeading}><strong>拆成小步骤</strong><span>{children.filter(item => item.completed).length} / {children.length} 完成</span></div>
      <div className={styles.subtaskList} ref={list}>{children.map((child, index) => <div key={child.id} className={styles.subtask} data-subtask-id={child.id} data-dragging={dragging === child.id} data-drop={target?.id === child.id && target.id !== dragging ? target.after ? "after" : "before" : undefined}>
        <button className={styles.dragHandle} type="button" aria-label={`拖动子任务：${child.title}`} title="拖动排序；也可使用旁边的上下按钮" onPointerDown={event => startDrag(event, child.id)} onPointerMove={moveDrag} onPointerUp={event => finishDrag(event)} onPointerCancel={event => finishDrag(event, true)} onLostPointerCapture={event => finishDrag(event, true)}>⠿</button>
        <input type="checkbox" aria-label={`完成子任务：${child.title}`} checked={child.completed} onChange={event => setChildren(items => items.map(item => item.id === child.id ? { ...item, completed: event.target.checked } : item))} />
        <input className={styles.subtaskTitle} aria-label={`子任务 ${index + 1}`} maxLength={160} required value={child.title} onChange={event => setChildren(items => items.map(item => item.id === child.id ? { ...item, title: event.target.value } : item))} />
        <div className={styles.subtaskActions}><button type="button" disabled={index === 0} aria-label={`上移子任务：${child.title}`} onClick={() => moveChild(child.id, -1)}>↑</button><button type="button" disabled={index === children.length - 1} aria-label={`下移子任务：${child.title}`} onClick={() => moveChild(child.id, 1)}>↓</button><button type="button" aria-label={`删除子任务：${child.title}`} onClick={() => setChildren(items => items.filter(item => item.id !== child.id))}>×</button></div>
      </div>)}</div>
      {!children.length && <p className={styles.detailHint}>先拆出一个小步骤，让开始更容易。</p>}
      <div className={styles.addSubtask}><input aria-label="新子任务" maxLength={160} placeholder="添加一个小步骤" value={newChild} onChange={event => setNewChild(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); addChild(); } }} /><button type="button" onClick={addChild} disabled={!newChild.trim() || children.length >= 50}>添加 ＋</button></div>
    </section>
  </>;
}
