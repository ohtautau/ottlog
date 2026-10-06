import PostDate from "@/components/post-date";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarkdownContent from "@/components/markdown-content";
import ArticleCommunity from "@/components/article-community";
import { getPost } from "@/lib/posts";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return post
    ? {
        title: post.title,
        description: post.description,
        openGraph: {
          title: post.title,
          description: post.description,
          type: "article",
          publishedTime: post.date,
        },
      }
    : { title: "文章不存在" };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return (
    <article className="article">
      <Link className="back-link" href="/posts">
        返回所有文章
      </Link>
      <header className="article-header">
        <p className="eyebrow"><span className="article-badge">{post.category}</span></p>
        <h1>{post.title}</h1>
        <p className="intro">{post.description}</p>
        <div className="article-meta">
          <span>Ottlog</span>
          <PostDate date={post.date} />
          <span>{post.minutes} 分钟阅读</span>
        </div>
        <div className="article-tags" aria-label="文章标签">
          {post.tags.map((tag) => (
            <span className="article-tag" key={tag}><span aria-hidden="true">#</span> {tag}</span>
          ))}
        </div>
      </header>
      {post.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */
        <img className="cover-image" src={post.coverUrl} alt={post.title} />}
      <div className="prose">
        <MarkdownContent>
          {post.content}
        </MarkdownContent>
      </div>
      <div className="article-end">
        — 感谢阅读 —<br />
        <Link href="/posts">继续阅读其他文章</Link>
      </div>
      <ArticleCommunity slug={post.slug} title={post.title} />
    </article>
  );
}
