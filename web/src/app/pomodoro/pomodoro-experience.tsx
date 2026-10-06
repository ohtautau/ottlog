"use client";

import ToolNavigation from "@/components/tool-navigation";
import ToolDataTransfer from "@/components/tool-data-transfer";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import ToolCalendar from "@/components/tool-calendar";
import { localDay } from "@/lib/tool-dates";
import { toolId } from "@/lib/tool-id";
import { initialTodoState, normalizeTodoState } from "@/lib/todo-data";
import { usePersonalToolState } from "@/lib/use-personal-tool-state";
import { durationLabel, finishTimer, initialPomodoroState, normalizePomodoroState, pauseTimer, remainingSeconds, resumeTimer, startTimer, timerModes, type TimerSelection } from "./pomodoro-data";
import TomatoScene from "./tomato-scene";
import styles from "./pomodoro.module.css";

export default function PomodoroExperience() {
  const searchParams = useSearchParams();
  const requestedTask = searchParams.get("task");
  const requestedEvent = searchParams.get("event");
  return <PomodoroWorkspace key={`${requestedTask ?? ""}:${requestedEvent ?? ""}`} requestedTask={requestedTask} requestedEvent={requestedEvent} />;
}

function PomodoroWorkspace({ requestedTask, requestedEvent }: { requestedTask: string | null; requestedEvent: string | null }) {
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState("pomodoro", initialPomodoroState);
  const { value: todoValue, ready: todosReady } = usePersonalToolState("todos", initialTodoState);
  const state = useMemo(() => normalizePomodoroState(value), [value]);
  const todos = useMemo(() => normalizeTodoState(todoValue).tasks, [todoValue]);
  const [panel, setPanel] = useState("timer");
  const [now, setNow] = useState(0);
  const [month, setMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [draft, setDraft] = useState<{ selection: TimerSelection; owner: string } | null>(null);
  const [message, setMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [historyKind, setHistoryKind] = useState("focus");
  const [limit, setLimit] = useState(12);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sceneActive, setSceneActive] = useState(true);
  const announcement = useRef("");
  const sceneRef = useRef<HTMLDivElement>(null);
  const active = state.active;
  const currentMode = active?.mode ?? state.mode;
  const modeInfo = timerModes.find(mode => mode.id === currentMode)!;
  const total = active?.totalSeconds ?? state.settings[currentMode] * 60;
  const remaining = active ? remainingSeconds(active, now || Date.parse(active.startedAt)) : total;
  const progress = active ? 1 - remaining / total : 0;
  const timeLabel = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const queryTask = requestedTask ? todos.find(task => task.id === requestedTask) : null;
  const chosen = draft?.owner === owner ? draft.selection : queryTask ? { taskId: queryTask.id, title: queryTask.title } : requestedEvent ? { taskId: null, title: requestedEvent.trim().slice(0, 100) } : state.selection;
  const setSelection = (selection: TimerSelection) => setDraft({ selection, owner });
  const today = now ? localDay(new Date(now)) : "";
  const focuses = state.sessions.filter(session => session.mode === "focus");
  const todaySessions = focuses.filter(session => localDay(new Date(session.endedAt)) === today);
  const todaySeconds = todaySessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const weekDays = now ? Array.from({ length: 7 }, (_, i) => { const date = new Date(now); date.setDate(date.getDate() - 6 + i); return localDay(date); }) : [];
  const weekTotals = weekDays.map(day => focuses.filter(session => localDay(new Date(session.endedAt)) === day).reduce((sum, session) => sum + session.durationSeconds, 0));
  const totalSeconds = focuses.reduce((sum, session) => sum + session.durationSeconds, 0);
  const weekSeconds = weekTotals.reduce((sum, seconds) => sum + seconds, 0);
  const counts: Record<string, number> = {};
  for (const session of focuses) { const day = localDay(new Date(session.endedAt)); counts[day] = (counts[day] ?? 0) + 1; }
  const filteredSessions = state.sessions.filter(session => (historyKind === "all" || (historyKind === "focus" ? session.mode === "focus" : session.mode !== "focus")) && (showAll || localDay(new Date(session.endedAt)) === selectedDate));
  const linkedExists = !active?.selection.taskId || todos.some(task => task.id === active.selection.taskId);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const frame = requestAnimationFrame(() => { const date = new Date(); setMonth(localDay(date).slice(0, 7)); setSelectedDate(localDay(date)); update(); });
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update); document.addEventListener("visibilitychange", update);
    return () => { cancelAnimationFrame(frame); window.clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);

  useEffect(() => {
    if (!ready || !active?.running || active.deadline === null || !now || active.deadline > now) return;
    if (announcement.current !== active.id) {
      announcement.current = active.id;
      setMessage(active.mode === "focus" ? "这一轮专注完成了。记录已保存，准备好再开始休息。" : "休息结束。准备好后，再开始下一轮专注。 ");
    }
    setValue(previous => finishTimer(normalizePomodoroState(previous), Date.now()));
  }, [active, now, ready, setValue]);

  useEffect(() => {
    let inView = true;
    const update = () => setSceneActive(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    if (sceneRef.current) observer.observe(sceneRef.current);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  function begin() {
    const task = chosen.taskId ? todos.find(item => item.id === chosen.taskId) : null;
    if (state.mode === "focus" && chosen.taskId && !task) { setMessage("这条待办已删除，请重新选择关联事项。 "); return; }
    const linked = state.mode !== "focus" ? state.selection : task ? { taskId: task.id, title: task.title } : { taskId: null, title: chosen.title.trim() };
    const at = Date.now(); setNow(at); setMessage(""); setResetting(false);
    const id = toolId();
    setValue(previous => startTimer(normalizePomodoroState(previous), at, id, linked));
  }
  function togglePause() {
    const at = Date.now(); setNow(at); setResetting(false);
    setValue(previous => { const old = normalizePomodoroState(previous); return old.active?.running ? pauseTimer(old, at) : resumeTimer(old, at); });
  }
  function endEarly() {
    const at = Date.now(); setNow(at); setResetting(false);
    const seconds = active ? active.totalSeconds - remainingSeconds(active, at) : 0;
    setValue(previous => finishTimer(normalizePomodoroState(previous), at, true));
    setMessage(seconds > 0 ? "本轮提前结束，已记录实际投入的时间。" : "本轮已结束，尚未产生计时记录。 ");
  }
  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active) return;
    const fields = new FormData(event.currentTarget);
    setValue(previous => { const old = normalizePomodoroState(previous); return normalizePomodoroState({ ...old, settings: { ...old.settings, ...Object.fromEntries(["focus", "shortBreak", "longBreak", "longEvery"].map(key => [key, Number(fields.get(key))])) } }); });
    setMessage("时间设置已保存，下一轮按新的节奏开始。 ");
  }
  function resetTimer() {
    setValue(previous => { const old = normalizePomodoroState(previous); return { ...old, active: null, mode: old.active?.mode ?? old.mode }; });
    setResetting(false); setMessage("本轮已重置，未计入统计。 ");
  }

  return <div className={styles.page} data-tool-page data-tool-workspace="pomodoro">
    <ToolNavigation />
    <ToolDataTransfer key={owner} tool="pomodoro" value={value} setValue={setValue} ready={ready} status={status} owner={owner} onImported={() => { setMessage(""); setDeleting(null); setResetting(false); }} />
    <header data-tool-header className={styles.heading}>
      <div><p data-tool-kicker className={styles.kicker}>OTTLOG / A LITTLE FOCUS</p><h1>番茄<span>钟。</span></h1><p data-tool-description className={styles.intro}>给一件事，留一段完整的时间。</p></div>
      <div className={styles.today}><span>今天的专注</span><strong>{todaySessions.filter(session => session.completed).length.toString().padStart(2, "0")}<small> 轮</small></strong><span>{durationLabel(todaySeconds)}</span></div>
    </header>
    <div className="tool-panel-tabs" role="group" aria-label="番茄钟视图">{[["timer", "专注计时"], ["statistics", "专注统计"], ["records", "日历与记录"]].map(([key, label]) => <button type="button" key={key} aria-pressed={panel === key} onClick={() => setPanel(key)}>{label}</button>)}</div>
    <div className="tool-workspace-panel" hidden={panel !== "timer"}>
    <section className={styles.stage} data-resting={currentMode !== "focus"} aria-label="番茄计时器">
      <div className={styles.clockPane} ref={sceneRef}>
        <div className={styles.clockTop}><span>{currentMode === "focus" ? "FOCUS ON / 01" : "TAKE A BREATH / 02"}</span><span className={styles.live} data-running={!!active?.running}>{active ? active.running ? "正在计时" : "已暂停" : "准备就绪"}</span></div>
        <div className={styles.clockArt}><TomatoScene progress={progress} running={!!active?.running && sceneActive} resting={currentMode !== "focus"} /><div className={styles.timerFace}><span>{modeInfo.label}</span><strong role="timer" aria-label={`剩余 ${Math.floor(remaining / 60)} 分 ${remaining % 60} 秒`}>{timeLabel}</strong><span>{active ? `已走过 ${Math.round(progress * 100)}%` : "从这一刻开始"}</span></div></div>
        <div className={styles.rounds} aria-label={`每 ${state.settings.longEvery} 轮专注后长休息`}>
          <span>你的节奏</span><div>{Array.from({ length: state.settings.longEvery }, (_, i) => <i key={i} data-filled={i < focuses.filter(session => session.completed).length % state.settings.longEvery} aria-hidden="true" />)}</div><span>{state.settings.longEvery} 轮一歇</span>
        </div>
      </div>
      <div className={styles.controls}>
        <div className={styles.modes} aria-label="计时模式">{timerModes.map(mode => <button key={mode.id} disabled={!ready || !!active} aria-pressed={currentMode === mode.id} onClick={() => { setValue(previous => ({ ...normalizePomodoroState(previous), mode: mode.id })); setMessage(""); }}>{mode.label}</button>)}</div>
        <h2>{currentMode === "focus" ? <>把注意力，<br /><span>放在这里。</span></> : <>停一停，<br /><span>也很好。</span></>}</h2><p className={styles.caption}>{modeInfo.caption}</p>
        {active ? <div className={styles.activeEvent}><span>本轮{currentMode === "focus" ? "关联事项" : "安排"}</span><strong>{currentMode !== "focus" ? modeInfo.label : active.selection.title || "自由专注"}</strong>{active.selection.taskId && <>{linkedExists ? <Link href={`/todos?task=${encodeURIComponent(active.selection.taskId)}`}>查看关联待办</Link> : <small>原待办已删除，本轮名称仍保留。</small>}</>}</div> : currentMode === "focus" ? <div className={styles.assignment}><label>这一轮，想做什么？<select aria-label="关联待办" disabled={!ready || !todosReady} value={chosen.taskId ?? ""} onChange={event => { const task = todos.find(item => item.id === event.target.value); setSelection(task ? { taskId: task.id, title: task.title } : { taskId: null, title: "" }); }}><option value="">自由专注 / 自定义事件</option>{chosen.taskId && !todos.some(task => task.id === chosen.taskId) && <option value={chosen.taskId}>原待办已删除 · 请重新选择</option>}{todos.filter(task => !task.completedAt || task.id === chosen.taskId).map(task => <option key={task.id} value={task.id}>{task.title}{task.completedAt ? "（已完成）" : ""}</option>)}</select></label>{!chosen.taskId && <label className={styles.eventLabel}>事件名称（选填）<input aria-label="事件名称" maxLength={100} placeholder="例如：读完一章书" value={chosen.title} disabled={!ready} onChange={event => setSelection({ taskId: null, title: event.target.value })} /></label>}<Link className={styles.todoLink} href="/todos">去安排待办</Link></div> : <div className={styles.breakNote}><span aria-hidden="true">∿</span><p>休息单独记录，<br />不计入专注时长。</p></div>}
        <div className={styles.timerActions}>
          <button className={styles.primary} disabled={!ready} onClick={active ? togglePause : begin}>{active ? active.running ? "暂停一下" : `继续${modeInfo.label}` : `开始${modeInfo.label}`}<span aria-hidden="true">{active?.running ? "Ⅱ" : "▶"}</span></button>
          {active && <div className={styles.secondaryActions}><button onClick={endEarly}>提前结束 · 记录</button><button onClick={() => setResetting(previous => !previous)}>重置本轮</button></div>}
          {resetting && active && <div className={styles.confirm} role="alert"><p>清除本轮进度？本轮不会写入统计。</p><button onClick={resetTimer}>确定重置</button><button onClick={() => setResetting(false)}>保留本轮</button></div>}
        </div>
        <p className={styles.timerHint}>暂停不计时。完成后手动开启下一轮。</p>
      </div>
    </section>
    <div className={styles.notice} role="status">{message || status}{!ready && <button onClick={retry}>重新读取</button>}</div>
    <details className={styles.settings}><summary>调整我的节奏 <span>＋</span></summary><form onSubmit={saveSettings} key={`${state.settings.focus}-${state.settings.shortBreak}-${state.settings.longBreak}-${state.settings.longEvery}`}><div className={styles.settingFields}>{[{ key: "focus", label: "专注 / 分钟", max: 120 }, { key: "shortBreak", label: "短休息 / 分钟", max: 60 }, { key: "longBreak", label: "长休息 / 分钟", max: 120 }, { key: "longEvery", label: "长休息间隔 / 轮", max: 12 }].map(field => <label key={field.key}>{field.label}<input name={field.key} type="number" min={1} max={field.max} step={1} defaultValue={state.settings[field.key as keyof typeof state.settings]} required disabled={!ready || !!active} /></label>)}</div><div className={styles.settingsFooter}><span>{active ? "本轮结束或重置后，可以修改时长。" : "从适合自己的时长开始，逐渐找到节奏。"}</span><button type="submit" disabled={!ready || !!active}>保存设置</button></div></form></details>
    </div>
    <section hidden={panel !== "statistics"} className={`${styles.statistics} tool-workspace-panel`} aria-labelledby="focus-stats"><div className={styles.sectionHeading}><div><p data-tool-kicker className={styles.kicker}>TIME WELL SPENT</p><h2 id="focus-stats">时间，有迹可循。</h2></div><span>专注统计</span></div><div className={styles.statGrid}>
      {[{ label: "今日专注", number: Math.floor(todaySeconds / 60), unit: "分钟", note: `${todaySessions.length} 次记录` }, { label: "近七天", number: Math.floor(weekSeconds / 60), unit: "分钟", note: `${weekTotals.filter(seconds => seconds > 0).length} 天有投入` }, { label: "完成番茄", number: focuses.filter(session => session.completed).length, unit: "轮", note: "提前结束不计轮数" }, { label: "累计专注", number: Math.floor(totalSeconds / 60), unit: "分钟", note: "不含休息与暂停" }].map((stat, index) => <article key={stat.label}><span><i aria-hidden="true">0{index + 1}</i>{stat.label}</span><strong>{stat.number.toLocaleString()}<small>{stat.unit}</small></strong><p>{stat.note}</p></article>)}
    </div><div className={styles.weekChart} aria-label="近七天专注时长"><div><span>这一周的节奏</span><strong>{durationLabel(weekSeconds)}</strong></div><div className={styles.bars}>{weekDays.map((day, i) => <button key={day} aria-label={`${day}，专注 ${durationLabel(weekTotals[i])}`} title={`${day} · ${durationLabel(weekTotals[i])}`} onClick={() => { setSelectedDate(day); setMonth(day.slice(0, 7)); setShowAll(false); setHistoryKind("focus"); setLimit(12); }}><span className={styles.barTrack}><i style={{ "--height": `${weekTotals[i] ? Math.max(8, weekTotals[i] / Math.max(...weekTotals, 1) * 100) : 0}%` } as CSSProperties} /></span><small>{day === today ? "今天" : day.slice(5).replace("-", ".")}</small></button>)}</div></div></section>
    <section hidden={panel !== "records"} className={`${styles.recordSection} tool-workspace-panel`}><div className={styles.sectionHeading}><div><p data-tool-kicker className={styles.kicker}>YOUR FOCUS ARCHIVE</p><h2>把投入，留下来。</h2></div><span>日历 / 记录</span></div><div className={styles.archive}>
      <div className={styles.calendar}>{month && <ToolCalendar month={month} onMonthChange={setMonth} selectedDate={selectedDate} onSelectDate={date => { setSelectedDate(date); setShowAll(false); setLimit(12); }} counts={counts} label="次专注" />}<p>日期上的数量是专注记录次数，包含提前结束。</p><button onClick={() => { setMonth(today.slice(0, 7)); setSelectedDate(today); setShowAll(false); setLimit(12); }}>回到今天</button></div>
      <div className={styles.history}><div className={styles.historyHead}><h3>{showAll ? "全部记录" : selectedDate ? selectedDate.replaceAll("-", " / ") : "专注记录"}<span>{filteredSessions.length} 条</span></h3><button aria-pressed={showAll} onClick={() => { setShowAll(value => !value); setLimit(12); }}>{showAll ? "查看选中日期" : "查看全部"}</button></div><div className={styles.historyFilters} aria-label="记录类型">{[{ key: "focus", label: "专注" }, { key: "break", label: "休息" }, { key: "all", label: "全部" }].map(filter => <button key={filter.key} aria-pressed={historyKind === filter.key} onClick={() => { setHistoryKind(filter.key); setLimit(12); }}>{filter.label}</button>)}</div>
        {!ready ? <p className={styles.empty}>正在读取记录…</p> : !filteredSessions.length ? <div className={styles.empty}><span aria-hidden="true">◷</span><p>这里还没有记录。<br />给下一段专注，留个位置。</p></div> : <ol className={styles.historyList}>{filteredSessions.slice(0, limit).map(session => { const taskExists = session.taskId && todos.some(task => task.id === session.taskId); return <li key={session.id}><div className={styles.sessionMark} data-break={session.mode !== "focus"} aria-hidden="true">{session.mode === "focus" ? "●" : "∿"}</div><div className={styles.sessionInfo}><div><strong>{session.title || (session.mode === "focus" ? "自由专注" : timerModes.find(mode => mode.id === session.mode)!.label)}</strong><span className={styles.duration}>{durationLabel(session.durationSeconds)}</span></div><p><time dateTime={session.endedAt}>{new Date(session.endedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}</time><span>{session.completed ? "完整一轮" : "提前结束"}</span>{session.taskId && (taskExists ? <Link href={`/todos?task=${encodeURIComponent(session.taskId)}`}>关联待办</Link> : <span>原待办已删除</span>)}</p>{deleting === session.id ? <div className={styles.deleteConfirm}><span>删除这条记录及对应统计？</span><button onClick={() => { setValue(previous => { const old = normalizePomodoroState(previous); return { ...old, sessions: old.sessions.filter(item => item.id !== session.id) }; }); setDeleting(null); }}>确认删除</button><button onClick={() => setDeleting(null)}>取消</button></div> : null}</div><button className={styles.deleteButton} title="删除记录" aria-label={`删除记录：${session.title || "计时"}`} onClick={() => setDeleting(session.id)}>×</button></li>; })}</ol>}
        {filteredSessions.length > limit && <button className={styles.loadMore} onClick={() => setLimit(value => value + 12)}>再看 12 条 ↓</button>}
      </div>
    </div><p className={styles.storage}>{status}<button onClick={retry}>重新同步</button><span>保留最近 1,000 条计时记录，可逐条删除；统计基于保留的记录。跨日计时归入结束当天。</span></p></section>
  </div>;
}
