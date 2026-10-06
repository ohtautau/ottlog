"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./home-pages.module.css";

const sections = [{ id: "welcome", label: "标题与格言" }, { id: "recent", label: "记录与分类" }];

export default function HomePages({ welcome, recent }: { welcome: ReactNode; recent: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const root = viewport.current;
    if (!root) return;
    const update = () => {
      const second = root.querySelector<HTMLElement>("#recent");
      if (second) setActive(second.getBoundingClientRect().top - root.getBoundingClientRect().top < root.clientHeight * .5 ? 1 : 0);
    };
    root.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(root);
    update();
    return () => { root.removeEventListener("scroll", update); observer.disconnect(); };
  }, []);

  function go(index: number) {
    const root = viewport.current;
    const target = root?.querySelector<HTMLElement>(`#${sections[index].id}`);
    if (!root || !target) return;
    root.scrollTo({ top: root.scrollTop + target.getBoundingClientRect().top - root.getBoundingClientRect().top,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <div className={styles.frame} data-home-pages>
    <div ref={viewport} className={styles.viewport} tabIndex={0} aria-label="首页分屏内容">
      {sections.map((section, index) => <section key={section.id} id={section.id} aria-label={section.label}
        className={`${styles.panel} ${index === 0 ? styles.welcome : styles.recent}`} data-active={active === index}>
        <div className={styles.content}>{index === 0 ? welcome : recent}</div>
        {index === 0 && <button className={styles.scrollHint} onClick={() => go(1)}>向下浏览 <span aria-hidden="true">↓</span></button>}
      </section>)}
    </div>
    <nav className={styles.progress} data-expanded={expanded} aria-label="首页分屏导航">
      <button className={styles.toggle} aria-label="展开分屏导航" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <span>0{active + 1}</span><span className={styles.track}><i style={{ transform: `translateY(${active * 100}%)` }} /></span><span>02</span>
      </button>
      <div className={styles.links}>
        {sections.map((section, index) => <button key={section.id} aria-current={index === active ? "step" : undefined}
          onClick={() => go(index)}><small>0{index + 1}</small>{section.label}</button>)}
      </div>
    </nav>
  </div>;
}
