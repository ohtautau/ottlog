"use client";

import ToolNavigation from "@/components/tool-navigation";
import ToolDataTransfer from "@/components/tool-data-transfer";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import MarkdownContent from "@/components/markdown-content";
import { usePersonalToolState, type PersonalToolSetter } from "@/lib/use-personal-tool-state";
import { toolId } from "@/lib/tool-id";
import { findMemos, initialMemoState, isMemo, isMemoState, makeMemo, maxBodyLength, maxMemos, memoColors, memoExcerpt, sameMemoContent, type Memo, type MemoColor, type MemoSort, type MemoState } from "./memo-data";
import styles from "./memo.module.css";

type EditorCache = { version: 1; activeId: string | null; draft: Memo | null; tagInput: string };
const volatileDrafts = new Map<string, EditorCache>();

function readEditor(key: string): EditorCache | null {
  if (volatileDrafts.has(key)) return volatileDrafts.get(key) ?? null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    if (parsed?.version !== 1 || (parsed.activeId !== null && typeof parsed.activeId !== "string") || (parsed.draft !== null && !isMemo(parsed.draft))) return null;
    return { ...parsed, tagInput: typeof parsed.tagInput === "string" ? parsed.tagInput.slice(0, 20) : "" };
  } catch { return null; }
}

function writeEditor(key: string, value: EditorCache): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); volatileDrafts.delete(key); return true; }
  catch { volatileDrafts.set(key, value); return false; }
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function PaperArt() {
  return <svg className={styles.paperArt} viewBox="0 0 290 215" aria-hidden="true">
    <path d="M42 70 L188 41 L244 148 L99 180 Z" fill="#3f5671" />
    <g className={styles.backPaper}><path d="M61 47 L204 45 L224 177 L81 179 Z" fill="#41645e" stroke="#88aaa0" strokeWidth="3" /><path d="M86 72 L181 71 M90 93 L177 92 M93 114 L150 113" stroke="#7d9e91" strokeWidth="6" /></g>
    <g className={styles.frontPaper}><path d="M40 20 L172 31 L205 61 L194 162 L30 148 Z" fill="#e1caa2" stroke="#23384c" strokeWidth="4" /><path d="M172 31 L169 60 L205 61" fill="#b69676" stroke="#23384c" strokeWidth="4" /><path d="M62 61 L142 68 M60 83 L169 92 M58 106 L141 113" stroke="#7f7564" strokeWidth="6" /><path d="M57 128 L96 131" stroke="#a96f59" strokeWidth="7" /></g>
    <g className={styles.pencil}><path d="M189 125 L247 35 L259 43 L201 133 L184 143 Z" fill="#d5a087" stroke="#23384c" strokeWidth="4" /><path d="M189 125 L201 133 L184 143 Z" fill="#f0dfbf" /><path d="M184 143 L187 134 L192 138 Z" fill="#20394c" /><path d="M242 44 L252 51" stroke="#edcda3" strokeWidth="5" /></g>
  </svg>;
}

export default function MemoExperience() {
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState<MemoState>("memos", initialMemoState);
  const [importRevision, setImportRevision] = useState(0);
  function checkDraft() {
    const editor = readEditor(`ottlog-memos-editor:v1:${owner}`);
    const saved = isMemoState(value) ? value.notes.find(note => note.id === editor?.draft?.id) ?? null : null;
    if (editor?.draft && (saved || editor.draft.title.trim() || editor.draft.body.trim() || editor.draft.tags.length || editor.tagInput.trim()) && (!sameMemoContent(editor.draft, saved) || editor.tagInput.trim())) {
      throw new Error("请先保存或移除正在编辑的备忘草稿，再导入或导出数据。");
    }
  }
  const valid = isMemoState(value);
  const count = valid ? value.notes.length : 0;
  return <div className={styles.page} data-tool-page data-tool-workspace="memos">
    <ToolNavigation />
    <ToolDataTransfer key={owner} tool="memos" value={value} setValue={setValue} ready={ready} status={status} owner={owner} beforeTransfer={checkDraft} onImported={() => {
      // A different tab may have started a draft while the local import waited.
      try { checkDraft(); writeEditor(`ottlog-memos-editor:v1:${owner}`, { version: 1, activeId: null, draft: null, tagInput: "" }); } catch { /* Keep that recovery draft. */ }
      setImportRevision(revision => revision + 1);
    }} />
    <header data-tool-header className={styles.hero}><div><p data-tool-kicker className={styles.eyebrow}>给一闪而过的想法，一个落脚点。</p><h1>备忘<span>录。</span></h1><p data-tool-description className={styles.heroDescription}>还没想清楚也没关系。<br />一句话、一个念头，都可以先放在这里。</p></div><div data-tool-art className={styles.heroArt}><PaperArt /><span>KEEP A LITTLE THOUGHT.</span></div></header>
    <div className={styles.utilityRow}><span className={styles.count}>{ready ? count : "—"}<small> / {maxMemos} 条备忘</small></span></div>
    <div className={styles.syncLine}><span role="status">{status}</span><button type="button" onClick={retry}>重新同步 ↻</button></div>
    {!ready ? <div className={styles.loading}><span aria-hidden="true">▱</span><h2>正在整理你的纸页。</h2><p>{status}</p><button type="button" className={styles.secondary} onClick={retry}>重试读取</button></div>
      : !valid ? <div className={styles.loading}><h2>这份备忘暂时无法读取。</h2><p>保存的数据格式不完整。可以先尝试重新同步。</p><button type="button" className={styles.secondary} onClick={retry}>重新读取</button></div>
        : <MemoWorkspace key={`${owner}:${importRevision}`} owner={owner} data={value} setData={setValue} />}
    <p className={styles.bottomLine}>不用立刻变成答案。留住它，就已经很好。<span aria-hidden="true">✳</span></p>
  </div>;
}

