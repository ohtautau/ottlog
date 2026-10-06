"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AccountPassword from "@/components/account-password";
import { useRouter } from "next/navigation";
import { accountRequest, type Session } from "@/lib/account";
export default function Account() {
  const router = useRouter();
  const [session, setSession] = useState<Session>();
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { accountRequest<Session>("/api/account/session").then(setSession).catch(e => setMessage(e.message)); }, []);
  return <section className="admin-login"><p className="eyebrow">OTTLOG / ACCOUNT</p><h1>{session?.authenticated ? "账号设置" : register ? "创建读者账号" : "登录 Ottlog"}</h1><p className="intro">收藏随账号保存，在网页和小程序登录同一账号即可同步；各端仅展示该端已公开的文章。</p>
    {session?.authenticated ? <><p>当前账号：{session.userName}</p>{session.isAdmin && <p><Link href="/admin">进入管理后台</Link></p>}<button disabled={busy} onClick={async () => { setBusy(true); try { await accountRequest("/api/account/logout", "POST"); setSession(await accountRequest<Session>("/api/account/session")); window.dispatchEvent(new Event("ottlog-session")); } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); } }}>退出账号</button>{session.isAdmin && <AccountPassword onChanged={() => { setSession({ authenticated: false, isAdmin: false, csrfToken: "" }); setRegister(false); setMessage("密码已修改，请使用新密码重新登录"); window.dispatchEvent(new Event("ottlog-session")); }} />}</> : <><form onSubmit={async e => { e.preventDefault(); setBusy(true); const data = new FormData(e.currentTarget); try { await accountRequest(`/api/account/${register ? "register" : "login"}`, "POST", { userName: data.get("username"), password: data.get("password") }); const current = await accountRequest<Session>("/api/account/session"); setSession(current); if (current.isAdmin) router.push("/admin"); setMessage("登录成功"); window.dispatchEvent(new Event("ottlog-session")); } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); } }}>
      <label>账号<input name="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_-]+" autoComplete="username" /></label><label>密码<input name="password" type="password" required minLength={register ? 12 : 1} maxLength={128} autoComplete={register ? "new-password" : "current-password"} /></label><p className="hint">账号为 3–50 位字母、数字、下划线或短横线，注册密码至少 12 位。</p><button className="button" disabled={busy}>{busy ? "处理中…" : register ? "注册并登录" : "登录"}</button>
    </form><button onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "已有账号，去登录" : "没有账号？注册"}</button></>}
    <p role="status">{message}</p></section>;
}
