import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from './ui-button';
import type { Domain } from '../lib/domain-data';
import type { Reminder } from '../lib/reminder-data';
import { habitPriorities, habitPriorityLabels, habitPriorityColors, habitTimePeriods, habitTimePeriodLabels, habitTimePeriod } from '../lib/habit-metadata';
import { getLibraryIcon, habitIconId, type LibraryIconId } from '../lib/icon-library';
import HabitIcon from './habit-icon';
import IconLibrarySheet from './icon-library-sheet';
import SheetActions, { SheetDeleteButton } from './sheet-actions';
import EditorHeading from './editor-heading';
import SheetBackdrop from './sheet-backdrop';
import AppDialog from './app-dialog';
import PrioritySelect from './priority-select';
import DomainChoiceField from './domain-choice-field';
import { alignHabitDomain } from '../lib/habit-domains';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import EntityTitleRow, { EntityTitleInput } from './entity-title-field';
import HabitNoteField from './habit-note-field';
import './habit-editor.css';
import EditorFieldsLayout from './editor-fields-layout';

export default function HabitEditor({ draft, domains, saving, pendingSave = false, message, archiveLabel, archivePending = false, onArchive, onChange, onSave, onDelete, onClose }: {
  draft: Reminder; domains: readonly Domain[]; saving: boolean; pendingSave?: boolean; message: string; archiveLabel: string; archivePending?: boolean;
  onArchive: () => void; onChange: (draft: Reminder) => void; onSave: () => void | Promise<void>; onDelete: () => void; onClose: () => void;
}) {
  const [iconPicker, setIconPicker] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const editable = ({ enabled: _enabled, ...fields }: Reminder) => JSON.stringify(fields);
  const [baseline] = useState(() => editable(draft));
  const closeGuard = useEditorCloseGuard({ scope: `habit:${draft.id || 'new'}`, hasChanges: pendingSave || editable(draft) !== baseline, blocked: saving, onSave, onClose });
  const aligned = alignHabitDomain(draft, domains);
  const selectedDomain = domains.find(domain => domain.id === aligned.domainId)?.id || '';
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return;
      if (deleteOpen) setDeleteOpen(false); else if (iconPicker) setIconPicker(false); else closeGuard.requestClose();
    };
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, [saving, iconPicker, deleteOpen, closeGuard.requestClose]);
  function openIconLibrary() {
    if (saving) return;
    void Taro.hideKeyboard?.().catch(() => {});
    setIconPicker(true);
  }
  function selectIcon(id: LibraryIconId | null) {
    const icon = getLibraryIcon(id);
    if (!icon || saving) return;
    onChange({ ...draft, iconId: icon.id, kind: icon.fallback, backgroundKind: undefined });
    setIconPicker(false);
  }
  return <>
    <View className='daily-editor-overlay'><SheetBackdrop disabled={saving} onClose={closeGuard.requestClose} /><View className='daily-editor-sheet' role='dialog' ariaLabel={draft.id ? '编辑习惯' : '创建习惯'}>
      <EditorHeading className='daily-editor-heading' titleClassName='daily-sheet-title' title={draft.id ? '编辑习惯' : '创建习惯'} actions={<ActionButton appearance='icon' className='button-label' ariaLabel='关闭习惯编辑' disabled={saving} onClick={closeGuard.requestClose}>×</ActionButton>} />
      <ScrollView scrollY className='daily-editor-scroll' showScrollbar={false}><EditorFieldsLayout className='daily-editor'>
        <View className='daily-domain-field'><DomainChoiceField ariaLabel='选择习惯领域' domains={domains} value={selectedDomain} disabled={saving} onChange={domainId => onChange({ ...draft, group: domains.find(domain => domain.id === domainId)?.name || '未分类', domainId: domainId || undefined })} /></View>
        <EntityTitleRow className='daily-title-row'><ActionButton appearance='icon' className='button-label daily-title-icon' ariaLabel='选择习惯图标' disabled={saving} onClick={openIconLibrary}><HabitIcon name={habitIconId(draft)} /></ActionButton><EntityTitleInput className='daily-title-input' ariaLabel='习惯名称' disabled={saving} cursorSpacing={96} adjustPosition maxlength={60} value={draft.title} placeholder='想多做什么？' onInput={event => onChange({ ...draft, title: event.detail.value })} /><PrioritySelect ariaLabel='选择习惯优先度' className='daily-priority-field' triggerClassName='daily-priority-trigger' open={priorityOpen} onOpenChange={setPriorityOpen} disabled={saving} options={habitPriorities.map(priority => ({ value: priority, label: habitPriorityLabels[priority], ariaLabel: `优先度${habitPriorityLabels[priority]}`, color: habitPriorityColors[priority], outlined: priority === 'none' }))} value={draft.priority || 'none'} onChange={priority => onChange({ ...draft, priority })} /></EntityTitleRow>
        <HabitNoteField className='daily-note-input' ariaLabel='提醒自己的话' disabled={saving} fixed cursorSpacing={96} adjustPosition showConfirmBar={false} maxlength={240} value={draft.note} placeholder='把动作写小一点，会更容易开始。' onInput={event => onChange({ ...draft, note: event.detail.value })} />
        <View className='daily-editor-settings'><View className='daily-time-period-field' role='group' ariaLabel='习惯时段设置'>{habitTimePeriods.map(timePeriod => <ChoiceButton key={timePeriod} size='compact' width='fill' ariaLabel={`习惯时段：${habitTimePeriodLabels[timePeriod]}`} selected={habitTimePeriod(draft) === timePeriod} disabled={saving} onClick={() => { void Taro.hideKeyboard?.().catch(() => {}); onChange({ ...draft, timePeriod }); }}>{habitTimePeriodLabels[timePeriod]}</ChoiceButton>)}</View></View>
        {draft.id && <View className='daily-editor-lifecycle'><ActionButton size='compact' width='fill' disabled={saving} ariaLabel={archiveLabel} onClick={onArchive}>{archiveLabel}</ActionButton></View>}
        {message && <View className='daily-editor-message' role='alert'>{message}</View>}
      </EditorFieldsLayout></ScrollView>
      <SheetActions className='daily-editor-footer' leading={draft.id ? <SheetDeleteButton ariaLabel='删除习惯' disabled={saving || archivePending} onClick={() => setDeleteOpen(true)} /> : undefined}><ActionButton appearance='primary' size='large' width='fill' className='button-label tool-primary' loading={saving} disabled={saving || archivePending || !draft.title.trim()} onClick={onSave}>{draft.id ? '保存' : '创建习惯'}</ActionButton></SheetActions>
    </View></View>
    {iconPicker && <IconLibrarySheet selectedId={habitIconId(draft)} onSelect={selectIcon} onClose={() => setIconPicker(false)} />}
    {deleteOpen && <AppDialog title='删除习惯？' ariaLabel='确认删除习惯' closeLabel='关闭习惯删除确认' onClose={() => setDeleteOpen(false)} busy={saving} error={message} actions={<ActionButton appearance='danger' size='large' width='fill' ariaLabel='确认删除习惯' disabled={saving} onClick={onDelete}>删除</ActionButton>}><Text>“{draft.title}”及其打卡记录会一起删除。</Text></AppDialog>}
    {closeGuard.dialog}
  </>;
}
