import { useMessageNotice } from './message-notice';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ScrollView, Text, Textarea, View } from '@tarojs/components';
import type { Todo } from '../lib/tool-records';
import { todoQuadrant } from '../lib/tool-records';
import EditorChecklist, { type EditorChecklistHandle } from './editor-checklist';
import ActionButton from './ui-button';
import EditorPreviewButton from './editor-preview-button';
import SheetActions from './sheet-actions';
import SheetBackdrop from './sheet-backdrop';
import { MoreSymbol } from './manage-symbol';
import { ScheduleSymbol } from './todo-schedule-sheet';
import SelectedTagList from './selected-tag-list';
import './task-detail-editor.css';

export function TaskTagSymbol() {
  return <View className='task-detail-symbol task-detail-tag-symbol' aria-hidden><View /><View /><View /><View /></View>;
}
export function TaskChecklistSymbol() {
  return <View className='task-detail-symbol task-detail-checklist-symbol' aria-hidden><View /><View /><View /></View>;
}
export function TaskAttachmentSymbol() {
  return <View className='task-detail-symbol task-detail-attachment-symbol' aria-hidden><View /></View>;
}

type Props = {
  owner?: string; draft: Todo; onChange: (draft: Todo) => void; onClose: () => void;
  disabled?: boolean; autoFocus?: boolean; ariaLabel?: string;
  category: ReactNode; priority: ReactNode; more?: ReactNode; onMore?: () => void;
  onSchedule: () => void; scheduleLabel?: string; scheduleOpen?: boolean;
  onToggleComplete?: () => void; notes: ReactNode | ((preview:boolean,onPreviewChange:(value:boolean)=>void)=>ReactNode);
  reminderAction?:ReactNode; tagsAction?: ReactNode; attachmentAction?: ReactNode; onTags?: () => void; onAttachment?: () => void;
  pending?: boolean; error?: string; onRetry?: () => void;
  topBar?: ReactNode; panelClassName?: string;
};

/** Shared task presentation only; the caller owns autosave, identity and menus. */
export default function TaskDetailEditor({ owner = '', draft, onChange, onClose, disabled = false, autoFocus = false,
  ariaLabel = '编辑任务', category, priority, more, onMore, onSchedule, scheduleLabel = '日期 · 提醒 · 重复', scheduleOpen,
  onToggleComplete, notes, reminderAction, tagsAction, attachmentAction, onTags, onAttachment, pending = false, error, onRetry, topBar, panelClassName = '',
}: Props) {
  const [notePreview,setNotePreview] = useState(false);
  const checklist = useRef<EditorChecklistHandle>(null);
  const latest = useRef({ draft, disabled }); latest.current = { draft, disabled };
  useEffect(() => { setNotePreview(false); }, [owner, draft.id]);
  useMessageNotice(error);
  return <View className='task-detail-overlay' catchMove>
    <SheetBackdrop onClose={onClose} />
    <View className={`task-detail-panel ${panelClassName}`} style={{ '--todo-completion-color': todoQuadrant(draft).color } as CSSProperties} role='dialog' ariaLabel={ariaLabel}>
      {topBar}
      <View className='task-detail-heading'>
        <View className='task-detail-category'>{category}</View>
        <View className='task-detail-heading-actions'>{priority}{more || <ActionButton appearance='icon' size='compact' ariaLabel='任务更多操作' disabled={disabled || !onMore} onClick={onMore}><MoreSymbol /></ActionButton>}</View>
      </View>
      <ScrollView className='task-detail-scroll' scrollY enhanced bounces={false} showScrollbar={false}>
        <View className='task-detail-body'>
          <View className='task-detail-schedule-row'>
            <ActionButton appearance='icon' size='compact' className='task-detail-complete' ariaLabel={draft.completedAt ? '重新打开任务' : '完成任务'} disabled={disabled || !onToggleComplete} onClick={onToggleComplete}>
              <View className={`task-detail-check${draft.completedAt ? ' is-checked' : ''}`} aria-hidden>{draft.completedAt && <View />}</View>
            </ActionButton>
            <ActionButton appearance='quiet' size='compact' className='task-detail-schedule' ariaLabel='设置日期、提醒和重复' aria-expanded={scheduleOpen} disabled={disabled} onClick={onSchedule}><ScheduleSymbol /><Text>{scheduleLabel}</Text></ActionButton>
          </View>
          <Textarea className='task-detail-title todo-title-input' ariaLabel='任务名称' value={draft.title} placeholder='准备做什么？' disabled={disabled} focus={autoFocus} autoHeight fixed showConfirmBar={false} maxlength={Math.max(100, draft.title.length)} cursorSpacing={96} adjustPosition onInput={event => { const current = latest.current; if (!current.disabled) { const next = { ...current.draft, title: event.detail.value }; latest.current.draft = next; onChange(next); } }} />
          <View className='task-detail-notes'>{typeof notes === 'function' ? notes(notePreview,setNotePreview) : notes}</View>
          <EditorChecklist ref={checklist} items={draft.subtasks} owner={owner} recordId={draft.id} disabled={disabled} color={todoQuadrant(draft).color} onChange={subtasks => { const current=latest.current; if (!current.disabled) { const next={...current.draft,subtasks};latest.current.draft=next;onChange(next); } }} />
          <SelectedTagList tags={draft.tags || []} disabled={disabled} onEdit={onTags} />
        </View>
      </ScrollView>
      <SheetActions className='task-detail-footer'>
        <View className='task-detail-tools'>
          {tagsAction || <ActionButton appearance='icon' size='compact' ariaLabel='任务标签' disabled={disabled || !onTags} onClick={onTags}><TaskTagSymbol /></ActionButton>}
          <ActionButton appearance='icon' size='compact' ariaLabel='添加子任务' disabled={disabled || (draft.subtasks?.length || 0) >= 50} onClick={() => checklist.current?.add()}><TaskChecklistSymbol /></ActionButton>
          {attachmentAction || <ActionButton appearance='icon' size='compact' ariaLabel='任务附件' disabled={disabled || !onAttachment} onClick={onAttachment}><TaskAttachmentSymbol /></ActionButton>}
          {reminderAction}
          <EditorPreviewButton selected={notePreview} onChange={setNotePreview} disabled={disabled} label='任务备注 Markdown 预览' />
        </View>
        {!!error ? onRetry && <View className='task-detail-save-state is-error'>{ <ActionButton appearance='quiet' size='compact' disabled={disabled} onClick={onRetry}>重试</ActionButton>}</View> : pending ? <View className='task-detail-save-state' role='status'><Text>保存中…</Text></View> : null}
      </SheetActions>
    </View>
  </View>;
}

import './compact-editor.css';
