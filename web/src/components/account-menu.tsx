"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountRequest, type Session } from "@/lib/account";
export default function AccountMenu() {
  const [session, setSession] = useState<Session>();
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    const load = () => { accountRequest<Session>("/api/account/profile").then(s => { if (active) setSession(s); }).catch(() => { if (active) setSession(undefined); }); };
    load(); window.addEventListener("ottlog-session", load); window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("ottlog-session", load); window.removeEventListener("focus", load); };
  }, [pathname]);
  return session?.authenticated ? <details className="account-menu" key={pathname}><summary>{session.userName} ▾</summary><div><Link href="/account">账号设置</Link>{session.isAdmin && <><Link href="/admin">文章管理</Link><Link href="/admin/comments">评论审核</Link></>}</div></details> : <Link href="/account">登录 / 注册</Link>;
}
