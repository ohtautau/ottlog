import { trimTextEnd } from '../../lib/text-whitespace';
import SectionTitle from '../../components/section-title';
import { CoreScreen, MoreSection } from '../../components/page-sections';
import PageScroll from '../../components/page-scroll';
import { useMemo, useRef, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import { api, type Post } from '../../api';
import { openPostFilter } from '../../components/article-card';
import { postGroups } from '../../lib/post-filter';
import { tagLabel } from '../../lib/tag-label';
import './index.css';

const accents = ['#6ca1f0', '#81bda8', '#d69b83', '#a999db'];

export default function CategoriesPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);
  const groups = useMemo(() => postGroups(posts), [posts]);
  async function load() {
    const request = ++requestId.current;
    setBusy(true); setMessage('');
    try { const items = await api<Post[]>('/posts'); if (request === requestId.current) setPosts(items); }
    catch (error) { if (request === requestId.current) setMessage(error instanceof Error ? error.message : '连接失败，请重试'); }
    finally { if (request === requestId.current) setBusy(false); }
  }
  useDidShow(() => { void load(); });

  return <PageScroll><View className='page categories-page core-page'><CoreScreen moreLabel='更多分类与标签'>
    <Text className='eyebrow'>OTTLOG / COLLECTIONS</Text>
    <View className='categories-title'><View>诺，下面</View><View>是分类<Text>。</Text></View></View>
    <View className='categories-summary'><Text>{groups.categories.length} 个分类</Text><Text>{posts.length} 篇记录</Text><Text>{groups.tags.length} 个标签</Text></View>
    {busy && !posts.length && <View className='categories-loading'>正在整理分类…</View>}
    {message && <View className='notice'><Text>{message}</Text><ActionButton className='button-label' onClick={load}>重新连接</ActionButton></View>}
    {!busy && !message && !posts.length && <View className='notice'><View>分类从第一篇记录开始。</View><Text className='muted'>发布到小程序的文章会自动出现在这里。</Text></View>}
    <View className='categories-grid'>{groups.categories.slice(0, 4).map((group, index) => <Button key={group.name} className='categories-tile' style={{ borderTopColor: accents[index % accents.length] }} onClick={() => void openPostFilter({ category: group.name })}>
      <View className='categories-tile-top'><Text style={{ color: accents[index % accents.length] }}>{String(index + 1).padStart(2, '0')}</Text><Text>COLLECTION</Text></View>
      <View className='categories-tile-name'>{trimTextEnd(group.name)}</View>
      <View className='categories-tile-bottom'><Text>{group.count} 篇文章</Text><View className='categories-tile-mark' style={{ backgroundColor: accents[index % accents.length] }} /></View>
    </Button>)}</View>
    </CoreScreen><MoreSection title='分类与标签'>
    {groups.categories.length > 4 && <>    <View className='categories-grid'>{groups.categories.slice(4).map((group, index) => <Button key={group.name} className='categories-tile' style={{ borderTopColor: accents[index % accents.length] }} onClick={() => void openPostFilter({ category: group.name })}>
      <View className='categories-tile-top'><Text style={{ color: accents[index % accents.length] }}>{String(index + 1).padStart(2, '0')}</Text><Text>COLLECTION</Text></View>
      <View className='categories-tile-name'>{trimTextEnd(group.name)}</View>
      <View className='categories-tile-bottom'><Text>{group.count} 篇文章</Text><View className='categories-tile-mark' style={{ backgroundColor: accents[index % accents.length] }} /></View>
    </Button>)}</View>
</>}
    {groups.tags.length > 0 && <View className='categories-tags-section'>
      <View className='categories-tags-heading'><SectionTitle inRow>顺着标签看看</SectionTitle><Text>/ TAGS</Text></View>
      <View className='categories-tags'>{groups.tags.map(tag => <Button key={tag.name} onClick={() => void openPostFilter({ tag: tag.name })}><Text className='categories-hash'>#</Text>{tagLabel(tag.name).slice(1)}<Text className='categories-tag-count'>{tag.count}</Text></Button>)}</View>
    </View>}
    <ActionButton className="button-label categories-all" onClick={() => void openPostFilter({})}>浏览所有文章</ActionButton>
  </MoreSection></View></PageScroll>;
}
