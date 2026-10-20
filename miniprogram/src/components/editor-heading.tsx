import type { ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { trimTextEnd } from '../lib/text-whitespace';
import './editor-heading.css';

/** Editors and prompts share title composition, with explicit typography variants. */
export default function EditorHeading({ title, titleContent, actions, caption, description, className = '', titleClassName = '', embedded = false, variant = 'editor' }: {
  title: ReactNode; titleContent?: ReactNode; actions?: ReactNode; caption?: ReactNode; description?: ReactNode; className?: string; titleClassName?: string; embedded?: boolean; variant?: 'editor' | 'prompt';
}) {
  return <View className={`editor-heading${embedded ? ' is-embedded' : ''}${variant === 'prompt' ? ' is-prompt' : ''} ${className}`}>
    <View className='editor-heading-copy'>{caption != null && <View className='editor-heading-caption'>{caption}</View>}{titleContent ?? <Text className={`editor-heading-title ${titleClassName}`}>{typeof title === 'string' ? trimTextEnd(title) : title}</Text>}{description != null && <View className='editor-heading-description'>{description}</View>}</View>
    {actions != null && <View className='editor-heading-actions'>{actions}</View>}
  </View>;
}
