import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import { ResetSymbol } from './manage-symbol';
import './operation-toast.css';

/** Shared, actionable feedback for a completed operation. The caller owns expiry. */
export default function OperationToast({message, onUndo, busy = false}: {message: string; onUndo?: () => void; busy?: boolean}) {
  return <View className='operation-toast' role='status' aria-live='polite'><Text className='operation-toast-message'>{message}</Text>{onUndo && <ActionButton appearance='icon' size='compact' ariaLabel='撤销最近一次操作' disabled={busy} loading={busy} onClick={onUndo}><ResetSymbol /></ActionButton>}</View>;
}
