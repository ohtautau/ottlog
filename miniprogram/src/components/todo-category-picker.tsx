import { useEffect, useRef, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import { getLibraryIcon } from '../lib/icon-library';
import { toolId, type TodoCategory } from '../lib/tool-records';
import { TODO_INBOX, todoCategoryChoices, type TodoCategoryDraft } from '../lib/todo-categories';
import { ChoicePopover, PopoverHeading } from './form-options';
import ActionButton from './ui-button';
import ActionMenu from './action-menu';
import { AddSymbol } from './create-button';
import { DeleteSymbol, EditSymbol } from './manage-symbol';
import LibraryIcon from './library-icon';
import IconLibrarySheet from './icon-library-sheet';
import SearchInput from './search-input';
import CheckSymbol from './check-symbol';
import SheetActions from './sheet-actions';
import SheetBackdrop from './sheet-backdrop';
import EditorHeading from './editor-heading';
import AppDialog from './app-dialog';
import './todo-category-picker.css';
import './entity-choice-options.css';

/** Classification is independent of ordinary task tags. Hosts own persistence. */
export default function TodoCategoryPicker({ categories, value, onChange, onUpsert, onDelete, owner = '', disabled = false }: {
  categories: readonly TodoCategory[]; value: string; owner?: string; disabled?: boolean;
  onChange: (id: string) => void; onUpsert: (draft: TodoCategoryDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const [managing,setManaging]=useState(false),[more,setMore]=useState(false);
  const [editor, setEditor] = useState<TodoCategoryDraft | null>(null), [icons, setIcons] = useState(false);
  const [deleting, setDeleting] = useState<TodoCategory | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const current = useRef({ owner, disabled, busy, onChange }); current.current = { owner, disabled, busy, onChange };
  const generation = useRef(0);
  useEffect(() => { ++generation.current; setOpen(false); setManaging(false); setMore(false); setEditor(null); setIcons(false); setDeleting(null); setBusy(false); setError(''); setQuery(''); }, [owner]);
  useEffect(() => () => { ++generation.current; }, []);
  useEffect(() => {
    if (!editor || typeof window === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; event.preventDefault(); event.stopImmediatePropagation(); if (icons) setIcons(false); else if (!current.current.busy) setEditor(null); };
    window.addEventListener('keydown', close, true); return () => window.removeEventListener('keydown', close, true);
  }, [!!editor, icons]);
  const locked = disabled || busy;
  const selected = categories.find(item => item.id === value) || TODO_INBOX;
  function begin(category?: TodoCategory) {
    if (locked) return;
    setError(''); setEditor({ id: category?.id || toolId(), name: category?.name || '', iconId: category?.iconId || 'notes', existing: !!category });
  }
  async function save() {
    if (!editor?.name.trim() || current.current.busy || current.current.disabled) return;
    const draft = { ...editor, name: editor.name.trim() }, expectedOwner = owner, operation = ++generation.current;
    setBusy(true); current.current.busy = true; setError('');
    try {
      await onUpsert(draft);
      if (current.current.owner !== expectedOwner || operation !== generation.current) return;
      setEditor(null); setIcons(false); if(!managing){setOpen(false);current.current.onChange(draft.id);}
    } catch (reason) { if (current.current.owner === expectedOwner && operation === generation.current) setError(reason instanceof Error ? reason.message : '分类未保存，请重试'); }
    finally { if (current.current.owner === expectedOwner && operation === generation.current) { setBusy(false); current.current.busy = false; } }
  }
  async function remove() {
    if (!deleting || locked) return;
    const id = deleting.id, expectedOwner = owner, operation = ++generation.current;
    setBusy(true); current.current.busy = true; setError('');
    try { await onDelete(id); if (current.current.owner !== expectedOwner || operation !== generation.current) return; setDeleting(null); }
    catch (reason) { if (current.current.owner === expectedOwner && operation === generation.current) setError(reason instanceof Error ? reason.message : '分类未删除，请重试'); }
    finally { if (current.current.owner === expectedOwner && operation === generation.current) { setBusy(false); current.current.busy = false; } }
  }
  const rows = todoCategoryChoices({ categories }).filter(item => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <>
    <ChoicePopover ariaLabel='任务分类' open={open} onOpenChange={next => { if (!editor && !deleting && !busy) { setOpen(next); setError(''); if(!next){setManaging(false);setMore(false);setQuery('');} } }} disabled={disabled}
      trigger={<><LibraryIcon name={selected.iconId} fallback='notes' className='todo-category-icon' variant={selected.id ? 'colored' : 'outline'} /><Text>{selected.name}</Text></>}
      triggerAppearance='quiet' triggerSize='compact' triggerClassName='todo-category-trigger' panelClassName='todo-category-panel' layerClassName='todo-category-layer'
      panelWidth={400} placement='anchor' align='start' preferredSide='below' maxHeightRatio={.8} contentKey={`${managing}:${query}:${categories.length}:${error}`} bodySpacing='none'
      heading={<PopoverHeading title={managing?'编辑分类':'任务分类'} actions={<ActionMenu ariaLabel='分类更多操作' open={more} onOpenChange={setMore} disabled={locked || !!editor || !!deleting}><ActionButton appearance='quiet' onClick={()=>{setMore(false);setManaging(!managing);setQuery('');}}>{managing?'完成编辑':'编辑'}</ActionButton><ActionButton appearance='quiet' onClick={()=>{setMore(false);setOpen(false);setManaging(false);}}>关闭</ActionButton></ActionMenu>} />}>
      <View className='entity-choice-body'><View className='entity-choice-search'><SearchInput ariaLabel='搜索任务分类' placeholder='搜索分类' value={query} maxlength={100} disabled={locked} onInput={event => setQuery(event.detail.value)} /></View>
      <View className='todo-category-options entity-choice-options'>{rows.map(category => <View className='todo-category-option-row' key={category.id}>
        <ActionButton appearance='quiet' className={`todo-category-option${selected.id === category.id ? ' is-selected' : ''}`} aria-pressed={selected.id === category.id} ariaLabel={`选择分类：${category.name}`} disabled={locked} onClick={() => { if (!locked) { if(managing){if(category.id)begin(category);}else{onChange(category.id);setOpen(false);} } }}><LibraryIcon name={category.iconId} fallback='notes' className='todo-category-icon' /><Text>{category.name}</Text></ActionButton>
        {managing && !!category.id && <><ActionButton appearance='icon' size='compact' ariaLabel={`编辑分类：${category.name}`} disabled={locked} onClick={() => begin(category)}><EditSymbol /></ActionButton><ActionButton appearance='icon' size='compact' intent='danger' ariaLabel={`删除分类：${category.name}`} disabled={locked} onClick={() => { setError(''); setDeleting(category); }}><DeleteSymbol /></ActionButton></>}
        <View className='todo-category-selection-slot'>{selected.id===category.id && <CheckSymbol className='todo-category-selected'/>}</View>
      </View>)}<View className='todo-category-create-row'><ActionButton appearance='quiet' size='compact' width='fill' ariaLabel='新建任务分类' disabled={locked} onClick={()=>begin()}><AddSymbol/><Text>新建分类</Text></ActionButton></View></View>{!rows.length && <View className='todo-category-empty'>没有找到分类</View>}
      </View>
    </ChoicePopover>
    {editor && <View className='todo-category-editor-layer' catchMove><SheetBackdrop disabled={locked} onClose={() => setEditor(null)} /><View className='todo-category-editor floating-window' role='dialog' ariaLabel={editor.existing ? '编辑任务分类' : '新建任务分类'}>
      <EditorHeading title={editor.existing ? '编辑分类' : '新建分类'} actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭分类编辑' disabled={locked} onClick={() => setEditor(null)}>×</ActionButton>} />
      <View className='todo-category-definition'><ActionButton appearance='icon' size='regular' ariaLabel='选择分类图标' disabled={locked} onClick={() => setIcons(true)}><LibraryIcon name={editor.iconId} fallback='notes' /></ActionButton><Input className='todo-category-name' ariaLabel='分类名称' placeholder='分类名称' focus={!icons} value={editor.name} maxlength={Math.max(100, editor.name.length)} disabled={locked} onInput={event => setEditor({ ...editor, name: event.detail.value })} onConfirm={() => { void save(); }} /></View>
      {!!error && <View className='todo-category-error' role='alert'>{error}</View>}<SheetActions><ActionButton appearance='primary' size='large' width='fill' ariaLabel='完成分类编辑' loading={busy} disabled={locked || !editor.name.trim()} onClick={() => { void save(); }}>完成</ActionButton></SheetActions>
    </View></View>}
    {editor && icons && <IconLibrarySheet className='todo-category-icons' selectedId={editor.iconId} title='分类图标' ariaLabel='分类图标库' closeLabel='关闭分类图标库' onClose={() => setIcons(false)} onSelect={id => { if (id && getLibraryIcon(id)) { setEditor({ ...editor, iconId: id }); setIcons(false); } }} />}
    {deleting && <AppDialog title='删除分类' ariaLabel='删除任务分类' closeLabel='取消删除分类' busy={busy} error={error} onClose={() => { if (!busy) setDeleting(null); }} actions={<ActionButton appearance='danger' size='large' width='fill' disabled={locked} loading={busy} onClick={() => { void remove(); }}>删除分类</ActionButton>}><Text>删除「{deleting.name}」后，其中的任务移至收集箱，普通标签保留。</Text></AppDialog>}
  </>;
}
