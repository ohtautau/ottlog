import { checklistItems, checklistSummary } from '../../lib/editor-checklist-data';
import AppliedOptions from '../../components/applied-options';
import { useMessageNotice } from '../../components/message-notice';
import ActionMenu from '../../components/action-menu';
import DocumentEditorSheet from '../../components/document-editor-sheet';
import CardGroupContent from '../../components/card-group-content';
import { MemoCard } from '../../components/data-card-views';
import EditorPreviewButton from '../../components/editor-preview-button';
import CheckSymbol from '../../components/check-symbol';
import EmptyState from '../../components/empty-state';
import { trimTextEnd } from '../../lib/text-whitespace';
import FilterPopover, { FilterFields, FilterField, FilterOptionGrid, FilterSearch } from '../../components/filter-popover';
import SectionTitle from '../../components/section-title';
import { CoreScreen } from '../../components/page-sections';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Taro, { useDidHide, useRouter } from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import PageScroll from '../../components/page-scroll';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import { initialMemoState, isMemoState, memoPriority, type Memo, type MemoState } from '../../lib/tool-records';
import AppDialog from '../../components/app-dialog';
import MemoEditorFields from '../../components/memo-editor-fields';
import { DeleteSymbol, PinSymbol, SelectionSymbol } from '../../components/manage-symbol';
import EntryComposer from '../../components/entry-composer';
import FloatingCreateButton from '../../components/floating-create-button';
import PageToolbar, { CategoryButton, CategoryRow, ToolbarResetButton } from '../../components/page-toolbar';
import { SortOptions, SortPopover } from '../../components/sort-options';
import SheetActions from '../../components/sheet-actions';
import { DEFAULT_TODO_TAGS, parseTodoTags } from '../../lib/todo-data';
import { useEntryTags } from '../../lib/use-entry-tags';
import { tagLabel } from '../../lib/tag-label';
import { isMemoImage, memoStateFits, withMemo } from '../../lib/memo-images';
import { resumeEditorInput } from '../../lib/resume-editor-input';
import { showAppMessage } from '../../lib/app-dialog';
import { ChoicePopover } from '../../components/form-options';
import { TaskTagSymbol, TaskAttachmentSymbol, TaskChecklistSymbol } from '../../components/task-detail-editor';
import './index.css';

