import { showAppMessage } from '../lib/app-dialog';
import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { EntityTitleInput } from './entity-title-field';
import ActionButton, { ChoiceButton } from './ui-button';
import { usePersonalToolState } from '../lib/use-personal-tool-state';
import { initialMemoState, isMemoState, memoPriorityColor, type Memo } from '../lib/tool-records';
import { getLibraryIcon, type LibraryIconId } from '../lib/icon-library';
import { parseTodoTags } from '../lib/todo-data';
import { habitPriorities, habitPriorityLabels } from '../lib/habit-metadata';
import { memoStateFits, withMemo } from '../lib/memo-images';
import { TagChoiceRow } from './form-options';
import PrioritySelect from './priority-select';
import MemoFieldsLayout, { MemoColorChoices, MemoIconPreview } from './memo-fields-layout';
import IconLibrarySheet from './icon-library-sheet';
import MarkdownNoteEditor from './markdown-note-editor';
import TagTextInput from './tag-text-input';
import { PinSymbol } from './manage-symbol';

const notify = (error: unknown) => { void showAppMessage({ title: error instanceof Error ? error.message : '操作失败，请重试', icon: 'none' }); };

/** Memo-specific controls used by the shared creator and the original-record editor. */
export default function MemoEditorFields({ draft, onChange, tagsText, onTagsChange, tagOptions, disabled, owner, onBusyChange, autoFocus }: {
  draft: Memo; onChange: (next: Memo) => void; tagsText: string; onTagsChange: (text: string) => void;
  tagOptions: readonly string[]; disabled: boolean; owner: string; onBusyChange?: (busy: boolean) => void;
  autoFocus?: boolean;
}) {
  const memoSource = usePersonalToolState('memos', initialMemoState);
  // Editors mount after the page's onShow, so initialize their read-only source.
  useEffect(() => { memoSource.retry(); }, [memoSource.retry]);
  const [iconPicker, setIconPicker] = useState<{ owner: string; id: string } | null>(null);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [titleFocused, setTitleFocused] = useState(autoFocus);
  useEffect(() => { if (autoFocus !== undefined) setTitleFocused(autoFocus); }, [autoFocus]);
  const current = useRef({ draft, owner, onChange, disabled });
  current.current = { draft, owner, onChange, disabled };
  useEffect(() => { setIconPicker(null); setPriorityOpen(false); }, [owner, draft.id]);

  const locked = disabled || imageBusy;
  const priority = draft.priority || 'none';
  const selectedTags = parseTodoTags(tagsText);

  function openIconLibrary() {
    if (locked || !owner) return;
    void Taro.hideKeyboard?.().catch(() => {});
    setIconPicker({ owner, id: draft.id });
  }
  function selectIcon(id: LibraryIconId | null) {
    const now = current.current;
    if (locked || now.disabled || now.owner !== owner || iconPicker?.owner !== owner || iconPicker.id !== now.draft.id) return;
    if (id !== null && !getLibraryIcon(id)) return;
    onChange({ ...now.draft, iconId: id ?? undefined });
    setIconPicker(null);
  }
  function selectTags(next: string[]) {
    if (next.length > 5) { notify(new Error('最多 5 个标签')); return; }
    onTagsChange(next.join('，'));
  }

  return <>
    <MemoFieldsLayout color={draft.color} title={<>
        <ActionButton appearance='icon' className='button-label memo-icon-picker' ariaLabel='选择便签图标' disabled={locked} onClick={openIconLibrary}><MemoIconPreview iconId={draft.iconId} /></ActionButton>
        <EntityTitleInput className='memo-title-input' ariaLabel='便签标题' focus={titleFocused} onBlur={() => setTitleFocused(false)} disabled={locked} value={draft.title} placeholder='准备记下什么？' maxlength={Math.max(80, draft.title.length)} cursorSpacing={96} adjustPosition onInput={event => onChange({ ...draft, title: event.detail.value })} />
        <PrioritySelect className='memo-priority-field' ariaLabel={`选择便签优先度：${habitPriorityLabels[priority]}`} triggerClassName='memo-priority-trigger' open={priorityOpen} onOpenChange={setPriorityOpen} disabled={locked} options={habitPriorities.map(value => ({ value, label: habitPriorityLabels[value], ariaLabel: `优先度${habitPriorityLabels[value]}`, color: memoPriorityColor(value), outlined: value === 'none' }))} value={priority} onChange={value => onChange({ ...draft, priority: value })} />
      </>} body={<MarkdownNoteEditor value={draft.body} images={draft.images} onChange={body => onChange({ ...draft, body })} onImagesChange={images => onChange({ ...draft, images })}
        owner={owner} recordId={draft.id} disabled={locked} maxLength={6000} ariaLabel='便签内容' placeholder='写下内容…'
        canInsertImage={memoSource.ready && memoSource.owner === owner && isMemoState(memoSource.value)}
        onBusyChange={value => { setImageBusy(value); onBusyChange?.(value); }}
        checkImages={images => { if (!isMemoState(memoSource.value) || !memoStateFits(withMemo(memoSource.value, { ...draft, images }))) throw new Error('便签空间不足，请先移除一些图片或整理旧便签'); }} />}
      pin={<ChoiceButton iconOnly size='compact' className={`button-label memo-pin-setting${draft.pinned ? ' is-active' : ''}`} ariaLabel={draft.pinned ? '取消置顶便签' : '置顶便签'} aria-pressed={draft.pinned} disabled={locked} onClick={() => onChange({ ...draft, pinned: !draft.pinned })}><PinSymbol /></ChoiceButton>}
      settings={<MemoColorChoices value={draft.color} disabled={locked} onChange={color => onChange({ ...draft, color })} />}
      tags={<TagChoiceRow className='memo-tags-field' options={tagOptions.map(tag => ({ value: tag, label: tag }))} value={selectedTags} frequentValues={tagOptions.slice(0, 4)} onChange={selectTags} ariaLabel='选择现有标签' disabled={locked} contentKey={tagsText} customInput={<TagTextInput ariaLabel='便签标签' value={tagsText} placeholder='输入标签，用符号分隔' maxlength={Math.max(104, tagsText.length)} cursorSpacing={96} adjustPosition disabled={locked} onInput={event => onTagsChange(event.detail.value)} />} />} />
    {!locked && iconPicker?.owner === owner && iconPicker.id === draft.id && <IconLibrarySheet selectedId={getLibraryIcon(draft.iconId)?.id} allowNone onSelect={selectIcon} onClose={() => setIconPicker(null)} />}
  </>;
}
