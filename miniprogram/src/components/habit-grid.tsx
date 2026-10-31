import type { ReactNode } from 'react';
import { View } from '@tarojs/components';
import CardGroupContent from './card-group-content';
import './habit-grid.css';

/** Shared two-column layout; hosts retain scrolling, paging and vertical spacing. */
export default function HabitGrid({ children, className = '', inset = false }: { children: ReactNode; className?: string; inset?: boolean }) {
  if (inset) return <CardGroupContent className={`habit-card-grid ${className}`}>{children}</CardGroupContent>;
  return <View className={`habit-card-grid ${className}`}>{children}</View>;
}
