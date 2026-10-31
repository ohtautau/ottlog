import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import { initialArticleState, isArticleState, putArticle, articleCardPost, type PersonalArticle } from '../../lib/article-data';
import { toolId } from '../../lib/tool-records';
import { noteStateFits } from '../../lib/note-image-data';
import { parseTodoTags } from '../../lib/todo-data';
import { openAccount } from '../../lib/account-navigation';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import PageScroll from '../../components/page-scroll';
import { CoreScreen } from '../../components/page-sections';
import PageToolbar, { CategoryRow, CategoryButton, ToolbarResetButton } from '../../components/page-toolbar';
import CreateButton from '../../components/create-button';
import CardGroupContent from '../../components/card-group-content';
import ArticleCard from '../../components/article-card';
import EmptyState from '../../components/empty-state';
import DocumentFieldsLayout from '../../components/document-fields-layout';
import DocumentEditorSheet from '../../components/document-editor-sheet';
import MarkdownNoteEditor from '../../components/markdown-note-editor';
import DomainRecordContent from '../../components/domain-record-content';
import { EntityTitleInput, EntityTitleText } from '../../components/entity-title-field';
import SingleLineInput from '../../components/single-line-input';
import TagTextInput from '../../components/tag-text-input';
import { TagChoiceRow, ChoicePopover, PopoverHeading } from '../../components/form-options';
import FilterPopover, { FilterField, FilterSearch } from '../../components/filter-popover';
import { SortOptions, SortPopover } from '../../components/sort-options';
import SheetActions, { SheetDeleteButton } from '../../components/sheet-actions';
import ActionButton from '../../components/ui-button';
import { EditSymbol } from '../../components/manage-symbol';
import AppDialog from '../../components/app-dialog';
import './index.css';
import '../../components/memo-reader.css';

