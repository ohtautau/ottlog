import type { ReactNode } from 'react';
import { View } from '@tarojs/components';
import './habit-grid.css';

/** Shared two-column layout; hosts retain scrolling, paging and vertical spacing. */
export default function HabitGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`habit-card-grid ${className}`}>{children}</View>;
}
