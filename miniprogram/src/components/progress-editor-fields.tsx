import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { MAX_DOMAIN_RECORD_LENGTH, type DomainState, type RecordItem, type RecordKind } from '../lib/domain-data';
import {
  clearProgressInput, MAX_PROGRESS_PAIRS, hasProgressContent, newProgressInput, progressRows,
  saveProgressDraft, setProgressInputKind, writeProgressInput, type ProgressDraft, type ProgressEntry,
} from '../lib/progress-draft';
import { adjustEffortScore, hasRecordContent } from '../lib/record-content';
import { hasSubtaskText } from '../lib/todo-subtasks';
import { MAX_NOTE_IMAGES } from '../lib/note-image-data';
import type { MemoImage } from '../lib/tool-records';
import { DeleteSymbol } from './manage-symbol';
import { RECORD_CONTENT_PLACEHOLDER } from './editor-copy';
import RecordActionRow from './record-action-row';
import DomainChoiceField from './domain-choice-field';
import MarkdownNoteEditor from './markdown-note-editor';
import ActionButton from './ui-button';
import EditorFieldsLayout from './editor-fields-layout';
import './progress-editor-fields.css';

export function ProgressRecordField({ kind, pairIndex = 0, children, deletable = false }: {
  kind: RecordKind; pairIndex?: number; children: ReactNode; deletable?: boolean;
}) {
  return <EditorFieldsLayout topSpace={false} className={`progress-record-field is-${kind}${deletable ? ' has-delete' : ''}`} data-progress-slot={kind} data-progress-pair={pairIndex}>{children}</EditorFieldsLayout>;
}

export function ProgressRecordSign({ kind, index, disabled, onToggle, onInteraction, onInteractionCancel }: {
  kind: RecordKind; index: number; disabled?: boolean; onToggle?: () => void; onInteraction?: () => void; onInteractionCancel?: () => void;
}) {
  const symbol = <Text className='progress-sign-symbol'>{kind === 'positive' ? '+' : '−'}</Text>;
  const className = `progress-record-type is-${kind}`;
  if (!onToggle) return <View className={className}>{symbol}</View>;
  const keepFocus = { onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault() };
  return <ActionButton {...keepFocus} className={className} appearance='icon' size='compact' disabled={disabled}
    ariaLabel={`将第 ${index + 1} 条记录改为${kind === 'positive' ? '负' : '正'}记录`}
    onTouchStart={onInteraction} onTouchCancel={onInteractionCancel} onClick={onToggle}>{symbol}</ActionButton>;
}

