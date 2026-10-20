import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { ChoicePopover, PopoverHeading } from './form-options';
import ActionButton from './ui-button';
import FilterActions from './filter-actions';
import FilterSymbol from './filter-symbol';
import SingleLineInput from './single-line-input';
import SectionTitle from './section-title';
import './filter-popover.css';

type FilterPopoverProps = Pick<ComponentProps<typeof ChoicePopover>,
  'ariaLabel' | 'open' | 'onOpenChange' | 'disabled' | 'triggerClassName' | 'triggerSelected' | 'panelClassName' | 'contentKey'> & {
  title: string; closeLabel: string; onClose: () => void;
  resetLabel: string; applyLabel: string; onReset: () => void; onApply?: () => void;
  headingClassName?: string; actionsClassName?: string; resetClassName?: string; children: ReactNode;
};

/** Shared filter chrome; the caller owns every condition and reset operation. */
export default function FilterPopover({ title, closeLabel, onClose, resetLabel, applyLabel, onReset, onApply = onClose,
  headingClassName = '', actionsClassName = '', resetClassName = '', panelClassName = '', children, ...props }: FilterPopoverProps) {
  return <ChoicePopover {...props} triggerIconOnly triggerSize='compact' showIndicator={false} trigger={<FilterSymbol />}
    panelClassName={`filter-popover ${panelClassName}`} bodySpacing='none'
    heading={<PopoverHeading className={headingClassName} title={title} actions={<ActionButton appearance='icon' size='compact' ariaLabel={closeLabel} onClick={onClose}>×</ActionButton>} />}
    footer={<FilterActions className={actionsClassName} resetClassName={resetClassName} resetLabel={resetLabel} applyLabel={applyLabel} onReset={onReset} onApply={onApply} />}>
    {children}
  </ChoicePopover>;
}

export function FilterFields({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`filter-fields ${className}`}>{children}</View>;
}

export function FilterFieldHeading({ label, caption, inRow = false }: { label: string; caption?: string; inRow?: boolean }) {
  return <View className={`filter-field-label-row${inRow ? ' is-inline' : ''}`}><SectionTitle inRow className='filter-field-label'>{label}</SectionTitle>{caption && <Text className='filter-field-caption'>{caption}</Text>}</View>;
}

export function FilterField({ label, caption, children, className = '' }: { label: string; caption?: string; children: ReactNode; className?: string }) {
  return <View className={`filter-field ${className}`}><FilterFieldHeading label={label} caption={caption} />{children}</View>;
}

export function FilterOptionGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`filter-option-grid ${className}`}>{children}</View>;
}

export function FilterSearch({ clearLabel, onClear, value = '', className = '', ...props }: Omit<ComponentProps<typeof SingleLineInput>, 'frameClassName' | 'trailing' | 'size' | 'align'> & {
  clearLabel: string; onClear: () => void;
}) {
  return <SingleLineInput {...props} value={value} align='left' size='regular' confirmType='search' cursorSpacing={100} adjustPosition frameClassName={`filter-search ${className}`}
    trailing={!!value && <ActionButton appearance='icon' size='compact' className='filter-search-clear' ariaLabel={clearLabel} disabled={props.disabled} onClick={event => { event.stopPropagation(); onClear(); }}>×</ActionButton>} />;
}
