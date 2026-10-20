import type { CSSProperties, ReactNode } from 'react';
import { View } from '@tarojs/components';
import EntityTitleRow, { EntityIconPreview } from './entity-title-field';
import ColorChoiceRow from './color-choice-row';
import { memoColors, type MemoColor } from '../lib/tool-records';
import './memo-editor-fields.css';
import EditorFieldsLayout from './editor-fields-layout';

/** Creation, editing and reading compose the same field order and visual frame. */
export default function MemoFieldsLayout({ title, body, settings, tags, pin, color, readOnly = false }: {
  title: ReactNode; body: ReactNode; settings?: ReactNode; tags?: ReactNode; pin?: ReactNode; color?: MemoColor; readOnly?: boolean;
}) {
  return <EditorFieldsLayout className={`memo-editor-fields${readOnly ? ' is-reading' : ''}`} style={color ? memoColorStyle(color) : undefined}>
    <EntityTitleRow className='memo-title-row'>{title}</EntityTitleRow>
    {body}
    {pin != null && <MemoPinRow>{pin}</MemoPinRow>}
    {settings != null && <View className='memo-editor-settings'>{settings}</View>}
    {tags}
  </EditorFieldsLayout>;
}

export function MemoPinRow({ children }: { children: ReactNode }) {
  return <View className='memo-pin-row'>{children}</View>;
}

/** Every memo surface reads the same saved color and existing dark-theme palette. */
export function memoColorStyle(color: MemoColor): CSSProperties {
  const { surface, value } = memoColors[color];
  const channels = [1, 3, 5].map(offset => parseInt(value.slice(offset, offset + 2), 16));
  return { '--memo-paper-background': surface, '--memo-paper-accent': value, '--memo-paper-border': `rgba(${channels.join(', ')}, .45)` } as CSSProperties;
}

export function MemoIconPreview({ iconId }: { iconId?: string }) {
  return <EntityIconPreview iconId={iconId} className='memo-icon-preview' />;
}

export function MemoColorChoices({ value, onChange, disabled, readOnly }: { value: MemoColor; onChange?: (value: MemoColor) => void; disabled?: boolean; readOnly?: boolean }) {
  return <ColorChoiceRow className='memo-palette' buttonClassName='memo-palette-button' options={(Object.keys(memoColors) as MemoColor[]).map(key => ({ key, label: memoColors[key].label, ariaLabel: `使用${memoColors[key].label}`, color: memoColors[key].value }))} value={value} onChange={onChange} disabled={disabled} readOnly={readOnly} />;
}
