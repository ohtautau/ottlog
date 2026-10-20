import type { ReactNode } from 'react';
import { View } from '@tarojs/components';
import './swipe-panels.css';

/** Adjacent content follows the finger; gesture ownership stays with the caller. */
export default function SwipePanels({ offset = 0, direction = 'next', adjacent, children }: {
  offset?: number; direction?: 'next' | 'previous'; adjacent?: ReactNode; children: ReactNode;
}) {
  return <View className='swipe-panels'>
    <View className='swipe-panel-current' style={offset ? { transform: `translateX(${offset}px)` } : undefined}>{children}</View>
    {adjacent && <View className='swipe-panel-adjacent' aria-hidden style={{ transform: `translateX(calc(${direction === 'next' ? '100%' : '-100%'} + ${offset}px))` }}>{adjacent}</View>}
  </View>;
}
