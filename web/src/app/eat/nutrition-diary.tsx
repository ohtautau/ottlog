"use client";

import { useRef, useState } from "react";
import { isMealLibrary, type MealLibrary, type NutritionEntry } from "./meal-data";
import type { PersonalToolSetter } from "@/lib/use-personal-tool-state";
import styles from "./nutrition-diary.module.css";

const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const display = (n: number) => Math.round(n * 10) / 10;

export default function NutritionDiary({ value, setValue, ready, status }: { value: MealLibrary; setValue: PersonalToolSetter<MealLibrary>; ready: boolean; status: string }) {
  const [date, setDate] = useState(localDate);
  const [editing, setEditing] = useState<NutritionEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState("");
  const entries = isMealLibrary(value) ? value.nutrition ?? [] : [];
  const daily = entries.filter(entry => entry.date === date);
  const totals = daily.reduce((sum, e) => ({ carbs: sum.carbs + e.carbs, protein: sum.protein + e.protein, fat: sum.fat + e.fat }), { carbs: 0, protein: 0, fat: 0 });
  const days = Array.from(new Set(entries.map(e => e.date))).sort().reverse();

  async function commit(update: (previous: MealLibrary) => MealLibrary, success: string) {
    if (pending.current || !ready) return false;
    pending.current = true; setBusy(true); setMessage("");
    try { await setValue(update); setMessage(success); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : "保存失败，请重试"); return false; }
    finally { pending.current = false; setBusy(false); }
  }

  return <section className={styles.diary} aria-label="饮食记录">
    <div className={styles.heading}><div><p>MY DAILY INTAKE</p><h2>今天，吃进了什么。</h2></div><button type="button" disabled={!ready || busy} onClick={() => { setDate(localDate()); setEditing(null); setOpen(true); }}>＋ 记录今天吃的</button></div>
    <div className={styles.date}><label>记录日期<input type="date" required value={date} disabled={busy || open} onChange={e => { if (e.target.value) setDate(e.target.value); }} /></label><button type="button" disabled={!ready || busy || open} onClick={() => { setEditing(null); setOpen(true); }}>为这天补记</button></div>
    <div className={styles.totals}>{([['carbs', '碳水'], ['protein', '蛋白质'], ['fat', '脂肪']] as const).map(([key, label]) => <div key={key}><span>{label}</span><strong>{display(totals[key])}<small> g</small></strong></div>)}</div>
    <p className={styles.hint}>记录实际吃下的总量，单位为克；可参考包装或自行填写估算值。</p>
    {open && <form key={editing?.id ?? 'new'} className={styles.form} onSubmit={async event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const entry: NutritionEntry = { id: editing?.id ?? crypto.randomUUID(), date, name: String(data.get('name')).trim(), carbs: Number(data.get('carbs')), protein: Number(data.get('protein')), fat: Number(data.get('fat')) };
      if (!isMealLibrary({ version: 1, meals: [], nutrition: [entry] })) { setMessage("请填写名称和有效的营养数据"); return; }
      if (await commit(previous => {
        if (!isMealLibrary(previous)) throw new Error("餐单无法读取，请先恢复数据");
        const records = previous.nutrition ?? [];
        if (editing && !records.some(e => e.id === editing.id)) throw new Error("这条记录已被删除，请重新添加");
        if (!editing && records.length >= 300) throw new Error("最多保留 300 条记录，请先导出备份并整理旧记录");
        return { ...previous, nutrition: editing ? records.map(e => e.id === entry.id ? entry : e) : [...records, entry] };
      }, "饮食记录已保存")) { setOpen(false); setEditing(null); }
    }}>
      <label className={styles.name}>吃了什么<input name="name" list="nutrition-meal-names" defaultValue={editing?.name ?? ''} required maxLength={80} placeholder="选择已有菜品，也可以直接输入" disabled={busy} /></label>
      <datalist id="nutrition-meal-names">{isMealLibrary(value) && value.meals.map(meal => <option key={meal.id} value={meal.name} />)}</datalist>
      {([['carbs', '碳水'], ['protein', '蛋白质'], ['fat', '脂肪']] as const).map(([key, label]) => <label key={key}>{label}（克）<input type="number" name={key} min="0" max="2000" step="0.1" required defaultValue={editing?.[key] ?? ''} disabled={busy} placeholder="0.0" /></label>)}
      <div className={styles.actions}><button disabled={busy}>{busy ? "保存中…" : "保存饮食记录"}</button><button type="button" disabled={busy} onClick={() => { setOpen(false); setEditing(null); }}>取消</button></div>
    </form>}
    <p role="status" className={styles.hint}>{message || status}</p>
    <ul className={styles.entries}>{daily.map(entry => <li key={entry.id}><div><strong>{entry.name}</strong><p>碳水 {entry.carbs} g · 蛋白质 {entry.protein} g · 脂肪 {entry.fat} g</p></div><div className={styles.actions}><button type="button" disabled={busy || open} onClick={() => { setEditing(entry); setOpen(true); }}>编辑</button><button type="button" disabled={busy || open} onClick={async () => {
      if (window.confirm(`删除“${entry.name}”这条饮食记录？`)) await commit(previous => ({ ...previous, nutrition: (previous.nutrition ?? []).filter(e => e.id !== entry.id) }), "记录已删除");
    }}>删除</button></div></li>)}</ul>
    {!daily.length && <p className={styles.hint}>这一天还没有记录。</p>}
    <details className={styles.history}><summary>历史记录 · {days.length} 天 / {entries.length} 条</summary><div>{days.map(day => {
      const records = entries.filter(e => e.date === day);
      return <button key={day} type="button" disabled={busy || open} onClick={() => setDate(day)}>{day}<span>{records.length} 条 · 碳 {display(records.reduce((n, e) => n + e.carbs, 0))} / 蛋 {display(records.reduce((n, e) => n + e.protein, 0))} / 脂 {display(records.reduce((n, e) => n + e.fat, 0))} g</span></button>;
    })}</div></details>
  </section>;
}
