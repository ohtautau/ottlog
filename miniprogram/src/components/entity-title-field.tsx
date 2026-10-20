import type { ComponentProps, ReactNode } from 'react';
import { Image, Input, Text, View } from '@tarojs/components';
import LibraryIcon from './library-icon';
import { getLibraryIcon } from '../lib/icon-library';
import { trimTextEnd } from '../lib/text-whitespace';
import './entity-title-field.css';

/** Entity names share an underline; hosts compose their icon and trailing controls. */
export default function EntityTitleRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`entity-title-row ${className}`}>{children}</View>;
}

export function EntityTitleInput({ className = '', ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={`entity-title-input ${className}`} />;
}

export function EntityTitleText({ className = '', children, ...props }: ComponentProps<typeof Text>) {
  return <Text {...props} className={`entity-title-text ${className}`}>{typeof children === 'string' ? trimTextEnd(children) : children}</Text>;
}

/** Read-only and editable entity rows share the same icon frame. */
export function EntityIconPreview({ iconId, backgroundImage, className = '', iconClassName = '' }: { iconId?: string; backgroundImage?: string; className?: string; iconClassName?: string }) {
  return <View className={`entity-icon-preview ${className}`}>
    {backgroundImage && <Image className='entity-icon-photo' src={backgroundImage} mode='aspectFill' />}
    {getLibraryIcon(iconId) ? <LibraryIcon name={iconId} className={iconClassName} /> : <View className='entity-icon-placeholder' aria-hidden><View /><View /></View>}
  </View>;
}
