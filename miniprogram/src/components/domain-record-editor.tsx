import { MAX_NOTE_IMAGES } from '../lib/note-image-data';
import RecordActionRow from './record-action-row';
import { adjustEffortScore, hasRecordContent } from '../lib/record-content';
import EditorHeading from './editor-heading';
import { RECORD_CONTENT_PLACEHOLDER } from './editor-copy';
import { useMessageNotice } from './message-notice';
import ActionMenu from './action-menu';
import { showAppMessage } from '../lib/app-dialog';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Taro, { useDidHide } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import MarkdownNoteEditor from './markdown-note-editor';
import SheetActions from './sheet-actions';
import DocumentEditorSheet from './document-editor-sheet';
import { initialDomainState, isDomainState, MAX_DOMAIN_RECORD_LENGTH, type RecordItem, type RecordKind } from '../lib/domain-data';
import { hasVolatilePersonalTool, usePersonalToolState } from '../lib/use-personal-tool-state';
import { editDomainRecord, packRecordEdit, recordEditKey, sameRecord, unpackRecordEdit, type RecordEditDraft } from '../lib/domain-record-edit';
import { newProgressDraft, saveAutoProgressDraft } from '../lib/progress-draft';
import './domain-record-editor.css';

export default function DomainRecordEditor({ owner, domainId, kind, record, title, dateLabel, onClose }: {
  owner: string; domainId: string; kind: RecordKind; record: RecordItem; title: string; dateLabel: string; onClose: () => void;
}) {
  const source = usePersonalToolState('domains', initialDomainState);
  const [draft, setDraft] = useState<RecordEditDraft | null>(null), [busy, setBusy] = useState(false), [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState(''), [info, setInfo] = useState(''), [more, setMore] = useState(false), [imageSignal, setImageSignal] = useState(0);
  const [progressShell] = useState(() => newProgressDraft(domainId));
  const mounted = useRef(true), processing = useRef(false), completed = useRef(false), latest = useRef(draft);
  const inFlight = useRef<Promise<boolean> | null>(null), closed = useRef(false);
  latest.current = draft;
  const current = useRef(source); current.current = source;
  const key = recordEditKey(owner, record.id);
  const writable = source.ready && source.owner === owner && isDomainState(source.value);
  const locked = !writable || busy || imageBusy || !!draft?.pending;
  const asProgress = (value: RecordItem) => ({ ...progressShell, positive: value, kinds: [kind, 'negative'] as [RecordKind, RecordKind] });
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
      if (saved && !saved.pending && !sameRecord(saved.original, record)) setInfo('已恢复本机编辑草稿');
      const restored = saved ? { ...saved, original: saved.pending ? saved.original : record } : { version: 1 as const, domainId, kind, original: record, record };
      latest.current = restored; setDraft(restored); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '编辑草稿读取失败，请重试'); }
  }
  useEffect(() => {
    if (source.owner && source.owner !== owner) { onClose(); return; }
    load();
  }, [writable, source.owner]);
  useEffect(() => { if (draft && !completed.current) try { store(draft); } catch (cause) { setError(cause instanceof Error ? cause.message : '编辑草稿保存失败，请重试'); } }, [draft]);
  useEffect(() => {
    if (!draft || !writable || busy || imageBusy || error || draft.pending || sameRecord(draft.record, draft.original)) return;
    const timer = setTimeout(() => { void commit('save'); }, 450);
    return () => clearTimeout(timer);
  }, [draft, writable, busy, imageBusy, error]);
  const flush = useRef(() => {});
  flush.current = () => { if (latest.current && current.current.owner === owner && !processing.current) void commit('save'); };
  useDidHide(() => flush.current());
  useLayoutEffect(() => () => flush.current(), []);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !more) { event.preventDefault(); void close(); } };
    const hide = () => flush.current();
    document.addEventListener('keydown', escape); window.addEventListener('pagehide', hide);
    return () => { document.removeEventListener('keydown', escape); window.removeEventListener('pagehide', hide); };
  }, [more]);
  function imagesBusy(value: boolean) { processing.current = value; if (mounted.current) setImageBusy(value); }
  function update(next: RecordItem) {
    if (!current.current.ready || current.current.owner !== owner || busy || !latest.current || latest.current.pending) return;
    const value = { ...latest.current, record: next }; latest.current = value; setError(''); setDraft(value);
  }
  async function commit(action: 'save' | 'delete'): Promise<boolean> {
    if (inFlight.current) return inFlight.current;
    const captured = latest.current;
    if (!captured || processing.current || !current.current.ready || current.current.owner !== owner || captured.pending && captured.pending !== action) return false;
    const target = { ...captured, record: { ...captured.record, content: captured.record.content.trim() } };
    if (action === 'save' && !target.pending && sameRecord(target.record, target.original) && !hasVolatilePersonalTool('domains', owner)) return true;
    setBusy(true); setError('');
    let operation!: Promise<boolean>;
    operation = (async () => {
      try {
        let savedRecord: RecordItem | undefined;
        await current.current.setValue(previous => {
          if (current.current.owner !== owner || !current.current.ready) throw new Error('账号已变化，请重新打开');
          if (action === 'delete') return editDomainRecord(previous, target, action);
          if (!hasRecordContent(target.record)) throw new Error('请输入备注，或使用删除按钮移除记录');
          const next = saveAutoProgressDraft(previous, asProgress(target.original), asProgress(target.record), hasVolatilePersonalTool('domains', owner));
          savedRecord = next.domains.find(domain => domain.id === domainId)?.[kind === 'positive' ? 'positiveRecords' : 'negativeRecords'].find(row => row.id === record.id);
          return next;
        });
        if (current.current.owner !== owner) return false;
        if (hasVolatilePersonalTool('domains', owner)) {
          const retained = { ...target, pending: action }; latest.current = retained;
          try { store(retained); } catch { /* Keep the same target in memory for retry. */ }
          if (mounted.current) setDraft(retained);
          throw new Error('本机存储不可用，修改已保留，请重试');
        }
        if (action === 'delete') {
          completed.current = true; closed.current = true;
          try { Taro.removeStorageSync(key); } catch { /* A saved delete remains authoritative. */ }
          if (mounted.current) onClose();
        } else {
          const acknowledged = { ...target, original: savedRecord || target.record, record: savedRecord || target.record, pending: undefined };
          latest.current = acknowledged;
          try { Taro.removeStorageSync(key); } catch { /* Same-ID acknowledgements remain safe. */ }
          if (mounted.current) { setDraft(acknowledged); setInfo(''); }
        }
        return true;
      } catch (cause) { if (mounted.current && current.current.owner === owner) setError(cause instanceof Error ? cause.message : '自动保存失败，请重试'); return false; }
      finally { if (mounted.current) setBusy(false); if (inFlight.current === operation) inFlight.current = null; }
    })();
    inFlight.current = operation; return operation;
  }
  async function close() {
    if (closed.current || processing.current || current.current.owner !== owner) return;
    const canonical = current.current.value;
    if (latest.current && current.current.ready && isDomainState(canonical) && !hasVolatilePersonalTool('domains', owner)
      && !canonical.domains.some(domain => [...domain.positiveRecords, ...domain.negativeRecords].some(item => item.id === record.id))) {
      try { store(latest.current); } catch (cause) { setError(cause instanceof Error ? cause.message : '编辑草稿未保存，请重试'); return; }
      completed.current = true; closed.current = true; onClose(); return;
    }
    if (inFlight.current && !await inFlight.current) return;
    if (!await commit('save') || current.current.owner !== owner) return;
    completed.current = true; closed.current = true;
    try { Taro.removeStorageSync(key); } catch { /* Already-saved content needs no edit draft. */ }
    if (mounted.current) onClose();
  }
  useMessageNotice(error, !busy);
  return <View className='domains-editor record-edit-autosave'><DocumentEditorSheet compact titledHeading title='编辑记录' onClose={() => { void close(); }} busy={busy || imageBusy}
    heading={<EditorHeading title='编辑记录' actions={<ActionMenu ariaLabel='记录更多操作' open={more} onOpenChange={setMore} panelWidth={180}><ActionButton appearance='quiet' intent='danger' disabled={!draft || !writable || busy || imageBusy || draft.pending === 'save'} onClick={()=>{setMore(false);void commit('delete');}}>删除记录</ActionButton></ActionMenu>} />}
    footer={error ? <SheetActions className='record-edit-footer document-autosave-footer'><ActionButton appearance='quiet' size='compact' disabled={busy || imageBusy || !writable} onClick={() => { setError(''); void commit(draft?.pending || 'save'); }}>重试</ActionButton></SheetActions> : undefined}>
      <View className='record-edit-meta'><Text>{(isDomainState(source.value) ? source.value.domains.find(domain => domain.id === domainId)?.name : '') || title.split(' · ')[0]}</Text><Text className={`record-kind is-${kind}`}>{kind === 'positive' ? '正记录' : '负记录'}</Text><Text>{dateLabel}</Text></View>
      {!draft ? <View className='record-edit-loading'><Text>正在读取编辑草稿…</Text><ActionButton disabled={!writable} onClick={load}>重试</ActionButton></View> : <><MarkdownNoteEditor minimal format='plain' showImageInsertion={false} insertionSignal={imageSignal} value={draft.record.content} images={draft.record.images} owner={owner} recordId={record.id} disabled={locked} canInsertImage={writable && !busy && !draft.pending} onBusyChange={imagesBusy} maxLength={MAX_DOMAIN_RECORD_LENGTH} ariaLabel='记录内容' placeholder={RECORD_CONTENT_PLACEHOLDER} onChange={content => update({ ...(latest.current?.record || draft.record), content })} onImagesChange={images => update({ ...(latest.current?.record || draft.record), images })} checkImages={images => { saveAutoProgressDraft(current.current.value, asProgress(draft.original), asProgress({ ...(latest.current?.record || draft.record), images }), hasVolatilePersonalTool('domains', owner)); }} /><RecordActionRow record={draft.record} disabled={locked} attachmentDisabled={(draft.record.images?.length || 0)>=MAX_NOTE_IMAGES} onAttach={()=>setImageSignal(value=>value+1)} onAdjust={delta=>{const row=latest.current?.record;if(row)update({...row,effortScore:adjustEffortScore(row,delta)});}} /></>}
      {!!info && <Text className='record-edit-info'>{info}</Text>}
    </DocumentEditorSheet></View>;
}
