import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Input, ScrollView, Text, Textarea, View } from '@tarojs/components';
import type { Todo, TodoSubtask } from '../lib/tool-records';
import { toolId, todoQuadrant } from '../lib/tool-records';
import { hasSubtaskText } from '../lib/todo-subtasks';
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
  draft: Todo; onChange: (draft: Todo) => void; onClose: () => void;
  disabled?: boolean; autoFocus?: boolean; ariaLabel?: string;
  category: ReactNode; priority: ReactNode; more?: ReactNode; onMore?: () => void;
  onSchedule: () => void; scheduleLabel?: string; scheduleOpen?: boolean;
  onToggleComplete?: () => void; notes: ReactNode | ((preview:boolean,onPreviewChange:(value:boolean)=>void)=>ReactNode); nextSteps?: ReactNode;
  tagsAction?: ReactNode; attachmentAction?: ReactNode; onTags?: () => void; onAttachment?: () => void;
  pending?: boolean; error?: string; onRetry?: () => void;
  topBar?: ReactNode; panelClassName?: string;
};

/** Shared task presentation only; the caller owns autosave, identity and menus. */
export default function TaskDetailEditor({ draft, onChange, onClose, disabled = false, autoFocus = false,
  ariaLabel = '编辑任务', category, priority, more, onMore, onSchedule, scheduleLabel = '日期和提醒', scheduleOpen,
  onToggleComplete, notes, nextSteps, tagsAction, attachmentAction, onTags, onAttachment, pending = false, error, onRetry, topBar, panelClassName = '',
}: Props) {
  const [notePreview,setNotePreview] = useState(false);
  const [showChecklist, setShowChecklist] = useState(!!draft.subtasks?.length);
  const [placeholderId, setPlaceholderId] = useState(toolId);
  const [focusedSubtask, setFocusedSubtask] = useState('');
  const latest = useRef({ draft, disabled }); latest.current = { draft, disabled };
  const inputPrefix = useRef(`subtask-${toolId()}`);
  const moveRef = useRef<(id: string, direction: number) => void>(() => {});
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const arrow = (event: KeyboardEvent) => {
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const target = event.target as HTMLElement;
      if (target?.getAttribute('data-subtask-editor') !== inputPrefix.current) return;
      event.preventDefault(); moveRef.current(target.getAttribute('data-subtask-id') || '', event.key === 'ArrowUp' ? -1 : 1);
    };
    document.addEventListener('keydown', arrow, true); return () => document.removeEventListener('keydown', arrow, true);
  }, []);
  useEffect(() => {
    setNotePreview(false);setShowChecklist(!!draft.subtasks?.length); setFocusedSubtask(''); setPlaceholderId(toolId());
  }, [draft.id]);
  const subtasks = draft.subtasks || [];
  const rows = [...subtasks, { id: placeholderId, title: '', completed: false }];
  function changeSubtasks(update: (items: TodoSubtask[]) => TodoSubtask[]) {
    const current = latest.current;
    if (current.disabled) return;
    const next = { ...current.draft, subtasks: update(current.draft.subtasks || []) };
    latest.current.draft = next; onChange(next);
  }
  function changeTitle(id: string, title: string) {
    changeSubtasks(items => {
      if (items.some(item => item.id === id)) return items.map(item => item.id === id ? { ...item, title } : item);
      return hasSubtaskText(title) && items.length < 50 ? [...items, { id, title, completed: false }] : items;
    });
    if (id === placeholderId && hasSubtaskText(title)) { setPlaceholderId(toolId()); setFocusedSubtask(id); }
  }
  function focusNewSubtask() {
    if (latest.current.disabled || (latest.current.draft.subtasks?.length || 0) >= 50) return;
    setShowChecklist(true); setFocusedSubtask(placeholderId);
  }
  function moveFocus(id: string, direction: number) {
    if (latest.current.disabled) return;
    const ids = [...(latest.current.draft.subtasks || []).map(item => item.id), placeholderId];
    const at = ids.indexOf(id), next = ids[Math.max(0, Math.min(ids.length - 1, at + direction))];
    if (at >= 0 && next) { setShowChecklist(true); setFocusedSubtask(next); }
  }
  moveRef.current = moveFocus;
  function leaveSubtask(id: string) {
    setFocusedSubtask(previous => previous === id ? '' : previous);
    if ((latest.current.draft.subtasks || []).some(item => item.id === id && !hasSubtaskText(item.title))) changeSubtasks(items => items.filter(item => item.id !== id));
  }
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
          {(showChecklist || !!subtasks.length) && <View className='task-detail-checklist'>
            {rows.map((item, index) => <View className={`task-detail-subtask${item.completed ? ' is-completed' : ''}`} key={item.id}>
              <ActionButton appearance='icon' size='compact' className='task-detail-subtask-check' ariaLabel={`${item.completed ? '重新打开' : '完成'}子任务 ${index + 1}`} disabled={disabled || item.id === placeholderId} onClick={() => changeSubtasks(items => items.map(row => row.id === item.id ? { ...row, completed: !row.completed } : row))}><View className={`task-detail-check${item.completed ? ' is-checked' : ''}`} aria-hidden>{item.completed && <View />}</View></ActionButton>
              <Input className='task-detail-subtask-input' data-subtask-editor={inputPrefix.current} data-subtask-id={item.id} ariaLabel={`子任务 ${index + 1}`} placeholder={item.id === placeholderId ? '换行即可添加子任务' : '子任务'} value={item.title} disabled={disabled || item.id === placeholderId && subtasks.length >= 50} maxlength={100} focus={focusedSubtask === item.id} onFocus={() => setFocusedSubtask(item.id)} onBlur={() => leaveSubtask(item.id)} cursorSpacing={96} adjustPosition confirmType='next' onConfirm={() => moveFocus(item.id, 1)} onInput={event => changeTitle(item.id, event.detail.value)} />
              {item.id !== placeholderId && <ActionButton appearance='icon' size='compact' intent='danger' ariaLabel={`删除子任务 ${index + 1}`} disabled={disabled} onClick={() => changeSubtasks(items => items.filter(row => row.id !== item.id))}>×</ActionButton>}
            </View>)}
          </View>}
          {nextSteps}
          <SelectedTagList tags={draft.tags || []} disabled={disabled} onEdit={onTags} />
        </View>
      </ScrollView>
      <SheetActions className='task-detail-footer'>
        <View className='task-detail-tools'>
          {tagsAction || <ActionButton appearance='icon' size='compact' ariaLabel='任务标签' disabled={disabled || !onTags} onClick={onTags}><TaskTagSymbol /></ActionButton>}
          <ActionButton appearance='icon' size='compact' ariaLabel='添加子任务' disabled={disabled || subtasks.length >= 50} onClick={focusNewSubtask}><TaskChecklistSymbol /></ActionButton>
          {attachmentAction || <ActionButton appearance='icon' size='compact' ariaLabel='任务附件' disabled={disabled || !onAttachment} onClick={onAttachment}><TaskAttachmentSymbol /></ActionButton>}
          <EditorPreviewButton selected={notePreview} onChange={setNotePreview} disabled={disabled} label='任务备注 Markdown 预览' />
        </View>
        {!!error ? <View className='task-detail-save-state is-error' role='alert'><Text>{error}</Text>{onRetry && <ActionButton appearance='quiet' size='compact' disabled={disabled} onClick={onRetry}>重试</ActionButton>}</View> : pending ? <View className='task-detail-save-state' role='status'><Text>保存中…</Text></View> : null}
      </SheetActions>
    </View>
  </View>;
}

import './compact-editor.css';
