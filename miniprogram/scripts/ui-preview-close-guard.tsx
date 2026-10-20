import { useEffect, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import PageScroll from '../src/components/page-scroll';
import ActionButton from '../src/components/ui-button';
import useEditorCloseGuard from '../src/lib/use-editor-close-guard';

/** Isolated delayed-save fixture verifies a returned scope cannot revive an old close. */
export default function CloseGuardFixture() {
  const [scope, setScope] = useState('account-a:item'), [visible, setVisible] = useState(true);
  const pending = useRef<((success: boolean) => void) | null>(null);
  const guard = useEditorCloseGuard({ scope: visible ? scope : '', hasChanges: true, onSave: () => new Promise<boolean>(resolve => { pending.current = resolve; }), onClose: () => setVisible(false) });
  useEffect(() => {
    (window as any).__miniCloseGuardControl = { setScope, resolve: () => pending.current?.(true) };
    return () => { delete (window as any).__miniCloseGuardControl; };
  }, []);
  return <PageScroll>{visible && <View role='dialog' ariaLabel={`延迟保存窗口：${scope}`}><Text>{scope}</Text><ActionButton onClick={guard.requestClose}>关闭测试编辑</ActionButton></View>}{guard.dialog}</PageScroll>;
}
