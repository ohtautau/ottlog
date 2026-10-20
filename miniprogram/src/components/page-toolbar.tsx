import { trimTextEnd } from '../lib/text-whitespace';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import ActionButton, { ChoiceButton } from './ui-button';
import { ResetSymbol } from './manage-symbol';
import './page-toolbar.css';

/** Slots preserve the same visual and reading order while pages provide existing actions. */
export default function PageToolbar({ reset, sort, filter, manage, create, leading, className = '' }: {
  reset?: ReactNode; sort?: ReactNode; filter?: ReactNode; manage?: ReactNode; create?: ReactNode; leading?: ReactNode; className?: string;
}) {
  const actions = [['reset', reset], ['sort', sort], ['filter', filter], ['manage', manage], ['create', create]] as const;
  if (!leading && !actions.some(([, action]) => !!action)) return null;
  return <View className={`page-toolbar ${className}`} role='group' ariaLabel='页面功能栏'>
    {!!leading && <View className='page-toolbar-leading'>{leading}</View>}
    <View className='page-toolbar-actions'>{actions.map(([kind, action]) => action ? <View key={kind} className={`page-toolbar-slot page-toolbar-${kind}`}>{action}</View> : null)}</View>
  </View>;
}

/** Restore the caller's defaults without duplicating symbol or control styling. */
export function ToolbarResetButton({ ariaLabel, onReset, disabled = false }: { ariaLabel: string; onReset: () => void; disabled?: boolean }) {
  return <ActionButton appearance='icon' size='compact' className='page-toolbar-reset-button' ariaLabel={ariaLabel} disabled={disabled} onClick={onReset}><ResetSymbol /></ActionButton>;
}

/** Read-only completion feedback shares the toolbar's left slot. */
export function PageToolbarSummary({ countLabel, recentTitle, recentLabel = '最近完成' }: {
  countLabel: string; recentTitle?: string; recentLabel?: string;
}) {
  return <View className='page-toolbar-summary'><Text className='page-toolbar-summary-count'>{countLabel}</Text>{recentTitle && <Text className='page-toolbar-summary-recent' aria-label={`${recentLabel}：${recentTitle}`}>{trimTextEnd(recentTitle)}</Text>}</View>;
}

let nextCategoryRowId = 0;
type CategoryRect = { id: string; left: number; right: number; width: number };

/** Categories stay on their own horizontally scrolling line, away from action buttons. */
export function CategoryRow({ children, fixedLeading, ariaLabel = '分类', className = '', contentClassName = '', size = 'standard', scrollIntoView, selectionOffset, contentKey = '', scrollWithAnimation, enhanced, bounces }: {
  children: ReactNode; ariaLabel?: string; className?: string; contentClassName?: string; scrollIntoView?: string; scrollWithAnimation?: boolean; enhanced?: boolean; bounces?: boolean;
  /** A leading category remains outside the horizontally scrolling options. */
  fixedLeading?: ReactNode;
  size?: 'standard' | 'compact';
  /** Number of preceding category slots to keep visible when selecting. */
  selectionOffset?: number; contentKey?: string;
}) {
  const [id] = useState(() => `category-row-${++nextCategoryRowId}`);
  const [scrollLeft, setScrollLeft] = useState<number>();
  const hasFixedLeading = !!fixedLeading;
  useEffect(() => {
    if (selectionOffset === undefined || !scrollIntoView) return;
    let active = true, revision = 0;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const currentRevision = ++revision;
      const query = Taro.createSelectorQuery();
      query.select(`#${id}`).boundingClientRect();
      query.select(`#${id}`).scrollOffset();
      query.selectAll(`#${id} .ui-category`).boundingClientRect();
      query.select(`#${id} .page-category-row`).boundingClientRect();
      query.selectAll(`#${id}-fixed .ui-category`).boundingClientRect();
      query.exec(results => {
        if (!active || currentRevision !== revision) return;
        const [viewport, offset, buttons, row, fixedButtons] = results as [CategoryRect | null, { scrollLeft: number } | null, CategoryRect[], CategoryRect | null, CategoryRect[]];
        if (!viewport?.width || !offset || !row || !buttons?.length) return;
        const index = buttons.findIndex(button => button.id === scrollIntoView);
        let position = 0;
        if (index < 0) {
          if (!fixedButtons?.some(button => button.id === scrollIntoView)) return;
        } else {
          const selected = buttons[index];
          const reference = Math.max(0, index - Math.max(0, selectionOffset));
          const before = Math.floor(reference), fraction = reference - before;
          const start = buttons[before].left + fraction * ((buttons[before + 1]?.left ?? buttons[before].left) - buttons[before].left);
          // Long labels get less leading context so their full text stays reachable.
          const target = Math.max(offset.scrollLeft + start - viewport.left, offset.scrollLeft + selected.right - viewport.right);
          position = Math.max(0, Math.min(target, row.width - viewport.width));
        }
        // Re-arm the native property after a manual swipe, even for a repeated target.
        setScrollLeft(offset.scrollLeft);
        if (moveTimer) clearTimeout(moveTimer);
        moveTimer = setTimeout(() => { if (active && currentRevision === revision) setScrollLeft(position); }, 30);
      });
    };
    const timer = setTimeout(measure, 0);
    Taro.onWindowResize?.(measure);
    return () => { active = false; clearTimeout(timer); if (moveTimer) clearTimeout(moveTimer); Taro.offWindowResize?.(measure); };
  }, [id, hasFixedLeading, scrollIntoView, selectionOffset, contentKey]);
  const scroll = <ScrollView id={id} scrollX showScrollbar={false} className={`page-category-scroll${hasFixedLeading ? '' : ` page-category-bar ${className}`}`} ariaLabel={hasFixedLeading ? undefined : ariaLabel} scrollIntoView={selectionOffset === undefined ? scrollIntoView : undefined} scrollLeft={selectionOffset === undefined ? undefined : scrollLeft} scrollWithAnimation={scrollWithAnimation} enhanced={enhanced} bounces={bounces}>
    <View className={`page-category-row${size === 'compact' ? ' is-compact' : ''} ${contentClassName}`}>{children}</View>
  </ScrollView>;
  return hasFixedLeading ? <View className={`page-category-bar page-category-fixed-row${size === 'compact' ? ' is-compact' : ''} ${className}`} role='group' ariaLabel={ariaLabel}>
    <View id={`${id}-fixed`} className='page-category-fixed'>{fixedLeading}</View>{scroll}
  </View> : scroll;
}

/** The original habit category appearance, with shared typography and touch feedback. */
export function CategoryButton(props: Omit<ComponentProps<typeof ChoiceButton>, 'variant' | 'iconOnly'>) {
  return <ChoiceButton {...props} variant='category' />;
}
