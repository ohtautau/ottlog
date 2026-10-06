"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AccountMenu from "./account-menu";
import { appTools } from "@/lib/app-tools";
import styles from "./site-header.module.css";

export default function SiteHeader() {
  const pathname = usePathname();
  return <HeaderNavigation key={pathname} pathname={pathname} />;
}

function HeaderNavigation({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelHide() { if (timeout.current) clearTimeout(timeout.current); }
  function hideLater() {
    cancelHide();
    timeout.current = setTimeout(() => {
      if (!root.current?.contains(document.activeElement)) setOpen(false);
    }, 650);
  }
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("pointerdown", outside); if (timeout.current) clearTimeout(timeout.current); };
  }, []);
  const links = [{href:"/",title:"首页"},{href:"/city",title:"分类城市"},{href:"/posts",title:"所有文章"},{href:"/favorites",title:"我的收藏"}];
  return <header className={`header ${styles.header}`}>
    <div className={`shell ${styles.brandRow}`}>
      <Link className="logo" href="/" aria-label="Ottlog 首页">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/ottlog-logo.svg" alt="Ottlog 标志" width={48} height={48}/><span className="brand-wordmark">OTTLOG</span>
      </Link>
    </div>
    <div ref={root} className={styles.dock} data-open={open} onPointerEnter={event => { if (event.pointerType === "mouse") { cancelHide(); timeout.current = setTimeout(() => setOpen(true), 200); } }} onPointerLeave={hideLater}
      onFocusCapture={cancelHide} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) hideLater(); }}
      onKeyDown={event => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }}>
      <button ref={toggle} className={styles.toggle} aria-label={open ? "收起网站导航" : "展开网站导航"} aria-expanded={open} aria-controls="site-drawer" onClick={() => { cancelHide(); setOpen(!open); }}><span aria-hidden="true">{open ? "×" : "☰"}</span><small>导航</small></button>
      <div id="site-drawer" className={styles.drawer} inert={!open}>
        <p className={styles.label}>OTTLOG / EXPLORE</p>
        <nav aria-label="主导航" className={styles.navigation}>{links.map(link => <Link key={link.href} href={link.href} aria-current={pathname===link.href?"page":undefined}>{link.title}</Link>)}</nav>
        <p className={styles.label}>日常工具</p>
        <nav aria-label="日常工具导航" className={styles.navigation}>{appTools.map(tool => <Link key={tool.href} href={tool.href} aria-current={pathname===tool.href?"page":undefined}>{tool.title}</Link>)}</nav>
        <div className={styles.account}><AccountMenu/><Link href="/subscribe">RSS 订阅</Link></div>
      </div>
    </div>
  </header>;
}
