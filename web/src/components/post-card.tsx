import PostDate from "@/components/post-date";
import Link from "next/link";
import { type PostSummary } from "@/lib/posts";
export default function PostCard({
  post,
  index,
}: {
  post: PostSummary;
  index: number;
}) {
  return (
    <article className="post-card">
      <div className="post-index">{String(index + 1).padStart(2, "0")}</div>
      <div className="post-copy">
        <div className="eyebrow post-meta">
          <span className="post-category">{post.category}</span>
          <PostDate date={post.date} />
        </div>
        <h3>
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.description}</p>
        <div className="tags">
          {post.tags.map((tag) => (
            <span className="article-tag" key={tag}><span aria-hidden="true">#</span> {tag}</span>
          ))}
          <span>{post.minutes} 分钟阅读</span>
        </div>
      </div>
    </article>
  );
}
