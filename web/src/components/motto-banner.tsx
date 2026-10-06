"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import QuickNote from "./quick-note";

const defaults = ["别评判自己，别审判自己。", "用自己的语言来表达心情。", "他人的感受不应该凌驾在你的感受之上。", "记得分享观察和感受。", "不休息怎么工作！", "怎么说每天也要动动吧。", "感受到的动力是不可靠的，习惯才是可靠的。", "每天有做三件事，就算成功！", "让心嘭嘭，让事等等。", "请允许大难临头，请允许睡个大觉。", "归因有个屁用。", "因人有无穷无尽的潜力，所以努力；因人有各种各样的局限性，所以选择。", "想要坚持的话，提醒很重要，让它在你的脑子里反复出现吧。", "看到这条麻烦您屈尊夸一下自己。", "目标，计划，可执行的下一步，这是不同的东西。", "做不到也是一种行动的结果。", "新的成就会让一切旧的苦难成为铺垫。", "他人对你的期望，既有动力，也有压力。", "他人的攻击意味着他人的需求没有得到满足，和你的好坏无关。", "有攻击，就有防御。", "羞耻。"];
export default function MottoBanner() {
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [likesLoaded, setLikesLoaded] = useState(false);
  const [reactions, setReactions] = useState<number[]>([]);
  const nextReaction = useRef(0);
  const holdDelay = useRef<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);
  const heldPointer = useRef<number | null>(null);
  const repeated = useRef(false);
  const stopHold = useCallback(() => {
    window.clearTimeout(holdDelay.current);
    window.clearInterval(holdTimer.current);
    holdDelay.current = undefined;
    holdTimer.current = undefined;
    heldPointer.current = null;
  }, []);
  const [mottos, setMottos] = useState(defaults);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const randomNext = useCallback(() => {
    if (mottos.length < 2) return;
    const candidate = Math.floor(Math.random() * (mottos.length - 1));
    setHistory(previous => [...previous.slice(-99), index]);
    setIndex(candidate >= index ? candidate + 1 : candidate);
  }, [index, mottos.length]);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ottlog-motto-likes") || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        setLikes(Object.fromEntries(Object.entries(saved).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isSafeInteger(entry[1]) && entry[1] >= 0)));
      }
    } catch { /* Storage may be unavailable in private browsing. */ }
    setLikesLoaded(true);
  }, []);
  useEffect(() => {
    if (!likesLoaded) return;
    try { localStorage.setItem("ottlog-motto-likes", JSON.stringify(likes)); } catch { /* Keep session likes usable. */ }
  }, [likes, likesLoaded]);
  useEffect(() => {
    if (reduced) setReactions([]);
  }, [reduced]);
  const like = () => {
    const motto = mottos[index];
    setLikes(current => ({ ...current, [motto]: (current[motto] ?? 0) + 1 }));
    if (!reduced) {
      const id = ++nextReaction.current;
      setReactions(current => [...current.slice(-17), id]);
    }
  };
  useEffect(() => {
    stopHold();
    return stopHold;
  }, [index, mottos, reduced, stopHold]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stopHold(); };
    window.addEventListener("blur", stopHold);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stopHold(); window.removeEventListener("blur", stopHold); document.removeEventListener("visibilitychange", onVisibility); };
  }, [stopHold]);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => fetch("/api/mottos", { cache: "no-store", signal: controller.signal }).then(r => r.ok ? r.json() : null).then(data => { if (Array.isArray(data?.mottos) && data.mottos.length) { setMottos(data.mottos); setHistory([]); setIndex(Math.floor(Math.random() * data.mottos.length)); } }).catch(() => {});
    load(); window.addEventListener("ottlog-mottos", load);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches); update(); media.addEventListener("change", update);
    return () => { window.removeEventListener("ottlog-mottos", load); controller.abort(); media.removeEventListener("change", update); };
  }, []);
  useEffect(() => {
    if (paused || interacting || reduced || mottos.length < 2) return;
    const timer = window.setInterval(() => { if (!document.hidden) randomNext(); }, 6000);
    return () => window.clearInterval(timer);
  }, [paused, interacting, reduced, mottos.length, randomNext]);
  return <section className="motto-banner" aria-label="生活格言" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
    <span className="motto-symbol" aria-hidden="true">“</span>
    <div className="motto-copy"><div className="motto-title-row"><span className="motto-label">此刻的一句话 / WORDS TO LIVE BY</span><QuickNote /></div><p key={index} className="motto-text">{mottos[index]}</p></div>
    <div className="motto-like-wrap">
      <button type="button" className="motto-like"
        onPointerDown={event => {
          if (event.button !== 0 || !event.isPrimary) return;
          stopHold(); repeated.current = false; heldPointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          holdDelay.current = window.setTimeout(() => {
            repeated.current = true; like();
            holdTimer.current = window.setInterval(like, 120);
          }, 350);
        }}
        onPointerMove={event => {
          if (heldPointer.current !== event.pointerId) return;
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
            repeated.current = true; stopHold();
          }
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={() => { repeated.current = true; stopHold(); }}
        onLostPointerCapture={stopHold}
        onBlur={stopHold}
        onContextMenu={event => event.preventDefault()}
        onClick={event => { if (event.detail === 0 || !repeated.current) like(); repeated.current = false; }} disabled={!likesLoaded} aria-label="给这条格言点赞" title="点击或长按连续点赞，次数保存在此浏览器">
        <svg key={nextReaction.current} className={nextReaction.current && !reduced ? "motto-heart motto-heart-pop" : "motto-heart"} aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21 3.6 12.7C-2 7.1 5.7-.9 12 5.5 18.3-.9 26 7.1 20.4 12.7Z"/></svg>
        <span>点赞</span><span className="motto-like-count">{likes[mottos[index]] ?? 0}</span>
      </button>
      <span className="motto-reactions" aria-hidden="true">{reactions.map(id => <span key={id} className="motto-reaction" style={{"--drift": `${((id * 37) % 71) - 35}px`, "--tilt": `${((id * 19) % 51) - 25}deg`} as CSSProperties} onAnimationEnd={() => setReactions(current => current.filter(value => value !== id))}>♥<small>+1</small></span>)}</span>
    </div>
    {mottos.length > 1 && <div className="motto-controls"><span>{String(index + 1).padStart(2, "0")} / {String(mottos.length).padStart(2, "0")}</span><button type="button" aria-label="上一条格言" disabled={!history.length} onClick={() => { const previous = history.at(-1); if (previous !== undefined) { setIndex(previous); setHistory(history.slice(0, -1)); } }}>←</button><button type="button" aria-label="随机下一条格言" onClick={randomNext}>→</button>{!reduced && <button type="button" aria-label={paused ? "播放格言" : "暂停格言"} onClick={() => setPaused(v => !v)}>{paused ? "播放" : "暂停"}</button>}</div>}
  </section>;
}
