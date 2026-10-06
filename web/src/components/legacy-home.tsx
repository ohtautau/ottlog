import Link from "next/link";
import HomePages from "@/components/home-pages";
import LivingTitle from "@/components/living-title";
import MottoBanner from "@/components/motto-banner";
import JournalCard from "@/components/journal-card";
import { getPosts } from "@/lib/posts";
export default async function Home() {
  const posts = await getPosts();
  const categories = Array.from(new Set(posts.map(post => post.category))).sort((a, b) => a.localeCompare(b, "zh-CN"));
  return (
    <HomePages welcome={<>
      <section className="hero">
        <div>
          <p className="eyebrow"><span className="status-dot" /> 一个随时可能断更的个人空间</p>
          <LivingTitle />
          <p className="hero-description"><span className="hero-greeting" lang="en">Oh, I’m <strong>Tau</strong>.</span><br />这里堆着 <strong className="tau-name">Tau</strong> 杂七杂八的胡言乱语和小玩具们。</p>
          <Link className="button" href="/posts">开始阅读 </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="art-caption">OTTLOG / PERSONAL JOURNAL</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-mark" src="/images/ottlog-logo.svg" alt="" width={320} height={320} />
          <div className="art-bottom"><span>发现，选择，前进。</span><span className="poster-arrow">→</span></div>
        </div>
      </section>
      <MottoBanner />
    </>} recent={<>
      <section className="home-content">
        <div>
          <div className="section-heading">
            <h2>最近的记录<span> / LATEST</span></h2>
            <Link className="button view-all" href="/posts">查看全部 </Link>
          </div>
          <div className="journal-grid journal-home-grid">
            {posts.slice(0, 3).map((post) => <JournalCard key={post.slug} post={post}  />)}
            {posts.length === 0 && <p className="empty-state">还没有发布文章，期待第一篇记录。</p>}
          </div>
        </div>
        <aside className="about">
          <span className="eyebrow">ABOUT THIS SPACE</span>
          <div className="avatar">o.</div>
          <h2>诺，下面是分类。</h2>
          <p>我去，你谁？</p>
          <div className="about-line" />
          <span className="eyebrow">正在记录</span>
          <div className="topics" aria-label="文章分类">{categories.map(category => <Link key={category} href={`/posts?${new URLSearchParams({ category })}`}>{category}</Link>)}</div>
          <p className="small-note">看得出来，这网站的主人是个强迫症患者。</p>
        </aside>
      </section>
    </>} />
  );
}
