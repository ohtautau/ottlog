import type { ComponentProps } from 'react';
import { View } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { nativeTabBarItems } from '../lib/native-tab-bar';
import { isWebTool } from '../lib/tool-platform';
import CreateButton from './create-button';
import './floating-create-button.css';

type Props = Omit<ComponentProps<typeof CreateButton>, 'appearance' | 'size' | 'width' | 'iconOnly' | 'showAddSymbol' | 'trailing'> & { raised?: boolean };

/** Page-level creation only. Mount outside scrolling content and below editors. */
export default function FloatingCreateButton({ className = '', raised = false, ...props }: Props) {
  const path = useRouter().path.replace(/^\//, '').split('?')[0];
  const tabPage = !isWebTool && nativeTabBarItems.some(item => item.pagePath === path);
  return <View className={`floating-create-action${tabPage ? ' has-native-tab-bar' : ''}${raised ? ' is-raised' : ''}`}>
    <CreateButton {...props} iconOnly appearance='primary' size='compact' className={`floating-create-button ${className}`} />
  </View>;
}
