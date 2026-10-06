import PostDate from "@/components/post-date";
import { automaticCover } from "@/lib/automatic-cover";
import Link from "next/link";
import { type PostSummary } from "@/lib/posts";
import styles from "./journal-card.module.css";

export default function JournalCard({ post, featured = false }: { post: PostSummary; featured?: boolean }) {
  return (
    <article data-journal-card className={`${styles.card}${featured ? ` ${styles.featured}` : ""}`}>
      <Link className={styles.link} href={`/posts/${post.slug}`} aria-label={post.title}>
        <div className={styles.cover}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverUrl || automaticCover(post.slug)} alt="" width={640} height={420} loading={featured ? "eager" : "lazy"} />
          {featured && <span className={styles.latest}><span aria-hidden="true">●</span> 最新记录</span>}
        </div>
        <div className={styles.body}>
          <div className={styles.meta}>
            <span className={styles.category}>{post.category}</span>
            <span className={styles.duration}>{post.minutes} 分钟阅读</span>
          </div>
          <h2 className={styles.title}>{post.title}</h2>
          {post.description && <p className={styles.description}>{post.description}</p>}
          {post.tags.length > 0 && <div className={styles.tags} aria-label="文章标签">{post.tags.map(tag => <span key={tag}><span aria-hidden="true">#</span>{tag}</span>)}</div>}
          <div className={styles.footer}>
            <PostDate date={post.date} />
            <span className={styles.read}>阅读全文</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
