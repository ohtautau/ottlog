"use client";
import { useState } from "react";
export default function Subscribe() {
  const [message, setMessage] = useState("");
  return <section className="archive"><p className="eyebrow">FOLLOW AT YOUR OWN PACE</p><h1>订阅 Ottlog</h1><p className="intro">用 RSS 阅读器接收新文章，无需注册，也无需提供邮箱。</p><ol className="subscribe-steps"><li>复制下面的订阅地址。</li><li>在你使用的 RSS 阅读器中选择“添加订阅”。</li><li>粘贴地址，保存后即可获取博客更新。</li></ol><label>正式站点订阅地址<input readOnly value="https://ohtautau.com/feed.xml" /></label><div className="admin-actions"><button className="button" onClick={async () => { try { await navigator.clipboard.writeText("https://ohtautau.com/feed.xml"); setMessage("订阅地址已复制"); } catch { setMessage("请手动选择并复制上方地址"); } }}>复制订阅地址</button><a href="/feed.xml">查看当前站点 RSS 原始文件</a></div><p className="hint">正式地址在网站上线后可用。本地测试地址为 http://localhost:3000/feed.xml。</p><h2>为什么原始文件是一段代码？</h2><p>RSS 是供阅读器解析的 XML 数据。浏览器直接打开会显示标签和文字，这是正常现象；将地址添加到阅读器后，就会显示为文章列表。</p><p role="status">{message}</p></section>;
}