function MemoWorkspace({ owner, data, setData }: { owner: string; data: MemoState; setData: PersonalToolSetter<MemoState> }) {
  const cacheKey = `ottlog-memos-editor:v1:${owner}`;
  const [initial] = useState(() => readEditor(cacheKey));
  const [draft, updateDraft] = useState<Memo | null>(() => initial?.draft ?? data.notes.find((memo) => memo.id === initial?.activeId) ?? makeMemo(toolId(), new Date().toISOString()));
  const [tagInput, setTagInput] = useState(initial?.tagInput || "");
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<MemoColor | "all">("all");
  const [sort, setSort] = useState<MemoSort>("updated");
  const [mobileView, setMobileView] = useState("editor");
  const [mode, setMode] = useState<"edit" | "split" | "preview">("edit");
  const [notice, setNotice] = useState(initial?.draft && (initial.draft.title.trim() || initial.draft.body.trim() || initial.draft.tags.length || initial.tagInput.trim()) ? "已恢复上次未保存的内容，继续写就好。" : "");
  const [storageFailed, setStorageFailed] = useState(false);
  const [deleted, setDeleted] = useState<Memo | null>(null);
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  const tagRef = useRef(tagInput);
  const dataRef = useRef(data);
  const operationRef = useRef(false);
  const mountedRef = useRef(true);
  const original = data.notes.find((memo) => memo.id === draft?.id) ?? null;
  const dirty = draft !== null && Boolean(original || draft.title.trim() || draft.body.trim() || draft.tags.length || tagInput.trim()) && (!sameMemoContent(draft, original) || Boolean(tagInput.trim()));
  const filtered = findMemos(data.notes, query, color, sort);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const runOperation = useCallback(async (work: () => Promise<boolean>): Promise<boolean> => {
    // The local write lock can yield. Keep saving, changing pages and deleting
    // mutually exclusive so an old completion cannot replace a newer draft.
    if (operationRef.current) return false;
    operationRef.current = true; setBusy(true);
    try { return await work(); }
    catch {
      if (mountedRef.current) setNotice("这次保存还没有完成，内容仍留在本机草稿中，请重试。");
      return false;
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, []);

  function remember(next: Memo | null, pendingTag = tagRef.current) {
    const saved = writeEditor(cacheKey, { version: 1, activeId: next?.id ?? null, draft: next, tagInput: pendingTag });
    setStorageFailed(!saved);
  }

  function changeDraft(next: Memo) {
    if (operationRef.current) return;
    draftRef.current = next; updateDraft(next); remember(next);
  }

  const saveCurrent = useCallback(async (announce = true): Promise<boolean> => {
    const current = draftRef.current;
    if (!current) return true;
    const pendingTag = tagRef.current.trim();
    const tags = pendingTag && !current.tags.includes(pendingTag) ? [...current.tags, pendingTag] : current.tags;
    if (tags.length > 5) { setNotice("最多添加 5 个标签，请先整理一下标签。"); return false; }
    const existing = dataRef.current.notes.find((memo) => memo.id === current.id);
    if (!current.title.trim() && !current.body.trim() && !existing && !tags.length) {
      if (announce) setNotice("先写下标题或内容，再保存这张纸页。");
      return !announce;
    }
    if (existing && existing.updatedAt !== current.updatedAt && !sameMemoContent(current, existing)) {
      setStorageFailed(!writeEditor(cacheKey, { version: 1, activeId: current.id, draft: current, tagInput: tagRef.current }));
      setNotice("这条备忘已在其他页面更新。请另存为新备忘，或读取已保存的版本，避免覆盖新的内容。"); return false;
    }
    if (!existing && dataRef.current.notes.length >= maxMemos) { setNotice(`最多保存 ${maxMemos} 条备忘，请先整理几条旧备忘。当前内容仍保留在本机草稿中。`); return false; }
    const next = { ...current, title: current.title.trim() || "未命名备忘", tags, updatedAt: new Date(Math.max(new Date().getTime(), Date.parse(current.updatedAt) + 1)).toISOString() };
    if (!isMemo(next)) { setNotice("请检查内容长度：标题最多 80 字，正文最多 6000 字，标签最多 5 个。"); return false; }
    let committed = false;
    await setData((previous) => {
      if (!isMemoState(previous)) return previous;
      dataRef.current = previous;
      const latest = previous.notes.find((memo) => memo.id === next.id);
      if (latest && latest.updatedAt !== current.updatedAt && !sameMemoContent(latest, current)) return previous;
      if (!latest && previous.notes.length >= maxMemos) return previous;
      committed = true;
      const updated: MemoState = { version: 1, notes: latest ? previous.notes.map((memo) => memo.id === next.id ? next : memo) : [next, ...previous.notes] };
      dataRef.current = updated;
      return updated;
    });
    if (!committed) {
      if (mountedRef.current) {
        setStorageFailed(!writeEditor(cacheKey, { version: 1, activeId: current.id, draft: current, tagInput: tagRef.current }));
        setNotice("保存前备忘列表有了变化，当前内容仍在本机草稿中。请检查数量或另存一份。");
      }
      return false;
    }
    if (!mountedRef.current) return false;
    // A remounted editor may already be using a newer recovery draft. Only this
    // mounted editor clears its own completed save.
    draftRef.current = next; updateDraft(next); tagRef.current = ""; setTagInput("");
    setStorageFailed(!writeEditor(cacheKey, { version: 1, activeId: next.id, draft: null, tagInput: "" }));
    if (announce) setNotice(`「${next.title}」已提交保存。同步进度见页面上方。`);
    return true;
  }, [cacheKey, setData]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void runOperation(() => saveCurrent()); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [runOperation, saveCurrent]);

  useEffect(() => {
    if (!storageFailed || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [storageFailed, dirty]);

  function focusEditor() {
    setMobileView("editor");
    requestAnimationFrame(() => { editorRef.current?.scrollTo({ top: 0 }); titleRef.current?.focus({ preventScroll: true }); });
  }

  async function selectMemo(memo: Memo) {
    await runOperation(async () => {
      if (draftRef.current?.id === memo.id) { focusEditor(); return true; }
      const current = draftRef.current;
      const saved = dataRef.current.notes.find((note) => note.id === current?.id) ?? null;
      if (current && (!sameMemoContent(current, saved) || tagRef.current.trim()) && !await saveCurrent(false)) return false;
      if (!mountedRef.current) return false;
      const latest = dataRef.current.notes.find((note) => note.id === memo.id);
      if (!latest) { setNotice("这张纸页刚刚被移除了，当前内容仍为你保留。"); return false; }
      draftRef.current = latest; updateDraft(latest); tagRef.current = ""; setTagInput(""); setNotice("");
      setStorageFailed(!writeEditor(cacheKey, { version: 1, activeId: latest.id, draft: null, tagInput: "" }));
      focusEditor(); return true;
    });
  }

  async function newMemo() {
    await runOperation(async () => {
      const current = draftRef.current;
      const saved = dataRef.current.notes.find((note) => note.id === current?.id) ?? null;
      if (current && (!sameMemoContent(current, saved) || tagRef.current.trim()) && !await saveCurrent(false)) return false;
      if (!mountedRef.current) return false;
      if (dataRef.current.notes.length >= maxMemos) { setNotice(`已经有 ${maxMemos} 条备忘了，先给新的想法腾一点位置。`); return false; }
      const next = makeMemo(toolId(), new Date().toISOString());
      draftRef.current = next; updateDraft(next); tagRef.current = ""; setTagInput(""); setNotice(""); remember(next, ""); focusEditor(); return true;
    });
  }

  function duplicateDraft() {
    if (operationRef.current) return;
    if (!draft || data.notes.length >= maxMemos) { setNotice("备忘数量已满，请先整理旧备忘。原内容仍在当前草稿中。"); return; }
    const now = new Date().toISOString();
    const copy = { ...draft, id: toolId(), title: `${draft.title || "未命名备忘"}（副本）`.slice(0, 80), createdAt: now, updatedAt: now };
    changeDraft(copy); setNotice("已创建新草稿，点击保存即可独立保留这份内容。");
  }

  async function removeMemo(memo: Memo) {
    await runOperation(async () => {
      const current = draftRef.current;
      const removed = current?.id === memo.id ? { ...current, title: current.title.trim() || "未命名备忘" } : memo;
      await setData((previous) => {
        if (!isMemoState(previous)) return previous;
        const updated: MemoState = { version: 1, notes: previous.notes.filter((note) => note.id !== memo.id) };
        dataRef.current = updated; return updated;
      });
      if (!mountedRef.current) return false;
      setDeleted(removed); setNotice(`已移除「${removed.title}」，可以撤销。`);
      if (draftRef.current?.id === memo.id) { const blank = makeMemo(toolId(), new Date().toISOString()); draftRef.current = blank; updateDraft(blank); tagRef.current = ""; setTagInput(""); remember(null, ""); }
      return true;
    });
  }

  async function undoDelete() {
    if (!deleted) return;
    await runOperation(async () => {
      let restored = false;
      await setData((previous) => {
        if (!isMemoState(previous) || previous.notes.length >= maxMemos) return previous;
        const updated: MemoState = { version: 1, notes: previous.notes.some((memo) => memo.id === deleted.id) ? previous.notes : [deleted, ...previous.notes] };
        dataRef.current = updated; restored = true; return updated;
      });
      if (!mountedRef.current) return false;
      if (!restored) { setNotice("纸页数量已满，整理后仍可撤销这次删除。"); return false; }
      setNotice(`已恢复「${deleted.title}」。`); setDeleted(null); return true;
    });
  }

  function addTag() {
    if (operationRef.current) return;
    if (!draft || !tagInput.trim()) return;
    if (draft.tags.includes(tagInput.trim())) { tagRef.current = ""; setTagInput(""); remember(draft, ""); return; }
    if (draft.tags.length >= 5) { setNotice("每条备忘最多添加 5 个标签。"); return; }
    const next = { ...draft, tags: [...draft.tags, tagInput.trim()] };
    tagRef.current = ""; setTagInput(""); changeDraft(next);
  }

  function insertMarkdown(before: string, after = "", sample = "文字") {
    if (operationRef.current) return;
    if (!draft) return;
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? draft.body.length;
    const end = textarea?.selectionEnd ?? draft.body.length;
    const selected = draft.body.slice(start, end) || sample;
    const nextBody = `${draft.body.slice(0, start)}${before}${selected}${after}${draft.body.slice(end)}`;
    if (nextBody.length > maxBodyLength) { setNotice("正文最多 6000 字，请先删减一点内容。"); return; }
    changeDraft({ ...draft, body: nextBody });
    if (mode === "preview") setMode("edit");
    requestAnimationFrame(() => { bodyRef.current?.focus(); bodyRef.current?.setSelectionRange(start + before.length, start + before.length + selected.length); });
  }

  return <>
    {(notice || deleted || storageFailed) && <div className={styles.notice} role="status"><span>{storageFailed ? "浏览器存储暂时不可用，未保存内容仅在当前页面暂存。请点击保存并确认账号同步成功后再关闭。" : notice}</span>{deleted && <button type="button" onClick={undoDelete} disabled={busy || data.notes.length >= maxMemos}>撤销删除 ↶</button>}</div>}
    <div className="tool-panel-tabs tool-mobile-tabs" role="group" aria-label="备忘视图">{[["editor", "编辑备忘"], ["list", "纸页目录"]].map(([key, label]) => <button type="button" key={key} aria-pressed={mobileView === key} onClick={() => setMobileView(key)}>{label}</button>)}</div>
    <div className={styles.workspace} data-mobile-view={mobileView}>
      <aside className={styles.library} aria-label="备忘目录">
        <div className={styles.libraryHeading}><h2>纸页目录<span>{data.notes.length.toString().padStart(2, "0")}</span></h2><button type="button" className={styles.newButton} onClick={newMemo} disabled={busy || data.notes.length >= maxMemos} aria-label="新建备忘">＋</button></div>
        <label className={styles.search}><span className={styles.visuallyHidden}>搜索标题、正文或标签</span><input type="search" placeholder="找一段想法、一个关键词…" value={query} onChange={(event) => setQuery(event.target.value)} /><span aria-hidden="true">⌕</span></label>
        <div className={styles.filterRow}><label><span className={styles.visuallyHidden}>按颜色筛选</span><select value={color} onChange={(event) => setColor(event.target.value as MemoColor | "all")}><option value="all">所有颜色</option>{Object.entries(memoColors).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}</select></label><label><span className={styles.visuallyHidden}>备忘排序</span><select value={sort} onChange={(event) => setSort(event.target.value as MemoSort)}><option value="updated">最近更新</option><option value="created">最近创建</option><option value="title">标题顺序</option></select></label></div>
        <div className={styles.noteList}>{filtered.map((memo) => <button type="button" key={memo.id} className={styles.noteCard} aria-pressed={draft?.id === memo.id} disabled={busy} onClick={() => selectMemo(memo)} style={{ "--note-color": memoColors[memo.color].value, "--note-surface": memoColors[memo.color].surface } as CSSProperties}><div className={styles.noteMeta}><span>{memo.pinned ? "↟ 置顶" : memoColors[memo.color].label}</span><time dateTime={memo.updatedAt}>{dateLabel(memo.updatedAt)}</time></div><h3>{memo.title || "未命名备忘"}</h3><p>{memoExcerpt(memo.body) || "这一页还留着空白。"}</p>{memo.tags.length > 0 && <div className={styles.cardTags}>{memo.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}<span className={styles.cardArrow} aria-hidden="true">编辑</span></button>)}</div>
        {!filtered.length && <div className={styles.listEmpty}><span aria-hidden="true">▱</span><p>{data.notes.length ? "还没有找到这段想法。" : "第一张纸页，等你落笔。"}</p>{data.notes.length > 0 && <button type="button" onClick={() => { setQuery(""); setColor("all"); }}>清除筛选</button>}</div>}
      </aside>

      <section className={styles.editor} ref={editorRef} aria-label="备忘编辑器" aria-busy={busy} style={draft ? { "--note-color": memoColors[draft.color].value, "--note-surface": memoColors[draft.color].surface } as CSSProperties : undefined}>
        {!draft ? <div className={styles.emptyEditor}><PaperArt /><p data-tool-kicker className={styles.eyebrow}>A BLANK PAGE IS A GOOD START.</p><h2>写下来，<br /><span>就不会溜走。</span></h2><p>灵感、随手记、还没整理好的念头。<br />这里不要求完整，也不用急着分类。</p><button type="button" className={styles.primary} onClick={newMemo} disabled={busy || data.notes.length >= maxMemos}>写一条备忘 </button></div>
          : <fieldset className={styles.editorInner} disabled={busy}>
            <div className={styles.editorTop}><span className={styles.editorState}>{original ? "我的纸页" : "新的一页"}<i />{busy ? "正在保存…" : dirty ? "有未保存内容" : original ? "已保存" : "直接开始写"}</span><div className={styles.editorTopActions}><button type="button" aria-pressed={draft.pinned} onClick={() => changeDraft({ ...draft, pinned: !draft.pinned })}>{draft.pinned ? "↟ 已置顶" : "↟ 置顶"}</button><button type="button" onClick={duplicateDraft} disabled={data.notes.length >= maxMemos}>另存一份</button></div></div>
            <label className={styles.titleLabel}><span className={styles.visuallyHidden}>备忘标题</span><input aria-label="备忘标题" ref={titleRef} className={styles.titleInput} maxLength={80} value={draft.title} placeholder="标题（可不填）" onChange={(event) => changeDraft({ ...draft, title: event.target.value })} /></label>
            <details className={styles.appearance}><summary>纸页颜色与标签</summary><div className={styles.colorChoices} role="group" aria-label="纸页颜色">{Object.entries(memoColors).map(([key, option]) => <button type="button" key={key} aria-label={`${option.label}纸页`} aria-pressed={draft.color === key} title={option.label} onClick={() => changeDraft({ ...draft, color: key as MemoColor })} style={{ "--swatch": option.value } as CSSProperties}><span aria-hidden="true">{draft.color === key ? "✓" : ""}</span></button>)}<span>{memoColors[draft.color].label}</span></div>
            <div className={styles.tagRow}>{draft.tags.map((tag) => <button type="button" key={tag} className={styles.tagChip} onClick={() => changeDraft({ ...draft, tags: draft.tags.filter((item) => item !== tag) })} aria-label={`移除标签${tag}`}>#{tag}<span aria-hidden="true">×</span></button>)}<label className={styles.tagInput}><span className={styles.visuallyHidden}>新标签</span><input maxLength={20} value={tagInput} placeholder={draft.tags.length >= 5 ? "已满 5 个标签" : "+ 标签，按回车加入"} disabled={draft.tags.length >= 5} onChange={(event) => { if (operationRef.current) return; tagRef.current = event.target.value; setTagInput(event.target.value); remember(draft, event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} /></label>{tagInput.trim() && <button type="button" className={styles.addTag} onClick={addTag}>加入</button>}</div>
            </details>
            <div className={styles.writingTools}><div className={styles.markdownTools} role="group" aria-label="插入 Markdown"><button type="button" onClick={() => insertMarkdown("## ", "", "小标题")} title="插入二级标题">H₂</button><button type="button" onClick={() => insertMarkdown("**", "**")} title="插入粗体"><b>B</b></button><button type="button" onClick={() => insertMarkdown("*", "*")} title="插入斜体"><i>I</i></button><button type="button" onClick={() => insertMarkdown("\n- ", "", "列表项")} title="插入列表">☷</button><button type="button" onClick={() => insertMarkdown("\n> ", "", "一段引用")} title="插入引用">❞</button><button type="button" onClick={() => insertMarkdown("[", "](https://)", "链接文字")} title="插入链接">链接</button><button type="button" onClick={() => insertMarkdown("\n```\n", "\n```\n", "代码")} title="插入代码">&lt;/&gt;</button></div><div className={styles.modeSwitch} role="group" aria-label="编辑视图">{([["edit", "编辑"], ["split", "对照"], ["preview", "预览"]] as const).map(([key, label]) => <button type="button" key={key} aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}</div></div>
            <div className={`${styles.panes} ${styles[mode]}`}>
              {mode !== "preview" && <div className={styles.writePane}><div className={styles.paneLabel}><span>MARKDOWN</span><span>{draft.body.length} / {maxBodyLength}</span></div><label><span className={styles.visuallyHidden}>备忘正文</span><textarea aria-label="备忘正文" ref={bodyRef} maxLength={maxBodyLength} value={draft.body} placeholder={"从脑海里，搬一点东西到这里。\n\n支持 Markdown，也支持公式。"} onChange={(event) => changeDraft({ ...draft, body: event.target.value })} spellCheck={false} /></label></div>}
              {mode !== "edit" && <div className={styles.previewPane}><div className={styles.paneLabel}><span>PREVIEW</span><span>纸上的样子</span></div><div className={`${styles.markdown} prose`}>{draft.body.trim() ? <MarkdownContent>{draft.body}</MarkdownContent> : <p className={styles.previewPlaceholder}>文字落在这里，<br />会慢慢有自己的样子。</p>}</div></div>}
            </div>
            <div className={styles.editorBottom}><div className={styles.saveActions}><button type="button" className={styles.primary} onClick={() => runOperation(() => saveCurrent())}>保存备忘 </button><span>Ctrl / ⌘ + S</span></div><button type="button" className={styles.deleteButton} onClick={() => removeMemo(draft)}>{original ? "删除备忘" : "移除草稿"}</button></div>
            <p className={styles.draftHint}>切换备忘时自动保存。未保存内容会留作本机草稿，刷新后可继续编辑。</p>
            {original && original.updatedAt !== draft.updatedAt && !sameMemoContent(original, draft) && <div className={styles.conflict}><p>已保存的版本有更新。当前草稿仍为你保留。</p><button type="button" onClick={duplicateDraft}>将草稿另存一份</button><button type="button" onClick={() => { if (operationRef.current) return; draftRef.current = original; updateDraft(original); tagRef.current = ""; setTagInput(""); remember(original, ""); setNotice("已读取保存的版本。"); }}>读取已保存内容</button></div>}
          </fieldset>}
      </section>
    </div>
  </>;
}
