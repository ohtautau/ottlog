"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MarkdownContent from "./markdown-content";

export function ImagePicker({ onFile, disabled, children }: { onFile: (file: File) => void; disabled?: boolean; children: React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  return <span className="image-picker"><button type="button" disabled={disabled} onClick={() => input.current?.click()}>＋ {children}</button><input ref={input} hidden type="file" aria-label={String(children)} accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }} /></span>;
}

export default function MarkdownEditor({ value, onChange, onImage, onSave, busy }: { value: string; onChange: (text: string) => void; onImage: (file: File) => void; onSave: (intent: "draft" | "publish") => void; busy: boolean }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const popup = useRef<Window | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState("split");
  const [notice, setNotice] = useState("");
  useEffect(() => () => { if (popup.current) { popup.current.onbeforeunload = null; popup.current.close(); } }, []);
  function insert(before: string, after = "", placeholder = "文字") {
    const field = textarea.current;
    if (!field) return;
    const start = field.selectionStart, end = field.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + before.length, start + before.length + selected.length); });
  }
  function detach() {
    const win = window.open("", "_blank", "popup,width=1280,height=850");
    if (!win) { setNotice("窗口被浏览器拦截，请允许弹出窗口后重试。"); return; }
    win.document.title = "Ottlog · 独立文章编辑器";
    win.document.documentElement.lang = "zh-CN";
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => win.document.head.appendChild(node.cloneNode(true)));
    const root = win.document.createElement("main"); root.className = "detached-editor"; win.document.body.appendChild(root);
    popup.current = win; setContainer(root);
    win.addEventListener("pagehide", () => { popup.current = null; setContainer(null); });
    win.onbeforeunload = () => { /* Text is already synchronized to the parent editor. */ };
  }
  function attach() { const win = popup.current; popup.current = null; setContainer(null); if (win) { win.onbeforeunload = null; win.close(); } }
  const editor = <div className="markdown-workspace"><div className="editor-tabs workspace-tabs"><button type="button" aria-pressed={mode === "code"} onClick={() => setMode("code")}>Markdown</button><button type="button" aria-pressed={mode === "split"} onClick={() => setMode("split")}>左右对照</button><button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>预览</button>{container ? <><button type="button" onClick={attach}>返回主窗口</button><button className="draft-button" type="button" disabled={busy} onClick={() => onSave("draft")}>保存草稿</button><button className="button" type="button" disabled={busy} onClick={() => onSave("publish")}>发布文章</button></> : <button className="detach-button" type="button" onClick={detach}>独立窗口 ↗</button>}</div>
    <div className="markdown-tools" role="toolbar" aria-label="Markdown 快捷工具">{[
      ["行内公式", "$", "$", "E=mc^2"], ["公式块", "\n$$\n", "\n$$\n", "E=mc^2"], ["标题", "\n## ", "", "标题"], ["粗体", "**", "**", "粗体文字"], ["斜体", "*", "*", "斜体文字"], ["引用", "\n> ", "", "引用内容"], ["列表", "\n- ", "", "列表项"], ["任务", "\n- [ ] ", "", "待办事项"], ["链接", "[", "](https://example.com)", "链接文字"], ["代码块", "\n```text\n", "\n```\n", "代码"], ["表格", "\n", "\n", "| 标题 | 内容 |\n| --- | --- |\n| 项目 | 内容 |"],
    ].map(([label, before, after, placeholder]) => <button key={label} type="button" disabled={mode === "preview"} onMouseDown={e => e.preventDefault()} onClick={() => insert(before, after, placeholder)}>{label}</button>)}<ImagePicker disabled={busy} onFile={onImage}>插入图片</ImagePicker></div>
    <div className={`markdown-panes mode-${mode}`}>
      {mode !== "preview" && <label className="code-pane">正文<textarea aria-label="正文" ref={textarea} className="markdown-input" value={value} maxLength={200000} rows={22} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.ctrlKey || e.metaKey) { if (e.key.toLowerCase() === "b") { e.preventDefault(); insert("**", "**"); } if (e.key.toLowerCase() === "s") { e.preventDefault(); onSave("draft"); } } }} /></label>}
      {mode !== "code" && <div className="prose editor-preview"><MarkdownContent>{value || "正文预览"}</MarkdownContent></div>}
    </div><p className="hint">Ctrl/⌘ + B 加粗 · Ctrl/⌘ + S 保存草稿。独立窗口实时同步正文；请保存后再关闭主页面。</p>
  </div>;
  return <>{notice && <p role="alert">{notice}</p>}{container ? <><p>正文正在独立窗口中编辑。<button type="button" onClick={() => popup.current?.focus()}>前往编辑窗口</button><button type="button" onClick={attach}>收回编辑器</button></p>{createPortal(editor, container)}</> : editor}</>;
}
