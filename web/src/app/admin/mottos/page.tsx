"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavigation from "@/components/admin-navigation";
import MottoSettings from "@/components/motto-settings";
import { accountRequest, type Session } from "@/lib/account";

export default function MottosPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("正在验证账号权限…");
  useEffect(() => {
    let active = true;
    accountRequest<Session>("/api/account/profile").then(session => {
      if (!active) return;
      if (session.authenticated && session.isAdmin) setAllowed(true);
      else router.replace("/account");
    }).catch(() => { if (active) setMessage("无法验证账号，请刷新重试"); });
    return () => { active = false; };
  }, [router]);
  if (!allowed) return <p role="status">{message}</p>;
  return <section className="admin"><AdminNavigation /><p className="eyebrow">OTTLOG / WORDS</p><h1>首页格言</h1><MottoSettings /></section>;
}
