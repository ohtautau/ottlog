import { MEMO_TITLE_PLACEHOLDER } from './editor-copy';
import SelectedTagList from './selected-tag-list';
import EditorTagField from './editor-tag-field';
import {View} from '@tarojs/components';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EntityTitleInput } from './entity-title-field';
import { ChoiceButton } from './ui-button';
import { usePersonalToolState } from '../lib/use-personal-tool-state';
import { initialMemoState, isMemoState, memoPriorityColor, type Memo } from '../lib/tool-records';
import { parseTodoTags } from '../lib/todo-data';
import { habitPriorities, habitPriorityLabels } from '../lib/habit-metadata';
import { memoStateFits, withMemo } from '../lib/memo-images';
import PrioritySelect from './priority-select';
import MemoFieldsLayout from './memo-fields-layout';
import MarkdownNoteEditor from './markdown-note-editor';
import { PinSymbol } from './manage-symbol';

/** Memo-specific controls used by the shared creator and the original-record editor. */
export default function MemoEditorFields({ draft, onChange, tagsText, onTagsChange, tagOptions, disabled, mediaWritable = !disabled, owner, onBusyChange, autoFocus, minimal = false, showTags = true, insertionSignal = 0, preview, onPreviewChange, actions, onTags }: {
  draft: Memo; onChange: (next: Memo) => void; tagsText: string; onTagsChange: (text: string) => void;
  tagOptions: readonly string[]; disabled: boolean; mediaWritable?: boolean; owner: string; onBusyChange?: (busy: boolean) => void;
  onTags?:()=>void; actions?:ReactNode; autoFocus?: boolean; minimal?: boolean; showTags?: boolean; insertionSignal?: number; preview?:boolean; onPreviewChange?:(value:boolean)=>void;
}) {
  const memoSource = usePersonalToolState('memos', initialMemoState);
  // Editors mount after the page's onShow, so initialize their read-only source.
  useEffect(() => { memoSource.retry(); }, [memoSource.retry]);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [titleFocused, setTitleFocused] = useState(autoFocus);
  useEffect(() => { if (autoFocus !== undefined) setTitleFocused(autoFocus); }, [autoFocus]);
  const current = useRef({ draft, owner, onChange, disabled, mediaWritable });
  current.current = { draft, owner, onChange, disabled, mediaWritable };
  useEffect(() => { setPriorityOpen(false); }, [owner, draft.id]);

  function change(patch: Partial<Memo>, media = false) {
    const now = current.current; if (media ? !now.mediaWritable : now.disabled) return;
    const next = { ...now.draft, ...patch }; current.current.draft = next; now.onChange(next);
  }
  const locked = disabled || imageBusy;
  const priority = draft.priority || 'none';
  const selectedTags = parseTodoTags(tagsText);

  return <>
    {actions && <View className='entry-pane-heading'><View/><View className='entry-pane-actions'><PrioritySelect className='memo-priority-field' ariaLabel={`选择便签优先度：${habitPriorityLabels[priority]}`} triggerClassName='memo-priority-trigger' open={priorityOpen} onOpenChange={setPriorityOpen} disabled={locked} options={habitPriorities.map(value => ({ value, label: habitPriorityLabels[value], ariaLabel: `优先度${habitPriorityLabels[value]}`, color: memoPriorityColor(value), outlined: value === 'none' }))} value={priority} onChange={value => change({ priority: value })} />{actions}</View></View>}
    <MemoFieldsLayout title={<>
        <EntityTitleInput className='memo-title-input' ariaLabel='便签标题' focus={titleFocused} onBlur={() => setTitleFocused(false)} disabled={locked} value={draft.title} placeholder={MEMO_TITLE_PLACEHOLDER} maxlength={Math.max(80, draft.title.length)} cursorSpacing={96} adjustPosition onInput={event => change({ title: event.detail.value })} />
        {!actions && <PrioritySelect className='memo-priority-field' ariaLabel={`选择便签优先度：${habitPriorityLabels[priority]}`} triggerClassName='memo-priority-trigger' open={priorityOpen} onOpenChange={setPriorityOpen} disabled={locked} options={habitPriorities.map(value => ({ value, label: habitPriorityLabels[value], ariaLabel: `优先度${habitPriorityLabels[value]}`, color: memoPriorityColor(value), outlined: value === 'none' }))} value={priority} onChange={value => change({ priority: value })} />}
      </>} body={<MarkdownNoteEditor value={draft.body} images={draft.images} onChange={body => change({ body })} onImagesChange={images => change({ images }, true)}
        owner={owner} recordId={draft.id} disabled={locked} maxLength={6000} ariaLabel='便签内容' placeholder={minimal ? '备注' : '写下内容…'} minimal={minimal} preview={preview} onPreviewChange={onPreviewChange} emptyPreviewPlaceholder='备注' insertionSignal={insertionSignal} showImageInsertion={!minimal}
        canInsertImage={mediaWritable && memoSource.ready && memoSource.owner === owner && isMemoState(memoSource.value)}
        onBusyChange={value => { setImageBusy(value); onBusyChange?.(value); }}
        checkImages={images => { if (!isMemoState(memoSource.value) || !memoStateFits(withMemo(memoSource.value, { ...draft, images }))) throw new Error('便签空间不足，请先移除一些图片或整理旧便签'); }} />}
      pin={<ChoiceButton iconOnly size='compact' className={`button-label memo-pin-setting${draft.pinned ? ' is-active' : ''}`} ariaLabel={draft.pinned ? '取消置顶便签' : '置顶便签'} aria-pressed={draft.pinned} disabled={locked} onClick={() => change({ pinned: !current.current.draft.pinned })}><PinSymbol /></ChoiceButton>}
      tags={<><SelectedTagList tags={selectedTags} disabled={locked} onEdit={onTags} />{showTags && <EditorTagField className='memo-tags-field' text={tagsText} onChange={onTagsChange} options={tagOptions} disabled={locked} label='便签标签' />}</>} />
  </>;
}