/** A single list keeps each record's identity, sign, attachments and score together. */
export default function ProgressEditorFields({ draft, onChange, state, disabled, mediaWritable = !disabled, owner, onBusyChange, autoFocus, actions }: {
  draft: ProgressDraft; onChange: (draft: ProgressDraft) => void; state: DomainState; disabled: boolean;
  mediaWritable?: boolean; owner: string; onBusyChange: (busy: boolean) => void; autoFocus?: boolean; actions?: ReactNode;
}) {
  const current = useRef({ draft, disabled, mediaWritable, owner });
  current.current = { draft, disabled, mediaWritable, owner };
  const known = useRef(new Set(progressRows(draft).filter(row => hasRecordContent(row.record)).map(row => row.record.id)));
  const autoFocusTaken = useRef(false);
  const interaction = useRef('');
  const [spare, setSpare] = useState<ProgressEntry>(() => {
    const primary = progressRows(draft)[0];
    return hasRecordContent(primary.record) ? { kind: 'positive', record: newProgressInput() } : primary;
  });
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState('');
  const [insertions, setInsertions] = useState<Record<string, number>>({});
  const [navigationId] = useState(() => `records-${draft.positive.id}`);
  const moveRef = useRef<(id: string, direction: number) => void>(() => {});
  const rows = progressRows(draft);
  const items = rows.filter(row => hasRecordContent(row.record) || known.current.has(row.record.id) && focused === row.record.id);
  const total = rows.filter(row => hasRecordContent(row.record)).length;
  const visible = [...items, ...(total < MAX_PROGRESS_PAIRS * 2 && (!items.length || revealed) ? [spare] : [])];

  function emit(next: ProgressDraft) {
    current.current.draft = next;
    onChange(next);
  }
  function latestEntry(fallback: ProgressEntry): ProgressEntry {
    return progressRows(current.current.draft).find(row => row.record.id === fallback.record.id) || fallback;
  }
  function change(fallback: ProgressEntry, record: RecordItem, media = false, focus = true) {
    if (media ? !current.current.mediaWritable : current.current.disabled) return;
    const entry = latestEntry(fallback);
    const existing = progressRows(current.current.draft).some(row => row.record.id === record.id);
    const clean = hasSubtaskText(record.content) ? record : { ...record, content: '' };
    if (!existing && !hasRecordContent(clean)) {
      setSpare({ kind: entry.kind, record: clean });
      return;
    }
    emit(writeProgressInput(current.current.draft, entry.kind, clean));
    if (hasRecordContent(clean)) {
      known.current.add(record.id);
      if (spare.record.id === record.id) {
        setSpare({ kind: 'positive', record: newProgressInput() });
        setRevealed(false);
      }
      if (focus && !media) setFocused(record.id);
    }
  }
  function leave(id: string) {
    const interacting = interaction.current === id;
    interaction.current = '';
    setFocused(previous => previous === id ? '' : previous);
    if (!interacting && spare.record.id === id) setRevealed(false);
    setSpare(previous => previous.record.id === id && !hasRecordContent(previous.record)
      ? { ...previous, record: { ...previous.record, content: '' } } : previous);
    const row = progressRows(current.current.draft).find(item => item.record.id === id);
    if (!current.current.disabled && row && !hasRecordContent(row.record) && known.current.has(id)) {
      emit(clearProgressInput(current.current.draft, id));
    }
  }
  function move(id: string, direction: number) {
    if (current.current.disabled) return;
    const candidates = [...items, ...(total < MAX_PROGRESS_PAIRS * 2 ? [spare] : [])];
    const index = candidates.findIndex(row => row.record.id === id);
    if (index < 0) return;
    const next = candidates[Math.max(0, Math.min(candidates.length - 1, index + direction))];
    if (next) {
      if (next.record.id === spare.record.id) setRevealed(true);
      setFocused(next.record.id);
    }
  }
  moveRef.current = move;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const arrow = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229 || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || !['Enter', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const target = event.target as HTMLElement;
      if (target?.getAttribute('data-editor-list') !== navigationId) return;
      event.preventDefault();
      event.stopPropagation();
      moveRef.current(target.getAttribute('data-editor-row') || '', event.key === 'ArrowUp' ? -1 : 1);
    };
    document.addEventListener('keydown', arrow, true);
    return () => document.removeEventListener('keydown', arrow, true);
  }, [navigationId]);
  useEffect(() => {
    if (focused && typeof document !== 'undefined') {
      document.querySelector<HTMLTextAreaElement>(`[data-editor-list="${navigationId}"][data-editor-row="${focused}"]`)?.focus();
    }
  }, [focused, navigationId, visible.length]);

  function toggleKind(fallback: ProgressEntry) {
    if (current.current.disabled) return;
    const entry = latestEntry(fallback);
    const kind = entry.kind === 'positive' ? 'negative' : 'positive';
    if (progressRows(current.current.draft).some(row => row.record.id === entry.record.id)) {
      emit(setProgressInputKind(current.current.draft, entry.record.id, kind));
    }
    if (entry.record.id === spare.record.id) setSpare({ ...entry, kind });
    interaction.current = '';
    setFocused(entry.record.id);
  }
  function attach(id: string) {
    if (current.current.disabled || !current.current.mediaWritable || !current.current.owner) return;
    interaction.current = '';
    setInsertions(previous => ({ ...previous, [id]: (previous[id] || 0) + 1 }));
  }
  function adjust(fallback: ProgressEntry, delta: -1 | 1) {
    const entry = latestEntry(fallback);
    interaction.current = '';
    change(entry, { ...entry.record, effortScore: adjustEffortScore(entry.record, delta) }, false, false);
  }
  function checkImages(fallback: ProgressEntry, images: MemoImage[]) {
    const entry = latestEntry(fallback);
    const next = writeProgressInput(current.current.draft, entry.kind, { ...entry.record, images });
    if (!hasProgressContent(next)) return;
    const own = new Set(progressRows(next).map(row => row.record.id));
    saveProgressDraft({ ...state, domains: state.domains.map(domain => ({
      ...domain, positiveRecords: domain.positiveRecords.filter(item => !own.has(item.id)),
      negativeRecords: domain.negativeRecords.filter(item => !own.has(item.id)),
    })) }, next);
  }

  return <EditorFieldsLayout className='progress-editor-fields'>
    <View className='entry-pane-heading progress-domain-row'><DomainChoiceField compact ariaLabel='选择记录领域' domains={state.domains} value={draft.domainId} optionPrefix='记录到' disabled={disabled} onChange={domainId => emit({ ...current.current.draft, domainId })} />{actions}</View>
    <View className='progress-record-list'>{visible.map((entry, index) => {
      const { record, kind } = entry;
      const empty = record.id === spare.record.id;
      return <ProgressRecordField key={record.id} kind={kind} pairIndex={index} deletable={!empty}>
        <ProgressRecordSign kind={kind} index={index} disabled={disabled} onInteraction={() => { interaction.current = record.id; }} onInteractionCancel={() => { interaction.current = ''; }} onToggle={() => toggleKind(entry)} />
        <View className='progress-record-body'>
          <MarkdownNoteEditor minimal format='plain' density='compact' showImageInsertion={false} insertionSignal={insertions[record.id] || 0} navigationId={navigationId}
            onFocus={() => { autoFocusTaken.current = true; setFocused(record.id); }} onBlur={() => leave(record.id)} onConfirm={() => move(record.id, 1)}
            autoFocus={focused === record.id || !focused && !autoFocusTaken.current && !!autoFocus && index === 0}
            value={record.content} images={record.images} owner={owner} recordId={record.id} disabled={disabled} canInsertImage={mediaWritable} onBusyChange={onBusyChange} maxLength={MAX_DOMAIN_RECORD_LENGTH}
            ariaLabel={index === 0 ? '记录内容' : `第 ${index + 1} 条记录内容`} placeholder={RECORD_CONTENT_PLACEHOLDER}
            onChange={content => change(entry, { ...latestEntry(entry).record, content })}
            onImagesChange={images => change(entry, { ...latestEntry(entry).record, images }, true)} checkImages={images => checkImages(entry, images)} />
          {!empty && <View className='progress-record-tools'><ActionButton appearance='icon' size='compact' intent='danger' ariaLabel={`删除第 ${index + 1} 条记录`} disabled={disabled}
            onClick={() => { emit(clearProgressInput(current.current.draft, record.id)); setFocused(''); }}><DeleteSymbol /></ActionButton></View>}
        </View>
        <RecordActionRow record={record} disabled={disabled} attachmentDisabled={!mediaWritable || (record.images?.length || 0) >= MAX_NOTE_IMAGES}
          onInteraction={() => { interaction.current = record.id; }} onInteractionCancel={() => { interaction.current = ''; }}
          onAttach={() => attach(record.id)} onAdjust={delta => adjust(entry, delta)} />
      </ProgressRecordField>;
    })}</View>
  </EditorFieldsLayout>;
}
