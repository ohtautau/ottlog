import type { CSSProperties, ReactNode } from 'react';
import { View } from '@tarojs/components';
import EntityTitleRow from './entity-title-field';
import EditorFieldsLayout from './editor-fields-layout';
import './memo-editor-fields.css';

/** Shared title, Markdown body, settings and tags for notes and articles. */
export default function DocumentFieldsLayout({ title, body, settings, tags, pin, readOnly, style }: {
  title: ReactNode; body: ReactNode; settings?: ReactNode; tags?: ReactNode; pin?: ReactNode; readOnly?: boolean; style?: CSSProperties;
}) {
  return <EditorFieldsLayout className={`document-editor-fields memo-editor-fields${readOnly ? ' is-reading' : ''}`} style={style}>
    <EntityTitleRow className='memo-title-row'>{title}</EntityTitleRow>{body}
    {pin != null && <View className='memo-pin-row'>{pin}</View>}
    {settings != null && <View className='memo-editor-settings'>{settings}</View>}{tags}
  </EditorFieldsLayout>;
}
