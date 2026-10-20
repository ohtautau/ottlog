import type { ComponentProps } from 'react';
import { Input } from '@tarojs/components';
import SingleLineInput from './single-line-input';

/** Keep the native text line centered independently of the field's touch target. */
export default function ScheduleNumberInput({ className = '', focus = false, onBlur, ...props }: ComponentProps<typeof Input>) {
  return <SingleLineInput {...props} size='compact' focus={focus} onBlur={onBlur} frameClassName='schedule-number-field' className={`schedule-number-input ${className}`} />;
}