type Editor = { owner: string; article: PersonalArticle; creating: boolean; tags: string; baseline: string };
const signature = (article: PersonalArticle, tags: string) => JSON.stringify({ title: article.title, body: article.body, category: article.category, images: article.images || [], tags });
export default function Articles() {
  const source = usePersonalToolState('articles', initialArticleState);
  const { value, owner, ready, status, retry, setValue } = source;
  const valid = isArticleState(value), writable = ready && valid && !!owner && owner !== 'guest';
  const state = valid ? value : initialArticleState;
  const [editor, setEditor] = useState<Editor | null>(null), [reader, setReader] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [imageBusy, setImageBusy] = useState(false), [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null), [search, setSearch] = useState(''), [tag, setTag] = useState('');
  const [sort, setSort] = useState<'updated' | 'created' | 'title'>('updated'), [sortOpen, setSortOpen] = useState(false), [filters, setFilters] = useState(false);
  const current = useRef({ owner, writable }); current.current = { owner, writable };
  const saving = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setEditor(null); setReader(null); setDeleting(null); setError(''); setBusy(false); setImageBusy(false); saving.current = false; setSearch(''); setTag(''); setFilters(false); setSortOpen(false); }, [owner]);
  const draft = writable && editor?.owner === owner ? editor : null;
  const viewed = writable ? state.articles.find(article => article.id === reader) : undefined;
  const tags = [...new Set(state.articles.flatMap(article => article.tags))];
  const rows = state.articles.filter(article => (!tag || article.tags.includes(tag)) && (!search.trim() || [article.title, article.body, article.category || '未分类', ...article.tags].join('\n').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())))
    .slice().sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : b[sort === 'created' ? 'createdAt' : 'updatedAt'].localeCompare(a[sort === 'created' ? 'createdAt' : 'updatedAt']));
  function open(article?: PersonalArticle) {
    if (!writable) { if (ready && owner === 'guest') void openAccount(); return; }
    if (saving.current) return;
    const now = new Date().toISOString(), next = article ? { ...article } : { id: toolId(), title: '', body: '', category: '', tags: [], createdAt: now, updatedAt: now };
    const text = next.tags.join('，'); setEditor({ owner, article: next, creating: !article, tags: text, baseline: signature(next, text) }); setReader(null); setError('');
  }
  async function save(): Promise<false | void> {
    if (!draft || !writable || saving.current || imageBusy) return false;
    const captured = draft, expected = owner;
    const article = { ...captured.article, title: captured.article.title.trim(), body: captured.article.body.trimEnd(), category: captured.article.category.trim(), tags: parseTodoTags(captured.tags), updatedAt: new Date().toISOString() };
    saving.current = true; setBusy(true); setError('');
    try {
      await setValue(previous => { if (current.current.owner !== expected || !current.current.writable) throw new Error('账号已变化，请重新打开'); return putArticle(previous, article, captured.creating); });
      if (!mounted.current || current.current.owner !== expected) return false;
      if (hasVolatilePersonalTool('articles', expected)) throw new Error('本机存储不可用，输入已保留，请重试');
      setEditor(null); setReader(article.id);
    } catch (reason) { if (mounted.current && current.current.owner === expected) setError(reason instanceof Error ? reason.message : '保存失败，请重试'); return false; }
    finally { if (mounted.current && current.current.owner === expected) { saving.current = false; setBusy(false); } }
  }
  const closeGuard = useEditorCloseGuard({ scope: draft ? `${owner}:article:${draft.article.id}` : '', hasChanges: !!draft && signature(draft.article, draft.tags) !== draft.baseline, blocked: busy || imageBusy, onSave: save, onClose: () => { setEditor(null); setError(''); } });
  useEffect(() => {
    if (!draft || deleting || typeof document === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closeGuard.requestClose(); } };
    document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close);
  }, [draft, deleting, closeGuard.requestClose]);
  async function remove() {
    if (!deleting || !writable || saving.current) return;
    const expected = owner, id = deleting; saving.current = true; setBusy(true); setError('');
    try {
      await setValue(previous => { if (current.current.owner !== expected || !isArticleState(previous)) throw new Error('账号已变化，请重新打开'); return { ...previous, articles: previous.articles.filter(article => article.id !== id) }; });
      if (current.current.owner !== expected || !mounted.current) return;
      if (hasVolatilePersonalTool('articles', expected)) throw new Error('删除未能保存，请重试');
      setDeleting(null); setEditor(null); setReader(null);
    } catch (reason) { if (current.current.owner === expected) setError(reason instanceof Error ? reason.message : '删除失败，请重试'); }
    finally { if (current.current.owner === expected) { saving.current = false; setBusy(false); } }
  }
  function change(article: PersonalArticle) { if (draft && !busy) setEditor({ ...draft, article }); }
  return <><PageScroll scrollY={false} snapSections={[]}><View className='tool-page personal-articles-page core-page'><CoreScreen>
    <PageToolbar leading={writable && <Text>{state.articles.length} 篇</Text>} reset={<ToolbarResetButton ariaLabel='恢复文章默认方式' disabled={!writable || busy} onReset={() => { setSearch(''); setTag(''); setSort('updated'); setFilters(false); setSortOpen(false); }} />}
      sort={<SortPopover ariaLabel='排序我的文章' open={sortOpen} onOpenChange={setSortOpen} disabled={!writable || busy} confirmLabel='完成' onConfirm={() => setSortOpen(false)}><SortOptions value={sort} options={[{ value: 'updated', label: '最近修改' }, { value: 'created', label: '最近创建' }, { value: 'title', label: '文章标题' }]} onChange={setSort} /></SortPopover>}
      filter={<FilterPopover ariaLabel='筛选我的文章' title='筛选文章' closeLabel='关闭文章筛选' resetLabel='重置文章筛选' open={filters} onOpenChange={setFilters} disabled={!writable || busy} onReset={() => { setSearch(''); setTag(''); }} onClose={() => setFilters(false)} applyLabel={`查看 ${rows.length} 篇文章`}><FilterField label='关键词'><FilterSearch ariaLabel='搜索我的文章' value={search} placeholder='搜索标题、内容、分类或标签' onInput={event => setSearch(event.detail.value)} clearLabel='清空文章搜索' onClear={() => setSearch('')} /></FilterField></FilterPopover>}
      create={<CreateButton label={owner === 'guest' ? '登录创建文章' : '创建文章'} disabled={!ready || !valid || busy} onClick={() => open()} />} />
    <View className='personal-article-navigation'><CategoryRow className='personal-article-categories' ariaLabel='我的文章标签' fixedLeading={<CategoryButton selected={!tag} onClick={() => setTag('')}>全部</CategoryButton>}>{tags.map(item => <CategoryButton key={item} selected={tag === item} onClick={() => setTag(tag === item ? '' : item)}>#{item}</CategoryButton>)}</CategoryRow><ActionButton appearance='quiet' ariaLabel='阅读公开文章' onClick={() => { void Taro.navigateTo({ url: '/pages/posts/index' }); }}>公开文章</ActionButton></View>
    <ScrollView scrollY className='personal-articles-scroll' enhanced bounces={false} showScrollbar={false}><CardGroupContent>
      {!ready ? <Text>{status || '正在读取文章…'}</Text> : !valid ? <View><Text>文章格式暂不兼容，原始数据已保留。</Text><ActionButton onClick={retry}>重新读取</ActionButton></View> : owner === 'guest' || !state.articles.length ? <EmptyState kind='articles' /> : !rows.length ? <Text>没有符合条件的文章</Text> : <View className='personal-article-grid'>{rows.map(article => <ArticleCard key={article.id} post={articleCardPost(article)} coverSource={article.images?.[0]?.dataUrl} onOpen={() => { if (!busy) setReader(article.id); }} onCategory={category => { setSearch(category); }} onTag={setTag} />)}</View>}
    </CardGroupContent></ScrollView>
    {!!status && <View className='tool-status'><Text>{status}</Text>{owner === 'guest' ? <ActionButton onClick={() => { void openAccount(); }}>登录账号</ActionButton> : /失败|暂存|离线|不可用|无法/.test(status) && <ActionButton onClick={retry}>重试同步</ActionButton>}</View>}
  </CoreScreen></View></PageScroll>
  {viewed && <ChoicePopover ariaLabel='文章内容' open onOpenChange={next => { if (!next && !busy) setReader(null); }} placement='center' panelWidth={680} maxHeightRatio={.9} bodySpacing='none' panelClassName='memo-reader memo-content-reader article-reader' heading={<PopoverHeading title='文章内容' actions={<ActionButton appearance='icon' ariaLabel='关闭文章内容' onClick={() => setReader(null)}>×</ActionButton>} />} footer={<SheetActions leading={<ActionButton appearance='icon' ariaLabel={`编辑文章：${viewed.title}`} onClick={() => open(viewed)}><EditSymbol /></ActionButton>}><ActionButton appearance='primary' size='large' width='fill' onClick={() => setReader(null)}>完成</ActionButton></SheetActions>}>
    <DocumentFieldsLayout readOnly title={<EntityTitleText>{viewed.title}</EntityTitleText>} body={<View className='memo-body-preview'><DomainRecordContent record={{ content: viewed.body, images: viewed.images }} inheritTypography={false} /></View>} tags={<Text>{[viewed.category, ...viewed.tags.map(item => `#${item}`)].filter(Boolean).join(' · ')}</Text>} />
  </ChoicePopover>}
  {draft && <DocumentEditorSheet title={draft.creating ? '创建文章' : '编辑文章'} onClose={closeGuard.requestClose} busy={busy || imageBusy} footer={<SheetActions className='memo-sheet-footer' leading={!draft.creating && <SheetDeleteButton ariaLabel='删除文章' disabled={busy || imageBusy} onClick={() => { setDeleting(draft.article.id); setError(''); }} />}><ActionButton appearance='primary' width='fill' size='large' disabled={busy || imageBusy || !draft.article.title.trim()} loading={busy} onClick={() => { void save(); }}>{draft.creating ? '创建文章' : '保存'}</ActionButton></SheetActions>}>
    <DocumentFieldsLayout title={<EntityTitleInput ariaLabel='文章标题' value={draft.article.title} placeholder='准备写些什么？' maxlength={80} disabled={busy || imageBusy} onInput={event => change({ ...draft.article, title: event.detail.value })} />}
      body={<MarkdownNoteEditor value={draft.article.body} images={draft.article.images} owner={owner} recordId={draft.article.id} disabled={busy} canInsertImage={writable} maxLength={6000} ariaLabel='文章内容' placeholder='写下文章内容…' onChange={body => change({ ...draft.article, body })} onImagesChange={images => change({ ...draft.article, images })} onBusyChange={setImageBusy} checkImages={images => { if (!noteStateFits({ ...state, articles: [{ ...draft.article, images }, ...state.articles.filter(row => row.id !== draft.article.id)] })) throw new Error('文章空间不足，请减少图片'); }} />}
      settings={<SingleLineInput ariaLabel='文章分类' value={draft.article.category} placeholder='分类（可选）' maxlength={24} disabled={busy || imageBusy} onInput={event => change({ ...draft.article, category: event.detail.value })} />}
      tags={<TagChoiceRow options={tags.map(item => ({ value: item, label: item }))} value={parseTodoTags(draft.tags)} onChange={items => setEditor({ ...draft, tags: items.join('，') })} disabled={busy || imageBusy} ariaLabel='选择文章标签' customInput={<TagTextInput ariaLabel='文章标签' value={draft.tags} placeholder='输入标签，用符号分隔' disabled={busy || imageBusy} onInput={event => setEditor({ ...draft, tags: event.detail.value })} />} />} />
    {!!error && <View role='alert'>{error}</View>}
  </DocumentEditorSheet>}{closeGuard.dialog}
  <AppDialog open={!!deleting} title='删除文章' ariaLabel='删除文章确认' onClose={() => { if (!busy) setDeleting(null); }} busy={busy} error={error} actions={<ActionButton appearance='danger' width='fill' size='large' disabled={busy} onClick={() => { void remove(); }}>删除</ActionButton>}><Text>删除这篇文章？</Text></AppDialog>
  </>;
}
