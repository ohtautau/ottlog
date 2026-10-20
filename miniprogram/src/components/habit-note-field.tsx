import type { ComponentProps } from 'react';
import { Text, Textarea, View } from '@tarojs/components';
import { trimTextEnd } from '../lib/text-whitespace';
import './habit-note-field.css';

/** The habit's reminder frame, editable in the form and complete in the detail. */
export default function HabitNoteField({ readOnly = false, className = '', value, ...props }: Omit<ComponentProps<typeof Textarea>, 'value' | 'className'> & {
  value: string; readOnly?: boolean; className?: string;
}) {
  const fieldClass = `tool-input habit-note-field ${className}`;
  return readOnly
    ? <View className={`${fieldClass} is-readonly`} ariaLabel={props.ariaLabel}><Text>{trimTextEnd(value)}</Text></View>
    : <Textarea {...props} className={fieldClass} value={value} />;
}
