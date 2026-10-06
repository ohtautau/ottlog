"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin-navigation.module.css";

export default function AdminNavigation({ onLeave }: { onLeave?: () => boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: "文章管理" },
    { href: "/admin/comments", label: "评论审核" },
    { href: "/admin/mottos", label: "首页格言" },
  ];
  return <div className={styles.bar}>
    <nav className={styles.tabs} aria-label="后台导航">
      {items.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onNavigate={event => { if (pathname !== item.href && onLeave && !onLeave()) event.preventDefault(); }}>{item.label}</Link>)}
    </nav>
    <div className={styles.utilities}>
      <Link href="/account" onNavigate={event => { if (onLeave && !onLeave()) event.preventDefault(); }}>账号设置</Link>
      <Link href="/" target="_blank" rel="noopener noreferrer">预览博客 ↗</Link>
    </div>
  </div>;
}
