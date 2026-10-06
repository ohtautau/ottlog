"use client";

import ToolNavigation from "@/components/tool-navigation";
import ToolDataTransfer from "@/components/tool-data-transfer";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePersonalToolState } from "@/lib/use-personal-tool-state";
import ReminderScene from "./reminder-scene";
import ReminderAppearance from "./reminder-appearance";
import HabitIcon from "./habit-icon";
import { cleanState, groups, initialReminders, localDate, weekday, type Reminder, type Scene } from "./reminders";
import styles from "./daily.module.css";

export default function DailyExperience() {
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState("reminders", initialReminders);
  const state = cleanState(value);
  const [mobileView, setMobileView] = useState("reminder");
  const [group, setGroup] = useState("全部");
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [selected, setSelected] = useState("exercise");
  const [history, setHistory] = useState<string[]>([]);
  const [today, setToday] = useState("");
  const [week, setWeek] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [imageBusy, setImageBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [celebration, setCelebration] = useState(0);
  const [timer, setTimer] = useState<{ id: string; end: number; remaining: number; running: boolean } | null>(null);
  const [now, setNow] = useState(0);
  const stage = useRef<HTMLElement>(null);
  const editor = useRef<HTMLFormElement>(null);
  const enabled = state.items.filter(r => r.enabled);
  const done = state.done[today] ?? [];
  const choices = enabled.filter(r => (group === "全部" || r.group === group) && (!onlyTodo || !done.includes(r.id)));
  const current = choices.find(r => r.id === selected) ?? choices[0];

  useEffect(() => {
    const update = () => {
      const date = new Date();
      setToday(localDate(date));
      setWeek(Array.from({ length: 7 }, (_, i) => { const d = new Date(date); d.setDate(d.getDate() - 6 + i); return localDate(d); }));
      setNow(Date.now());
    };
    update(); const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!timer?.running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer?.running]);
  useEffect(() => {
    let inView = true;
    const update = () => setActive(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    if (stage.current) observer.observe(stage.current);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, [ready]);

  function next() {
    const unseen = choices.filter(r => r.id !== current?.id && !history.includes(r.id));
    const pool = unseen.length ? unseen : choices.filter(r => r.id !== current?.id);
    if (!pool.length) return;
    setHistory(h => [...(unseen.length ? h : []), current.id]);
    setSelected(pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length].id);
    setMessage("");
  }
  function toggleDone(id: string, day = today) {
    if (!ready || !day) return;
    const wasDone = state.done[day]?.includes(id) ?? false;
    setValue(previous => {
      const previousState = cleanState(previous);
      const ids = previousState.done[day] ?? [];
      const updated = { ...previousState.done, [day]: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] };
      return { ...previousState, done: Object.fromEntries(Object.entries(updated).sort().slice(-90)) };
    });
    setMessage(`${day === today ? "今天" : `${day.slice(5)} ${weekday(day)}`}的记录${wasDone ? "已撤销" : "已记下"}。`);
    if (!wasDone && day === today) setCelebration(n => n + 1);
  }
  function selectCard(id: string) {
    setMobileView("reminder");
    setSelected(id); setOnlyTodo(false); setMessage("");
    stage.current?.scrollTo({ top: 0, behavior: "instant" });
  }
  function saveReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (imageBusy || !ready) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const reminder: Reminder = { id: editing?.id ?? crypto.randomUUID(), title, note: String(form.get("note") ?? "").trim(),
      group: String(form.get("group")), kind: String(form.get("kind")) as Scene, minutes: Number(form.get("minutes")), enabled: editing?.enabled ?? true,
      ...(form.get("backgroundKind") ? { backgroundKind: String(form.get("backgroundKind")) as Scene } : {}),
      ...(form.get("backgroundImage") ? { backgroundImage: String(form.get("backgroundImage")) } : {}),
    };
    if (!editing && state.items.length >= 80) { setMessage("最多保存 80 条提醒，请编辑已有事项。"); return; }
    setValue(previous => {
      const old = cleanState(previous);
      // The web form does not edit library icons; retain the latest mini-program choice.
      return { ...old, items: editing ? old.items.map(r => r.id === editing.id ? { ...r, ...reminder, ...(r.group === reminder.group ? {} : { domainId: undefined }), ...(r.iconId !== undefined ? { iconId: r.iconId } : {}) } : r) : [...old.items, { ...reminder, priority: 'none', createdAt: Date.now() }] };
    });
    setEditing(null); setFormKey(n => n + 1); setSelected(reminder.id); setGroup("全部"); setOnlyTodo(false);
    setMessage("提醒已保存。");
  }
  const seconds = timer ? Math.max(0, timer.running ? Math.ceil((timer.end - now) / 1000) : timer.remaining) : 0;
  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  function startTimer() {
    if (!current?.minutes) return;
    const remaining = current.minutes * 60;
    setNow(Date.now()); setTimer({ id: current.id, end: Date.now() + remaining * 1000, remaining, running: true });
  }

  return <div className={styles.page} data-tool-page data-tool-workspace="daily">
    <ToolNavigation />
    <ToolDataTransfer key={owner} tool="reminders" value={value} setValue={setValue} ready={ready} status={status} owner={owner} onImported={() => { setEditing(null); setHistory([]); setTimer(null); setMessage(""); }} />
    <header data-tool-header className={styles.heading}>
      <div><p data-tool-kicker className={styles.kicker}>OTTLOG / DAILY PRACTICE</p><h1>习惯<span>养成。</span></h1><p data-tool-description className={styles.intro}>没事就来翻一翻，想起一件现在可以做的事。</p></div>
      <div className={styles.today}><span>{today ? today.replaceAll("-", " / ") : "TODAY"}</span><strong>{enabled.filter(r => done.includes(r.id)).length.toString().padStart(2, "0")}<small> / {enabled.length}</small></strong><span>今天留下的行动</span></div>
    </header>
    <div className={styles.toolbar}>
      <div className={styles.filters} aria-label="提醒分类">{["全部", ...groups].map(g => <button key={g} aria-pressed={group === g} onClick={() => { setGroup(g); setHistory([]); }}>{g === "全部" ? "随便刷刷" : g}</button>)}</div>
      <button className={styles.todoFilter} aria-pressed={onlyTodo} onClick={() => setOnlyTodo(v => !v)}>{onlyTodo ? "✓ " : "+ "}只看未完成</button>
    </div>
    <div className="tool-panel-tabs tool-mobile-tabs" role="group" aria-label="习惯视图">{[["reminder", "此刻提醒"], ["collection", "习惯与打卡"]].map(([key, label]) => <button type="button" key={key} aria-pressed={mobileView === key} onClick={() => setMobileView(key)}>{label}</button>)}</div>
    <div className={styles.workbench} data-mobile-view={mobileView}>
    <section className={styles.stage} ref={stage} aria-label="当前提醒" data-group={current?.group}>
      {!ready ? <div className={styles.empty}><p>{status}</p><button onClick={retry}>重新读取</button></div> : !current ? <div className={styles.empty}><span>✓</span><h2>{onlyTodo ? "这组都记下了。" : "留个位置，给下一件事。"}</h2><p>{onlyTodo ? "想继续翻看，可以切回全部提醒。" : "打开管理提醒，加入你想反复记起的事。"}</p><button onClick={() => { setOnlyTodo(false); setManage(true); setMobileView("collection"); }}>查看 / 管理提醒</button></div> : <>
        <div className={styles.content} key={`text-${current.id}`}>
          <div className={styles.cardMeta}><span>{current.group} / {String(enabled.findIndex(r => r.id === current.id) + 1).padStart(2, "0")}</span><span>{done.includes(current.id) ? "今天已记录 ✓" : "给自己一个提醒"}</span></div>
          <h2>{current.title}</h2><p className={styles.note}>{current.note}</p>
          {current.minutes > 0 && <button className={styles.timerStart} onClick={startTimer} disabled={!!timer && (timer.running && seconds > 0 || !timer.running)}>{current.minutes} 分钟，从现在开始 <span>◷</span></button>}
          <div className={styles.actions}><button className={styles.complete} disabled={!today} aria-pressed={done.includes(current.id)} onClick={() => toggleDone(current.id)}>{done.includes(current.id) ? "已做过 · 撤销" : "今天做过了"}<span aria-hidden="true">✓</span></button><button className={styles.next} onClick={next} disabled={choices.length < 2}>换一张</button></div>
          <div className={styles.stageFoot}><button disabled={!history.some(id => choices.some(r => r.id === id))} onClick={() => { const old = history.filter(id => choices.some(r => r.id === id)); setSelected(old[old.length - 1]); setHistory(old.slice(0, -1)); }}>← 上一张</button><span>{choices.length} 件小事，慢慢来。</span></div>
        </div>
        <div className={styles.visual} key={`scene-${current.id}`}><div className={styles.orbit} aria-hidden="true" /><ReminderScene kind={current.kind} active={active} /><span className={styles.sceneLabel}>ONE THING AT A TIME</span><span className={styles.sceneNumber} aria-hidden="true">{String(enabled.findIndex(r => r.id === current.id) + 1).padStart(2, "0")}</span></div>
        {celebration > 0 && <div key={celebration} className={styles.celebration} aria-hidden="true">{Array.from({length: 9}, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>}
      </>}
    </section>
    {timer && <div className={styles.timer} role="region" aria-label="专注计时"><div><span>{state.items.find(r => r.id === timer.id)?.title ?? "专注时间"}</span><strong role="timer" aria-label={seconds === 0 ? "本轮专注结束" : `剩余 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`}>{timerLabel}</strong></div><p>{seconds === 0 ? "这一轮结束了，给自己留一点休息时间。" : timer.running ? "只做眼前这一件事。" : "暂停一下，准备好再继续。"}</p>{seconds > 0 && <button onClick={() => setTimer(t => t ? { ...t, remaining: seconds, end: Date.now() + seconds * 1000, running: !t.running } : null)}>{timer.running ? "暂停" : "继续"}</button>}<button onClick={() => setTimer(null)}>结束计时</button></div>}
    <div className={styles.notice} role="status">{message || status}</div>
    <section className={styles.collection}>
      <div className={styles.collectionHead}><div><p data-tool-kicker className={styles.kicker}>YOUR LITTLE ROUTINES</p><h2>把想做的事，<span>放在眼前。</span></h2></div><button className={styles.manage} aria-expanded={manage} onClick={() => setManage(v => !v)}>{manage ? "收起管理 −" : "管理提醒 +"}</button></div>
      {manage && <form className={styles.editor} onSubmit={saveReminder} key={formKey} ref={editor}>
        <h3>{editing ? "编辑这件事" : "加一件想记起的事"}</h3>
        <label>名称<input name="title" maxLength={60} required defaultValue={editing?.title} placeholder="例如：给朋友发条消息" /></label>
        <label>提醒自己的话<textarea name="note" maxLength={240} rows={2} defaultValue={editing?.note} placeholder="写一个足够小、可以开始的动作。" /></label>
        <div className={styles.formGrid}><label>分组<select name="group" defaultValue={editing?.group ?? "精神"}>{[...new Set([...groups, ...state.items.map(item => item.group)])].map(g => <option key={g}>{g}</option>)}</select></label><label>专注分钟（0 为关闭）<input name="minutes" type="number" min={0} max={120} step={1} defaultValue={editing?.minutes ?? 0} required /></label></div>
        <ReminderAppearance reminder={editing} onBusy={setImageBusy} />
        <div className={styles.editorActions}><button type="submit" disabled={!ready || imageBusy}>保存提醒</button>{editing && <button type="button" disabled={imageBusy} onClick={() => { setEditing(null); setFormKey(n => n + 1); }}>取消编辑</button>}</div>
      </form>}
      <p className={styles.weekHint}>点选圆圈，记录或撤销对应日期的习惯。</p>
      <div className={styles.routineGrid}>{state.items.filter(r => (manage || r.enabled) && (group === "全部" || r.group === group)).map((r, index) => <article key={r.id} className={styles.routine} data-habit={r.id} data-group={r.group} data-done={done.includes(r.id)} data-disabled={!r.enabled}>
        <div className={styles.routineArt} aria-hidden="true"><ReminderScene kind={r.backgroundKind ?? r.kind} staticImage />{r.backgroundImage && <img key={r.backgroundImage} src={r.backgroundImage} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} />}</div>
        <div className={styles.routineTop}><span className={styles.groupBadge}><i aria-hidden="true" />{r.group}</span><span>{String(index + 1).padStart(2, "0")}</span></div>
        <button className={styles.routineTitle} disabled={!r.enabled} onClick={() => selectCard(r.id)}><span className={styles.habitIcon}><HabitIcon kind={r.kind} /></span><span>{r.title}</span></button>
        <div className={styles.week} role="group" aria-label={`${r.title}最近七天记录`}>{week.map(day => <button type="button" key={day} className={styles.day} data-today={day === today} aria-pressed={state.done[day]?.includes(r.id) ?? false} disabled={!ready || !r.enabled} title={`${day} ${weekday(day)}`} aria-label={`${r.title} ${day} ${weekday(day)}${state.done[day]?.includes(r.id) ? " 已记录，点击撤销" : " 未记录，点击记录"}`} onClick={() => toggleDone(r.id, day)}><small>{weekday(day)}</small><i aria-hidden="true">{state.done[day]?.includes(r.id) ? "✓" : ""}</i><span>{day === today ? "今天" : day.slice(5).replace("-", "/")}</span></button>)}</div>
        {manage && <div className={styles.rowActions}><button disabled={imageBusy} onClick={() => { setEditing(r); setFormKey(n => n + 1); requestAnimationFrame(() => { editor.current?.scrollIntoView({ block: "center" }); editor.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus({ preventScroll: true }); }); }}>编辑</button><button disabled={!ready} onClick={() => setValue(old => { const s = cleanState(old); return { ...s, items: s.items.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x) }; })}>{r.enabled ? "停用" : "启用"}</button></div>}
      </article>)}</div>
      <p className={styles.storage}>{status} <button onClick={retry}>重试同步</button></p>
    </section>
    </div>
  </div>;
}
