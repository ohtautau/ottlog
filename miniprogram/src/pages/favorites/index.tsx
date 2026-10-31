import { useRef, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import { api, favorites, type Post, type Session } from '../../api';
import { openAccount } from '../../lib/account-navigation';
import { SavedArticleCard } from '../../components/data-card-views';
import EmptyState from '../../components/empty-state';
import CardGroupContent from '../../components/card-group-content';
import ActionButton from '../../components/ui-button';
import PageScroll from '../../components/page-scroll';
import { CoreScreen } from '../../components/page-sections';
import SectionTitle from '../../components/section-title';
import './index.css';

type Favorite = Pick<Post, 'slug' | 'title'>;
export default function Favorites() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [session, setSession] = useState<Session>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0), lock = useRef(false);
  async function load() {
    const current = ++request.current;
    setLoading(true); setError(''); setItems([]); setSession(undefined);
    try {
      const account = await api<Session>('/account/session');
      if (current !== request.current) return;
      setSession(account);
      if (account.authenticated) {
        const saved = await favorites();
        if (current === request.current) setItems(saved);
      }
    } catch (reason) { if (current === request.current) setError(reason instanceof Error ? reason.message : '读取收藏失败'); }
    finally { if (current === request.current) setLoading(false); }
  }
  useDidShow(() => { void load(); });
  async function remove(item: Favorite) {
    if (lock.current || !session?.authenticated) return;
    lock.current = true; setBusy(true); setError('');
    const current = request.current;
    try {
      await api(`/favorites/${encodeURIComponent(item.slug)}`, 'DELETE', undefined, `${session.isAdmin ? 'admin' : 'reader'}:${session.userName}`);
      if (current === request.current) setItems(previous => previous.filter(saved => saved.slug !== item.slug));
    } catch (reason) { if (current === request.current) setError(reason instanceof Error ? reason.message : '移除收藏失败'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <PageScroll snapSections={[]}><View className='page favorites-page core-page'><CoreScreen>
    <SectionTitle className='card-group-heading'>收藏的文章</SectionTitle>
    {loading ? <Text className='tool-status'>正在读取收藏…</Text> : error ? <View className='notice' role='alert'><Text>{error}</Text><ActionButton disabled={busy} onClick={() => { void load(); }}>重新读取</ActionButton></View> : !session?.authenticated ? <ActionButton appearance='primary' onClick={() => { void openAccount(); }}>登录查看收藏</ActionButton> : <ScrollView className='favorites-scroll' scrollY enhanced bounces={false} showScrollbar={false}><CardGroupContent>
      {!items.length ? <EmptyState kind='favorites' /> : items.map((item, index) => <SavedArticleCard key={item.slug} title={item.title} index={index} onOpen={() => { void Taro.navigateTo({ url: `/pages/detail/index?slug=${encodeURIComponent(item.slug)}` }); }} actions={<ActionButton appearance='secondary' size='compact' disabled={busy} onClick={() => { void remove(item); }}>移除收藏</ActionButton>} />)}
    </CardGroupContent></ScrollView>}
  </CoreScreen></View></PageScroll>;
}
