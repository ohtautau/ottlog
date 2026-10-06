"use client";

import ToolNavigation from "@/components/tool-navigation";
import ToolDataTransfer from "@/components/tool-data-transfer";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import ToolCalendar from "@/components/tool-calendar";
import { localDay, monthDays } from "@/lib/tool-dates";
import { toolId } from "@/lib/tool-id";
import { initialTodoState, normalizeTodoState, todoColors, todoQuadrant, todoQuadrants, type Todo, type TodoCategory, type TodoState } from "@/lib/todo-data";
import { usePersonalToolState } from "@/lib/use-personal-tool-state";
import styles from "./todos.module.css";
import TaskDetails from "./task-details";
import useTaskDrag, { type TaskDrop } from "./use-task-drag";

type View = "matrix" | "list" | "calendar" | "statistics";
type Undo = { task?: Todo; category?: TodoCategory; taskIds?: string[]; message: string };
const viewNames: Record<View, string> = { matrix: "四象限", list: "列表", calendar: "日历", statistics: "统计" };
const dateLabel = (date: string) => date ? `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日` : "未设日期";
const daysAgo = (today: string, offset: number) => { const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() - offset); return localDay(date); };

export default function TodoExperience() {
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState("todos", initialTodoState);
  const state = normalizeTodoState(value);
  const [view, setView] = useState<View>("matrix");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [completion, setCompletion] = useState("open");
  const [priority, setPriority] = useState("all");
  const [due, setDue] = useState("all");
  const [sort, setSort] = useState("manual");
  const [movingTask, setMovingTask] = useState("");
  const [today, setToday] = useState("");
  const [month, setMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [editingCategory, setEditingCategory] = useState<TodoCategory | null>(null);
  const [defaults, setDefaults] = useState({ important: true, urgent: false });
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState("");
  const [editorError, setEditorError] = useState("");
  const [undo, setUndo] = useState<Undo | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const categoryEditor = useRef<HTMLFormElement>(null);
  const locatedTask = useRef("");
  const taskDrag = useTaskDrag(moveTask);

  useEffect(() => {
    const update = () => setToday(localDay());
    update();
    const frame = requestAnimationFrame(() => { const day = localDay(); setMonth(day.slice(0, 7)); setSelectedDate(day); });
    const interval = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { cancelAnimationFrame(frame); window.clearInterval(interval); window.removeEventListener("focus", update); };
  }, []);
  useEffect(() => {
    const reset = () => { setUndo(null); setMessage(""); setEditing(null); setEditingCategory(null); dialog.current?.close(); };
    window.addEventListener("ottlog-session", reset);
    return () => window.removeEventListener("ottlog-session", reset);
  }, []);
  useEffect(() => { if (!ready) dialog.current?.close(); }, [ready]);
  useEffect(() => {
    if (!ready) return;
    const id = new URLSearchParams(window.location.search).get("task");
    if (!id || locatedTask.current === id) return;
    const timer = window.setTimeout(() => {
      locatedTask.current = id;
      const task = normalizeTodoState(value).tasks.find(item => item.id === id);
      if (!task) { setMessage("这件待办已删除，或不在当前账号中。"); return; }
      setView("list"); setCompletion("all"); setCategory("all"); setPriority("all"); setDue("all"); setSearch(task.title);
      setEditing(task); setFormKey(key => key + 1); dialog.current?.showModal();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready, value]);

  function updateState(update: (previous: TodoState) => TodoState) {
    setValue(previous => update(normalizeTodoState(previous)));
  }
  function moveTask(id: string, target: TaskDrop) {
    updateState(old => {
      const task = old.tasks.find(item => item.id === id);
      if (!task) return old;
      const quadrant = todoQuadrants.find(item => item.id === target.quadrant);
      const next = old.tasks.filter(item => item.id !== id);
      const moved = { ...task, ...(quadrant ? { important: quadrant.important, urgent: quadrant.urgent } : {}), updatedAt: new Date().toISOString() };
      const index = target.taskId ? next.findIndex(item => item.id === target.taskId) : -1;
      next.splice(index < 0 ? next.length : index + (target.after ? 1 : 0), 0, moved);
      return { ...old, tasks: next };
    });
    setSort("manual"); setMovingTask("");
    const quadrant = todoQuadrants.find(item => item.id === target.quadrant);
    setMessage(quadrant ? `已移入「${quadrant.title}」，采用手动排序。` : "顺序已保存，采用手动排序。");
  }
  function nudgeTask(task: Todo, offset: number) {
    const items = view === "matrix" ? filtered.filter(item => todoQuadrant(item).id === todoQuadrant(task).id) : filtered;
    const index = items.findIndex(item => item.id === task.id), target = items[index + offset];
    if (target) moveTask(task.id, { quadrant: "", taskId: target.id, after: offset > 0 });
  }
  function openEditor(task: Todo | null, quadrant?: typeof todoQuadrants[number]) {
    setEditing(task); setDefaults({ important: quadrant?.important ?? true, urgent: quadrant?.urgent ?? false });
    setEditorError("");
    setFormKey(key => key + 1);
    dialog.current?.showModal();
  }
  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) { setEditorError("写一个待办名称，不能只有空格。"); return; }
    if (!editing && state.tasks.length >= 200) { setEditorError("最多保存 200 件待办，可以先删除不再需要的记录。"); return; }
    if (editing && !state.tasks.some(task => task.id === editing.id)) { setEditorError("这件待办已被删除，请关闭窗口后重新添加。"); return; }
    const subtasks = JSON.parse(String(data.get("subtasks") ?? "[]")) as NonNullable<Todo["subtasks"]>;
    if (subtasks.some(item => !item.title.trim())) { setEditorError("子任务名称不能只有空格。"); return; }
    const stamp = new Date().toISOString();
    const task: Todo = {
      ...editing,
      id: editing?.id ?? toolId(), title, description: String(data.get("description") ?? "").trim(),
      categoryId: String(data.get("categoryId") ?? ""), important: data.get("important") === "on", urgent: data.get("urgent") === "on",
      dueDate: String(data.get("dueDate") ?? ""), completedAt: editing?.completedAt ?? null,
      createdAt: editing?.createdAt ?? stamp, updatedAt: stamp,
      subtasks: subtasks.map(item => ({ ...item, title: item.title.trim() })),
    };
    updateState(old => ({ ...old, tasks: editing ? old.tasks.map(item => item.id === task.id ? task : item) : [task, ...old.tasks] }));
    setMessage(editing ? "修改已保存。" : "新待办已加入。"); setUndo(null); dialog.current?.close();
  }
  function toggleTask(task: Todo) {
    const stamp = new Date().toISOString();
    updateState(old => ({ ...old, tasks: old.tasks.map(item => item.id === task.id ? { ...item, completedAt: item.completedAt ? null : stamp, updatedAt: stamp } : item) }));
    setMessage(task.completedAt ? "已重新打开这件事。" : "做完一件，记下这一小步。");
  }
  function deleteTask(task: Todo) {
    updateState(old => ({ ...old, tasks: old.tasks.filter(item => item.id !== task.id) }));
    setUndo({ task, message: `已删除「${task.title}」` }); setMessage("");
  }
  function restore() {
    if (!undo) return;
    if (undo.task && state.tasks.length >= 200 || undo.category && state.categories.length >= 30) { setUndo(null); setMessage("当前记录数量已达上限，暂时无法恢复。"); return; }
    updateState(old => ({
      ...old,
      categories: undo.category && !old.categories.some(item => item.id === undo.category!.id) && old.categories.length < 30 ? [...old.categories, undo.category] : old.categories,
      tasks: undo.task ? old.tasks.some(item => item.id === undo.task!.id) || old.tasks.length >= 200 ? old.tasks : [{ ...undo.task, categoryId: old.categories.some(item => item.id === undo.task!.categoryId) ? undo.task.categoryId : "" }, ...old.tasks]
        : old.tasks.map(item => undo.category && undo.taskIds?.includes(item.id) && !item.categoryId ? { ...item, categoryId: undo.category.id } : item),
    }));
    setUndo(null); setMessage("已撤销删除。");
  }
  function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget), name = String(data.get("name") ?? "").trim();
    if (!name) return;
    if (state.categories.some(item => item.id !== editingCategory?.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { setMessage("已有同名分类，请换个名称。"); return; }
    if (!editingCategory && state.categories.length >= 30) { setMessage("最多保存 30 个分类。"); return; }
    const next: TodoCategory = { id: editingCategory?.id ?? toolId(), name, color: String(data.get("color")) };
    updateState(old => ({ ...old, categories: editingCategory ? old.categories.map(item => item.id === next.id ? next : item) : [...old.categories, next] }));
    setEditingCategory(null); event.currentTarget.reset(); setMessage("分类已保存。");
  }
  function deleteCategory(item: TodoCategory) {
    const taskIds = state.tasks.filter(task => task.categoryId === item.id).map(task => task.id);
    updateState(old => ({ ...old, categories: old.categories.filter(c => c.id !== item.id), tasks: old.tasks.map(task => task.categoryId === item.id ? { ...task, categoryId: "", updatedAt: new Date().toISOString() } : task) }));
    if (category === item.id) setCategory("all");
    setEditingCategory(null); setUndo({ category: item, taskIds, message: `已删除「${item.name}」分类，原待办保留在未分类。` }); setMessage("");
  }

  const filtered = state.tasks.filter(task => {
    const query = search.trim().toLocaleLowerCase();
    const name = state.categories.find(item => item.id === task.categoryId)?.name ?? "未分类";
    return (!query || `${task.title} ${task.description} ${name} ${task.subtasks?.map(item => item.title).join(" ") ?? ""}`.toLocaleLowerCase().includes(query))
      && (category === "all" || task.categoryId === category)
      && (completion === "all" || (completion === "done" ? !!task.completedAt : !task.completedAt))
      && (priority === "all" || todoQuadrant(task).id === priority)
      && (due === "all" || (due === "today" ? task.dueDate === today : due === "overdue" ? !!task.dueDate && task.dueDate < today && !task.completedAt : !task.dueDate));
  }).sort((a, b) => sort === "manual" ? 0 : sort === "title" ? a.title.localeCompare(b.title, "zh-CN") : sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : sort === "due" ? (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || b.createdAt.localeCompare(a.createdAt) : todoQuadrants.findIndex(q => q.id === todoQuadrant(a).id) - todoQuadrants.findIndex(q => q.id === todoQuadrant(b).id) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const open = state.tasks.filter(task => !task.completedAt);
  const completed = state.tasks.filter(task => task.completedAt);
  const overdue = open.filter(task => task.dueDate && task.dueDate < today);
  const completedToday = completed.filter(task => localDay(new Date(task.completedAt!)) === today);
  const completionRate = state.tasks.length ? Math.round(completed.length / state.tasks.length * 100) : 0;
  const counts: Record<string, number> = {};
  filtered.forEach(task => { if (task.dueDate) counts[task.dueDate] = (counts[task.dueDate] ?? 0) + 1; });
  const week = today ? Array.from({ length: 7 }, (_, index) => daysAgo(today, 6 - index)) : [];
  const weekCounts = week.map(day => completed.filter(task => localDay(new Date(task.completedAt!)) === day).length);
  const maxWeek = Math.max(1, ...weekCounts);
  const inMonth = month ? monthDays(month) : [];
  const monthlyDone = completed.filter(task => inMonth.includes(localDay(new Date(task.completedAt!))));
  const monthlyDue = state.tasks.filter(task => inMonth.includes(task.dueDate));

  function renderTask(task: Todo) {
    const taskCategory = state.categories.find(item => item.id === task.categoryId);
    const isOverdue = !task.completedAt && task.dueDate && task.dueDate < today;
    return <article className={styles.task} data-todo-id={task.id} data-done={!!task.completedAt} data-dragging={taskDrag.drag?.id === task.id} data-drop={taskDrag.drag?.target?.taskId === task.id && taskDrag.drag.id !== task.id ? taskDrag.drag.target.after ? "after" : "before" : undefined} key={task.id} onClick={event => { if (!(event.target as HTMLElement).closest("button,a,input,select,label")) openEditor(task); }}>
      <div className={styles.taskTop}>
        <button className={styles.dragHandle} aria-label={`拖动待办：${task.title}`} title="拖动排序或移入其他象限" onPointerDown={event => taskDrag.begin(event, task.id, task.title)} onPointerMove={taskDrag.move} onPointerUp={event => taskDrag.finish(event)} onPointerCancel={event => taskDrag.finish(event, true)} onLostPointerCapture={event => taskDrag.finish(event, true)} onClick={() => { if (taskDrag.shouldClick()) setMovingTask(id => id === task.id ? "" : task.id); }}>⠿</button>
        <button className={styles.check} aria-label={`${task.completedAt ? "重新打开" : "完成"}：${task.title}`} aria-pressed={!!task.completedAt} onClick={() => toggleTask(task)}>{task.completedAt ? "✓" : ""}</button>
        <button className={styles.taskTitle} onClick={() => openEditor(task)} title="查看任务详情">{task.title}</button>
      </div>
      {task.description && <p data-tool-description className={styles.description}>{task.description}</p>}
      <div className={styles.taskMeta}>
        <span className={styles.categoryTag} style={{ "--category": taskCategory?.color ?? "#9badc1" } as CSSProperties}>{taskCategory?.name ?? "未分类"}</span>
        {task.dueDate && <time dateTime={task.dueDate} data-overdue={!!isOverdue}>{isOverdue ? "已逾期 · " : ""}{dateLabel(task.dueDate)}</time>}
        {view !== "matrix" && <span className={styles.priorityLabel} style={{ color: todoQuadrant(task).color }}>{todoQuadrant(task).caption}</span>}
        {!!task.subtasks?.length && <span className={styles.subtaskCount}>☑ {task.subtasks.filter(item => item.completed).length} / {task.subtasks.length} 步</span>}
      </div>
      <div className={styles.taskActions}>
        {!task.completedAt && <Link href={`/pomodoro?task=${encodeURIComponent(task.id)}`}>◷ 开始专注</Link>}
        <button onClick={() => openEditor(task)}>编辑</button>
        <button aria-expanded={movingTask === task.id} onClick={() => setMovingTask(id => id === task.id ? "" : task.id)}>移动</button>
        <button className={styles.delete} onClick={() => deleteTask(task)} aria-label={`删除：${task.title}`}>删除</button>
      </div>
      {movingTask === task.id && <div className={styles.movePanel} aria-label={`移动待办：${task.title}`}><div><button onClick={() => nudgeTask(task, -1)}>↑ 上移</button><button onClick={() => nudgeTask(task, 1)}>↓ 下移</button></div><label>移到象限<select aria-label={`移动${task.title}到象限`} value={todoQuadrant(task).id} onChange={event => moveTask(task.id, { quadrant: event.target.value, taskId: "", after: true })}>{todoQuadrants.map(q => <option key={q.id} value={q.id}>{q.title} · {q.caption}</option>)}</select></label></div>}
    </article>;
  }
  const activeFilters = !!search.trim() || category !== "all" || priority !== "all" || due !== "all" || completion !== "open" || sort !== "manual";

  return <div className={styles.page} data-tool-page data-tool-workspace="todos">
    <ToolNavigation />
    <ToolDataTransfer key={owner} tool="todos" value={value} setValue={setValue} ready={ready} status={status} owner={owner} onImported={() => { setSearch(""); setCategory("all"); setCompletion("open"); setPriority("all"); setDue("all"); setSort("manual"); setUndo(null); setEditingCategory(null); setManage(false); setMessage(""); }} />
    <header data-tool-header className={styles.header}>
      <div><p data-tool-kicker>OTTLOG / NEXT STEP</p><h1>待办<span>清单。</span></h1><p data-tool-description className={styles.intro}>分清轻重缓急，让下一步清楚一点。</p></div>
      <button className={styles.add} disabled={!ready} onClick={() => openEditor(null)}>新增待办 <span>＋</span></button>
    </header>
    <div className={styles.commandBar}>
      <div className={styles.views} role="group" aria-label="待办视图">{(Object.keys(viewNames) as View[]).map(name => <button key={name} aria-pressed={view === name} onClick={() => setView(name)}>{viewNames[name]}</button>)}</div>
    </div>

    {view !== "statistics" && <details className={styles.filterDisclosure}>
      <summary><strong>整理我的待办</strong><small>{activeFilters ? `已调整条件 · ${filtered.length} 件` : "搜索、筛选与排序"}</small><span aria-hidden="true">＋</span></summary>
      <section className={styles.filterPanel} aria-label="搜索和筛选待办">
      <div className={styles.searchRow}><label className={styles.search}><span aria-hidden="true">⌕</span><input type="search" aria-label="搜索待办" placeholder="搜索标题、内容、子任务或分类" value={search} onChange={event => setSearch(event.target.value)} /></label><button className={styles.manage} aria-expanded={manage} onClick={() => setManage(show => !show)}>管理分类 {manage ? "−" : "+"}</button></div>
      <div className={styles.filters}>
        <label>分类<select aria-label="分类" value={category} onChange={event => setCategory(event.target.value)}><option value="all">全部分类</option><option value="">未分类</option>{state.categories.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>状态<select aria-label="状态" value={completion} onChange={event => setCompletion(event.target.value)}><option value="open">未完成</option><option value="done">已完成</option><option value="all">全部状态</option></select></label>
        <label>轻重缓急<select aria-label="轻重缓急" value={priority} onChange={event => setPriority(event.target.value)}><option value="all">全部象限</option>{todoQuadrants.map(q => <option key={q.id} value={q.id}>{q.caption}</option>)}</select></label>
        <label>截止日期<select aria-label="截止日期" value={due} onChange={event => setDue(event.target.value)}><option value="all">全部日期</option><option value="today">今天截止</option><option value="overdue">已逾期</option><option value="none">未设日期</option></select></label>
        <label>排序<select aria-label="排序" value={sort} onChange={event => setSort(event.target.value)}><option value="manual">手动拖动排序</option><option value="priority">优先级</option><option value="due">截止日期最近</option><option value="newest">最新创建</option><option value="oldest">最早创建</option><option value="title">标题名称</option></select></label>
      </div>
      <div className={styles.filterFoot}><span>{filtered.length} 件符合条件</span>{activeFilters && <button onClick={() => { setSearch(""); setCategory("all"); setPriority("all"); setDue("all"); setCompletion("open"); setSort("manual"); }}>重置筛选 ×</button>}</div>
    </section>

    {manage && <section className={styles.categoryManager} aria-label="管理待办分类">
      <div><h2>给事情分个类。</h2><p>删除分类会保留待办，并移入未分类。</p></div>
      <div className={styles.categoryRows}>{state.categories.map(item => <div key={item.id}><span style={{ color: item.color }}>●</span><strong>{item.name}</strong><small>{state.tasks.filter(task => task.categoryId === item.id).length} 件</small><button disabled={!ready} onClick={() => { setEditingCategory(item); requestAnimationFrame(() => categoryEditor.current?.querySelector("input")?.focus()); }}>改名 / 颜色</button><button disabled={!ready} aria-label={`删除分类：${item.name}`} onClick={() => deleteCategory(item)}>删除</button></div>)}</div>
      <form className={styles.categoryEditor} key={editingCategory?.id ?? "new-category"} onSubmit={saveCategory} ref={categoryEditor}>
        <label>{editingCategory ? "分类名称" : "新分类"}<input name="name" defaultValue={editingCategory?.name ?? ""} placeholder="例如：个人项目" maxLength={30} required /></label>
        <fieldset><legend>分类颜色</legend>{todoColors.map((color, index) => <label key={color} style={{ "--category": color } as CSSProperties}><input type="radio" name="color" value={color} defaultChecked={editingCategory ? editingCategory.color === color || !todoColors.includes(editingCategory.color) && index === 0 : index === 0} aria-label={["蓝色", "绿色", "奶油色", "珊瑚色", "紫色", "青色"][index]} /><span /></label>)}</fieldset>
        <button disabled={!ready} type="submit">{editingCategory ? "保存分类" : "添加分类"} +</button>{editingCategory && <button type="button" onClick={() => setEditingCategory(null)}>取消</button>}
      </form>
    </section>}

    </details>}

    <div className={styles.notice} data-empty={!undo && !message} role="status">{undo ? <><span>{undo.message}</span><button onClick={restore}>撤销删除 ↶</button><button aria-label="关闭删除提示" onClick={() => setUndo(null)}>×</button></> : message}</div>
    <div className={styles.viewPanel}>
    {!ready ? <div className={styles.empty}><h2>正在打开你的待办。</h2><p>{status}</p><button onClick={retry}>重新读取 ↻</button></div> : <>
      {view === "matrix" && <section className={styles.matrix} aria-label="四象限待办">{todoQuadrants.map((q, index) => {
        const items = filtered.filter(task => task.important === q.important && task.urgent === q.urgent);
        return <section className={styles.quadrant} data-quadrant={q.id} data-drag-over={taskDrag.drag?.target?.quadrant === q.id} key={q.id} style={{ "--q-color": q.color } as CSSProperties} aria-label={q.caption}>
          <header><div><p><span>0{index + 1}</span>{q.caption}</p><h2>{q.title}<span>{items.length}</span></h2></div><i aria-hidden="true">{q.symbol}</i></header>
          <div className={styles.quadrantTasks} data-todo-scroll tabIndex={items.length ? 0 : undefined} role="group" aria-label={`${q.caption}任务`}>{items.length ? items.map(renderTask) : <div className={styles.quadrantEmpty}><span aria-hidden="true">{q.symbol}</span><p>{activeFilters || state.tasks.length ? "这个象限暂时没有符合条件的事。" : ["有截止时间，也值得你认真对待。", "给重要的事，留出不被打扰的时间。", "尽快处理，或者找人一起完成。", "先记在这里，之后再做决定。"][index]}</p></div>}</div>
          <button className={styles.quadrantAdd} onClick={() => openEditor(null, q)}>加入一件事 <span>＋</span></button>
        </section>;
      })}</section>}
      {view === "list" && <section className={styles.list} aria-label="待办列表">{filtered.length ? filtered.map(renderTask) : <div className={styles.empty}><span>→</span><h2>这里还空着。</h2><p>{state.tasks.length ? "换一个筛选条件，再看看。" : "把脑海中的下一件事放下来。"}</p><button onClick={() => openEditor(null)}>新增待办 +</button></div>}</section>}
      {view === "calendar" && month && <section className={styles.calendarView}>
        <div><ToolCalendar month={month} onMonthChange={setMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} counts={counts} label="件待办" /><p className={styles.calendarHint}>按截止日期显示当前筛选中的待办；点击日期查看当天安排。</p></div>
        <div className={styles.agenda}><header><p data-tool-kicker className={styles.kicker}>YOUR DAY, AT A GLANCE</p><h2>{dateLabel(selectedDate)}</h2><span>{filtered.filter(task => task.dueDate === selectedDate).length} 件待办</span></header>{filtered.filter(task => task.dueDate === selectedDate).map(renderTask)}{!filtered.some(task => task.dueDate === selectedDate) && <p className={styles.agendaEmpty}>这一天，还没有符合条件的安排。</p>}<button className={styles.quadrantAdd} onClick={() => openEditor(null)}>为这天添加 <span>＋</span></button></div>
        <div className={styles.unscheduled}><h3>未设日期 <span>{filtered.filter(task => !task.dueDate).length}</span></h3><div>{filtered.filter(task => !task.dueDate).map(renderTask)}</div>{!filtered.some(task => !task.dueDate) && <p>没有未设日期的待办。</p>}</div>
      </section>}
      {view === "statistics" && <section className={styles.statistics} aria-label="待办统计">
        <div className={styles.statsHeader}><h2>每一步，都留下痕迹。</h2><p>统计全部待办，包含已完成事项。删除的待办不计入统计。</p></div>
        <div className={styles.weekChart}><header><div><p data-tool-kicker className={styles.kicker}>LAST 7 DAYS</p><h3>最近七天</h3></div><strong>{weekCounts.reduce((sum, count) => sum + count, 0)}<small> 件完成</small></strong></header><div className={styles.bars}>{week.map((day, index) => <div key={day}><strong>{weekCounts[index]}</strong><div><i style={{ height: `${weekCounts[index] / maxWeek * 100}%` }} /></div><span>{dateLabel(day).replace(" 月 ", "/").replace(" 日", "")}</span></div>)}</div></div>
        <div className={styles.distribution}><p data-tool-kicker className={styles.kicker}>WHAT IS ON YOUR MIND</p><h3>未完成 · 象限分布</h3>{todoQuadrants.map(q => { const count = open.filter(task => task.important === q.important && task.urgent === q.urgent).length; return <div key={q.id}><span>{q.title}</span><strong>{count}</strong><i style={{ "--q-color": q.color, "--share": `${count / Math.max(1, open.length) * 100}%` } as CSSProperties} /></div>; })}</div>
        <div className={styles.monthStats}><label>统计月份<input type="month" aria-label="统计月份" value={month} onChange={event => { if (event.target.value) setMonth(event.target.value); }} /></label><div><strong>{monthlyDone.length}</strong><span>本月完成</span></div><div><strong>{monthlyDue.length}</strong><span>本月截止</span></div><div><strong>{monthlyDue.filter(task => task.completedAt).length}</strong><span>其中已完成</span></div></div>
        <div className={styles.categoryStats}><h3>分类进度</h3>{[...state.categories, { id: "", name: "未分类", color: "#9badc1" }].map(item => { const tasks = state.tasks.filter(task => task.categoryId === item.id); const count = tasks.filter(task => task.completedAt).length; return <div key={item.id}><span style={{ color: item.color }}>●</span><strong>{item.name}</strong><span>{count} / {tasks.length} 件完成</span><i style={{ "--q-color": item.color, "--share": `${count / Math.max(1, tasks.length) * 100}%` } as CSSProperties} /></div>; })}</div>
      </section>}
    </>}
    </div>
    <section className={styles.overview} aria-label="待办概览">
      <div><span>正在等待</span><strong>{String(open.length).padStart(2, "0")}</strong><small>件未完成</small></div>
      <div data-tone="green"><span>今天完成</span><strong>{String(completedToday.length).padStart(2, "0")}</strong><small>每一步都算数</small></div>
      <div data-tone="warm"><span>需要留意</span><strong>{String(overdue.length).padStart(2, "0")}</strong><small>件已逾期</small></div>
      <div><span>累计完成</span><strong>{completionRate}<small>%</small></strong><small>{completed.length} / {state.tasks.length} 件</small><i style={{ "--progress": `${completionRate}%` } as CSSProperties} aria-hidden="true" /></div>
    </section>
    <p className={styles.storage}>{status}<button onClick={retry}>重试同步 ↻</button></p>

    {taskDrag.drag && <div className={styles.dragGhost} aria-hidden="true" style={{ left: Math.max(10, Math.min(taskDrag.drag.x + 14, typeof window === "undefined" ? 0 : window.innerWidth - 220)), top: taskDrag.drag.y + 18 }}>⠿ {taskDrag.drag.title}<small>{taskDrag.drag.target ? "松开以放置" : "拖到另一件事或象限"}</small></div>}
    <dialog className={styles.dialog} ref={dialog} aria-labelledby="todo-editor-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <form key={formKey} onSubmit={saveTask} className={styles.editor}>
        <header><div><p data-tool-kicker className={styles.kicker}>ONE THING AT A TIME</p><h2 id="todo-editor-title">{editing ? "任务详情" : "下一件事"}</h2></div><button type="button" aria-label="关闭待办编辑" onClick={() => dialog.current?.close()}>×</button></header>
        <label>待办名称<input name="title" required maxLength={100} defaultValue={editing?.title ?? ""} placeholder="写下一个具体、可以开始的动作" autoFocus /></label>
        <TaskDetails description={editing?.description ?? ""} subtasks={editing?.subtasks ?? []} />
        <div className={styles.formRow}><label>分类<select name="categoryId" defaultValue={editing?.categoryId ?? (category !== "all" ? category : "")}><option value="">未分类</option>{state.categories.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>截止日期（选填）<input name="dueDate" type="date" min="1900-01-01" max="9999-12-31" defaultValue={editing?.dueDate ?? (view === "calendar" ? selectedDate : "")} /></label></div>
        <fieldset className={styles.priorityChoices}><legend>按轻重缓急，放进合适的象限</legend><label><input type="checkbox" name="important" defaultChecked={editing?.important ?? defaults.important} /><span><strong>重要</strong><small>对我有价值，值得投入</small></span></label><label><input type="checkbox" name="urgent" defaultChecked={editing?.urgent ?? defaults.urgent} /><span><strong>紧急</strong><small>有时间压力，需要尽快处理</small></span></label></fieldset>
        {editorError && <p className={styles.editorError} role="alert">{editorError}</p>}
        <div className={styles.editorActions}><button type="button" onClick={() => dialog.current?.close()}>取消</button><button type="submit" disabled={!ready}>{editing ? "保存修改" : "加入待办"}</button></div>
      </form>
    </dialog>
  </div>;
}
