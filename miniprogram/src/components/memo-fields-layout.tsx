import type { CSSProperties, ReactNode } from 'react';
import { View } from '@tarojs/components';
import { EntityIconPreview } from './entity-title-field';
import './memo-editor-fields.css';
import { memoIconId } from '../lib/icon-library';
import DocumentFieldsLayout from './document-fields-layout';

/** Creation, editing and reading compose the same field order and visual frame. */
export default function MemoFieldsLayout({ title, body, settings, tags, pin, readOnly = false }: {
  title: ReactNode; body: ReactNode; settings?: ReactNode; tags?: ReactNode; pin?: ReactNode; readOnly?: boolean;
}) {
  return <DocumentFieldsLayout {...{ title, body, settings, tags, pin, readOnly }} style={memoSurfaceStyle()} />;
}

export function MemoPinRow({ children }: { children: ReactNode }) {
  return <View className='memo-pin-row'>{children}</View>;
}

/** All notes share an opaque neutral surface; legacy color fields remain data only. */
export function memoSurfaceStyle(): CSSProperties {
  return { '--memo-paper-background': '#20333e', '--memo-paper-accent': '#b9dbca', '--memo-paper-border': '#3b505a' } as CSSProperties;
}

export function MemoIconPreview({ iconId }: { iconId?: string }) {
  return <EntityIconPreview iconId={memoIconId(iconId)} className='memo-icon-preview' />;
}
