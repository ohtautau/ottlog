import { trimTextEnd } from '../../lib/text-whitespace';
import FilterPopover, { FilterFields, FilterField, FilterOptionGrid, FilterSearch } from '../../components/filter-popover';
import SectionTitle from '../../components/section-title';
import EditorHeading from '../../components/editor-heading';
import { CoreScreen } from '../../components/page-sections';
import { useEffect, useMemo, useRef, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Button, Image, ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import PageScroll from '../../components/page-scroll';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import { demoMemos, initialMemoState, isMemoState, memoColors, memoPriority, memoPriorityColor, type Memo, type MemoColor, type MemoState } from '../../lib/tool-records';
import AppDialog from '../../components/app-dialog';
import LibraryIcon from '../../components/library-icon';
import { getLibraryIcon } from '../../lib/icon-library';
import HabitPriorityCorner from '../../components/habit-priority-corner';
import MemoEditorFields from '../../components/memo-editor-fields';
import { memoColorStyle } from '../../components/memo-fields-layout';
import MemoReader from '../../components/memo-reader';
import { DeleteSymbol, PinSymbol, ResetSymbol } from '../../components/manage-symbol';
import EntryComposer from '../../components/entry-composer';
import CreateButton from '../../components/create-button';
import PageToolbar, { CategoryButton, CategoryRow, ToolbarResetButton } from '../../components/page-toolbar';
import { SortOptions, SortPopover } from '../../components/sort-options';
import SheetActions, { SheetDeleteButton } from '../../components/sheet-actions';
import { DEFAULT_TODO_TAGS, parseTodoTags } from '../../lib/todo-data';
import { useEntryTags } from '../../lib/use-entry-tags';
import { tagLabel } from '../../lib/tag-label';
import { isMemoImage, memoStateFits, withMemo } from '../../lib/memo-images';
import { resumeEditorInput } from '../../lib/resume-editor-input';
import { showAppMessage } from '../../lib/app-dialog';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import './index.css';

const colors = Object.keys(memoColors) as MemoColor[];
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
type ReaderChange = { owner: string; id: string; patch: Pick<Memo, 'iconId' | 'priority'>; updatedAt: string };
export default function Memos() {
  const route = useRouter();
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState('memos', initialMemoState);
  const valid = isMemoState(value), state = valid ? value : initialMemoState, writable = ready && valid;
  const [search, setSearch] = useState('');
  const [colorFilters, setColorFilters] = useState<MemoColor[]>([]);
  const [sort, setSort] = useState(0);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [managing, setManaging] = useState(false);
  const [viewed, setViewed] = useState<{ owner: string; id: string } | null>(null);
  const [readerChange, setReaderChange] = useState<ReaderChange | null>(null);
  const [readerError, setReaderError] = useState('');
  const readerChangeRef = useRef<ReaderChange | null>(null);
  const readerSaving = useRef<ReaderChange | null>(null);
  const [deletion, setDeletion] = useState<{ owner: string; note: Memo; pending?: boolean } | null>(null);
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
  const draftOwner = useRef('');
  const dismissedEditors = useRef(new Map<string, { owner: string; draft: Memo; baseline: Memo; tags: string }>());
  const tagCatalog = useEntryTags();
  const existingTags = tagCatalog.owner === owner || !tagCatalog.owner ? tagCatalog.tags : DEFAULT_TODO_TAGS;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const lastOwner = useRef('');
  useEffect(() => { setManaging(false); setViewed(null); setReaderChange(null); setReaderError(''); readerChangeRef.current = null; readerSaving.current = null; setDeletion(null); setDeleteError(''); deleting.current = null; }, [owner]);
  useEffect(() => {
    if (owner && lastOwner.current && owner !== lastOwner.current) { dismissedEditors.current.clear(); setDraft(null); setCreating(false); setBusy(false); setImageBusy(false); setSearch(''); setColorFilters([]); setTagFilters([]); setSort(0); setShowFilters(false); setShowSort(false); }
    if (owner) lastOwner.current = owner;
  }, [owner]);
  useEffect(() => {
    if (!writable || entryApplied.current || route.params.create !== '1') return;
    entryApplied.current = true; create();
  }, [writable, route.params.create]);
  const images = draft?.images?.filter(isMemoImage) ?? [];
  const readNote = writable && viewed?.owner === owner ? state.notes.find(note => note.id === viewed.id) : undefined;
  const currentDeletion = writable && deletion?.owner === owner ? deletion : null;
  const savedDraft = draft ? state.notes.find(note => note.id === draft.id) : undefined;
  const closeGuard = useEditorCloseGuard({ scope: draft && draftOwner.current === owner ? `${owner}:${draft.id}` : '', hasChanges: !!draft && (!!savedDraft && (JSON.stringify(savedDraft) !== JSON.stringify(draft) || tags !== savedDraft.tags.join('，')) || hasVolatilePersonalTool('memos', owner)), blocked: busy || imageBusy || !!currentDeletion, onSave: saveAndClose, onClose: closeEditor });
  useEffect(() => {
    if (!draft || currentDeletion || typeof document === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closeGuard.requestClose(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [draft?.id, currentDeletion, closeGuard.requestClose]);
  const filtered = useMemo(() => state.notes.filter(note => (colorFilters.length === 0 || colorFilters.includes(note.color)) && (tagFilters.length === 0 || tagFilters.some(tag => note.tags.includes(tag))) && `${note.title}\n${note.body}\n${note.tags.join(' ')}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === 2 ? noteTitle(a).localeCompare(noteTitle(b), 'zh-Hans-CN') : Date.parse(sort === 1 ? b.createdAt : b.updatedAt) - Date.parse(sort === 1 ? a.createdAt : a.updatedAt))), [state.notes, colorFilters, search, sort, tagFilters]);
  const filterTags = [...new Set(state.notes.flatMap(note => note.tags))];
  const activeCategoryTag = [...tagFilters].reverse().find(tag => filterTags.includes(tag));
  const categoryTarget = tagFilters.length === 0 ? 'memo-category-all' : activeCategoryTag === undefined ? undefined : `memo-category-${filterTags.indexOf(activeCategoryTag)}`;
  const filterCount = Number(!!search.trim()) + Number(colorFilters.length > 0) + Number(tagFilters.length > 0);
  function clearFilters() { setSearch(''); setColorFilters([]); setTagFilters([]); setSort(0); }
  function restoreDefaults() {
    if (!writable || busy || imageBusy || currentDeletion || creating || draft || readerChangeRef.current) return;
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
    setShowFilters(false); setShowSort(false); setViewed(null); setCreating(true);
  }
  function edit(note: Memo) {
    if (!writable || deleting.current || busy || imageBusy) return;
    setViewed(null);
    draftOwner.current = owner;
    const retained = dismissedEditors.current.get(note.id);
    const resume = retained?.owner === owner && retained.draft.id === note.id ? retained : null;
    dismissedEditors.current.delete(note.id);
    setDraft(resume ? resumeEditorInput(note, resume.baseline, resume.draft) : { ...note, tags: [...note.tags] });
    setTags(resume && resume.tags !== resume.baseline.tags.join('，') ? resume.tags : note.tags.join('，'));
  }
  async function save(): Promise<boolean> {
    if (!draft || busy || imageBusy || !writable || currentOwner.current !== owner || draftOwner.current !== owner) return false;
    const parsedTags = parseTodoTags(tags);
    if (parsedTags.length > 5 || parsedTags.some(tag => tag.length > 20)) { notify(new Error('最多 5 个标签，每个不超过 20 个字')); return false; }
    const captured = { ...draft, title: draft.title.trim(), body: trimTextEnd(draft.body), tags: parsedTags, updatedAt: new Date().toISOString() };
    if (!captured.title && !captured.body.trim() && !images.length) { notify(new Error('写下内容或插入图片，再保存吧')); return false; }
    if (captured.title.length > 80 || captured.body.length > 6000) { notify(new Error('便签标题最多 80 字，内容最多 6000 字')); return false; }
    const capturedOwner = owner;
    setBusy(true);
    try {
      await change(previous => {
        const existing = previous.notes.find(note => note.id === captured.id);
        if (!existing) throw new Error('这张便签已删除，请重新添加');
        const note = { ...existing, ...captured };
        if (!memoStateFits(withMemo(previous, note))) throw new Error('便签空间不足，请先移除一些图片或整理旧便签');
        return { ...previous, notes: previous.notes.map(item => item.id === note.id ? note : item) };
      });
      if (!mounted.current || currentOwner.current !== capturedOwner || currentDraft.current?.id !== captured.id) return false;
      if (hasVolatilePersonalTool('memos', capturedOwner)) throw new Error('本机存储不可用，内容已保留，请重试保存');
      dismissedEditors.current.delete(captured.id); setDraft(null); setViewed({ owner: capturedOwner, id: captured.id }); return true;
    } catch (error) { if (mounted.current && currentOwner.current === capturedOwner) notify(error); return false; }
    finally { if (mounted.current && currentOwner.current === capturedOwner) setBusy(false); }
  }
  async function saveAndClose(): Promise<false | void> {
    // save already returns to the reader after a durable write; do not cache its old raw input again.
    if (!await save()) return false;
  }
  async function pin(note: Memo) {
    try { await change(previous => ({ ...previous, notes: previous.notes.map(item => item.id === note.id ? { ...item, pinned: !item.pinned, updatedAt: new Date().toISOString() } : item) })); }
    catch (error) { notify(error); }
  }
  function closeReader() {
    if (!readerChangeRef.current && !busy) setViewed(null);
  }
  function changeReader(patch: ReaderChange['patch']) {
    if (!readNote || !writable || busy || imageBusy || currentDeletion || creating || draft || readerChangeRef.current || currentOwner.current !== owner) return;
    if (Object.entries(patch).every(([key, next]) => readNote[key as keyof Memo] === next)) return;
    const target: ReaderChange = { owner, id: readNote.id, patch, updatedAt: new Date().toISOString() };
    readerChangeRef.current = target; setReaderChange(target);
    void saveReaderChange(target);
  }
  async function saveReaderChange(target: ReaderChange) {
    if (!writable || readerSaving.current || readerChangeRef.current !== target || currentOwner.current !== target.owner) return;
    readerSaving.current = target; setBusy(true); setReaderError('');
    try {
      await change(previous => {
        const existing = previous.notes.find(note => note.id === target.id);
        if (!existing) throw new Error('这张便签已删除，请重新打开');
        const changed = { ...existing, ...target.patch, updatedAt: target.updatedAt };
        const next = { ...previous, notes: previous.notes.map(note => note.id === target.id ? changed : note) };
        if (!memoStateFits(next)) throw new Error('便签空间不足，请先整理旧便签');
        return next;
      });
      if (!mounted.current || currentOwner.current !== target.owner || readerChangeRef.current !== target) return;
      if (hasVolatilePersonalTool('memos', target.owner)) throw new Error('本机存储不可用，修改已保留，请重试保存');
      readerChangeRef.current = null; setReaderChange(null);
    } catch (error) {
      if (mounted.current && currentOwner.current === target.owner && readerChangeRef.current === target) setReaderError(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      if (readerSaving.current === target) { readerSaving.current = null; if (mounted.current && currentOwner.current === target.owner) setBusy(false); }
    }
  }
  function requestDelete(note: Memo) {
    if (!writable || busy || imageBusy || deleting.current) return;
    setDeletion({ owner, note }); setDeleteError('');
  }
  function closeDelete() { if (!deleting.current && !deletionRef.current?.pending) { setDeletion(null); setDeleteError(''); } }
  async function remove() {
    if (!currentDeletion || deleting.current || busy || imageBusy) return;
    const target = currentDeletion, id = target.note.id;
    deleting.current = target; setBusy(true); setDeleteError('');
    try {
      await change(previous => {
        if (!target.pending && !previous.notes.some(note => note.id === id)) throw new Error('这张便签已删除');
        return { ...previous, notes: previous.notes.filter(note => note.id !== id) };
      });
      if (!mounted.current || currentOwner.current !== target.owner || deleting.current !== target) return;
      if (hasVolatilePersonalTool('memos', target.owner)) {
        setDeletion({ ...target, pending: true });
        throw new Error('本机存储不可用，删除尚未保存，请重试');
      }
      dismissedEditors.current.delete(id); setDeletion(null);
      if (currentDraft.current?.id === id) setDraft(null);
      if (viewed?.id === id) setViewed(null);
    } catch (error) {
      if (mounted.current && currentOwner.current === target.owner && deletionRef.current?.note.id === id) setDeleteError(error instanceof Error ? error.message : '删除失败，请重试');
    } finally {
      if (deleting.current === target) { deleting.current = null; if (mounted.current && currentOwner.current === target.owner) setBusy(false); }
    }
  }
  function closeEditor() {
    const capturedOwner = owner, capturedId = draft?.id;
    const saved = state.notes.find(note => note.id === draft?.id);
    if (draft) {
      if (draftOwner.current !== capturedOwner || currentOwner.current !== capturedOwner) return;
      dismissedEditors.current.set(draft.id, { owner: capturedOwner, draft, baseline: saved || draft, tags });
      setDraft(null); return;
    }
    if (!mounted.current || currentOwner.current !== capturedOwner || currentDraft.current?.id !== capturedId) return;
    setDraft(null);
  }
  const filterFields = <FilterFields>
    <FilterField label='关键词'><FilterSearch className='memo-filter-search' ariaLabel='搜索便签' placeholder='搜索标题、内容或标签' value={search} onInput={event => setSearch(event.detail.value)} clearLabel='清空便签搜索' onClear={() => setSearch('')} onConfirm={() => setShowFilters(false)} /></FilterField>
    <FilterField label='标签'><FilterOptionGrid><ChoiceButton selected={tagFilters.length === 0} ariaLabel='便签标签：全部' onClick={() => setTagFilters([])}>全部</ChoiceButton>{filterTags.map(tag => <ChoiceButton key={tag} selected={tagFilters.includes(tag)} ariaLabel={`便签标签：${tag}`} onClick={() => setTagFilters(previous => previous.includes(tag) ? previous.filter(value => value !== tag) : [...previous, tag])}>{tagLabel(tag)}</ChoiceButton>)}</FilterOptionGrid></FilterField>
    <FilterField label='颜色'><FilterOptionGrid className='memo-filter-colors'><ChoiceButton selected={colorFilters.length === 0} ariaLabel='便签颜色：全部' onClick={() => setColorFilters([])}>全部</ChoiceButton>{colors.map(key => <ChoiceButton key={key} selected={colorFilters.includes(key)} ariaLabel={`便签颜色：${memoColors[key].label}`} onClick={() => setColorFilters(previous => previous.includes(key) ? previous.filter(value => value !== key) : [...previous, key])}><View style={{ backgroundColor: memoColors[key].value }} />{memoColors[key].label}</ChoiceButton>)}</FilterOptionGrid></FilterField>
  </FilterFields>;
  return <>
    <PageScroll><View className='tool-page memo-page core-page'><CoreScreen className='memo-core'>
      <PageToolbar className='memo-toolbar' reset={<ToolbarResetButton ariaLabel='恢复便签默认方式' disabled={!writable || busy || imageBusy || !!currentDeletion || creating || !!draft || !!readerChange} onReset={restoreDefaults} />} sort={<SortPopover ariaLabel='排序便签' open={showSort} onOpenChange={open => { if (open) setShowFilters(false); setShowSort(open); }} disabled={!writable} selected={showSort || sort !== 0} confirmLabel='完成' onConfirm={() => setShowSort(false)}><SortOptions className='memo-filter-sort' options={sortLabels.map((label, index) => ({ value: index, label, ariaLabel: `便签排序：${label}` }))} value={sort} onChange={setSort} /></SortPopover>} filter={<FilterPopover ariaLabel='筛选便签' title='筛选便签' open={showFilters} onOpenChange={open => { if (open) setShowSort(false); setShowFilters(open); }} disabled={!writable} triggerClassName='memo-filter-toggle' triggerSelected={filterCount > 0} panelClassName='memo-filter-popover memo-filter-sheet' headingClassName='memo-filter-heading' actionsClassName='memo-filter-footer' resetClassName='memo-filter-reset' closeLabel='关闭便签筛选' onClose={() => setShowFilters(false)} resetLabel='重置便签筛选' applyLabel={`查看 ${filtered.length} 张便签`} onReset={clearFilters}>
          {filterFields}
        </FilterPopover>} manage={<ChoiceButton id='memo-settings' iconOnly size='compact' ariaLabel='管理便签删除' selected={managing} disabled={!writable || busy || imageBusy || !!currentDeletion || creating} onClick={() => { setShowSort(false); setShowFilters(false); setManaging(previous => !previous); }}><DeleteSymbol /></ChoiceButton>} create={<CreateButton className='memo-create' label='创建便签' disabled={!writable || busy} onClick={create} />} />
      <CategoryRow ariaLabel='便签分类' className='memo-category-row' fixedLeading={<CategoryButton id='memo-category-all' ariaLabel='便签分类：全部' selected={tagFilters.length === 0} onClick={() => setTagFilters([])}>全部</CategoryButton>} scrollIntoView={categoryTarget} selectionOffset={1.5} contentKey={JSON.stringify([owner, filterTags])} scrollWithAnimation>{filterTags.map((tag, index) => <CategoryButton id={`memo-category-${index}`} key={tag} ariaLabel={`便签分类：${tag}`} selected={tagFilters.includes(tag)} onClick={() => setTagFilters(tagFilters.length === 1 && tagFilters.includes(tag) ? [] : [tag])}>{tagLabel(tag)}</CategoryButton>)}</CategoryRow>
      <View className='memo-list-heading'><View><SectionTitle inRow className='memo-list-label'>{filterCount ? '筛选结果' : '全部便签'}</SectionTitle><Text className='memo-list-count'>{filtered.length}</Text></View><Text>{sortLabels[sort]}{filtered.some(note => note.pinned) ? ' · 置顶优先' : ''}</Text></View>
      {!!filterCount && <View className='memo-active-filters'><Text>{[search.trim() && `“${search.trim()}”`, ...tagFilters.map(tagLabel), ...colorFilters.map(color => memoColors[color].label)].filter(Boolean).join(' · ')}</Text><ActionButton appearance='icon' size='compact' ariaLabel='重置便签筛选' onClick={clearFilters}><ResetSymbol /></ActionButton></View>}
      <ScrollView id='memo-list' key={JSON.stringify([owner, search, colorFilters, sort, tagFilters])} className='memo-list-scroll' scrollY enhanced bounces={false} showScrollbar={false}>
        {!ready ? <View className='memo-list-empty'><View className='memo-empty-paper' aria-hidden /><Text className='memo-empty-title'>正在读取便签…</Text></View> : !valid ? <View className='memo-list-empty'><Text className='memo-empty-title'>暂时无法显示便签</Text><Text>当前数据格式暂不兼容，原始数据已保留。</Text><ActionButton className='button-label tool-secondary' onClick={retry}>重新读取</ActionButton></View> : filtered.length ? <View className='memo-list'>{filtered.map(note => {
          const photos = note.images?.filter(isMemoImage) ?? [];
          const title = noteTitle(note);
          return <View className='memo-note' style={memoColorStyle(note.color)} key={note.id}>
            <HabitPriorityCorner priority={memoPriority(note)} color={memoPriorityColor(memoPriority(note))} />
            <Button className='memo-note-open' hoverClass='none' ariaLabel={`查看便签：${title}`} onClick={() => { if (writable && !busy && !imageBusy && !deletionRef.current) setViewed({ owner, id: note.id }); }}>
              {getLibraryIcon(note.iconId) ? <LibraryIcon className='memo-note-symbol' name={note.iconId} /> : <View className='memo-note-paper' style={{ color: memoColors[note.color].value, backgroundColor: memoColors[note.color].surface }} aria-hidden><View /><View /><View /></View>}
              <View className='memo-note-copy'>
                <View className='memo-note-title-row'><Text className='memo-note-title'>{title}</Text></View>
                <Text className='memo-note-body'>{note.body ? excerpt(note.body) : photos.length ? `${photos.length} 张图片` : '暂无正文'}</Text>
                <View className='memo-note-meta'>{note.pinned && <Text className='memo-note-pinned'>置顶</Text>}{note.tags.slice(0, 2).map(tag => <Text className='memo-note-tag' key={tag}>{tagLabel(tag)}</Text>)}{note.tags.length > 2 && <Text>＋{note.tags.length - 2}</Text>}{!!photos.length && !!note.body && <Text className='memo-note-photo-count'>{photos.length} 图</Text>}<Text className='memo-note-date'>{noteDate(sort === 1 ? note.createdAt : note.updatedAt)}</Text></View>
              </View>
              {!!photos.length && <View className='memo-note-images'><Image src={photos[0].dataUrl} mode='aspectFill' /></View>}
            </Button>
            <View className='memo-note-actions'>
              <ChoiceButton iconOnly size='compact' className='button-label memo-note-pin' ariaLabel={`${note.pinned ? '取消置顶' : '置顶'}便签：${title}`} aria-pressed={note.pinned} disabled={!writable || busy} onClick={() => { void pin(note); }}><PinSymbol /></ChoiceButton>
              {managing && <ActionButton appearance='icon' intent='danger' size='compact' ariaLabel={`删除便签：${title}`} disabled={busy || imageBusy || !writable} onClick={() => requestDelete(note)}><DeleteSymbol /></ActionButton>}
            </View>
          </View>;
        })}</View> : <View className='memo-list-empty'><View className='memo-empty-paper' aria-hidden /><Text className='memo-empty-title'>{state.notes.length ? '没有符合条件的便签' : '还没有便签'}</Text>{!state.notes.length && <ActionButton className='button-label tool-secondary' disabled={!writable || busy} onClick={() => { void change(previous => previous.notes.length ? previous : { ...previous, notes: demoMemos() }).catch(notify); }}>生成示例便签</ActionButton>}{!!filterCount && <ActionButton className='button-label tool-secondary' onClick={clearFilters}>清除筛选</ActionButton>}</View>}
      </ScrollView>
      {!!status && <View className='tool-status'><Text>{status}</Text><ActionButton className='button-label' onClick={retry}>重试同步</ActionButton></View>}
    </CoreScreen></View></PageScroll>
    {readNote && <MemoReader key={`${owner}:${readNote.id}`} note={readNote} title={noteTitle(readNote)} onClose={closeReader}
      changing={busy} changeError={readerError} closeDisabled={busy || !!readerChange}
      changeDisabled={busy || imageBusy || !!currentDeletion || creating || !!draft || !!readerChange}
      onIconChange={id => { if (id === null || getLibraryIcon(id)) changeReader({ iconId: id ?? undefined }); }} onPriorityChange={priority => changeReader({ priority })}
      onRetry={() => { const target = readerChangeRef.current; if (target) void saveReaderChange(target); }}
      editDisabled={busy || imageBusy || !!currentDeletion || creating || !!draft || !!readerChange} onEdit={() => { if (!readerChangeRef.current && viewed?.owner === currentOwner.current) edit(readNote); }}
      pinDisabled={busy || imageBusy || !!currentDeletion || creating || !!draft || !!readerChange} onPin={() => { if (!readerChangeRef.current && viewed?.owner === currentOwner.current) void pin(readNote); }} />}
    {draft && <View className='memo-overlay'><View className='memo-backdrop' onClick={closeGuard.requestClose} /><View className='memo-sheet'>
      <EditorHeading className='memo-sheet-heading' titleClassName='memo-sheet-title' title='编辑便签' actions={<ActionButton appearance='icon' className='button-label' aria-label='关闭便签编辑' disabled={busy || imageBusy} onClick={closeGuard.requestClose}>×</ActionButton>} />
      <ScrollView scrollY className='memo-sheet-scroll' enhanced bounces={false} showScrollbar={false}><View className='memo-sheet-fields'>
        <MemoEditorFields draft={draft} onChange={setDraft} tagsText={tags} onTagsChange={setTags} tagOptions={existingTags} disabled={busy || !writable} owner={owner} onBusyChange={setImageBusy} />
      </View></ScrollView><SheetActions className='memo-sheet-footer' leading={<SheetDeleteButton ariaLabel='删除便签' disabled={busy || imageBusy || !writable} onClick={() => requestDelete(draft)} />}><ActionButton appearance='primary' className="button-label tool-primary" loading={busy} disabled={busy || imageBusy || !writable || !draft.title.trim() && !draft.body.trim() && !images.length} onClick={() => { void save(); }}>保存</ActionButton></SheetActions>
    </View></View>}
    <AppDialog open={!!currentDeletion} title='删除便签' ariaLabel='删除便签确认' closeLabel='关闭便签删除确认' onClose={closeDelete} busy={busy || !!currentDeletion?.pending} error={deleteError} actions={<ActionButton appearance='danger' size='large' width='fill' disabled={busy} loading={busy} onClick={() => { void remove(); }}>{currentDeletion?.pending ? '重试删除' : '删除'}</ActionButton>}>
      <Text>删除「{currentDeletion && noteTitle(currentDeletion.note)}」？</Text>
    </AppDialog>
    {creating && <EntryComposer initialMode='memo' onClose={() => setCreating(false)} />}
    {closeGuard.dialog}
  </>;
}
