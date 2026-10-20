import { trimTextEnd } from '../../lib/text-whitespace';
import SectionTitle from '../../components/section-title';
import { CoreScreen, MoreSection } from '../../components/page-sections';
import PageScroll from '../../components/page-scroll';
import { requestAppConfirmation, showAppMessage } from '../../lib/app-dialog';
import { useMemo, useRef, useState } from 'react';
import Taro, { useLoad, useDidShow, useShareAppMessage } from '@tarojs/taro';
import { View, Text, RichText, Input, Textarea, Image } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import { api, Comment, favorites, imageUrl, Post, Session, websiteOrigin } from '../../api';
import { createMarkdownRenderer } from '../../lib/markdown';
import { openPostFilter } from '../../components/article-card';
import { decodeRouteValue } from '../../lib/route-value';
import { tagLabel } from '../../lib/tag-label';
import './index.css';

const renderMarkdown = createMarkdownRenderer(imageUrl);
const failure = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export default function Detail() {
  const slugRef = useRef('');
  const [slug, setSlug] = useState('');
  const [post, setPost] = useState<Post>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [account, setAccount] = useState<Session>();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentAnchor, setCommentAnchor] = useState('');

  async function loadComments(value: string) {
    setCommentsLoading(true); setCommentsError('');
    try { setComments(await api<Comment[]>(`/posts/${encodeURIComponent(value)}/comments`)); }
    catch (reason) { setCommentsError(failure(reason, '留言加载失败，请重试')); }
    finally { setCommentsLoading(false); }
  }
  async function load(value: string) {
    setLoading(true); setError('');
    if (!value) { setError('文章地址不完整，请返回文章列表重新打开。'); setLoading(false); return; }
    try {
      const article = await api<Post>(`/posts/${encodeURIComponent(value)}`);
      setPost(article);
      void Taro.setNavigationBarTitle({ title: article.title });
      void loadComments(value);
    } catch (reason) { setError(failure(reason, '文章加载失败，请重试')); }
    finally { setLoading(false); }
  }
  async function loadFavorite() {
    setSaveError('');
    try {
      const session = await api<Session>('/account/session'); setAccount(session);
      if (session.authenticated) {
        const list = await favorites();
        setSaved(list.some(item => item.slug === slugRef.current));
      } else { setSaved(false); }
    } catch (reason) { setSaveError(failure(reason, '收藏状态未能同步')); }
  }
  useLoad(params => {
    const value = decodeRouteValue(params.slug); slugRef.current = value; setSlug(value); void load(value);
  });
  useDidShow(() => { void loadFavorite(); });
  useShareAppMessage(() => ({ title: post?.title ?? 'Ottlog', path: `/pages/detail/index?slug=${encodeURIComponent(slug)}`, imageUrl: post?.coverUrl ? imageUrl(post.coverUrl) : undefined }));
  const html = useMemo(() => renderMarkdown(post?.content ?? ''), [post?.content]);

  async function toggleFavorite() {
    if (saveBusy) return;
    if (!account?.authenticated) {
      const result = await requestAppConfirmation({ title: '把喜欢的文章留在账号里', content: '登录博客账号后，网页和小程序可以同步收藏。', confirmText: '去登录', cancelText: '继续阅读' });
      if (result.confirm) await Taro.switchTab({ url: '/pages/favorites/index' });
      return;
    }
    setSaveBusy(true); setSaveError('');
    try {
      await api(`/favorites/${encodeURIComponent(slug)}`, saved ? 'DELETE' : 'PUT');
      setSaved(!saved);
    } catch (reason) { setSaveError(failure(reason, '收藏失败，请重试')); }
    finally { setSaveBusy(false); }
  }
  async function sendComment() {
    if (sending || !name.trim() || !text.trim()) return;
    setSending(true); setCommentMessage('');
    try {
      await api(`/posts/${encodeURIComponent(slug)}/comments`, 'POST', { name: name.trim(), text: text.trim() });
      setText(''); setCommentMessage('留言已收到，审核通过后会展示。');
    } catch (reason) { setCommentMessage(failure(reason, '提交失败，请重试')); }
    finally { setSending(false); }
  }
  function openCategory(category: string) { openPostFilter({ category }); }

  return <PageScroll scrollIntoView={commentAnchor}><View className='page detail-page core-page'>
    {loading && !post && <View className='detail-loading'><Text className='eyebrow'>OTTLOG / READING</Text><View className='detail-skeleton' /><View className='detail-skeleton short' /><Text className='muted'>正在翻开这篇记录…</Text></View>}
    {error && <View className='notice'><Text>{error}</Text><ActionButton className='button-label' onClick={() => load(slug)}>重新加载</ActionButton></View>}
    {post && <><CoreScreen moreLabel='阅读全文'>
      <View className='detail-heading'>
        <View className='detail-meta'><Text className='detail-category' onClick={() => openCategory(post.category)}>{post.category}</Text><Text>{post.minutes} 分钟阅读</Text></View>
        <View className='detail-title'>{trimTextEnd(post.title)}</View>
        <View className='detail-byline'><Text className='detail-avatar'>τ</Text><Text>Tau</Text><Text className='detail-date'>{post.date.slice(0, 10).split('-').join('.')}</Text></View>
        {post.description && <View className='detail-description'>{trimTextEnd(post.description)}</View>}

      </View>
      {post.coverUrl && <Image className='detail-cover' mode='widthFix' src={imageUrl(post.coverUrl)} />}
      </CoreScreen><MoreSection>
        {post.tags.length > 0 && <View className='detail-tags'>{post.tags.map(tag => <Text key={tag} className='detail-tag' onClick={() => openPostFilter({ tag })}>{tagLabel(tag)}</Text>)}</View>}
      <View className='detail-prose'><RichText nodes={html} userSelect /></View>
      <View className='detail-end'><Text>记录到这里。</Text><Text>OTTLOG / TAU</Text></View>
      <View className='detail-actions'><ActionButton className={'button-label ' + (saved ? 'detail-saved' : '')} loading={saveBusy} disabled={saveBusy} onClick={toggleFavorite}>{saved ? '★ 已收藏' : '☆ 收藏文章'}</ActionButton><ActionButton className='button-label' openType='share'>分享</ActionButton><ActionButton className='button-label' onClick={() => { setCommentAnchor(''); setTimeout(() => setCommentAnchor('article-comments'), 30); }}>留言 {comments.length || ''}</ActionButton></View>
      <ActionButton className="button-label detail-copy" onClick={() => { void Taro.setClipboardData({ data: `${websiteOrigin}/posts/${encodeURIComponent(slug)}` }).catch(() => showAppMessage({ title: '复制失败，请重试', icon: 'none' })); }}>复制博客链接</ActionButton>
      {saveError && <View className='detail-error'><Text>{saveError}</Text><Text className='detail-text-button' onClick={() => { void loadFavorite(); }}>重新同步收藏</Text></View>}
      <View className='detail-comments' id='article-comments'>
        <View className='detail-section-title'><SectionTitle inRow>读者留言</SectionTitle><Text className='eyebrow'>{comments.length.toString().padStart(2, '0')}</Text></View>
        {commentsLoading && <View className='muted'>正在加载留言…</View>}
        {commentsError && <View className='detail-error'><Text>{commentsError}</Text><Text className='detail-text-button' onClick={() => { void loadComments(slug); }}>重新加载留言</Text></View>}
        {!commentsLoading && !commentsError && !comments.length && <View className='detail-empty'>暂无留言</View>}
        {comments.map(comment => <View className='detail-comment' key={comment.id}><View className='detail-comment-head'><Text className='detail-comment-author'>{trimTextEnd(comment.name)}</Text><Text className='detail-comment-date'>{comment.createdAt.slice(0, 10).split('-').join('.')}</Text></View><Text className='detail-comment-content' selectable>{trimTextEnd(comment.text)}</Text></View>)}
        <View className='detail-comment-form'><Text className='detail-label'>留下一句话</Text><Input maxlength={40} placeholder='你的昵称' value={name} onInput={event => setName(event.detail.value)} /><Textarea maxlength={2000} placeholder='读完以后，想说点什么？' value={text} onInput={event => setText(event.detail.value)} /><View className='detail-form-note'><Text>审核通过后展示</Text><Text>{text.length} / 2000</Text></View><ActionButton appearance='primary' className='button-label' disabled={sending || !name.trim() || !text.trim()} loading={sending} onClick={sendComment}>提交留言</ActionButton>{commentMessage && <View className='detail-feedback'>{commentMessage}</View>}</View>
      </View>
    </MoreSection></>}
  </View></PageScroll>;
}

