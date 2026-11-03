import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Input, Text, View } from '@tarojs/components';
import { getLibraryIcon } from '../lib/icon-library';
import { tagLabel } from '../lib/tag-label';
import { ChoicePopover, PopoverHeading } from './form-options';
import ActionButton, { ChoiceButton } from './ui-button';
import { AddSymbol } from './create-button';
import { DeleteSymbol, EditSymbol } from './manage-symbol';
import LibraryIcon from './library-icon';
import IconLibrarySheet from './icon-library-sheet';
import SingleLineInput from './single-line-input';
import SheetActions from './sheet-actions';
import SheetBackdrop from './sheet-backdrop';
import EditorHeading from './editor-heading';
import AppDialog from './app-dialog';
import './todo-primary-tag-picker.css';

export type TodoPrimaryTagDraft = { originalName?: string; name: string; iconId: string };
export type TodoTagStyles = Readonly<Record<string, { iconId?: string }>>;
export type TodoPrimaryTagMutations = {
  tags: readonly string[]; styles?: TodoTagStyles; disabled?: boolean; owner?: string;
  onUpsert: (tag: TodoPrimaryTagDraft) => Promise<void> | void;
  onDelete?: (tag: string) => Promise<void> | void;
};

/** Selection reorders the task's existing tags; the host owns the mutation. */
export default function TodoPrimaryTagPicker({ value, onChange, ...props }: TodoPrimaryTagMutations & { value: string; onChange: (tag: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [props.owner]);
  return <TagWindow {...props} open={open} onOpenChange={setOpen} selected={value} onSelect={tag => { onChange(tag); setOpen(false); }} ariaLabel='主要标签'
    trigger={<><LibraryIcon name={props.styles?.[value]?.iconId} fallback='notes' className='todo-primary-tag-icon' variant={value ? 'colored' : 'outline'} /><Text>{value || '主要标签'}</Text></>} />;
}
let nextManagerId = 0;
export function TodoPrimaryTagManager({ open, onClose, ...props }: TodoPrimaryTagMutations & { open: boolean; onClose: () => void }) {
  const [id] = useState(() => `todo-primary-tag-manager-${++nextManagerId}`);
  return <><View id={id} className='todo-primary-tag-manager-anchor' aria-hidden /><TagWindow {...props} open={open} onOpenChange={next => { if (!next) onClose(); }} anchorId={id} ariaLabel='管理任务标签' /></>;
}

function TagWindow({ tags, styles = {}, disabled = false, owner = '', onUpsert, onDelete, open, onOpenChange, selected, onSelect, ariaLabel, trigger, anchorId }: TodoPrimaryTagMutations & {
  open: boolean; onOpenChange: (open: boolean) => void; selected?: string; onSelect?: (tag: string) => void;
  ariaLabel: string; trigger?: ReactNode; anchorId?: string;
}) {
  const [query, setQuery] = useState(''), [editor, setEditor] = useState<TodoPrimaryTagDraft | null>(null), [icons, setIcons] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const latest = useRef({ owner, editor, busy, disabled, tags, onSelect }); latest.current = { owner, editor, busy, disabled, tags, onSelect };
  const generation = useRef(0);
  useEffect(() => { ++generation.current; setEditor(null); setIcons(false); setDeleting(null); setBusy(false); setError(''); setQuery(''); }, [owner, open]);
  useEffect(() => () => { ++generation.current; }, []);
  useEffect(() => {
    if (!editor || typeof window === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; event.preventDefault(); event.stopImmediatePropagation(); if (icons) setIcons(false); else if (!latest.current.busy) setEditor(null); };
    window.addEventListener('keydown', close, true); return () => window.removeEventListener('keydown', close, true);
  }, [editor?.originalName, !!editor, icons]);
  const locked = disabled || busy;
  function begin(tag?: string) { if (locked) return; setError(''); setEditor({ ...(tag ? { originalName: tag } : {}), name: tag || '', iconId: tag && styles[tag]?.iconId || 'notes' }); }
  async function save() {
    const draft = latest.current.editor;
    if (!draft?.name.trim() || latest.current.busy || latest.current.disabled) return;
    if (draft.originalName && !latest.current.tags.includes(draft.originalName) && styles[draft.name]?.iconId !== draft.iconId) { setError('这个标签已被移除，请关闭后重新选择'); return; }
    const expectedOwner = owner, operation = ++generation.current; setBusy(true); latest.current.busy = true; setError('');
    try {
      await onUpsert({ ...draft, name: draft.name.trim() });
      if (latest.current.owner !== expectedOwner || operation !== generation.current) return;
      setEditor(null); setIcons(false); latest.current.onSelect?.(draft.name.trim());
    } catch (reason) { if (latest.current.owner === expectedOwner && operation === generation.current) setError(reason instanceof Error ? reason.message : '标签未保存，请重试'); }
    finally { if (latest.current.owner === expectedOwner && operation === generation.current) { setBusy(false); latest.current.busy = false; } }
  }
  async function remove() {
    if (!deleting || !onDelete || locked) return;
    const expectedOwner = owner, operation = ++generation.current, tag = deleting; setBusy(true); latest.current.busy = true; setError('');
    try { await onDelete(tag); if (latest.current.owner !== expectedOwner || operation !== generation.current) return; setDeleting(null); }
    catch (reason) { if (latest.current.owner === expectedOwner && operation === generation.current) setError(reason instanceof Error ? reason.message : '标签未移除，请重试'); }
    finally { if (latest.current.owner === expectedOwner && operation === generation.current) { setBusy(false); latest.current.busy = false; } }
  }
  const rows = [...new Set(tags.filter(tag => !!tag.trim()))].filter(tag => tag.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <>
    <ChoicePopover ariaLabel={ariaLabel} anchorId={anchorId} open={open} onOpenChange={next => { if (!editor && !deleting && !busy) onOpenChange(next); }} disabled={disabled}
      trigger={trigger} triggerAppearance='quiet' triggerSize='compact' triggerClassName='todo-primary-tag-trigger' panelClassName='todo-primary-tag-panel' layerClassName='todo-primary-tag-layer'
      panelWidth={400} placement='center' maxHeightRatio={.8} contentKey={`${query}:${tags.length}:${error}`} bodySpacing='none'
      heading={<PopoverHeading title={onSelect ? '主要标签' : '任务标签'} actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭主要标签' disabled={locked || !!editor || !!deleting} onClick={() => onOpenChange(false)}>×</ActionButton>} />}
      footer={<SheetActions><ActionButton appearance='quiet' size='compact' width='fill' ariaLabel='新建任务标签' disabled={locked} onClick={() => begin()}><AddSymbol /><Text>新建标签</Text></ActionButton></SheetActions>}>
      <View className='todo-primary-tag-search'><SingleLineInput ariaLabel='搜索任务标签' placeholder='搜索标签' align='left' value={query} maxlength={100} disabled={locked} onInput={event => setQuery(event.detail.value)} /></View>
      <View className='todo-primary-tag-options'>{rows.map(tag => <View className='todo-primary-tag-option-row' key={tag}>
        <ChoiceButton className='todo-primary-tag-option' selected={!!onSelect && selected === tag} ariaLabel={`${onSelect ? '设为主要标签' : '查看标签'}：${tag}`} disabled={locked || !onSelect} onClick={() => { if (!locked) onSelect?.(tag); }}><LibraryIcon name={styles[tag]?.iconId} fallback='notes' className='todo-primary-tag-icon' /><Text>{tagLabel(tag)}</Text>{onSelect && selected === tag && <Text className='todo-primary-tag-selected' aria-hidden>✓</Text>}</ChoiceButton>
        <ActionButton appearance='icon' size='compact' ariaLabel={`编辑标签：${tag}`} disabled={locked} onClick={() => begin(tag)}><EditSymbol /></ActionButton>
        {onDelete && <ActionButton appearance='icon' size='compact' intent='danger' ariaLabel={`删除标签：${tag}`} disabled={locked} onClick={() => { setError(''); setDeleting(tag); }}><DeleteSymbol /></ActionButton>}
      </View>)}</View>{!rows.length && <View className='todo-primary-tag-empty'>没有找到标签</View>}
    </ChoicePopover>
    {editor && <View className='todo-primary-tag-editor-layer' catchMove><SheetBackdrop disabled={locked} onClose={() => setEditor(null)} /><View className='todo-primary-tag-editor floating-window' role='dialog' ariaLabel={editor.originalName ? '编辑任务标签' : '新建任务标签'}>
      <EditorHeading title={editor.originalName ? '编辑标签' : '新建标签'} actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭标签编辑' disabled={locked} onClick={() => setEditor(null)}>×</ActionButton>} />
      <View className='todo-primary-tag-definition'><ActionButton appearance='icon' size='regular' ariaLabel='选择任务标签图标' disabled={locked} onClick={() => setIcons(true)}><LibraryIcon name={editor.iconId} fallback='notes' /></ActionButton><Input className='todo-primary-tag-name' ariaLabel='任务标签名称' placeholder='标签名称' focus={!icons} value={editor.name} maxlength={Math.max(100, editor.name.length)} disabled={locked} onInput={event => setEditor({ ...editor, name: event.detail.value })} onConfirm={() => { void save(); }} /></View>
      {!!error && <View className='todo-primary-tag-error' role='alert'>{error}</View>}<SheetActions><ActionButton appearance='primary' size='large' width='fill' ariaLabel='完成标签编辑' loading={busy} disabled={locked || !editor.name.trim()} onClick={() => { void save(); }}>完成</ActionButton></SheetActions>
    </View></View>}
    {editor && icons && <IconLibrarySheet className='todo-primary-tag-icons' selectedId={editor.iconId} title='任务标签图标' ariaLabel='任务标签图标库' closeLabel='关闭任务标签图标库' onClose={() => setIcons(false)} onSelect={id => { if (id && getLibraryIcon(id)) { setEditor({ ...editor, iconId: id }); setIcons(false); } }} />}
    {deleting && <AppDialog title='移除标签' ariaLabel='移除任务标签' closeLabel='取消移除标签' busy={busy} error={error} onClose={() => { if (!busy) setDeleting(null); }} actions={<ActionButton appearance='danger' size='large' width='fill' disabled={locked} loading={busy} onClick={() => { void remove(); }}>移除标签</ActionButton>}><Text>从任务中移除「{deleting}」？任务内容和其它标签保留。</Text></AppDialog>}
  </>;
}
