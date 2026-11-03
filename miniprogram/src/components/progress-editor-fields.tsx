import { Text, View } from '@tarojs/components';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MAX_DOMAIN_RECORD_LENGTH, type DomainState, type RecordKind } from '../lib/domain-data';
import { appendProgressPair, MAX_PROGRESS_PAIRS, hasProgressContent, pairedProgressDraft, progressRows, saveProgressDraft, type ProgressDraft } from '../lib/progress-draft';
import type { MemoImage } from '../lib/tool-records';
import DomainChoiceField from './domain-choice-field';
import MarkdownNoteEditor from './markdown-note-editor';
import ActionButton from './ui-button';
import { TaskAttachmentSymbol } from './task-detail-editor';
import { AddSymbol } from './create-button';
import './progress-editor-fields.css';
import EditorFieldsLayout from './editor-fields-layout';

/** Normal pairs use fixed negative/positive headers; historic signs remain labelled faithfully. */
export function ProgressRecordField({ slot, kind, pairIndex = 0, children }: {
  slot: 'positive' | 'negative'; kind: RecordKind; pairIndex?: number; children: ReactNode;
}) {
  return <EditorFieldsLayout topSpace={false} className='progress-record-field' data-progress-slot={slot} data-progress-pair={pairIndex}>
    <View className={`progress-record-heading is-${kind}`}><Text>{kind === 'negative' ? '负记录' : '正记录'}</Text></View>
    {children}
  </EditorFieldsLayout>;
}

/** Every row shares one domain and adds a negative/positive pair without replacing previous input. */
export default function ProgressEditorFields({ draft, onChange, state, disabled, owner, onBusyChange, autoFocus, insertionSignal = 0 }: {
  draft: ProgressDraft; onChange: (draft: ProgressDraft) => void; state: DomainState; disabled: boolean;
  owner: string; onBusyChange: (busy: boolean) => void;
  autoFocus?: boolean; insertionSignal?: number;
}) {
  const rows = progressRows(draft);
  const currentDraft = useRef(draft), receivedDraft = useRef(draft);
  if (receivedDraft.current !== draft) { receivedDraft.current = draft; currentDraft.current = draft; }
  function emit(next: ProgressDraft) { currentDraft.current = next; onChange(next); }
  const activeRecord = useRef(draft.positive.id), handledInsertion = useRef(insertionSignal);
  const [insertions, setInsertions] = useState<Record<string, number>>({});
  useEffect(() => {
    if (handledInsertion.current === insertionSignal) return;
    handledInsertion.current = insertionSignal;
    if (disabled) return;
    const id = rows.some(row => row.record.id === activeRecord.current) ? activeRecord.current : draft.positive.id;
    setInsertions(previous => ({ ...previous, [id]: (previous[id] || 0) + 1 }));
  }, [insertionSignal]);
  const groups = Array.from({ length: 1 + (draft.pairs?.length || 0) }, (_, pairIndex) =>
    (['negative', 'positive'] as const).map(slot => rows.find(row => row.pairIndex === pairIndex && row.slot === slot)!));
  function changeRecord(pairIndex: number, slot: 'positive' | 'negative', values: Partial<ProgressDraft['positive']>) {
    const next = pairedProgressDraft(currentDraft.current);
    return pairIndex === 0 ? { ...next, [slot]: { ...next[slot], ...values } }
      : { ...next, pairs: next.pairs!.map((pair, index) => index + 1 === pairIndex ? { ...pair, [slot]: { ...pair[slot], ...values } } : pair) };
  }
  function checkImages(pairIndex: number, slot: 'positive' | 'negative', images: MemoImage[]) {
    const next = changeRecord(pairIndex, slot, { images });
    if (hasProgressContent(next)) {
      const ownIds = new Set(progressRows(next).map(row => row.record.id));
      const withoutOwn = { ...state, domains: state.domains.map(domain => ({ ...domain,
        positiveRecords: domain.positiveRecords.filter(record => !ownIds.has(record.id)), negativeRecords: domain.negativeRecords.filter(record => !ownIds.has(record.id)) })) };
      saveProgressDraft(withoutOwn, next);
    }
  }
  return <EditorFieldsLayout className='progress-editor-fields'>
    <View className='progress-domain-row'><DomainChoiceField ariaLabel='选择记录领域' domains={state.domains} value={draft.domainId} optionPrefix='记录到' disabled={disabled} onChange={domainId => emit({ ...currentDraft.current, domainId })} /></View>
    <View className='progress-record-pairs'>{groups.map((group, pairIndex) => <View className='progress-record-pair' key={group[0].record.id}>{group.map(({ slot, kind, record }) => <ProgressRecordField key={record.id} slot={slot} kind={kind} pairIndex={pairIndex}>
      <MarkdownNoteEditor minimal format='plain' density='compact' showImageInsertion={false} insertionSignal={insertions[record.id] || 0} onFocus={() => { activeRecord.current = record.id; }} autoFocus={pairIndex === 0 && slot === 'positive' && autoFocus} value={record.content} images={record.images} owner={owner} recordId={record.id} disabled={disabled} canInsertImage={!disabled} onBusyChange={onBusyChange} maxLength={MAX_DOMAIN_RECORD_LENGTH} ariaLabel={pairIndex === 0 ? slot === 'positive' ? '记录内容' : '第二条记录内容' : `第 ${pairIndex + 1} 组${slot === 'negative' ? '负' : '正'}记录内容`} placeholder='备注' onChange={content => { activeRecord.current = record.id; emit(changeRecord(pairIndex, slot, { content })); }} onImagesChange={images => emit(changeRecord(pairIndex, slot, { images }))} checkImages={images => checkImages(pairIndex, slot, images)} />
      <ActionButton appearance='icon' size='compact' className='progress-record-attachment' ariaLabel={`第 ${pairIndex + 1} 组${kind === 'negative' ? '负' : '正'}记录附件`} disabled={disabled} onClick={() => setInsertions(previous => ({ ...previous,[record.id]:(previous[record.id] || 0) + 1 }))}><TaskAttachmentSymbol /></ActionButton>
    </ProgressRecordField>)}</View>)}</View>
    <View className='progress-add-pair'><ActionButton appearance='quiet' width='fill' ariaLabel='添加一组正负记录' disabled={disabled || groups.length >= MAX_PROGRESS_PAIRS} onClick={() => emit(appendProgressPair(currentDraft.current))}><AddSymbol /></ActionButton></View>
  </EditorFieldsLayout>;
}
