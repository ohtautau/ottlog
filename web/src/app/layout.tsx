import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import "@fontsource-variable/noto-sans-sc";
import "./globals.css";
import BackgroundMeteors from "@/components/background-meteors";
import SiteHeader from "@/components/site-header";
export const viewport: Viewport = {
  themeColor: "#111a27",
  colorScheme: "dark",
};
export const metadata: Metadata = {
  title: { default: "首页", template: "%s · Ottlog" },
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
  description: "一个记录技术探索、日常生活与思考的个人博客。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Restore the initial CSS scale before the first paint, ahead of React hydration. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=Number(sessionStorage.getItem("ottlog-bird-progress-v1"));document.documentElement.style.setProperty("--living-elapsed",(Number.isFinite(t)?Math.max(0,Math.min(3600,t)):0)+"s")}catch{}` }} />
      </head>
      <body>
        <BackgroundMeteors />
        <a className="skip-link" href="#main">
          跳到正文
        </a>
        <SiteHeader />
        <main id="main" className="shell">
          {children}
        </main>
        <footer className="shell footer">
          <Link className="footer-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/ottlog-logo.svg" alt="" width={32} height={32} />
            Ottlog.
          </Link>
        <span className="footer-motto">这你也能看到？</span>
        <nav className="footer-links" aria-label="页脚导航">
          <Link href="/favorites">收藏</Link>
          <Link href="/subscribe">RSS 订阅</Link>
        </nav>
          <span>© {new Date().getFullYear()} Ottlog</span>
        </footer>
      </body>
    </html>
  );
}
