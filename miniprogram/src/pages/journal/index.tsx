import SectionTitle from '../../components/section-title';
import { CoreScreen, MoreSection } from '../../components/page-sections';
﻿import PageScroll from '../../components/page-scroll';
import { useEffect, useRef, useState } from 'react';
import Taro, { useDidShow, useDidHide, useShareAppMessage } from '@tarojs/taro';
import { View, Text, Image, Button } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import { api, Post, websiteOrigin } from '../../api';
import ArticleCard from '../../components/article-card';
import './index.css';

const fallbackMottos = ['发现，选择，前进。', '别评判自己，别审判自己。', '记得分享观察和感受。'];
function nextMotto(current: number, length: number) { return length > 1 ? (current + 1 + Math.floor(Math.random() * (length - 1))) % length : 0; }
export default function Index() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [mottos, setMottos] = useState(fallbackMottos);
  const [mottoIndex, setMottoIndex] = useState(0);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [reaction, setReaction] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  async function load() {
    const request = ++generation.current;
    setBusy(true); setMessage('');
    const [articles, words] = await Promise.allSettled([api<Post[]>('/posts'), api<{mottos:string[]}>('/mottos')]);
    if (request !== generation.current) return;
    if (articles.status === 'fulfilled') setPosts(articles.value);
    else setMessage(articles.reason instanceof Error ? articles.reason.message : '文章暂时加载失败，请稍后重试。');
    if (words.status === 'fulfilled' && Array.isArray(words.value.mottos) && words.value.mottos.length) {
      setMottos(words.value.mottos); setMottoIndex(Math.floor(Math.random() * words.value.mottos.length));
    }
    setBusy(false);
  }
  useDidShow(() => {
    setVisible(true); void load();
    const saved = Taro.getStorageSync('ottlog.motto.likes');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) setLikes(saved);
  });
  useDidHide(() => setVisible(false));
  useShareAppMessage(() => ({title:'Oh, I’m Tau. 让想法在这，栖息和生长。',path:'/pages/journal/index'}));
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    if (!visible || paused || mottos.length < 2) return;
    const timer = setInterval(() => setMottoIndex(index => nextMotto(index, mottos.length)), 6000);
    return () => clearInterval(timer);
  }, [visible, paused, mottos.length]);
  const motto = mottos[mottoIndex] || mottos[0];
  const categories = Array.from(new Set(posts.map(post => post.category))).sort((a,b)=>a.localeCompare(b,'zh-CN'));
  function openPosts(category?: string) {
    Taro.setStorageSync('ottlog.post-filter', { category: category || '', tag: '', q: '' });
    Taro.navigateTo({url:'/pages/posts/index'});
  }
  function like() {
    const current = Number(likes[motto]) || 0;
    const next = {...likes,[motto]:Math.min(Number.MAX_SAFE_INTEGER,current+1)};
    setLikes(next); setReaction(value=>value+1); Taro.setStorageSync('ottlog.motto.likes',next);
  }
  return <PageScroll><View className='page home-page core-page'><CoreScreen moreLabel='最近记录与个人空间'>
    <View className='home-brand'><Image src='/assets/ottlog-logo.png' className='home-brand-icon' mode='aspectFit'/><Text>OTTLOG</Text><Text className='home-edition'>TAU / JOURNAL</Text></View>
    <View className='home-hero'>
      <Text className='home-status'>■ 一个随时可能断更的个人空间</Text>
      <View className='home-poster'>
        <View className='home-heading'><Text className='home-leading'>让想法在这，</Text><View className='home-rest'>栖息<Text className='home-bird'>⌁</Text></View><View className='home-growth'><Text className='home-and'>和</Text>生长<Text className='home-period'>。</Text></View></View>
        <View className='home-mark'><Image src='/assets/ottlog-logo.png' mode='aspectFit'/><Text>发现，选择，前进。</Text></View>
      </View>
      <View className='home-greeting'>Oh, I’m <Text>Tau</Text>.</View>
      <Text className='muted'>这里堆着 Tau 杂七杂八的胡言乱语和小玩具们。</Text>
      <View className='home-start'><ActionButton appearance='primary' className='button-label' onClick={()=>openPosts()}>开始阅读</ActionButton><Text>ohtautau.com</Text></View>
    </View>
    </CoreScreen><MoreSection>
    <View className='home-motto'>
      <Text className='home-quote'>“</Text><Text className='eyebrow'>此刻的一句话 / WORDS</Text>
      <View className='home-motto-text' key={motto}>{motto}</View>
      <View className='home-motto-actions'><View className='home-like-wrap'><ActionButton className='button-label' onClick={like} aria-label='给这条格言点赞'>♥ {Number(likes[motto]) || 0}</ActionButton>{reaction>0&&<Text key={reaction} className='home-reaction'>+1</Text>}</View><Text>{String(mottoIndex+1).padStart(2,'0')} / {mottos.length}</Text><ActionButton className="button-label button-secondary" onClick={()=>setMottoIndex(index=>nextMotto(index,mottos.length))}>换一句</ActionButton><Button className='button-secondary home-motto-toggle' ariaLabel={paused ? '播放' : '暂停'} onClick={()=>setPaused(value=>!value)}><View className={paused ? 'motto-play-icon' : 'motto-pause-icon'} /></Button></View>
    </View>
    <View className='section-heading'><View><SectionTitle inRow className='section-heading-title'>最近的记录</SectionTitle><Text className='section-heading-sub'>/ LATEST</Text></View><ActionButton className="button-label button-small" onClick={()=>openPosts()}>查看全部</ActionButton></View>
    {message&&<View className='notice'>{message}<ActionButton className='button-label' onClick={()=>void load()}>重新连接</ActionButton></View>}
    {busy&&!posts.length&&<View className='notice'>正在翻开最近的记录…</View>}
    {!busy&&!message&&!posts.length&&<View className='notice'>暂无公开文章</View>}
    {posts.slice(0,3).map(post=><ArticleCard key={post.slug} post={post}/>)}
    <View className='home-categories'><View className='card-title'>分类</View><View className='home-topic-list'>{categories.map(category=><ActionButton className='button-label' key={category} onClick={()=>openPosts(category)}>{category}</ActionButton>)}</View><ActionButton className="button-label button-secondary" onClick={()=>Taro.navigateTo({url:'/pages/categories/index'})}>浏览分类</ActionButton></View>
    <View className='home-footer'><View className='home-footer-actions'><ActionButton className='button-label' onClick={()=>Taro.switchTab({url:'/pages/favorites/index'})}>我的收藏</ActionButton><ActionButton className='button-label' onClick={()=>Taro.setClipboardData({data:websiteOrigin+'/feed.xml'})}>复制 RSS 地址</ActionButton></View></View>
  </MoreSection></View></PageScroll>;
}

