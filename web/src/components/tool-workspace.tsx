'use client';
import { createElement, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { websiteRoute } from '../../shared-app/routes';
import './tool-workspace.css';
const headings: Record<string, [string,string]> = {
  index: ['今日', '快速记下一件事，继续今天的安排。'], todos: ['任务', '分清轻重缓急，把下一步安排好。'],
  domains: ['领域', '把目标、习惯与日常记录放在一起。'], 'domain-detail': ['领域详情', '持续记录目标、习惯与每一步记录。'],
  daily: ['习惯', '把想做的事放进日常，慢慢积累。'], memos: ['便签', '留住零碎念头，也方便重新找到。'],
  pomodoro: ['专注', '为眼前的一件事留一段完整时间。'],
  articles: ['文章', '管理当前账号的文章。'],
  statistics: ['统计', '从已有记录中看看近期的变化。'], mottos: ['格言', '管理首页轮播中留给自己的话。'],
};
export default function ToolWorkspace({ page = 'index', query = '' }: { page?: string; query?: string }) {
  const router = useRouter();
  const [title] = headings[page] || headings.index;
  const viewport = true;
  useEffect(() => {
    if (/^#\/?pages\/[a-z-]+\/index(?:\?|$)/.test(location.hash)) router.replace(websiteRoute(location.hash));
    const navigate = (event: Event) => {
      const detail = (event as CustomEvent<{url:string;replace?:boolean}>).detail;
      if (!detail || typeof detail.url !== 'string' || !/^\/(?!\/)/.test(detail.url)) return;
      if (detail.replace) router.replace(detail.url); else router.push(detail.url);
    };
    window.addEventListener('ottlog:navigate', navigate); return () => window.removeEventListener('ottlog:navigate', navigate);
  }, [router]);
  return <section aria-label={title} data-tool-workspace={page} data-tool-layout={viewport ? 'viewport' : undefined} className='tool-workspace'>
    <link rel='stylesheet' href='/tool-app/app.css' precedence='tool-app' />
    {createElement('ottlog-tools', { key: `${page}:${query}`, 'data-page': page, 'data-query': query })}
    <Script id='ottlog-tools-runtime' src='/tool-app/app.js' type='module' strategy='afterInteractive' />
  </section>;
}
