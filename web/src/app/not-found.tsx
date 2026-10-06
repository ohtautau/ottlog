import Link from "next/link";
export default function NotFound() {
  return (
    <section className="archive">
      <p className="eyebrow">404 / NOT FOUND</p>
      <h1>这篇记录还未抵达。</h1>
      <p className="intro">页面不存在，或文章地址已经更改。</p>
      <Link className="button" href="/posts">
        浏览所有文章
      </Link>
    </section>
  );
}
