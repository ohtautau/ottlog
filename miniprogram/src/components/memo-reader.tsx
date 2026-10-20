import { Text, View } from '@tarojs/components';
import { useState } from 'react';
import { memoPriorityColor, type Memo, type MemoPriority } from '../lib/tool-records';
import { getLibraryIcon, type LibraryIconId } from '../lib/icon-library';
import { habitPriorities, habitPriorityLabels } from '../lib/habit-metadata';
import { isMemoImage } from '../lib/memo-images';
import { tagLabel } from '../lib/tag-label';
import { ChoicePopover, PopoverHeading } from './form-options';
import ActionButton, { ChoiceButton } from './ui-button';
import DomainRecordContent from './domain-record-content';
import MemoFieldsLayout, { MemoIconPreview } from './memo-fields-layout';
import PrioritySelect from './priority-select';
import IconLibrarySheet from './icon-library-sheet';
import SheetActions from './sheet-actions';
import { EditSymbol, PinSymbol } from './manage-symbol';
import { EntityTitleText } from './entity-title-field';
import './markdown-note-editor.css';
import './memo-reader.css';
import EditorFieldsLayout from './editor-fields-layout';

let nextMemoReaderPriorityId = 0;

/** Reading uses the saved record; explicit actions stay with the page's state owner. */
export default function MemoReader({ note, title, onClose, onEdit, onPin, onIconChange, onPriorityChange, onRetry, changeError = '', changing = false, changeDisabled = false, closeDisabled = false, editDisabled = false, pinDisabled = false }: {
  note: Memo; title: string; onClose: () => void; onEdit: () => void; onPin: () => void;
  onIconChange: (id: LibraryIconId | null) => void; onPriorityChange: (value: MemoPriority) => void; onRetry: () => void;
  changeError?: string; changing?: boolean; changeDisabled?: boolean; closeDisabled?: boolean; editDisabled?: boolean; pinDisabled?: boolean;
}) {
  const [iconPicker, setIconPicker] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [priorityId] = useState(() => `memo-reader-priority-${++nextMemoReaderPriorityId}`);
  const priority = note.priority || 'none';
  const priorityProps = { ariaLabel: `选择便签优先度：${habitPriorityLabels[priority]}`, open: priorityOpen, onOpenChange: setPriorityOpen, disabled: changeDisabled,
    options: habitPriorities.map(value => ({ value, label: habitPriorityLabels[value], ariaLabel: `优先度${habitPriorityLabels[value]}`, color: memoPriorityColor(value), outlined: value === 'none' })), value: priority, onChange: onPriorityChange };
  return <><ChoicePopover ariaLabel='便签内容' anchorId='memo-list' open onOpenChange={open => { if (!open) { if (iconPicker) setIconPicker(false); else if (!closeDisabled) onClose(); } }} placement='center' panelWidth={560} maxHeightRatio={.9} bodySpacing='none' contentKey={changeError} panelClassName='memo-reader memo-content-reader'
    heading={<PopoverHeading className='memo-content-heading' title='便签内容' actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭便签内容' disabled={closeDisabled} onClick={onClose}>×</ActionButton>} />}
    footer={<>{!!changeError && <View className='memo-reader-error' role='alert'>{changeError}</View>}<SheetActions className='memo-reader-actions' leading={<ActionButton appearance='icon' size='compact' ariaLabel={`编辑便签：${title}`} disabled={editDisabled} onClick={onEdit}><EditSymbol /></ActionButton>}><ActionButton appearance='primary' size='large' width='fill' disabled={changing || (closeDisabled && !changeError)} loading={changing} onClick={changeError ? onRetry : onClose}>{changeError ? '重试保存' : '完成'}</ActionButton></SheetActions></>}>
    <MemoFieldsLayout readOnly color={note.color} title={<>
      <ActionButton appearance='icon' className='button-label memo-icon-picker' ariaLabel='选择便签图标' disabled={changeDisabled} onClick={() => { setPriorityOpen(false); setIconPicker(true); }}><MemoIconPreview iconId={note.iconId} /></ActionButton>
      <EntityTitleText className='memo-reader-title' selectable>{title}</EntityTitleText>
      <PrioritySelect {...priorityProps} triggerId={priorityId} renderLayer={false} className='memo-priority-field' triggerClassName='memo-priority-trigger' />
    </>}
      body={<EditorFieldsLayout topSpace={false} className='markdown-note-editor'><View className='memo-body-preview'><DomainRecordContent record={{ content: note.body, images: note.images?.filter(isMemoImage) }} inheritTypography={false} /></View></EditorFieldsLayout>}
      pin={<ChoiceButton iconOnly size='compact' className='memo-reader-pin' ariaLabel={note.pinned ? '取消置顶便签' : '置顶便签'} aria-pressed={note.pinned} disabled={pinDisabled} onClick={onPin}><PinSymbol /></ChoiceButton>}
      tags={!!note.tags.length && <View className='memo-tags-field memo-reader-tags'>{note.tags.map(tag => <Text key={tag}>{tagLabel(tag)}</Text>)}</View>} />
  </ChoicePopover>
    <PrioritySelect {...priorityProps} anchorId={priorityId} layerClassName='memo-reader-priority-layer' panelClassName='memo-reader-priority-popover' />
    {iconPicker && !changeDisabled && <IconLibrarySheet className='memo-reader-icon-library' selectedId={getLibraryIcon(note.iconId)?.id} allowNone onClose={() => setIconPicker(false)} onSelect={id => { setIconPicker(false); onIconChange(id); }} />}
  </>;
}
