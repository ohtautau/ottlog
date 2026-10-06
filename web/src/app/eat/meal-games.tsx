"use client";

import { useEffect, useRef, useState } from "react";
import { kindLabels, type Meal } from "./meal-data";
import { mealQuestions, pairMeals, rankMeals, type MealAnswer } from "./meal-game-data";
import MealCardArt from "./meal-card-art";
import styles from "./meal-games.module.css";

export default function MealGames({ meals, ready }: { meals: Meal[]; ready: boolean }) {
  const [mode, setMode] = useState<"swipe" | "quiz">("swipe");
  const [answers, setAnswers] = useState<MealAnswer[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [phase, setPhase] = useState<"idle" | "dragging" | "exiting">("idle");
  const [chosen, setChosen] = useState("");
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const flight = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = useRef(false);
  useEffect(() => () => { if (flight.current) clearTimeout(flight.current); }, []);

  const step = answers.length;
  const pairs = pairMeals(meals);
  const total = mode === "quiz" ? mealQuestions.length : pairs.length;
  const question = mealQuestions[step];
  const pair = pairs[step];
  const active = step < total;
  const ranking = rankMeals(meals, answers, mode, pairs);
  const labels = mode === "quiz" ? ["不是", "不确定", "是"] : ["选左边", "都想再看看", "选右边"];

  function answer(value: MealAnswer) {
    if (!ready || !meals.length || !active || locked.current) return;
    locked.current = true; drag.current = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      flight.current = null; locked.current = false;
      setAnswers(previous => previous.length === step ? [...previous, value] : previous);
      setOffset({ x: 0, y: 0 }); setPhase("idle"); setChosen("");
      stage.current?.focus({ preventScroll: true });
    };
    if (reduced) { finish(); return; }
    setPhase("exiting");
    setOffset(value === 0 ? { x: offset.x * .3, y: -(stage.current?.clientHeight ?? 600) - 400 } : { x: value * (window.innerWidth + 440), y: offset.y - 70 });
    flight.current = setTimeout(finish, 320);
  }
  function reset(next = mode) {
    if (flight.current) clearTimeout(flight.current);
    flight.current = null; locked.current = false;
    setMode(next); setAnswers([]); setOffset({ x: 0, y: 0 }); setPhase("idle"); setChosen(""); drag.current = null;
  }
  function release() { if (!locked.current) { drag.current = null; setPhase("idle"); setOffset({ x: 0, y: 0 }); } }
  const intent = offset.y < -25 && Math.abs(offset.y) > Math.abs(offset.x) ? "up" : offset.x < -25 ? "left" : offset.x > 25 ? "right" : "none";
  const canCommit = intent === "up" ? offset.y <= -60 : Math.abs(offset.x) >= 60 && Math.abs(offset.x) > Math.abs(offset.y);
  const intentLabel = intent === "left" ? labels[0] : intent === "right" ? labels[2] : labels[1];

  return <section className={styles.games} aria-label="开饭小游戏">
    <div className={styles.header}><div><p>PLAY WITH YOUR APPETITE</p><h2>让胃投一票。</h2></div><span>{meals.length} 道餐食待选</span></div>
    <div className={styles.modes} role="group" aria-label="选择玩法">
      <button type="button" aria-pressed={mode === "swipe"} onClick={() => reset("swipe")}>左右开饭 <small>两道菜，一张卡，选更想吃的</small></button>
      <button type="button" aria-pressed={mode === "quiz"} onClick={() => reset("quiz")}>猜你想吃 <small>滑动回答问题，找到今天的口味</small></button>
    </div>
    <div ref={stage} className={styles.stage} tabIndex={0} role="region" aria-label="选餐游戏操作区" onKeyDown={event => {
      if (event.repeat || (event.target as HTMLElement).closest("button, input, textarea, select, [contenteditable=true]")) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key) && active) { event.preventDefault(); answer(event.key === "ArrowUp" ? 0 : event.key === "ArrowRight" ? 1 : -1); }
    }}>
      {!ready ? <p>正在读取餐单…</p> : !meals.length ? <p>先在“我的餐单”添加一道食物，再开始游戏。</p> : active ? <>
        <div className={styles.progress}><span>{String(step + 1).padStart(2, "0")} / {total}</span><span>{mode === "swipe" ? "今天更想吃哪一个？" : "听听胃的意见"}</span></div>
        <div className={styles.playArea} role="group" aria-label={mode === "quiz" ? "回答问题" : "选择两道菜"}>
          <button className={`${styles.direction} ${styles.left}`} type="button" disabled={phase === "exiting"} aria-label={mode === "quiz" ? "不是" : `选择左侧菜品：${pair[0].name}`} onClick={() => answer(-1)}><span aria-hidden="true">←</span><small>左滑</small><strong>{labels[0]}</strong></button>
          <div className={styles.deck}>
            <article key={`${mode}-${step}`} className={`${styles.card} ${mode === "swipe" ? styles.pairCard : ""}`} data-meal-card data-mode={mode} data-phase={phase} data-choice={intent} style={{ transform: `translate(${offset.x}px, ${offset.y}px) rotate(${Math.max(-24, Math.min(24, offset.x / 18))}deg)` }}
              onPointerDown={event => { if (locked.current || drag.current || !event.isPrimary || event.button !== 0) return; stage.current?.focus({ preventScroll: true }); setPhase("dragging"); drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId }; event.currentTarget.setPointerCapture(event.pointerId); }}
              onPointerMove={event => { if (drag.current?.id === event.pointerId) setOffset({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y }); }}
              onPointerUp={event => { const start = drag.current; if (!start || start.id !== event.pointerId) return; drag.current = null; const dx = event.clientX - start.x; const dy = event.clientY - start.y; if (dy <= -60 && Math.abs(dy) > Math.abs(dx)) answer(0); else if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy)) answer(dx > 0 ? 1 : -1); else release(); }}
              onPointerCancel={release} onLostPointerCapture={release}>
              <span className={styles.stamp} aria-hidden="true">{intent === "none" ? "" : intentLabel}</span>
              {mode === "quiz" ? <><span className={styles.symbol} aria-hidden="true">{question.symbol}</span><p>YOUR APPETITE SAYS…</p><h3>{question.title}</h3></> : <>
                <h3 className={styles.pairHeading}>这一餐，你站哪一边？</h3>
                <div className={styles.pair}>
                  {pair.map((meal, index) => <div key={meal.id} className={styles.option} data-meal-option={index === 0 ? "left" : "right"}>
                    <span className={styles.optionLabel}>{index === 0 ? "A / 左边" : "B / 右边"}</span>
                    <MealCardArt kind={meal.kind}/><h4>{meal.name}</h4><p>{meal.place || kindLabels[meal.kind]}</p><small>¥{meal.price} · {meal.minutes} 分钟</small>
                  </div>)}
                  <span className={styles.or} aria-hidden="true">OR</span>
                </div>
              </>}
              <span className={styles.verdict} aria-hidden="true">{intent === "none" ? "按住卡片，跟着直觉走" : !canCommit ? "再滑远一点即可选择" : `松开选「${intentLabel}」`}</span>
            </article>
          </div>
          <button className={`${styles.direction} ${styles.right}`} type="button" disabled={phase === "exiting"} aria-label={mode === "quiz" ? "是" : `选择右侧菜品：${pair[1].name}`} onClick={() => answer(1)}><span aria-hidden="true">→</span><small>右滑</small><strong>{labels[2]}</strong></button>
          <button className={`${styles.direction} ${styles.up}`} type="button" disabled={phase === "exiting"} aria-label={mode === "quiz" ? "不确定" : "跳过这两道菜"} onClick={() => answer(0)}><span aria-hidden="true">↑</span><span><small>上滑</small><strong>{labels[1]}</strong></span></button>
        </div>
        <p className={styles.hint}>拖动卡片、点击方向提示，或按 ← / ↑ / →。</p>
      </> : <div className={styles.finish}><span>✓</span><h3>{mode === "swipe" && meals.length === 1 ? "餐单里只有这一道。" : "这一餐，答案更近了。"}</h3><p>{mode === "swipe" && meals.length === 1 ? "可以直接选它，或再添加一道菜开始二选一。" : "从下面的建议里选一个，或者再玩一轮。"}</p></div>}
      <div className={styles.controls}><button type="button" disabled={!answers.length || phase === "exiting"} onClick={() => { release(); setAnswers(previous => previous.slice(0, -1)); setChosen(""); }}>撤回上一步</button><button type="button" onClick={() => reset()}>重新开始</button></div>
    </div>
    <div className={styles.candidates} role="region" aria-label="推荐结果" aria-live="polite" aria-atomic="true">
      <h3>{answers.length ? "目前最可能的三餐" : "先看看餐单里的灵感"}</h3>
      <p className={styles.hint}>{answers.length ? mode === "quiz" ? "按你的回答更新排序；不确定会保留当前倾向。" : "优先推荐你选过的菜，也参考你偏爱的餐食类型；跳过不影响排序。" : "每次选择都会更新，餐食不足三道时显示全部。"}</p>
      <ol>{ranking.map(({ meal }, index) => <li key={meal.id}><span className={styles.rank}>0{index + 1}</span><div><h4>{meal.name}</h4><p>{kindLabels[meal.kind]} · ¥{meal.price} · {meal.minutes} 分钟</p><small>{meal.place}</small></div><button type="button" aria-pressed={chosen === meal.id} onClick={() => setChosen(meal.id)}>{chosen === meal.id ? "决定了 ✓" : "就吃这个"}</button></li>)}</ol>
      {chosen && <p role="status">今天就吃：{meals.find(meal => meal.id === chosen)?.name}。好好吃饭！</p>}
    </div>
  </section>;
}
