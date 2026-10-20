import { trimTextEnd } from '../../lib/text-whitespace';
import { CoreScreen, MoreSection } from '../../components/page-sections';
import PageScroll from '../../components/page-scroll';
﻿import { useRef, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, Button, Input } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import SectionTitle from '../../components/section-title';
import { personalDataNotice } from '../../lib/tool-status-display';
import { api, favorites, Post, Session } from '../../api';
import './index.css';

type Favorite = Pick<Post, 'slug' | 'title'>;
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : '连接失败，请稍后重试';

export default function Favorites() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [session, setSession] = useState<Session>();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [listError, setListError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const requestId = useRef(0);

  async function load() {
    const current = ++requestId.current;
    setLoading(true); setMessage(''); setListError('');
    try {
      const account = await api<Session>('/account/session');
      if (current !== requestId.current) return;
      setSession(account);
      setItems([]);
      if (account.authenticated) {
        try {
          const saved = await favorites();
          if (current === requestId.current) setItems(saved);
        } catch (reason) { if (current === requestId.current) setListError(errorMessage(reason)); }
      }
    } catch (reason) { if (current === requestId.current) setMessage(errorMessage(reason)); }
    finally { if (current === requestId.current) setLoading(false); }
  }
  useDidShow(() => { void load(); });

  async function act(task: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setMessage('');
    try { await task(); }
    catch (reason) { setMessage(errorMessage(reason)); }
    finally { actionLock.current = false; setBusy(false); }
  }
  function authenticate() {
    void act(async () => {
      await api(`/account/${register ? 'register' : 'login'}`, 'POST', { userName: userName.trim(), password });
      Taro.eventCenter.trigger('ottlog-session');
      setPassword('');
      await load();
    });
  }
  function remove(item: Favorite) {
    void act(async () => {
      await api(`/favorites/${encodeURIComponent(item.slug)}`, 'DELETE');
      setItems(previous => previous.filter(saved => saved.slug !== item.slug));
    });
  }
  const canAuthenticate = !!userName.trim() && (register ? password.length >= 12 : !!password);
  return <PageScroll><View className='page account-page core-page'><CoreScreen moreLabel='收藏与更多入口'>
    <View className='account-heading'><View className='account-title'>我的空间<Text className='account-title-dot'>.</Text></View></View>
    {message && <View className='notice'><Text>{message}</Text>{!busy && <ActionButton className='button-label' onClick={() => { void load(); }}>重新连接</ActionButton>}</View>}
    {loading && <View className='account-loading'><View className='account-loading-line' /><Text className='muted'>正在同步你的账号与收藏…</Text></View>}
    {!loading && session?.authenticated && <>
      <View className='account-profile'>
        <View className='account-profile-badge'>{session.userName?.slice(0, 1).toUpperCase() || 'T'}</View>
        <View className='account-profile-text'><View className='account-user-name'>{session.userName}</View><Text className='account-profile-caption'>{session.isAdmin ? '管理员账号' : '读者账号'}</Text></View>
        <ActionButton className="button-label account-sign-out" disabled={busy} onClick={() => { void act(async () => { await api('/account/logout', 'POST'); Taro.eventCenter.trigger('ottlog-session'); setSession(undefined); setItems([]); await load(); }); }}>退出</ActionButton>
      </View>
    </>}
    {!loading && session && !session.authenticated && <View className='account-auth'>
      <View className='account-tabs'><ChoiceButton className={'button-label ' + (!register ? 'account-tab selected' : 'account-tab')} disabled={busy} onClick={() => { setRegister(false); setMessage(''); }}>登录</ChoiceButton><ChoiceButton className={'button-label ' + (register ? 'account-tab selected' : 'account-tab')} disabled={busy} onClick={() => { setRegister(true); setMessage(''); }}>创建账号</ChoiceButton></View>
      
      <Text className='account-help'>{register ? '创建读者账号，网页与小程序均可使用。' : '登录同一账号，同步网页的待办、习惯、备忘录和收藏。'}</Text>
      <View className='account-field'><Text className='account-label'>账号</Text><Input placeholder='输入博客账号' maxlength={50} value={userName} disabled={busy} onInput={event => setUserName(event.detail.value)} /></View>
      <View className='account-field'><Text className='account-label'>密码</Text><Input placeholder={register ? '至少 12 位密码' : '输入密码'} password maxlength={128} value={password} disabled={busy} confirmType='done' onInput={event => setPassword(event.detail.value)} onConfirm={() => { if (canAuthenticate) authenticate(); }} /></View>
      <ActionButton appearance='primary' className="button-label account-submit" loading={busy} disabled={busy || !canAuthenticate} onClick={authenticate}>{register ? '注册并登录' : '登录并同步'}</ActionButton>

    </View>}
    {!loading && session?.authenticated && <View className='account-core-tools'><ActionButton appearance='primary' className='button-label tool-primary' onClick={() => void Taro.switchTab({ url: '/pages/todos/index' })}>打开我的待办 ↗</ActionButton><ActionButton className='button-label tool-secondary' onClick={() => void Taro.navigateTo({ url: '/pages/memos/index' })}>记下一点想法 ↗</ActionButton></View>}
    </CoreScreen><MoreSection title='我的收藏与工具'>
    {session && <View className='account-data-notice'><SectionTitle>数据保存与同步</SectionTitle><View className='account-auth-note'>{personalDataNotice(session.authenticated)}</View></View>}
    {!loading && session?.authenticated && <>
      <View className='account-list-header'><Text>收藏的文章</Text><Text className='account-count'>{items.length.toString().padStart(2, '0')}</Text></View>
      
      {listError ? <View className='notice'><Text>{listError}</Text><ActionButton className='button-label' disabled={busy} onClick={() => { void load(); }}>重新加载收藏</ActionButton></View> : <>
        {!items.length && <View className='account-empty'><View className='account-empty-star'>☆</View><View className='account-empty-title'>暂无收藏</View><ActionButton className='button-label' onClick={() => { void Taro.navigateTo({ url: '/pages/posts/index' }); }}>去读读文章</ActionButton></View>}
        {items.map((item, index) => <View className='account-saved-card' key={item.slug}>
          <View className='account-saved-open' onClick={() => { void Taro.navigateTo({ url: `/pages/detail/index?slug=${encodeURIComponent(item.slug)}` }); }}><Text className='account-saved-number'>{(index + 1).toString().padStart(2, '0')}</Text><View className='account-saved-title'>{trimTextEnd(item.title)}</View></View>
          <View className='account-saved-bottom'><Text className='account-read' onClick={() => { void Taro.navigateTo({ url: `/pages/detail/index?slug=${encodeURIComponent(item.slug)}` }); }}>阅读全文</Text><ActionButton className="button-label account-remove" disabled={busy} onClick={() => remove(item)}>移除收藏</ActionButton></View>
        </View>)}
      </>}
    </>}
    <View className='account-links'><Button ariaLabel='打开统计' onClick={() => void Taro.navigateTo({ url: '/pages/statistics/index' })}><Text>统计</Text><Text>↗</Text></Button><Button onClick={() => void Taro.navigateTo({ url: '/pages/journal/index' })}><Text>Tau 的个人空间</Text><Text>↗</Text></Button><Button onClick={() => void Taro.navigateTo({ url: '/pages/categories/index' })}><Text>分类与标签</Text><Text>↗</Text></Button><Button onClick={() => void Taro.switchTab({ url: '/pages/index/index' })}><Text>回到今日 · 日常工具</Text><Text>↗</Text></Button></View>
  </MoreSection></View></PageScroll>;
}

