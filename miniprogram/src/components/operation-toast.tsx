import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { currentAppMessage, subscribeAppMessages, retainAppOperation } from '../lib/app-dialog';
import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import { ResetSymbol } from './manage-symbol';
import './operation-toast.css';
import useKeyboardDock from '../lib/use-keyboard-dock';

/** Shared, actionable feedback for a completed operation. The caller owns expiry. */
export default function OperationToast({message, onUndo, busy = false, kind = 'info', notification = false}: {message: string; onUndo?: () => void; busy?: boolean; kind?: 'info' | 'error'; notification?: boolean}) {
  const keyboardInset = useKeyboardDock();
  const [, refresh] = useState(0);
  useEffect(() => subscribeAppMessages(() => refresh(value => value + 1)), []);
  useLayoutEffect(() => notification ? undefined : retainAppOperation(), [notification]);
  const notice = !notification ? currentAppMessage() : null;
  return <View style={keyboardInset ? { '--operation-toast-keyboard': `${keyboardInset}px` } as CSSProperties : undefined} className={`operation-toast${notification ? ' operation-toast-notification' : ''}${onUndo ? ' operation-toast-undo' : ''}`} role={(notice?.options.kind || kind) === 'error' ? 'alert' : 'status'} aria-live={(notice?.options.kind || kind) === 'error' ? 'assertive' : 'polite'}><Text className='operation-toast-message'>{notice ? `${notice.options.title} · ${message}` : message}</Text>{onUndo && <ActionButton appearance='icon' size='compact' ariaLabel='撤销最近一次操作' disabled={busy} loading={busy} onClick={onUndo}><ResetSymbol /></ActionButton>}</View>;
}
