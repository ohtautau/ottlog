"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./living-title.module.css";

// Six non-overlapping perches fill over one hour of visible viewing time.
const arrivals = [
  { slot: 2, delay: 2, from: "-3em" },
  { slot: 4, delay: 116, from: "5em" },
  { slot: 0, delay: 416, from: "-3em" },
  { slot: 5, delay: 1016, from: "5em" },
  { slot: 1, delay: 2096, from: "-3em" },
  { slot: 3, delay: 3596, from: "5em" },
];

// Share progress for birds and growth within the current tab session.
const titleProgressKey = "ottlog-bird-progress-v1";
function readTitleProgress() {
  try {
    const value = Number(sessionStorage.getItem(titleProgressKey));
    return Number.isFinite(value) ? Math.max(0, Math.min(3600, value)) : 0;
  } catch { return 0; }
}

export default function LivingTitle() {
  const root=useRef<HTMLDivElement>(null);
  const [resumedSeconds,setResumedSeconds]=useState<number|null>(null);
  const [visible,setVisible]=useState(false);
  const [reduced,setReduced]=useState(false);
  const accumulatedSeconds=useRef(0);
  useEffect(()=>{
    const resumed=readTitleProgress();
    accumulatedSeconds.current=resumed;
    setResumedSeconds(resumed);
  },[]);
  useEffect(()=>{
    if(resumedSeconds===null)return;
    const started=performance.now(),running=visible&&!reduced;
    const save=()=>{
      const elapsed=running?(performance.now()-started)/1000:0;
      const progress=Math.min(3600,accumulatedSeconds.current+elapsed);
      try {
        sessionStorage.setItem(titleProgressKey,String(progress));
      } catch { /* Animation remains usable when storage is unavailable. */ }
      return progress;
    };
    const timer=window.setInterval(save,1000);
    window.addEventListener("pagehide",save);
    document.addEventListener("visibilitychange",save);
    return()=>{accumulatedSeconds.current=save();window.clearInterval(timer);window.removeEventListener("pagehide",save);document.removeEventListener("visibilitychange",save);};
  },[visible,reduced,resumedSeconds]);
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReduced(media.matches);update();media.addEventListener("change",update);
    let inView=false;
    const sync=()=>setVisible(inView&&!document.hidden);
    const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();});
    if(root.current)observer.observe(root.current);
    document.addEventListener("visibilitychange",sync);
    return()=>{observer.disconnect();media.removeEventListener("change",update);document.removeEventListener("visibilitychange",sync);};
  },[]);
  return <div ref={root} className={styles.title} style={resumedSeconds===null?undefined:{ "--living-elapsed": `${resumedSeconds}s` } as CSSProperties} data-progress-ready={resumedSeconds!==null} data-paused={!visible||reduced||resumedSeconds===null}>
    <h1 className="resting-title">让想法在这，<span className={`serif-accent ${styles.words}`}>
      <span className={styles.perch}>栖息
        {arrivals.map(({slot,delay,from},index)=><span key={slot} className={styles.flight} aria-hidden="true" style={{
          left: `${slot * 16.66}%`, "--arrival": `${delay-(resumedSeconds??0)}s`, "--from-x": from,
          "--facing": from.startsWith("-") ? 1 : -1,
          "--bird-tone": index % 2 ? "#91b7ae" : "#81a5d4",
        } as CSSProperties}>
        <svg className={styles.bird} focusable="false" viewBox="0 0 80 66">
          <g className={styles.birdBody}>
            <path d="M27 40 8 48 16 30 29 33Z" fill="var(--bird-tone)"/>
            <ellipse cx="39" cy="35" rx="20" ry="14" fill="#dce9ee"/>
            <circle cx="55" cy="23" r="12" fill="#eaf1e8"/>
            <path d="m65 23 12 4-12 4Z" fill="#e7b773"/>
            <circle cx="59" cy="21" r="2.1" fill="#15283d"/>
            <path className={styles.wing} d="M40 34Q9 2 17 26Q19 46 43 42Z" fill="#618aba" stroke="#182f49" strokeWidth="2"/>
          </g>
          <path d="m36 46-2 13m13-13-2 13m-16 1h11m0 0h11" fill="none" stroke="#e7b773" strokeWidth="3" strokeLinecap="round"/>
        </svg></span>)}
        <svg className={styles.branch} aria-hidden="true" focusable="false" viewBox="0 0 200 20"><path d="M3 13 197 8m-45 2 15-7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>
      </span><span className={styles.growthRow}><span className={styles.join}>和</span><span className={styles.growth}>
        <span className={styles.growingText}>生长</span>
        <svg className={styles.sprout} aria-hidden="true" focusable="false" viewBox="0 0 110 110">
          <g fill="none" stroke="#88bd9c" strokeWidth="4" strokeLinecap="round">
            {/* Split at exact junctions: each branch starts only once the trunk reaches it. */}
            <path className={`${styles.stem} ${styles.stemBase}`} d="M53 107Q48 91 50 77" pathLength="1"/>
            <path className={`${styles.stem} ${styles.stemMiddle}`} d="M50 77Q51 65 56 54" pathLength="1"/>
            <path className={`${styles.stem} ${styles.stemTip}`} d="M56 54Q60 32 67 13" pathLength="1"/>
            <path className={`${styles.stem} ${styles.branchLeft}`} d="M50 77Q35 69 22 53" pathLength="1"/>
            <path className={`${styles.stem} ${styles.branchRight}`} d="M56 54Q71 49 85 37" pathLength="1"/>
          </g>
          <path className={styles.leafOne} d="M22 53Q-2 56 7 27Q29 28 22 53" fill="#a4ccaa"/>
          <path className={styles.leafTwo} d="M85 37Q76 8 104 15Q109 38 85 37" fill="#77ad96"/>
          <path className={styles.leafThree} d="M67 13Q48 7 62 0Q82-2 67 13" fill="#c3d9ac"/>
        </svg>
      </span><span className={styles.period}>。</span></span>
    </span></h1>
  </div>;
}
