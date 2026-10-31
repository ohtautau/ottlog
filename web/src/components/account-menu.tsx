"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { accountRequest, logoutAccount, type Session } from "@/lib/account";
export default function AccountMenu() {
  const [session, setSession] = useState<Session>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const generation = useRef(0);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    const load = () => {
      if (pending.current) return;
      const request = ++generation.current;
      accountRequest<Session>("/api/account/profile").then(s => { if (active && request === generation.current) setSession(s); }).catch(() => { if (active && request === generation.current) setSession(undefined); });
    };
    load(); window.addEventListener("ottlog-session", load); window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("ottlog-session", load); window.removeEventListener("focus", load); };
  }, [pathname]);
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    ++generation.current;
    setBusy(true);
    setError("");
    try {
      setSession(await logoutAccount());
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return session?.authenticated ? <details className="account-menu" key={pathname}><summary>{session.userName} ▾</summary><div>
    <Link className="account-menu-action" href="/account">账号设置</Link>
    <button className="account-menu-action" type="button" disabled={busy} onClick={logout}>{busy ? "登出中…" : "登出"}</button>
    {error && <p className="account-menu-error" role="alert">{error}</p>}
    {session.isAdmin && <><Link className="account-menu-action" href="/admin">文章管理</Link><Link className="account-menu-action" href="/admin/comments">评论审核</Link></>}
  </div></details> : <Link href="/account">登录 / 注册</Link>;
}