const sortLabels = ['最近修改', '最近创建', '标题顺序'];
const excerpt = (body: string) => body.replace(/```[\s\S]*?```/g, ' [代码] ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' [图片] ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`~|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
const noteTitle = (note: Memo) => trimTextEnd(note.title) || excerpt(note.body).slice(0, 40) || (note.images?.some(isMemoImage) ? '图片便签' : '未命名便签');
function noteDate(value: string) {
  const date = new Date(value), today = new Date();
  if (!Number.isFinite(date.getTime())) return '';
  if (date.toDateString() === today.toDateString()) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${date.getFullYear() === today.getFullYear() ? '' : `${date.getFullYear()}/`}${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}
const notify = (error: unknown) => { void showAppMessage({ title: error instanceof Error ? error.message : '操作失败，请重试', icon: 'none' }); };
export default function Memos() {
  const route = useRouter();
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState('memos', initialMemoState);
  const valid = isMemoState(value), state = valid ? value : initialMemoState, writable = ready && valid;
  const [checklistSignal,setChecklistSignal]=useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(0);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [managing, setManaging] = useState(false);
  const [selected,setSelected] = useState<string[]>([]);
  const [memoPreview,setMemoPreview] = useState(false);
  const [batchError,setBatchError] = useState('');
  const batchPin = useRef<{owner:string;ids:string[];pinned:boolean;updatedAt:string}|null>(null);
  const [deletion, setDeletion] = useState<{ owner: string; notes: Memo[]; pending?: boolean } | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const deleting = useRef<object | null>(null);
  const deletionRef = useRef(deletion); deletionRef.current = deletion;
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Memo | null>(null);
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const entryApplied = useRef(false);
  const mounted = useRef(true);
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const currentDraft = useRef(draft); currentDraft.current = draft;
  const [autosaveError, setAutosaveError] = useState(''), [editorTagsOpen, setEditorTagsOpen] = useState(false), [moreOpen, setMoreOpen] = useState(false), [imageSignal, setImageSignal] = useState(0);
  const persistedMemo = useRef<Memo | null>(null), memoSaving = useRef<Promise<boolean> | null>(null), tagsRef = useRef(tags); tagsRef.current = tags;
  const saveRef = useRef<() => Promise<boolean>>(async () => true);
  const draftOwner = useRef('');
  const dismissedEditors = useRef(new Map<string, { owner: string; draft: Memo; baseline: Memo; tags: string }>());
  const tagCatalog = useEntryTags();
  const existingTags = tagCatalog.owner === owner || !tagCatalog.owner ? tagCatalog.tags : DEFAULT_TODO_TAGS;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const lastOwner = useRef('');
  useEffect(() => { setManaging(false);setSelected([]);setBatchError('');batchPin.current=null;setMemoPreview(false);setDeletion(null);setDeleteError('');deleting.current=null; }, [owner]);
  useEffect(() => {
    if (owner && lastOwner.current && owner !== lastOwner.current) { dismissedEditors.current.clear(); setDraft(null); setCreating(false); setBusy(false); setImageBusy(false); setSearch(''); setTagFilters([]); setSort(0); setShowFilters(false); setShowSort(false); }
    if (owner) lastOwner.current = owner;
  }, [owner]);
  useEffect(() => {
    if (!writable || entryApplied.current || route.params.create !== '1') return;
    entryApplied.current = true; create();
  }, [writable, route.params.create]);
  const images = draft?.images?.filter(isMemoImage) ?? [];
  const currentDeletion = writable && deletion?.owner === owner ? deletion : null;
  const savedDraft = draft ? state.notes.find(note => note.id === draft.id) : undefined;
  function memoSignature(note: Memo, text = note.tags.join('，')) { const { updatedAt: _, ...fields } = note; return JSON.stringify({ ...fields, title: note.title.trim(), body: trimTextEnd(note.body), tags: parseTodoTags(text) }); }
  useEffect(() => {
    if (!draft || busy || imageBusy || autosaveError || currentDeletion || memoSignature(draft, tags) === (persistedMemo.current ? memoSignature(persistedMemo.current) : '')) return;
    const timer = setTimeout(() => { void saveRef.current(); }, 450); return () => clearTimeout(timer);
  }, [draft, tags, busy, imageBusy, autosaveError, currentDeletion]);
  useDidHide(() => { if (currentDraft.current && !imageBusy) void saveRef.current(); });
  useEffect(() => { if (typeof window === 'undefined') return; const flush = () => { if (currentDraft.current) void saveRef.current(); }; window.addEventListener('pagehide', flush); return () => window.removeEventListener('pagehide', flush); }, []);
  useLayoutEffect(() => () => { if (currentDraft.current && draftOwner.current === currentOwner.current) void saveRef.current(); }, []);
  useEffect(() => {
    if (!draft || currentDeletion || moreOpen || typeof document === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); void closeEditor(); } };
    document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close);
  }, [draft?.id, currentDeletion, moreOpen]);
  const filtered = useMemo(() => state.notes.filter(note => (tagFilters.length === 0 || tagFilters.some(tag => note.tags.includes(tag))) && `${note.title}\n${note.body}\n${note.tags.join(' ')}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === 2 ? noteTitle(a).localeCompare(noteTitle(b), 'zh-Hans-CN') : Date.parse(sort === 1 ? b.createdAt : b.updatedAt) - Date.parse(sort === 1 ? a.createdAt : a.updatedAt))), [state.notes, search, sort, tagFilters]);
  const filterTags = [...new Set(state.notes.flatMap(note => note.tags))];
  const activeCategoryTag = [...tagFilters].reverse().find(tag => filterTags.includes(tag));
  const categoryTarget = tagFilters.length === 0 ? 'memo-category-all' : activeCategoryTag === undefined ? undefined : `memo-category-${filterTags.indexOf(activeCategoryTag)}`;
  const filterCount = Number(!!search.trim()) + Number(tagFilters.length > 0);
  function clearFilters() { setSearch(''); setTagFilters([]); setSort(0); }
  function restoreDefaults() {
    if (!writable || busy || imageBusy || currentDeletion || creating || draft) return;
    clearFilters(); setShowSort(false); setShowFilters(false); setManaging(false);
  }
  async function change(updater: (old: MemoState) => MemoState) {
    const capturedOwner = owner;
    if (!writable || !capturedOwner || currentOwner.current !== capturedOwner) throw new Error('账号或记录已变化，请重新打开');
    await setValue(previous => {
      if (currentOwner.current !== capturedOwner) throw new Error('账号已变化，请重新打开');
      if (!isMemoState(previous)) throw new Error('数据格式暂不兼容，请到网页查看');
      return updater(previous);
    });
  }
  function create() {
    if (!writable || deleting.current) return;
    setShowFilters(false); setShowSort(false); setCreating(true);
  }
  function edit(note: Memo) {
    if (!writable || deleting.current || busy || imageBusy) return;
    setMemoPreview(false);persistedMemo.current = { ...note, tags: [...note.tags] }; setAutosaveError(''); setEditorTagsOpen(false); setMoreOpen(false);
    draftOwner.current = owner;
    const retained = dismissedEditors.current.get(note.id);
    const resume = retained?.owner === owner && retained.draft.id === note.id ? retained : null;
    dismissedEditors.current.delete(note.id);
    setDraft(resume ? resumeEditorInput(note, resume.baseline, resume.draft) : { ...note, tags: [...note.tags] });
    setTags(resume && resume.tags !== resume.baseline.tags.join('，') ? resume.tags : note.tags.join('，'));
  }
  function save(): Promise<boolean> {
    if (memoSaving.current) return memoSaving.current;
    const task = saveCaptured(); memoSaving.current = task;
    void task.finally(() => { if (memoSaving.current === task) memoSaving.current = null; }); return task;
  }
  async function saveCaptured(): Promise<boolean> {
    const input = currentDraft.current, baseline = persistedMemo.current, expectedOwner = draftOwner.current;
    if (!input || imageBusy || !writable || currentOwner.current !== expectedOwner) return false;
    if (baseline && memoSignature(input, tagsRef.current) === memoSignature(baseline) && !hasVolatilePersonalTool('memos', expectedOwner)) return true;
    const parsedTags = parseTodoTags(tagsRef.current), captured = { ...input, title: input.title.trim(), body: trimTextEnd(input.body), tags: parsedTags, updatedAt: new Date().toISOString() };
    setBusy(true); setAutosaveError('');
    try {
      if (parsedTags.length > 5 || parsedTags.some(tag => tag.length > 20)) throw new Error('最多 5 个标签，每个不超过 20 个字');
      if (!captured.title && !captured.body.trim() && !captured.images?.length && !checklistItems(captured.checklist).length) throw new Error('请写下内容或插入图片');
      if (captured.title.length > 80 || captured.body.length > 6000) throw new Error('便签标题最多 80 字，内容最多 6000 字');
      await change(previous => {
        const existing = previous.notes.find(note => note.id === captured.id);
        if (!existing) throw new Error('这张便签已删除，请重新添加');
        const note = baseline ? resumeEditorInput(existing, baseline, captured) : captured;
        if (!memoStateFits(withMemo(previous, note))) throw new Error('便签空间不足，请整理图片');
        return { ...previous, notes: previous.notes.map(item => item.id === note.id ? note : item) };
      });
      if (currentOwner.current !== expectedOwner || currentDraft.current?.id !== captured.id) return false;
      if (hasVolatilePersonalTool('memos', expectedOwner)) throw new Error('本机存储不可用，内容已保留，请重试');
      persistedMemo.current = captured; dismissedEditors.current.delete(captured.id); return true;
    } catch (reason) { if (currentOwner.current === expectedOwner && mounted.current) setAutosaveError(reason instanceof Error ? reason.message : '保存失败，请重试'); return false; }
    finally { if (mounted.current && currentOwner.current === expectedOwner) setBusy(false); }
  }
  saveRef.current = save;
  async function pin(note: Memo) {
    try { await change(previous => ({ ...previous, notes: previous.notes.map(item => item.id === note.id ? { ...item, pinned: !item.pinned, updatedAt: new Date().toISOString() } : item) })); }
    catch (error) { notify(error); }
  }
  function toggleSelected(id:string) {
    if (!writable || busy || imageBusy || currentDeletion || batchPin.current) return;
    setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous,id]);
  }
  async function pinSelected() {
    if (!writable || busy || imageBusy || currentDeletion || !selected.length && !batchPin.current) return;
    const rows=state.notes.filter(note => selected.includes(note.id));
    const target=batchPin.current || { owner,ids:rows.map(note=>note.id),pinned:!rows.every(note=>note.pinned),updatedAt:new Date().toISOString() };
    batchPin.current=target;setBusy(true);setBatchError('');
    try {
      await change(previous => ({...previous,notes:previous.notes.map(note=>target.ids.includes(note.id)?{...note,pinned:target.pinned,updatedAt:target.updatedAt}:note)}));
      if(currentOwner.current!==target.owner)return;
      if(hasVolatilePersonalTool('memos',target.owner))throw new Error('置顶尚未保存，请重试');
      batchPin.current=null;
    }catch(error){if(currentOwner.current===target.owner)setBatchError(error instanceof Error?error.message:'置顶失败，请重试');}
    finally{if(mounted.current&&currentOwner.current===target.owner)setBusy(false);}
  }
  function requestDelete(note: Memo) {
    if (!writable || busy || imageBusy || deleting.current) return;
    setDeletion({ owner, notes:[note] }); setDeleteError('');
  }
  function closeDelete() { if (!deleting.current && !deletionRef.current?.pending) { setDeletion(null); setDeleteError(''); } }
  async function remove() {
    if (!currentDeletion || deleting.current || busy || imageBusy) return;
    const target = currentDeletion, ids = target.notes.map(note => note.id);
    deleting.current = target; setBusy(true); setDeleteError('');
    try {
      await change(previous => {
        if (!target.pending && !previous.notes.some(note => ids.includes(note.id))) throw new Error('所选便签已删除');
        return { ...previous, notes: previous.notes.filter(note => !ids.includes(note.id)) };
      });
      if (!mounted.current || currentOwner.current !== target.owner || deleting.current !== target) return;
      if (hasVolatilePersonalTool('memos', target.owner)) {
        setDeletion({ ...target, pending: true });
        throw new Error('本机存储不可用，删除尚未保存，请重试');
      }
      ids.forEach(id => dismissedEditors.current.delete(id)); setDeletion(null);setSelected(previous=>previous.filter(id=>!ids.includes(id)));
      if (currentDraft.current && ids.includes(currentDraft.current.id)) {currentDraft.current=null;setDraft(null);}
    } catch (error) {
      if (mounted.current && currentOwner.current === target.owner && deletionRef.current?.notes === target.notes) setDeleteError(error instanceof Error ? error.message : '删除失败，请重试');
    } finally {
      if (deleting.current === target) { deleting.current = null; if (mounted.current && currentOwner.current === target.owner) setBusy(false); }
    }
  }
  async function closeEditor() {
    const id = currentDraft.current?.id, expectedOwner = draftOwner.current;
    if (!id || imageBusy || currentDeletion) return;
    if (persistedMemo.current && writable && currentOwner.current === expectedOwner && !state.notes.some(note => note.id === id) && !hasVolatilePersonalTool('memos', expectedOwner)) {
      const retained = currentDraft.current;
      if (retained) dismissedEditors.current.set(id, { owner: expectedOwner, draft: retained, baseline: persistedMemo.current, tags: tagsRef.current });
      currentDraft.current = null; setDraft(null); setAutosaveError(''); return;
    }
    while (currentDraft.current?.id === id && currentOwner.current === expectedOwner) {
      if (!await save()) return;
      const current = currentDraft.current;
      if (!current || !persistedMemo.current || memoSignature(current, tagsRef.current) !== memoSignature(persistedMemo.current)) continue;
      currentDraft.current=null;setDraft(null); setAutosaveError(''); return;
    }
  }

  const filterFields = <FilterFields>
    <FilterField label='关键词'><FilterSearch className='memo-filter-search' ariaLabel='搜索便签' placeholder='搜索标题、内容或标签' value={search} onInput={event => setSearch(event.detail.value)} clearLabel='清空便签搜索' onClear={() => setSearch('')} onConfirm={() => setShowFilters(false)} /></FilterField>
    <FilterField label='标签'><FilterOptionGrid><ChoiceButton selected={tagFilters.length === 0} ariaLabel='便签标签：全部' onClick={() => setTagFilters([])}>全部</ChoiceButton>{filterTags.map(tag => <ChoiceButton key={tag} selected={tagFilters.includes(tag)} ariaLabel={`便签标签：${tag}`} onClick={() => setTagFilters(previous => previous.includes(tag) ? previous.filter(value => value !== tag) : [...previous, tag])}>{tagLabel(tag)}</ChoiceButton>)}</FilterOptionGrid></FilterField>
  </FilterFields>;
  useMessageNotice(batchError, !busy);
  useMessageNotice(autosaveError, !busy);
  return <>
    <PageScroll><View className='tool-page memo-page core-page'><CoreScreen className='memo-core'>
      <PageToolbar className='memo-toolbar' reset={!managing && <ToolbarResetButton ariaLabel='恢复便签默认方式' disabled={!writable || busy || imageBusy || !!currentDeletion || creating || !!draft} onReset={restoreDefaults} />} sort={!managing && <SortPopover ariaLabel='排序便签' open={showSort} onOpenChange={open => { if (open) setShowFilters(false); setShowSort(open); }} disabled={!writable} selected={showSort || sort !== 0} confirmLabel='完成' onConfirm={() => setShowSort(false)}><SortOptions className='memo-filter-sort' options={sortLabels.map((label, index) => ({ value: index, label, ariaLabel: `便签排序：${label}` }))} value={sort} onChange={setSort} /></SortPopover>} filter={!managing && <FilterPopover ariaLabel='筛选便签' title='筛选便签' open={showFilters} onOpenChange={open => { if (open) setShowSort(false); setShowFilters(open); }} disabled={!writable} triggerClassName='memo-filter-toggle' triggerSelected={filterCount > 0} panelClassName='memo-filter-popover memo-filter-sheet' headingClassName='memo-filter-heading' actionsClassName='memo-filter-footer' resetClassName='memo-filter-reset' closeLabel='关闭便签筛选' onClose={() => setShowFilters(false)} resetLabel='重置便签筛选' applyLabel={`查看 ${filtered.length} 张便签`} onReset={clearFilters}>
          {filterFields}
        </FilterPopover>} manage={<View className='memo-selection-actions'>{managing && <><Text className='memo-selection-count'>已选 {selected.length}</Text><ActionButton appearance='icon' ariaLabel='批量置顶便签' disabled={!selected.length || busy || !!currentDeletion} onClick={() => { void pinSelected(); }}><PinSymbol /></ActionButton><ActionButton appearance='icon' intent='danger' ariaLabel='批量删除便签' disabled={!selected.length || busy || !!currentDeletion || !!batchPin.current} onClick={() => {setDeletion({owner,notes:state.notes.filter(note=>selected.includes(note.id))});setDeleteError('');}}><DeleteSymbol /></ActionButton></>}<ChoiceButton id='memo-settings' iconOnly size='compact' ariaLabel={managing ? '退出便签多选' : '多选便签'} selected={managing} disabled={!writable || busy || imageBusy || !!currentDeletion || creating || !!batchPin.current} onClick={() => { setShowSort(false);setShowFilters(false);setSelected([]);setManaging(previous=>!previous); }}><SelectionSymbol /></ChoiceButton></View>} />
      {batchError && <View className='memo-selection-error'><ActionButton appearance='quiet' disabled={busy} onClick={()=>{void pinSelected();}}>重试</ActionButton></View>}
      <CategoryRow ariaLabel='便签分类' className='memo-category-row' fixedLeading={<CategoryButton id='memo-category-all' ariaLabel='便签分类：全部' selected={tagFilters.length === 0} onClick={() => setTagFilters([])}>全部</CategoryButton>} scrollIntoView={categoryTarget} selectionOffset={1.5} contentKey={JSON.stringify([owner, filterTags])} scrollWithAnimation>{filterTags.map((tag, index) => <CategoryButton id={`memo-category-${index}`} key={tag} ariaLabel={`便签分类：${tag}`} selected={tagFilters.includes(tag)} onClick={() => setTagFilters(tagFilters.length === 1 && tagFilters.includes(tag) ? [] : [tag])}>{tagLabel(tag)}</CategoryButton>)}</CategoryRow>
      <View className='memo-list-heading card-group-heading'><View><SectionTitle inRow className='memo-list-label'>{filterCount ? '筛选结果' : '全部便签'}</SectionTitle><Text className='memo-list-count'>{filtered.length}</Text></View></View>
      <AppliedOptions items={[search.trim() ? `“${search.trim()}”` : '', ...tagFilters.map(tagLabel), sort !== 0 ? `排序：${sortLabels[sort]}` : ''].filter(Boolean)} />
      <ScrollView id='memo-list' key={JSON.stringify([owner, search, sort, tagFilters])} className='memo-list-scroll' scrollY enhanced bounces={false} showScrollbar={false}>
        <CardGroupContent className='floating-create-content'>{!ready ? <View className='memo-list-empty'><View className='memo-empty-paper' aria-hidden /><Text className='memo-empty-title'>正在读取便签…</Text></View> : !valid ? <View className='memo-list-empty'><Text className='memo-empty-title'>暂时无法显示便签</Text><Text>当前数据格式暂不兼容，原始数据已保留。</Text><ActionButton className='button-label tool-secondary' onClick={retry}>重新读取</ActionButton></View> : filtered.length ? <View className='memo-list'>{filtered.map(note => {
          const photos = note.images?.filter(isMemoImage) ?? [];
          const title = noteTitle(note);
          return <MemoCard key={note.id} title={title} body={note.body ? excerpt(note.body) : photos.length ? `${photos.length} 张图片` : checklistSummary(note.checklist) || '暂无正文'} selected={selected.includes(note.id)} selecting={managing} priority={memoPriority(note)} images={photos}
              onOpen={() => { if (writable && !busy && !imageBusy && !deletionRef.current) { if(managing)toggleSelected(note.id);else edit(note); } }}
              metadata={<>{note.pinned && <Text className='memo-note-pinned'>置顶</Text>}{note.tags.slice(0, 2).map(tag => <Text className='memo-note-tag' key={tag}>{tagLabel(tag)}</Text>)}{note.tags.length > 2 && <Text>＋{note.tags.length - 2}</Text>}{!!photos.length && !!note.body && <Text className='memo-note-photo-count'>{photos.length} 图</Text>}<Text className='memo-note-date'>{noteDate(sort === 1 ? note.createdAt : note.updatedAt)}</Text></>} actions={<>
              {!managing && <ChoiceButton iconOnly size='compact' className='button-label memo-note-pin' ariaLabel={`${note.pinned ? '取消置顶' : '置顶'}便签：${title}`} aria-pressed={note.pinned} disabled={!writable || busy} onClick={() => { void pin(note); }}><PinSymbol /></ChoiceButton>}
              {managing && <ActionButton appearance='icon' className='memo-selection-toggle' ariaLabel={`选择圆圈：${title}`} aria-pressed={selected.includes(note.id)} disabled={!writable || busy || imageBusy || !!currentDeletion} onClick={event => { event.stopPropagation(); toggleSelected(note.id); }}><View className='memo-selection-mark' aria-hidden>{selected.includes(note.id) && <CheckSymbol />}</View></ActionButton>}
            </>} />;
        })}</View> : !state.notes.length && !filterCount ? <EmptyState kind='memos' /> : <View className='memo-list-empty'><View className='memo-empty-paper' aria-hidden /><Text className='memo-empty-title'>没有符合条件的便签</Text>{!!filterCount && <ActionButton className='button-label tool-secondary' onClick={clearFilters}>清除筛选</ActionButton>}</View>}</CardGroupContent>
      </ScrollView>
      {!!status && <View className='tool-status'><Text>{status}</Text><ActionButton className='button-label' onClick={retry}>重试同步</ActionButton></View>}
    </CoreScreen></View></PageScroll>
    <FloatingCreateButton className='memo-create' label='创建便签' disabled={!writable || busy} onClick={create} />
    {draft && <DocumentEditorSheet compact title='编辑便签' onClose={() => { void closeEditor(); }} busy={imageBusy}
      heading={<ActionMenu ariaLabel='更多便签操作' open={moreOpen} onOpenChange={setMoreOpen} panelWidth={180}>
        <ActionButton appearance='quiet' intent='danger' onClick={() => { setMoreOpen(false); requestDelete(draft); }}>删除便签</ActionButton>
      </ActionMenu>}
      footer={<SheetActions className='document-autosave-footer'><View className='document-autosave-tools'><ActionButton appearance='icon' ariaLabel='便签标签' onClick={() => setEditorTagsOpen(!editorTagsOpen)}><TaskTagSymbol /></ActionButton><ActionButton appearance='icon' ariaLabel='添加子任务' disabled={!writable || imageBusy} onClick={()=>setChecklistSignal(value=>value+1)}><TaskChecklistSymbol /></ActionButton><ActionButton appearance='icon' ariaLabel='便签附件' disabled={imageBusy} onClick={() => setImageSignal(value => value + 1)}><TaskAttachmentSymbol /></ActionButton><ChoiceButton iconOnly ariaLabel={draft.pinned ? '取消置顶便签' : '置顶便签'} selected={draft.pinned} onClick={() => { setAutosaveError(''); const next = { ...draft, pinned: !draft.pinned }; currentDraft.current = next; setDraft(next); }}><PinSymbol /></ChoiceButton><EditorPreviewButton selected={memoPreview} onChange={setMemoPreview} disabled={imageBusy} label='便签 Markdown 预览' /></View>{autosaveError && <View className='document-autosave-status'><ActionButton appearance='quiet' disabled={busy} onClick={() => { setAutosaveError(''); void save(); }}>重试</ActionButton></View>}</SheetActions>}>
      <MemoEditorFields checklistSignal={checklistSignal} onTags={() => setEditorTagsOpen(true)} preview={memoPreview} onPreviewChange={setMemoPreview} minimal showTags={editorTagsOpen} insertionSignal={imageSignal} draft={draft} onChange={value => { setAutosaveError(''); currentDraft.current = value; setDraft(value); }} tagsText={tags} onTagsChange={value => { setAutosaveError(''); tagsRef.current = value; setTags(value); }} tagOptions={existingTags} disabled={!writable} owner={owner} onBusyChange={setImageBusy} />
    </DocumentEditorSheet>}
    <AppDialog open={!!currentDeletion} title='删除便签' ariaLabel='删除便签确认' closeLabel='关闭便签删除确认' onClose={closeDelete} busy={busy || !!currentDeletion?.pending} error={deleteError} actions={<ActionButton appearance='danger' size='large' width='fill' disabled={busy} loading={busy} onClick={() => { void remove(); }}>{currentDeletion?.pending ? '重试删除' : '删除'}</ActionButton>}>
      <Text>删除「{currentDeletion?.notes.length === 1 ? noteTitle(currentDeletion.notes[0]) : `所选 ${currentDeletion?.notes.length || 0} 张便签`}」？</Text>
    </AppDialog>
    {creating && <EntryComposer initialMode='memo' onClose={() => setCreating(false)} />}
  </>;
}
