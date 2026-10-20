import { View } from '@tarojs/components';
import type { ReactNode } from 'react';
import { MAX_DOMAIN_RECORD_LENGTH, type DomainState, type RecordKind } from '../lib/domain-data';
import { hasProgressContent, pairedProgressDraft, progressRows, saveProgressDraft, type ProgressDraft } from '../lib/progress-draft';
import type { MemoImage } from '../lib/tool-records';
import DomainChoiceField from './domain-choice-field';
import MarkdownNoteEditor from './markdown-note-editor';
import { ChoiceButton } from './ui-button';
import './progress-editor-fields.css';
import EditorFieldsLayout from './editor-fields-layout';

/** The live form and gesture snapshot share each slot's independent sign controls. */
export function ProgressRecordField({ slot, kind, onKindChange, disabled, children }: {
  slot: 'positive' | 'negative'; kind: RecordKind; onKindChange?: (kind: RecordKind) => void;
  disabled?: boolean; children: ReactNode;
}) {
  const label = slot === 'positive' ? '第一条记录' : '第二条记录';
  return <EditorFieldsLayout topSpace={false} className='progress-record-field' data-progress-slot={slot}>
    <View className='progress-record-kinds'>{(['negative', 'positive'] as const).map(value => <ChoiceButton key={value} className={`progress-record-choice is-${value}`} size='compact' width='fill' selected={kind === value} ariaLabel={`${label}类型：${value === 'negative' ? '负记录' : '正记录'}`} disabled={disabled} onClick={() => onKindChange?.(value)}>{value === 'negative' ? '负记录' : '正记录'}</ChoiceButton>)}</View>
    {children}
  </EditorFieldsLayout>;
}

/** Two positional slots retain their own contents, images and selected signs. */
export default function ProgressEditorFields({ draft, onChange, state, disabled, owner, onBusyChange, autoFocus }: {
  draft: ProgressDraft; onChange: (draft: ProgressDraft) => void; state: DomainState; disabled: boolean;
  owner: string; onBusyChange: (busy: boolean) => void;
  autoFocus?: boolean;
}) {
  const rows = progressRows(draft);
  function changeRecord(slot: 'positive' | 'negative', values: Partial<ProgressDraft['positive']>) {
    const next = pairedProgressDraft(draft);
    return { ...next, [slot]: { ...next[slot], ...values } };
  }
  function changeKind(slot: 'positive' | 'negative', kind: RecordKind) {
    const next = pairedProgressDraft(draft), currentRows = progressRows(next);
    const kinds: [RecordKind, RecordKind] = [currentRows[0].kind, currentRows[1].kind];
    kinds[slot === 'positive' ? 0 : 1] = kind;
    onChange({ ...next, kinds });
  }
  function checkImages(slot: 'positive' | 'negative', images: MemoImage[]) {
    const next = changeRecord(slot, { images });
    if (hasProgressContent(next)) saveProgressDraft(state, next);
  }
  return <EditorFieldsLayout className='progress-editor-fields'>
    <View className='progress-domain-row'><DomainChoiceField ariaLabel='选择记录领域' domains={state.domains} value={draft.domainId} optionPrefix='记录到' disabled={disabled} onChange={domainId => onChange({ ...draft, domainId })} /></View>
    {rows.map(({ slot, kind, record }) => <ProgressRecordField key={record.id} slot={slot} kind={kind} onKindChange={value => changeKind(slot, value)} disabled={disabled}>
      <MarkdownNoteEditor format='plain' density='compact' showImageInsertion={false} autoFocus={slot === 'positive' && autoFocus} value={record.content} images={record.images} owner={owner} recordId={record.id} disabled={disabled} canInsertImage={false} onBusyChange={onBusyChange} maxLength={MAX_DOMAIN_RECORD_LENGTH} ariaLabel={slot === 'positive' ? '记录内容' : '第二条记录内容'} placeholder='有什么需要记录的？' onChange={content => onChange(changeRecord(slot, { content }))} onImagesChange={images => onChange(changeRecord(slot, { images }))} checkImages={images => checkImages(slot, images)} />
    </ProgressRecordField>)}
  </EditorFieldsLayout>;
}
