"use client";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return <section className="archive"><p className="eyebrow">暂时无法加载</p><h1>记录正在路上。</h1><p className="intro">暂时无法获取文章，请稍后重试。</p><button className="button" onClick={retry}>重新加载 ↻</button></section>;
}
