import { Image, Text, View } from '@tarojs/components';
import type { EntryDraft } from '../lib/entry-draft';
import { trimTextEnd } from '../lib/text-whitespace';
import { memoPriorityColor, todoQuadrant, type MemoImage } from '../lib/tool-records';
import type { DomainState } from '../lib/domain-data';
import { progressRows } from '../lib/progress-draft';
import PriorityFlag from './priority-flag';
import EntityTitleRow from './entity-title-field';
import { MemoColorChoices, MemoIconPreview, MemoPinRow, memoColorStyle } from './memo-fields-layout';
import { PinSymbol } from './manage-symbol';
import ActionButton, { ChoiceButton } from './ui-button';
import { ProgressRecordField } from './progress-editor-fields';
import EditorFieldsLayout from './editor-fields-layout';

/** Gesture snapshots contain no native input or second editable draft. */
export default function EntryPreview({ draft, domains }: { draft: EntryDraft; domains: DomainState }) {
  const note = (value: string, placeholder: string, images?: MemoImage[], compact = false, plain = false) => <EditorFieldsLayout topSpace={false} className={`markdown-note-editor${compact ? ' is-compact' : ''}${plain ? ' is-plain' : ''}`}>
    <View className='entry-preview-note'><Text>{trimTextEnd(value) || placeholder}</Text></View>
    <View className='memo-editor-toolbar'>{!plain && <View className='memo-editor-modes'><ChoiceButton selected>书写</ChoiceButton><ChoiceButton>预览</ChoiceButton></View>}<Text className='memo-body-count'>{value.length}</Text>{!plain && <ActionButton className='memo-insert-image'>图片</ActionButton>}</View>
    {!!images?.length && <View className='memo-images'>{images.map(image => <View className='memo-image' key={image.id}><Image src={image.dataUrl} mode='aspectFill' /></View>)}</View>}
  </EditorFieldsLayout>;
  if (draft.mode === 'progress' && draft.progress) return <EditorFieldsLayout className='progress-editor-fields entry-preview'>
    <View className='progress-domain-row entry-preview-domain'><Text>{trimTextEnd(domains.domains.find(domain => domain.id === draft.progress!.domainId)?.name || '未分类')}</Text></View>
    {progressRows(draft.progress).map(({ slot, kind, record }) => <ProgressRecordField key={record.id} slot={slot} kind={kind}>{note(record.content, '有什么需要记录的？', record.images, true, true)}</ProgressRecordField>)}
  </EditorFieldsLayout>;
  const task = draft.mode === 'task';
  return <EditorFieldsLayout className={`entry-preview${task ? '' : ' memo-editor-fields'}`} style={task ? undefined : memoColorStyle(draft.memo.color)}>
    {task && <View className='entry-preview-task-schedule'><View className='entry-preview-domain'><Text>{draft.task.dueDate || '日期'}</Text></View></View>}
    <EntityTitleRow className='todo-title-row'>{!task && <MemoIconPreview iconId={draft.memo.iconId} />}<Text className='entry-preview-title'>{trimTextEnd(task ? draft.task.title : draft.memo.title) || (task ? '准备做什么？' : '准备记下什么？')}</Text><View className='entry-preview-priority'><PriorityFlag color={task ? todoQuadrant(draft.task).color : memoPriorityColor(draft.memo.priority)} outlined={task ? todoQuadrant(draft.task).id === 'later' : !draft.memo.priority || draft.memo.priority === 'none'} /></View></EntityTitleRow>
    {note(task ? draft.task.description : draft.memo.body, task ? '有什么需要补充的？' : '写下内容…', task ? draft.task.images : draft.memo.images)}
    {task ? <View className='todo-next-list'>{[...(draft.task.nextTasks || []).map(step => step.title), '还要做什么？'].map((title, index) => <View className='entry-preview-step' key={index}><View className='todo-next-bullet' /><Text>{trimTextEnd(title) || '还要做什么？'}</Text></View>)}</View> : <><MemoPinRow><View className={`memo-pin-setting${draft.memo.pinned ? ' is-active' : ''}`}><PinSymbol /></View></MemoPinRow><View className='memo-editor-settings'><MemoColorChoices value={draft.memo.color} readOnly /></View></>}
    <View className={task ? 'todo-tags-row' : 'memo-tags-field'}>{!!draft.tagsText && <Text>{draft.tagsText}</Text>}</View>
  </EditorFieldsLayout>;
}
