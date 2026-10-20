import { CoreScreen, MoreSection } from '../../components/page-sections';
import PageScroll from '../../components/page-scroll';
import { useMemo, useRef, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, Input } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import { api, type Post } from '../../api';
import ArticleCard from '../../components/article-card';
import PageToolbar, { CategoryButton, CategoryRow, ToolbarResetButton } from '../../components/page-toolbar';
import { SortDirection, SortOptions, SortPopover } from '../../components/sort-options';
import { ChoicePopover, SingleChoiceField } from '../../components/form-options';
import { FilterFieldHeading } from '../../components/filter-popover';
import { defaultPostFilter, filterPosts, postGroups, POST_FILTER_STORAGE_KEY, readPostFilterLink, type PostFilter } from '../../lib/post-filter';
import { tagLabel } from '../../lib/tag-label';
import './index.css';

const pageSizes = [10, 20, 50];
const sorts = [{ name: '发布时间', value: 'date' }, { name: '文章标题', value: 'title' }, { name: '阅读时长', value: 'minutes' }] as const;

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<PostFilter>({ ...defaultPostFilter });
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [visible, setVisible] = useState(10);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);
  const groups = useMemo(() => postGroups(posts), [posts]);
  const results = useMemo(() => filterPosts(posts, filter), [posts, filter]);
  const categories = ['全部分类', ...groups.categories.map(group => group.name)];
  const tags = ['全部标签', ...groups.tags.map(group => group.name)];

  async function load() {
    const request = ++requestId.current;
    setBusy(true); setMessage('');
    try { const items = await api<Post[]>('/posts'); if (request === requestId.current) setPosts(items); }
    catch (error) { if (request === requestId.current) setMessage(error instanceof Error ? error.message : '连接失败，请重试'); }
    finally { if (request === requestId.current) setBusy(false); }
  }
  function update(value: Partial<PostFilter>) { setFilter(previous => ({ ...previous, ...value })); setVisible(pageSize); }
  function clear() { setFilter({ ...defaultPostFilter }); setDraft(''); setVisible(pageSize); }
  useDidShow(() => {
    const pending = readPostFilterLink(Taro.getStorageSync(POST_FILTER_STORAGE_KEY));
    if (pending) {
      Taro.removeStorageSync(POST_FILTER_STORAGE_KEY);
      setFilter(previous => ({ ...previous, q: pending.q || '', category: pending.category || '', tag: pending.tag || '' }));
      setDraft(pending.q || ''); setVisible(pageSize);
    }
    void load();
  });

  return <PageScroll key={`${filter.q}/${filter.category}/${filter.tag}`} onReachEnd={() => { if (!busy) setVisible(previous => Math.min(previous + pageSize, results.length)); }}><View className='page posts-page core-page'><CoreScreen moreLabel='全部文章'>
    <Text className='eyebrow'>OTTLOG / ARCHIVE</Text>
    <View className='posts-title'>所有文章<Text className='posts-title-dot'>.</Text></View>
    <View className='posts-intro'><Text>在这里，翻翻过去的记录。</Text><Text>{posts.length} 篇</Text></View>

    <View className='posts-search'>
      <Input className='posts-search-input' value={draft} maxlength={100} placeholder='搜索标题、摘要、分类或标签' confirmType='search' onInput={event => setDraft(event.detail.value)} onConfirm={() => update({ q: draft })} />
      <ActionButton appearance='primary' compact className="button-label posts-search-submit" onClick={() => update({ q: draft })}>搜索</ActionButton>
    </View>
    <PageToolbar className='posts-toolbar'
      reset={<ToolbarResetButton ariaLabel='恢复文章默认方式' onReset={() => { setFilter({ ...defaultPostFilter }); setDraft(''); setPageSize(10); setVisible(10); setExpanded(false); setSortOpen(false); }} />}
      sort={<SortPopover ariaLabel='排序文章' open={sortOpen} onOpenChange={setSortOpen} iconOnly={false} confirmLabel='完成' onConfirm={() => setSortOpen(false)}>
        <SortOptions options={sorts.map(item => ({ value: item.value, label: item.name }))} value={filter.sort} onChange={sort => update({ sort })} />
        <SortDirection value={filter.direction} onChange={direction => update({ direction })} />
      </SortPopover>}
      filter={<ChoicePopover ariaLabel='筛选文章' open={expanded} onOpenChange={setExpanded} trigger={<Text>筛选</Text>} panelClassName='filter-popover posts-filter-panel' triggerClassName='posts-filter-toggle'>
        <View className='posts-filter-row'><FilterFieldHeading label='标签' inRow /><SingleChoiceField width='fill' ariaLabel='文章标签' value={filter.tag} options={tags.map((tag, index) => ({ value: index ? tag : '', label: index ? tagLabel(tag) : tag, ariaLabel: tag }))} onChange={tag => update({ tag })} /></View>
        <View className='posts-filter-row'><FilterFieldHeading label='每次显示' inRow /><SingleChoiceField width='fill' ariaLabel='文章显示数量' value={String(pageSize)} options={pageSizes.map(size => ({ value: String(size), label: `${size} 篇` }))} onChange={value => { const size = Number(value); setPageSize(size); setVisible(size); }} /></View>
        <ActionButton onClick={() => setExpanded(false)}>查看 {results.length} 篇文章</ActionButton>
      </ChoicePopover>}
    />
    <CategoryRow ariaLabel='文章分类' className='posts-category-row' fixedLeading={<CategoryButton ariaLabel='文章分类：全部分类' selected={!filter.category} onClick={() => update({ category: '' })}>全部</CategoryButton>}>{categories.slice(1).map(name => <CategoryButton key={name} ariaLabel={`文章分类：${name}`} selected={filter.category === name} onClick={() => update({ category: name })}>{name}</CategoryButton>)}</CategoryRow>
    {(filter.q || filter.category || filter.tag) && <View className='posts-active-filters'>
      {filter.q && <ActionButton className='button-label' onClick={() => { setDraft(''); update({ q: '' }); }}>搜索：{filter.q} ×</ActionButton>}
      {filter.category && <ActionButton className='button-label' onClick={() => update({ category: '' })}>{filter.category} ×</ActionButton>}
      {filter.tag && <ActionButton className='button-label' onClick={() => update({ tag: '' })}>{tagLabel(filter.tag)} ×</ActionButton>}
      <ActionButton className="button-label posts-clear" onClick={clear}>清空筛选</ActionButton>
    </View>}
    <View className='posts-results-count'><Text>{filter.q || filter.category || filter.tag ? '找到' : '共'} {results.length} 篇记录</Text><Text>{sorts.find(sort => sort.value === filter.sort)?.name} · {filter.direction === 'desc' ? '降序' : '升序'}</Text></View>
    {busy && !posts.length && <View className='posts-loading'>正在翻开记录…</View>}
    {message && <View className='notice'><Text>{message}</Text><ActionButton className='button-label' onClick={load}>重新连接</ActionButton></View>}
    {!busy && !message && !results.length && <View className='posts-empty'><Text className='posts-empty-symbol'>∅</Text><View>暂时没有找到文章</View>{posts.length > 0 && <ActionButton className='button-label' onClick={clear}>查看所有文章</ActionButton>}</View>}
    {results[0] && <View className='posts-featured'><ArticleCard post={results[0]} onCategory={category => update({ category })} onTag={tag => update({ tag })} /></View>}
    </CoreScreen><MoreSection title='继续阅读'>
    <View className='posts-entry-links'><ActionButton className='button-label' onClick={() => void Taro.navigateTo({ url: '/pages/categories/index' })}>分类与标签 ↗</ActionButton><ActionButton className='button-label' onClick={() => void Taro.navigateTo({ url: '/pages/journal/index' })}>Tau 的空间 ↗</ActionButton></View>
    <View className='posts-list'>{results.slice(1, visible).map(post => <ArticleCard key={post.slug} post={post} onCategory={category => { update({ category }); }} onTag={tag => { update({ tag }); }} />)}</View>
    {results.length > 0 && <View className='posts-pagination'><Text>已显示 {Math.min(visible, results.length)} / {results.length} 篇</Text>{visible < results.length ? <ActionButton className='button-label' onClick={() => setVisible(previous => previous + pageSize)}>加载更多</ActionButton> : <Text className='posts-end'>记录到这里，待续。</Text>}</View>}
  </MoreSection></View></PageScroll>;
}
