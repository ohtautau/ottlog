import { showAppMessage } from '../lib/app-dialog';
import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import MarkdownNoteEditor from './markdown-note-editor';
import SheetActions, { SheetDeleteButton } from './sheet-actions';
import EditorHeading from './editor-heading';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import { initialDomainState, isDomainState, MAX_DOMAIN_RECORD_LENGTH, type RecordItem, type RecordKind } from '../lib/domain-data';
import { hasVolatilePersonalTool, usePersonalToolState } from '../lib/use-personal-tool-state';
import { editDomainRecord, packRecordEdit, recordEditKey, sameRecord, unpackRecordEdit, type RecordEditDraft } from '../lib/domain-record-edit';
import './domain-record-editor.css';
import EditorFieldsLayout from './editor-fields-layout';

export default function DomainRecordEditor({ owner, domainId, kind, record, title, dateLabel, onClose }: {
  owner: string; domainId: string; kind: RecordKind; record: RecordItem; title: string; dateLabel: string; onClose: () => void;
}) {
  const source = usePersonalToolState('domains', initialDomainState);
  const [draft, setDraft] = useState<RecordEditDraft | null>(null), [busy, setBusy] = useState(false), [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState(''), [info, setInfo] = useState('');
  const mounted = useRef(true), operating = useRef(false), processing = useRef(false), completed = useRef(false), latest = useRef(draft);
  latest.current = draft;
  const current = useRef(source); current.current = source;
  const key = recordEditKey(owner, record.id);
  const writable = source.ready && source.owner === owner && isDomainState(source.value);
  const locked = !writable || busy || imageBusy || !!draft?.pending;
  function store(value: RecordEditDraft) { Taro.setStorageSync(key, packRecordEdit(value)); }
  useEffect(() => { source.retry(); }, [source.retry]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (!completed.current && latest.current) try { store(latest.current); } catch { void showAppMessage({ title: '编辑草稿未保存，请检查本机存储', icon: 'none' }); }
    };
  }, []);
  function load() {
    if (!writable || draft) return;
    try {
      const saved = unpackRecordEdit(Taro.getStorageSync(key), domainId, kind, record);
      if (saved && !saved.pending && !sameRecord(saved.original, record)) setInfo('记录已变化，已恢复草稿，请核对后保存');
      setDraft(saved ? { ...saved, original: saved.pending ? saved.original : record } : { version: 1, domainId, kind, original: record, record });
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '编辑草稿读取失败，请重试'); }
  }
  useEffect(() => {
    if (source.owner && source.owner !== owner) { onClose(); return; }
    load();
  }, [writable, source.owner]);
  useEffect(() => { if (draft && !completed.current) try { store(draft); } catch (cause) { setError(cause instanceof Error ? cause.message : '编辑草稿保存失败，请重试'); } }, [draft]);
  function dismiss() {
    if (operating.current || processing.current) return;
    try { if (latest.current) store(latest.current); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '编辑草稿保存失败，请重试'); }
  }
  const closeGuard = useEditorCloseGuard({ scope: `${owner}:${record.id}`, hasChanges: !!draft && (!sameRecord(draft.record, record) || !!draft.pending), blocked: busy || imageBusy, onSave: () => commit('save'), onClose: dismiss });
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') closeGuard.requestClose(); };
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, [closeGuard.requestClose]);
  function imagesBusy(value: boolean) { processing.current = value; if (mounted.current) setImageBusy(value); }
  function update(record: RecordItem) { if (!operating.current && writable && draft && !draft.pending) { setError(''); setDraft({ ...draft, record }); } }
  async function commit(action: 'save' | 'delete') {
    const captured = latest.current;
    if (!captured || operating.current || processing.current || !current.current.ready || current.current.owner !== owner || captured.pending && captured.pending !== action) return;
    operating.current = true; setBusy(true); setError('');
    try {
      // Normalize once so the same target and original ID remain stable on retry.
      const target = { ...captured, record: { ...captured.record, content: captured.record.content.trim() } };
      await current.current.setValue(previous => {
        if (current.current.owner !== owner || !current.current.ready) throw new Error('账号已变化，请重新打开');
        return editDomainRecord(previous, target, action);
      });
      if (hasVolatilePersonalTool('domains', owner)) {
        if (mounted.current && current.current.owner === owner) { latest.current = { ...target, pending: action }; setDraft(latest.current); }
        throw new Error('本机存储不可用，内容已保留，请重试');
      }
      completed.current = true;
      try { Taro.removeStorageSync(key); } catch { /* A committed original snapshot cannot silently overwrite later edits. */ }
      if (mounted.current && current.current.owner === owner) onClose();
    } catch (cause) { if (mounted.current && current.current.owner === owner) setError(cause instanceof Error ? cause.message : '保存失败，请重试'); }
    finally { operating.current = false; if (mounted.current) setBusy(false); }
  }
  return <View className='domains-editor'><View className='domain-overlay'>
    <View className='domain-backdrop' catchMove onClick={closeGuard.requestClose} />
    <View className='domain-sheet domain-sheet-record-edit' role='dialog' ariaLabel={title}>
      <EditorHeading className='domain-sheet-heading' title={title} actions={<ActionButton appearance='icon' ariaLabel='关闭记录编辑' disabled={busy || imageBusy} onClick={closeGuard.requestClose}>×</ActionButton>} />
      <ScrollView scrollY className='domain-sheet-scroll' showScrollbar={false}><EditorFieldsLayout className='domain-sheet-body'>
        <View className='record-edit-meta'><Text>创建日期：{dateLabel}</Text></View>
        {!draft ? <View className='record-edit-loading'><Text>正在读取编辑草稿…</Text><ActionButton disabled={!writable} onClick={load}>重试</ActionButton></View> : <MarkdownNoteEditor format='plain' showImageInsertion={false} value={draft.record.content} images={draft.record.images} owner={owner} recordId={record.id} disabled={locked} canInsertImage={false} onBusyChange={imagesBusy} maxLength={MAX_DOMAIN_RECORD_LENGTH} ariaLabel='记录内容' placeholder='写下内容…'
          onChange={content => update({ ...draft.record, content })} onImagesChange={images => update({ ...draft.record, images })} checkImages={images => { editDomainRecord(current.current.value, { ...draft, record: { ...draft.record, images } }); }} />}
        {!!info && <Text className='record-edit-info'>{info}</Text>}
        {!!error && <View className='domain-error' role='alert'>{error}</View>}
      </EditorFieldsLayout></ScrollView>
      <SheetActions className='domain-sheet-actions' leading={<SheetDeleteButton className='record-edit-delete' ariaLabel={`删除${kind === 'positive' ? '正' : '负'}记录：${record.content}`} disabled={!draft || !writable || busy || imageBusy || draft.pending === 'save'} onClick={() => { void commit('delete'); }} />}><ActionButton appearance='primary' size='large' width='fill' loading={busy} disabled={!draft || !writable || busy || imageBusy || draft.pending === 'delete' || !draft.record.content.trim() && !draft.record.images?.length} onClick={() => { void commit('save'); }}>保存</ActionButton></SheetActions>
    </View>
  </View>{closeGuard.dialog}</View>;
}
