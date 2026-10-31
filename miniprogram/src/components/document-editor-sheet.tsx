import type { ReactNode } from 'react';
import { ScrollView, View } from '@tarojs/components';
import EditorHeading from './editor-heading';
import ActionButton from './ui-button';
import './document-editor-sheet.css';

/** Notes and articles share the same frame, scrolling body and fixed actions. */
export default function DocumentEditorSheet({ title, closeLabel, onClose, busy, children, footer }: { title: string; closeLabel?: string; onClose: () => void; busy?: boolean; children: ReactNode; footer: ReactNode }) {
  return <View className='memo-overlay document-editor-overlay'><View className='memo-backdrop' onClick={onClose} /><View className='memo-sheet document-editor-sheet' role='dialog' ariaLabel={title}>
    <EditorHeading className='memo-sheet-heading' titleClassName='memo-sheet-title' title={title} actions={<ActionButton appearance='icon' ariaLabel={closeLabel || `关闭${title}`} disabled={busy} onClick={onClose}>×</ActionButton>} />
    <ScrollView scrollY className='memo-sheet-scroll' enhanced bounces={false} showScrollbar={false}><View className='memo-sheet-fields'>{children}</View></ScrollView>{footer}
  </View></View>;
}
