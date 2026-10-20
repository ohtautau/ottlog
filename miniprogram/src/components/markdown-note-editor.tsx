import { showAppMessage } from '../lib/app-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { Image, RichText, Text, Textarea, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from './ui-button';
import { imageUrl } from '../api';
import { createMarkdownRenderer } from '../lib/markdown';
import { isMemoImage, MAX_MEMO_IMAGES, previewMemoImages, readMemoImage } from '../lib/memo-images';
import type { MemoImage } from '../lib/tool-records';
import './markdown-note-editor.css';
import EditorFieldsLayout from './editor-fields-layout';

const renderMarkdown = createMarkdownRenderer(imageUrl);
const notify = (error: unknown) => { void showAppMessage({ title: error instanceof Error ? error.message : '操作失败，请重试', icon: 'none' }); };

/** Shared text/image input; progress uses the plain-text variant without Markdown modes. */
export default function MarkdownNoteEditor({ value, images: savedImages, onChange, onImagesChange, checkImages, canInsertImage, showImageInsertion = true, disabled, owner, recordId, onBusyChange, maxLength, ariaLabel, placeholder, className = '', inputClassName = '', autoFocus, defaultPreview = false, density = 'regular', format = 'markdown' }: {
  value: string; images?: MemoImage[]; onChange: (value: string) => void; onImagesChange: (images: MemoImage[]) => void;
  checkImages: (images: MemoImage[]) => void; canInsertImage: boolean; disabled: boolean; owner: string; recordId: string;
  onBusyChange?: (busy: boolean) => void; maxLength: number; ariaLabel: string; placeholder: string; className?: string; inputClassName?: string;
  autoFocus?: boolean; defaultPreview?: boolean; density?: 'regular' | 'compact'; format?: 'markdown' | 'plain'; showImageInsertion?: boolean;
}) {
  const [preview, setPreview] = useState(defaultPreview), [imageBusy, setImageBusy] = useState(false);
  const [focused, setFocused] = useState(autoFocus);
  useEffect(() => { if (autoFocus !== undefined) setFocused(autoFocus); }, [autoFocus]);
  const mounted = useRef(true), operating = useRef(false);
  const identity = useRef({ owner, recordId, generation: 0 });
  if (identity.current.owner !== owner || identity.current.recordId !== recordId) identity.current = { owner, recordId, generation: identity.current.generation + 1 };
  const images = savedImages?.filter(isMemoImage) || [], locked = disabled || imageBusy;
  const current = useRef({ images, canInsertImage: canInsertImage && showImageInsertion, disabled, onImagesChange, checkImages });
  current.current = { images, canInsertImage: canInsertImage && showImageInsertion, disabled, onImagesChange, checkImages };
  const busyCallback = useRef(onBusyChange); busyCallback.current = onBusyChange;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; busyCallback.current?.(false); }; }, []);
  useEffect(() => { setPreview(defaultPreview); }, [owner, recordId, format, defaultPreview]);
  const showingPreview = format === 'markdown' && preview;
  const markdown = useMemo(() => showingPreview ? renderMarkdown(value) : '', [showingPreview, value]);
  async function insertImage() {
    const before = current.current;
    if (before.disabled || operating.current || !owner || !before.canInsertImage || before.images.length >= MAX_MEMO_IMAGES) return;
    const captured = identity.current;
    const isCurrent = () => mounted.current && identity.current === captured && current.current.canInsertImage;
    operating.current = true; setImageBusy(true); busyCallback.current?.(true);
    try {
      const chosen = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'] });
      if (!chosen.tempFiles.length || !isCurrent()) return;
      const image = await readMemoImage(chosen.tempFiles[0].tempFilePath);
      if (!isCurrent()) return;
      const latest = current.current, next = [...latest.images, image];
      if (next.length > MAX_MEMO_IMAGES) throw new Error(`最多插入 ${MAX_MEMO_IMAGES} 张图片`);
      latest.checkImages(next);
      latest.onImagesChange(next);
    } catch (error) {
      if (isCurrent() && !/cancel/i.test(String((error as { errMsg?: string })?.errMsg || ''))) notify(error);
    } finally {
      operating.current = false;
      if (mounted.current) { setImageBusy(false); busyCallback.current?.(false); }
    }
  }
  return <EditorFieldsLayout topSpace={false} className={`markdown-note-editor${density === 'compact' ? ' is-compact' : ''}${format === 'plain' ? ' is-plain' : ''} ${className}`}>
    {showingPreview ? <View className='memo-body-preview'>{value ? <RichText nodes={markdown} selectable /> : !images.length && <Text className='tool-muted'>暂无内容</Text>}</View> : <Textarea className={`memo-body-input ${inputClassName}`} ariaLabel={ariaLabel} focus={focused} onBlur={() => setFocused(false)} disabled={locked} value={value} placeholder={placeholder} maxlength={Math.max(maxLength, value.length)} fixed cursorSpacing={96} adjustPosition onInput={event => onChange(event.detail.value)} showConfirmBar={false} />}
    <View className='memo-editor-toolbar'>{format === 'markdown' && <View className='memo-editor-modes'><ChoiceButton className={!preview ? 'is-active' : ''} aria-pressed={!preview} disabled={locked} onClick={() => setPreview(false)}>书写</ChoiceButton><ChoiceButton className={preview ? 'is-active' : ''} aria-pressed={preview} disabled={locked} onClick={() => setPreview(true)}>预览</ChoiceButton></View>}<Text className='memo-body-count'>{value.length} / {maxLength}{images.length ? ` · ${images.length} 张图片` : ''}</Text>{showImageInsertion && <ActionButton className='memo-insert-image' ariaLabel='插入图片' disabled={locked || images.length >= MAX_MEMO_IMAGES || !canInsertImage} loading={imageBusy} onClick={() => { void insertImage(); }}><View className='memo-image-mark' aria-hidden />{imageBusy ? '处理中' : '图片'}</ActionButton>}</View>
    {!!images.length && <View className={`memo-images${showingPreview ? ' is-preview' : ''}`}>{images.map((image, index) => <View className='memo-image' key={image.id}><Image src={image.dataUrl} mode={showingPreview ? 'widthFix' : 'aspectFill'} ariaLabel={`${ariaLabel}图片 ${index + 1}`} onClick={() => { void previewMemoImages(images, index).catch(notify); }} />{!showingPreview && <ActionButton appearance='icon' context='overlay' className='memo-image-remove' ariaLabel={`移除图片 ${index + 1}`} disabled={locked} onClick={() => onImagesChange(images.filter(item => item.id !== image.id))}>×</ActionButton>}</View>)}</View>}
  </EditorFieldsLayout>;
}
