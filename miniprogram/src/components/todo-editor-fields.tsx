import { showAppMessage } from '../lib/app-dialog';
import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import { parseTodoTags } from '../lib/todo-data';
import { initialTodoState, isTodoState, todoQuadrant, todoQuadrants, toolId, type Todo } from '../lib/tool-records';
import { scheduleSummary } from '../lib/todo-schedule';
import { SelectChevron } from './select-trigger';
import { TagChoiceRow } from './form-options';
import PrioritySelect from './priority-select';
import { AddSymbol } from './create-button';
import { MoveSymbol } from './sort-symbol';
import { ScheduleSymbol } from './todo-schedule-sheet';
import MarkdownNoteEditor from './markdown-note-editor';
import { usePersonalToolState } from '../lib/use-personal-tool-state';
import { noteStateFits } from '../lib/note-image-data';
import './todo-editor-fields.css';
import TagTextInput from './tag-text-input';
import EntityTitleRow, { EntityTitleInput } from './entity-title-field';
import EditorFieldsLayout from './editor-fields-layout';

export default function TodoEditorFields({ draft, onChange, tagsText, onTagsChange, tagOptions, disabled, owner, onBusyChange, today, scheduleOpen, onSchedule, autoFocus, defaultPreview = false }: {
  draft: Todo; onChange: (draft: Todo) => void; tagsText: string; onTagsChange: (text: string) => void;
  tagOptions: string[]; disabled: boolean; owner: string; onBusyChange?: (busy: boolean) => void; today: string; scheduleOpen: boolean; onSchedule: () => void;
  autoFocus?: boolean; defaultPreview?: boolean;
}) {
  const source = usePersonalToolState('todos', initialTodoState);
  useEffect(() => { source.retry(); }, [source.retry]);
  const [imageBusy, setImageBusy] = useState(false);
  const locked = disabled || imageBusy || scheduleOpen;
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [focusedNext, setFocusedNext] = useState('');
  const [placeholderId, setPlaceholderId] = useState(toolId);
  const [titleFocused, setTitleFocused] = useState(autoFocus);
  useEffect(() => { if (autoFocus !== undefined) setTitleFocused(autoFocus); }, [autoFocus]);
  const current = useRef({ draft, locked, placeholderId }); current.current = { draft, locked, placeholderId };
  const quadrant = todoQuadrant(draft), selected = parseTodoTags(tagsText);
  const options = [...new Set([...tagOptions, ...selected])].map(tag => ({ value: tag, label: tag }));
  function updateNext(nextTasks: NonNullable<Todo['nextTasks']>) {
    const next = { ...current.current.draft, nextTasks }; current.current.draft = next; onChange(next);
  }
  function addNext(id = current.current.placeholderId) {
    const snapshot = current.current, steps = snapshot.draft.nextTasks || [];
    if (snapshot.locked) return;
    if (!steps.some(step => step.id === id)) {
      if (id !== snapshot.placeholderId) return;
      if (steps.length >= 50) { void showAppMessage({ title: '每件任务最多 50 个下一步任务', icon: 'none' }); return; }
      snapshot.placeholderId = toolId(); setPlaceholderId(snapshot.placeholderId);
      updateNext([...steps, { id, title: '' }]);
    }
    setFocusedNext(id);
  }
  function moveNext(id: string, direction: number) {
    const steps = [...(current.current.draft.nextTasks || [])], index = steps.findIndex(step => step.id === id), target = index + direction;
    if (current.current.locked || index < 0 || target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]]; updateNext(steps);
  }
  return <EditorFieldsLayout className='todo-editor-fields'>
    <View className='todo-editor-meta todo-date-row'><ActionButton className={`button-label todo-schedule-trigger${draft.dueDate || draft.reminderAt || draft.recurrence ? ' is-active' : ''}`} ariaLabel='设置日期、提醒和重复' aria-expanded={scheduleOpen} disabled={locked} onClick={() => { setPriorityOpen(false); setTitleFocused(false); setFocusedNext(''); void Taro.hideKeyboard().catch(() => {}); onSchedule(); }}><ScheduleSymbol /><Text>{draft.dueDate || draft.reminderAt || draft.recurrence ? scheduleSummary(draft, today) : '日期'}</Text><SelectChevron expanded={scheduleOpen} /></ActionButton></View>
    <EntityTitleRow className='todo-title-row'>
      <EntityTitleInput className='todo-title-input' ariaLabel='任务名称' focus={titleFocused} onBlur={() => setTitleFocused(false)} value={draft.title} placeholder='准备做什么？' disabled={locked} maxlength={Math.max(100, draft.title.length)} cursorSpacing={96} adjustPosition onInput={event => onChange({ ...draft, title: event.detail.value })} confirmType='done' />
      <PrioritySelect className='todo-priority-field' ariaLabel={quadrant.title} open={priorityOpen} onOpenChange={setPriorityOpen} disabled={locked} triggerClassName='todo-priority-toggle' panelClassName='todo-priority-panel' optionsClassName='todo-priority-options' choiceClassName='todo-priority-choice' optionsAriaLabel='任务优先级' options={todoQuadrants.map((q, index) => ({ value: q.id, label: ['高', '中', '低', '无'][index], ariaLabel: q.title, color: q.color, outlined: q.id === 'later' }))} value={quadrant.id} onChange={id => { const q = todoQuadrants.find(q => q.id === id); if (q) onChange({ ...draft, important: q.important, urgent: q.urgent }); }} />
    </EntityTitleRow>
    <MarkdownNoteEditor className='todo-note-editor' inputClassName='todo-description' defaultPreview={defaultPreview} value={draft.description} images={draft.images}
      onChange={description => onChange({ ...draft, description })} onImagesChange={images => onChange({ ...draft, images })}
      owner={owner} recordId={draft.id} disabled={locked} maxLength={10000} ariaLabel='任务备注' placeholder='有什么需要补充的？'
      canInsertImage={source.ready && source.owner === owner && isTodoState(source.value)}
      onBusyChange={value => { current.current.locked = disabled || value; setImageBusy(value); onBusyChange?.(value); }}
      checkImages={images => { if (!isTodoState(source.value) || !noteStateFits({ ...source.value, tasks: [{ ...draft, images }, ...source.value.tasks.filter(task => task.id !== draft.id)] })) throw new Error('任务空间不足，请移除一些图片或整理旧任务'); }} />
    <View className='todo-next-list'>{[...(draft.nextTasks || []), { id: placeholderId, title: '' }].map((child, index) => <View className={`todo-next-step${index === 0 ? ' todo-next-first' : ''}`} key={child.id}>
      <View className='todo-next-bullet' aria-hidden /><Input className='todo-next-input' ariaLabel={`下一步任务 ${index + 1}`} placeholder='还要做什么？' disabled={locked || child.id === placeholderId && index >= 50} value={child.title} maxlength={100} cursorSpacing={96} adjustPosition focus={focusedNext === child.id} onFocus={() => { if (child.id === current.current.placeholderId) addNext(child.id); }} onBlur={() => setFocusedNext(previous => previous === child.id ? '' : previous)} onInput={event => { if (current.current.locked) return; if (child.id === current.current.placeholderId) addNext(child.id); updateNext((current.current.draft.nextTasks || []).map(item => item.id === child.id ? { ...item, title: event.detail.value } : item)); }} confirmType='next' onConfirm={() => addNext()} />
      <View className='todo-next-actions'>
        {child.id !== placeholderId ? <>
          <View className='todo-next-controls' aria-hidden={(draft.nextTasks?.length || 0) <= 1 ? true : undefined}>{(draft.nextTasks?.length || 0) > 1 && <>
            <ActionButton appearance='icon' size='compact' className='button-label todo-next-button' disabled={locked || index === 0} ariaLabel={`提前第 ${index + 1} 步`} onClick={() => moveNext(child.id, -1)}><MoveSymbol direction='up' /></ActionButton>
            <ActionButton appearance='icon' size='compact' className='button-label todo-next-button' disabled={locked || index === draft.nextTasks!.length - 1} ariaLabel={`后移第 ${index + 1} 步`} onClick={() => moveNext(child.id, 1)}><MoveSymbol direction='down' /></ActionButton>
          </>}</View>
          <ActionButton appearance='icon' size='compact' className='button-label todo-next-button' disabled={locked} ariaLabel={`删除第 ${index + 1} 个下一步任务`} onClick={() => { if (!current.current.locked) updateNext((current.current.draft.nextTasks || []).filter(item => item.id !== child.id)); }}>×</ActionButton>
        </> : <ActionButton appearance='icon' size='compact' className='button-label todo-add-next' ariaLabel='添加下一步任务' disabled={locked || index >= 50} onClick={() => addNext(child.id)}><AddSymbol /></ActionButton>}
      </View>
    </View>)}</View>
    <TagChoiceRow options={options} value={selected} onChange={tags => onTagsChange(tags.join('，'))} ariaLabel='选择现有标签' frequentValues={tagOptions.slice(0, 4)} disabled={locked} className='todo-tags-row' contentKey={tagsText} customInput={<TagTextInput ariaLabel='任务标签' value={tagsText} disabled={locked} maxlength={Math.max(300, tagsText.length)} cursorSpacing={96} adjustPosition placeholder='输入标签，用符号分隔' onInput={event => onTagsChange(event.detail.value)} />} />
  </EditorFieldsLayout>;
}
