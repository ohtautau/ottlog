import type { ComponentProps, ReactNode } from 'react';
import { useRouter } from '@tarojs/taro';
import { View } from '@tarojs/components';
import { nativeTabBarItems } from '../lib/native-tab-bar';
import ActionButton from './ui-button';
import { DeleteSymbol } from './manage-symbol';
import './sheet-actions.css';

/** One bottom gap; tabBar and floating panels already own their safe-area boundary. */
export default function SheetActions({ children, leading, className = '' }: { children: ReactNode; leading?: ReactNode; className?: string }) {
  const route = useRouter().path.replace(/^\//, '').split('?')[0];
  const hasNativeTabBar = nativeTabBarItems.some(item => item.pagePath === route);
  return <View className={`sheet-actions${hasNativeTabBar ? ' has-native-tab-bar' : ''}${leading != null ? ' has-leading-action' : ''} ${className}`}>{leading}{children}</View>;
}

/** An editor's existing delete operation, composed into SheetActions.leading. */
export function SheetDeleteButton({ className = '', ...props }: Omit<ComponentProps<typeof ActionButton>, 'children' | 'appearance' | 'intent' | 'size' | 'width'> & { ariaLabel: string }) {
  return <ActionButton {...props} appearance='icon' intent='danger' size='compact' className={`sheet-delete-button ${className}`}><DeleteSymbol /></ActionButton>;
}
