import { View } from '@tarojs/components';
import type { ReactNode } from 'react';
import { MoveSymbol } from './sort-symbol';
import ActionButton from './ui-button';
import './card-corner-actions.css';

/** Shared placement for card actions; callers own the card and its persistence. */
export default function CardCornerActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`card-corner-actions ${className}`}>{children}</View>;
}

/** Adjacent movement uses the same geometry in every card collection. */
export function CardMoveActions({ objectLabel, onMoveUp, onMoveDown, disabled = false, upDisabled = false, downDisabled = false, className = '' }: {
  objectLabel: string; onMoveUp: () => void; onMoveDown: () => void;
  disabled?: boolean; upDisabled?: boolean; downDisabled?: boolean; className?: string;
}) {
  return <CardCornerActions className={className}>
    <ActionButton appearance='icon' size='compact' width='content' ariaLabel={`上移${objectLabel}`} disabled={disabled || upDisabled} onClick={event => { event.stopPropagation(); onMoveUp(); }}><MoveSymbol direction='up' /></ActionButton>
    <ActionButton appearance='icon' size='compact' width='content' ariaLabel={`下移${objectLabel}`} disabled={disabled || downDisabled} onClick={event => { event.stopPropagation(); onMoveDown(); }}><MoveSymbol direction='down' /></ActionButton>
  </CardCornerActions>;
}
