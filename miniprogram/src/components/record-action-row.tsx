import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import { TaskAttachmentSymbol } from './task-detail-editor';
import { recordEffortScore } from '../lib/record-content';
import './record-action-row.css';
export default function RecordActionRow({ record, disabled, attachmentDisabled, onAttach, onAdjust }: {
  record: { effortScore?: number }; disabled: boolean; attachmentDisabled?: boolean; onAttach: () => void; onAdjust: (delta: -1 | 1) => void;
}) {
  const keepFocus = { onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault() };
  const score = recordEffortScore(record);
  return <View className='record-action-row'>
    <ActionButton appearance='icon' size='compact' ariaLabel='该条记录附件' disabled={disabled || attachmentDisabled} onClick={onAttach}><TaskAttachmentSymbol /></ActionButton>
    <View className='record-effort-controls'>
      <ActionButton {...keepFocus} appearance='icon' size='compact' ariaLabel='减少投入分数' disabled={disabled || score === 0} onClick={() => onAdjust(-1)}>−</ActionButton>
      <Text className='record-effort-value' aria-label={`投入分数 ${score}`}>{score}</Text>
      <ActionButton {...keepFocus} appearance='icon' size='compact' ariaLabel='增加投入分数' disabled={disabled || score === Number.MAX_SAFE_INTEGER} onClick={() => onAdjust(1)}>+</ActionButton>
    </View>
  </View>;
}
