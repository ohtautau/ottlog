import { Text, View } from '@tarojs/components';
import type { ComponentProps } from 'react';
import './back-button.css';
import ActionButton from './ui-button';

type Props = Omit<ComponentProps<typeof ActionButton>, 'children'>;

export default function BackButton({ appearance = 'secondary', className = '', ariaLabel = '返回', ...props }: Props) {
  return <ActionButton {...props} appearance={appearance} className={`back-button ${className}`} ariaLabel={ariaLabel}><View className='back-button-chevron' aria-hidden /><Text>返回</Text></ActionButton>;
}
