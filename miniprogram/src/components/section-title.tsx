import { Text } from '@tarojs/components';
import type { ReactNode } from 'react';
import ActionButton from './ui-button';
import { SelectChevron } from './select-trigger';
import './section-title.css';

/** Shared typography for content groups; the surrounding row owns its layout. */
export default function SectionTitle({ children, className = '', size = 'standard', inRow = false, expanded = true, onToggle, disabled, ariaLabel }: { children: ReactNode; className?: string; size?: 'standard' | 'compact'; inRow?: boolean; expanded?: boolean; onToggle?: () => void; disabled?: boolean; ariaLabel?: string }) {
  const title = <Text className={`section-title${size === 'compact' ? ' section-title-compact' : ''} ${className}`} style={{
    fontSize: size === 'compact' ? 'var(--section-title-compact-font-size)' : 'var(--section-title-font-size)', fontWeight: 600,
    lineHeight: 'var(--section-title-line-height)', color: 'var(--section-title-color)',
    letterSpacing: 0, fontStyle: 'normal', textTransform: 'none',
    textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere',
    marginBottom: inRow || onToggle ? 0 : 'var(--section-title-content-gap)',
  }}>{children}</Text>;
  return onToggle ? <ActionButton appearance='quiet' size='compact' width='fill' className='section-title-disclosure' disabled={disabled} ariaLabel={ariaLabel} aria-expanded={expanded} onTouchStart={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onToggle(); }}>{title}<SelectChevron expanded={expanded} /></ActionButton> : title;
}
