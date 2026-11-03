import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Input, ScrollView, Text, Textarea, View } from '@tarojs/components';
import type { Todo, TodoSubtask } from '../lib/tool-records';
import { toolId, todoQuadrant } from '../lib/tool-records';
import ActionButton from './ui-button';
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
  onToggleComplete?: () => void; notes: ReactNode; nextSteps?: ReactNode;
  tagsAction?: ReactNode; attachmentAction?: ReactNode; onTags?: () => void; onAttachment?: () => void;
  pending?: boolean; error?: string; onRetry?: () => void;
  topBar?: ReactNode; panelClassName?: string;
};

/** Shared task presentation only; the caller owns autosave, identity and menus. */
export default function TaskDetailEditor({ draft, onChange, onClose, disabled = false, autoFocus = false,
  ariaLabel = '编辑任务', category, priority, more, onMore, onSchedule, scheduleLabel = '日期和提醒', scheduleOpen,
  onToggleComplete, notes, nextSteps, tagsAction, attachmentAction, onTags, onAttachment, pending = false, error, onRetry, topBar, panelClassName = '',
}: Props) {
  const [showChecklist, setShowChecklist] = useState(!!draft.subtasks?.length);
  const [placeholderId, setPlaceholderId] = useState(toolId);
  const [focusedSubtask, setFocusedSubtask] = useState('');
  const latest = useRef({ draft, disabled }); latest.current = { draft, disabled };
  useEffect(() => {
    setShowChecklist(!!draft.subtasks?.length); setFocusedSubtask(''); setPlaceholderId(toolId());
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
      return title.trim() && items.length < 50 ? [...items, { id, title, completed: false }] : items;
    });
    if (id === placeholderId && title.trim()) { setPlaceholderId(toolId()); setFocusedSubtask(id); }
  }
  function focusNewSubtask() {
    if (latest.current.disabled || (latest.current.draft.subtasks?.length || 0) >= 50) return;
    setShowChecklist(true); setFocusedSubtask(placeholderId);
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
          <View className='task-detail-notes'>{notes}</View>
          {(showChecklist || !!subtasks.length) && <View className='task-detail-checklist'>
            {rows.map((item, index) => <View className={`task-detail-subtask${item.completed ? ' is-completed' : ''}`} key={item.id}>
              <ActionButton appearance='icon' size='compact' className='task-detail-subtask-check' ariaLabel={`${item.completed ? '重新打开' : '完成'}子任务 ${index + 1}`} disabled={disabled || item.id === placeholderId} onClick={() => changeSubtasks(items => items.map(row => row.id === item.id ? { ...row, completed: !row.completed } : row))}><View className={`task-detail-check${item.completed ? ' is-checked' : ''}`} aria-hidden>{item.completed && <View />}</View></ActionButton>
              <Input className='task-detail-subtask-input' ariaLabel={`子任务 ${index + 1}`} placeholder={item.id === placeholderId ? '换行即可添加子任务' : '子任务'} value={item.title} disabled={disabled || item.id === placeholderId && subtasks.length >= 50} maxlength={100} focus={focusedSubtask === item.id} onFocus={() => setFocusedSubtask(item.id)} onBlur={() => setFocusedSubtask(previous => previous === item.id ? '' : previous)} cursorSpacing={96} adjustPosition confirmType='next' onConfirm={focusNewSubtask} onInput={event => changeTitle(item.id, event.detail.value)} />
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
        </View>
        {!!error ? <View className='task-detail-save-state is-error' role='alert'><Text>{error}</Text>{onRetry && <ActionButton appearance='quiet' size='compact' disabled={disabled} onClick={onRetry}>重试</ActionButton>}</View> : pending ? <View className='task-detail-save-state' role='status'><Text>保存中…</Text></View> : null}
      </SheetActions>
    </View>
  </View>;
}
