"use client";

import { useRef, useState } from "react";
import { accountRequest } from "@/lib/account";

export default function AccountPassword({ onChanged }: { onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);

  return <section aria-label="修改密码" style={{ marginTop: 32 }}>
    <h2>修改密码</h2>
    <p className="hint">修改后会退出登录，请使用新密码重新登录。</p>
    <form onSubmit={async event => {
      event.preventDefault();
      if (pending.current) return;
      const form = event.currentTarget;
      const data = new FormData(form);
      if (data.get("new") !== data.get("confirm")) { setMessage("两次输入的新密码不一致"); return; }
      pending.current = true;
      setBusy(true);
      setMessage("");
      try {
        await accountRequest("/api/auth/password", "POST", { currentPassword: data.get("current"), newPassword: data.get("new") });
        form.reset();
        onChanged();
      } catch (error) { setMessage(error instanceof Error ? error.message : "修改失败，请重试"); }
      finally { pending.current = false; setBusy(false); }
    }}>
      <label>当前密码<input type="password" name="current" required maxLength={128} autoComplete="current-password" disabled={busy} /></label>
      <label>新密码<input type="password" name="new" required minLength={12} maxLength={128} autoComplete="new-password" disabled={busy} /></label>
      <label>确认新密码<input type="password" name="confirm" required minLength={12} maxLength={128} autoComplete="new-password" disabled={busy} /></label>
      <p className="hint">新密码为 12–128 个字符。</p>
      <button className="button" disabled={busy}>{busy ? "正在修改…" : "保存新密码并退出"}</button>
    </form>
    <p role="status">{message}</p>
  </section>;
}
