import { useEffect, useState, type ComponentProps } from 'react';
import { Textarea, View } from '@tarojs/components';
import './tag-text-input.css';

/** Padding belongs to the touch frame; native tag text can grow and wrap. */
export default function TagTextInput({ focus = false, onBlur, ...props }: ComponentProps<typeof Textarea>) {
  const [focused, setFocused] = useState(focus);
  useEffect(() => { setFocused(focus); }, [focus]);
  return <View className='form-tag-input-frame' onClick={() => { if (!props.disabled) setFocused(true); }}>
    <Textarea {...props} className='form-tag-input' autoHeight fixed disableDefaultPadding showConfirmBar={false} confirmType='done'
      focus={focused} onBlur={event => { setFocused(false); onBlur?.(event); }} />
  </View>;
}
