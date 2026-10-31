import type { ReactNode } from 'react';
import { View } from '@tarojs/components';
import './card-group-content.css';

/** Retain the group inset even without a visible surface. Native ScrollView
 * cannot own padding, so place this View inside its scrolling viewport. */
export default function CardGroupContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`card-group-content ${className}`}>{children}</View>;
}
