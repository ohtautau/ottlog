import { View, Text } from '@tarojs/components';
import type { CSSProperties } from 'react';
import ActionButton from './ui-button';
import PriorityFlag from './priority-flag';
import './priority-options.css';

export const PRIORITY_POPOVER_WIDTH = 136;
const priorityOptionLabels: Record<string, string> = { 高: '高优先度', 中: '中优先度', 低: '低优先度', 无: '无优先度' };

export type PriorityOption<T extends string> = { value: T; label: string; ariaLabel: string; color: string; outlined?: boolean };

export default function PriorityOptions<T extends string>({ options, value, disabled = false, className = '', choiceClassName = '', ariaLabel = '优先度', onChange }: {
  options: readonly PriorityOption<T>[]; value: T; disabled?: boolean; className?: string; choiceClassName?: string; ariaLabel?: string; onChange: (value: T) => void;
}) {
  return <View className={`priority-options ${className}`} role='group' ariaLabel={ariaLabel}>
    {options.map(option => <ActionButton key={option.value} appearance='quiet' style={{ '--control-text': value === option.value ? 'var(--control-selected-text)' : 'var(--priority-option-text)' } as CSSProperties} className={`priority-option ${choiceClassName}${value === option.value ? ' is-active' : ''}`} ariaLabel={option.ariaLabel} aria-pressed={value === option.value} disabled={disabled} onClick={() => onChange(option.value)}><PriorityFlag className='priority-option-mark' color={option.color} outlined={option.outlined} /><Text className='priority-option-label'>{priorityOptionLabels[option.label] ?? option.label}</Text></ActionButton>)}
  </View>;
}
