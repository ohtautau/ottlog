import type { Metadata } from "next";
import JournalCard from "@/components/journal-card";
import SortDirection from "@/components/sort-direction";
import Link from "next/link";
import { getPosts, getCategories } from "@/lib/posts";
export const metadata: Metadata = {
  title: "所有文章",
  description: "浏览 Ottlog 的技术、生活与随笔记录。",
};
export default async function Posts({ searchParams }: { searchParams: Promise<{ q?: string | string[]; category?: string | string[]; tag?: string | string[]; sort?: string | string[]; direction?: string | string[] }> }) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const category = (typeof params.category === "string" ? params.category : "").trim().slice(0, 100);
  const tag = (typeof params.tag === "string" ? params.tag : "").trim().slice(0, 100);
  const requestedSort = typeof params.sort === "string" ? params.sort : "date";
  // Keep bookmarked URLs from the original combined sort menu working.
  const sort = requestedSort === "title" ? "title" : requestedSort === "minutes" || requestedSort === "shortest" ? "minutes" : "date";
  const direction = params.direction === "asc" || params.direction === "desc" ? params.direction : ["oldest", "shortest", "title"].includes(requestedSort) ? "asc" : "desc";
  const [results, categories, allPosts] = await Promise.all([getPosts({ q, category }), getCategories(), getPosts()]);
  const tags = Array.from(new Set(allPosts.flatMap(post => post.tags))).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const posts = results.filter(post => !tag || post.tags.includes(tag)).sort((a, b) => {
    const order = sort === "title" ? a.title.localeCompare(b.title, "zh-CN") : sort === "minutes" ? a.minutes - b.minutes : a.date.localeCompare(b.date);
    return (direction === "asc" ? order : -order) || a.slug.localeCompare(b.slug);
  });
  return (
    <section className="archive">
      <p className="eyebrow">THE ARCHIVE</p>
      <h1>
        所有文章<span className="serif-accent">.</span>
      </h1>
      <p className="intro">
        一点探索，一点思考。这里有 {posts.length} 篇记录。
      </p>
      <form key={JSON.stringify([q, category, tag, sort, direction])} className="search-form archive-filters" action="/posts" method="get">
        <div><label htmlFor="q">关键词</label><input id="q" name="q" type="search" maxLength={100} defaultValue={q} placeholder="搜索标题、正文或标签" /></div>
        <div><label htmlFor="category">分类</label><select id="category" name="category" defaultValue={category}><option value="">全部分类</option>{category && !categories.some(item => item.name === category) && <option value={category}>{category}</option>}{categories.map(item => <option key={item.name} value={item.name}>{item.name}（{item.count}）</option>)}</select></div>
        <div><label htmlFor="tag">标签</label><select id="tag" name="tag" defaultValue={tag}><option value="">全部标签</option>{tag && !tags.includes(tag) && <option value={tag}>{tag}</option>}{tags.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
        <div className="article-sort-controls"><label htmlFor="sort">排序依据<select id="sort" name="sort" defaultValue={sort}><option value="date">日期</option><option value="title">标题</option><option value="minutes">阅读时间</option></select></label><SortDirection key={direction} value={direction} autoSubmit /></div>
        <button className="button" type="submit">搜索</button>
        {(q || category || tag || sort !== "date" || direction !== "desc") && <Link className="clear-search" href="/posts">清除筛选</Link>}
      </form>
      <div className="journal-grid journal-archive-grid">
        {posts.length === 0 && <div className="empty-state"><h2>没有找到相关文章</h2><p>试试其他关键词，或清除筛选查看全部记录。</p></div>}
        {posts.map((post) => (
          <JournalCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}
