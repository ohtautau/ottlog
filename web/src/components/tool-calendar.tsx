"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { localDay, monthDays, shiftMonth } from "@/lib/tool-dates";
import styles from "./tool-calendar.module.css";

type Props = {
  month: string; onMonthChange: (month: string) => void; selectedDate: string; onSelectDate: (date: string) => void;
  counts: Record<string, number>; label?: string;
};
export default function ToolCalendar({ month, onMonthChange, selectedDate, onSelectDate, counts, label = "条记录" }: Props) {
  const [today, setToday] = useState("");
  useEffect(() => { const update = () => setToday(localDay()); update(); const interval = setInterval(update, 60000); return () => clearInterval(interval); }, []);
  const days = monthDays(month);
  const [year, index] = month.split("-").map(Number);
  const offset = days.length ? (new Date(year, index - 1, 1, 12).getDay() + 6) % 7 : 0;
  const total = days.reduce((sum, date) => sum + (counts[date] || 0), 0);
  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (!move) return;
    const buttons = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>("button"));
    const target = buttons[buttons.indexOf(event.currentTarget) + move];
    if (target) { event.preventDefault(); target.focus(); }
  }
  return <section className={styles.calendar} aria-label={`${month} 日历`}>
    <div className={styles.head}><div><span>CALENDAR</span><h3>{year}<small> / </small>{String(index).padStart(2, "0")}</h3></div><div className={styles.controls}><button type="button" aria-label="上个月" onClick={() => onMonthChange(shiftMonth(month, -1))}>←</button><button type="button" disabled={!today} onClick={() => { onMonthChange(today.slice(0, 7)); onSelectDate(today); }}>今天</button><button type="button" aria-label="下个月" onClick={() => onMonthChange(shiftMonth(month, 1))}>→</button></div></div>
    <div className={styles.week} aria-hidden="true">{["一", "二", "三", "四", "五", "六", "日"].map(day => <span key={day}>{day}</span>)}</div>
    <div className={styles.days}>
      {Array.from({ length: offset }, (_, i) => <span className={styles.blank} key={`blank-${i}`} aria-hidden="true" />)}
      {days.map(date => <button type="button" key={date} aria-label={`${date}，${counts[date] || 0} ${label}`} aria-pressed={date === selectedDate} aria-current={date === today ? "date" : undefined} data-count={!!counts[date]} onClick={() => onSelectDate(date)} onKeyDown={navigate}><span>{Number(date.slice(-2))}</span><small>{counts[date] ? counts[date] : "·"}</small></button>)}
    </div>
    <div className={styles.foot}><span>点击日期查看</span><span>本月 <strong>{total}</strong> {label}</span></div>
  </section>;
}
