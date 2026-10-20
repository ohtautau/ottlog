import type { ComponentProps } from 'react';
import { View } from '@tarojs/components';
import './editor-fields-layout.css';

/** One owner for field spacing in creation, editing and read-only snapshots. */
export default function EditorFieldsLayout({ className = '', topSpace = true, ...props }: ComponentProps<typeof View> & {
  topSpace?: boolean;
}) {
  return <View {...props} className={`editor-fields-layout${topSpace ? ' has-top-space' : ''} ${className}`} />;
}
