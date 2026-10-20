import type { ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { ChoicePopover, PopoverHeading, PopoverActions } from './form-options';
import ActionButton, { ChoiceButton } from './ui-button';
import SortSymbol from './sort-symbol';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import './sort-options.css';

/** Sorting windows share their chrome, spacing and control sizes. State stays with the page. */
export function SortPopover({ ariaLabel, open, onOpenChange, selected, disabled, saving = false, hasChanges = false, confirmDisabled = false, confirmLabel = '排序', onConfirm, panelClassName = '', triggerClassName = '', contentKey = '', children, iconOnly = true }: {
  ariaLabel: string; open: boolean; onOpenChange: (open: boolean) => void; selected?: boolean; disabled?: boolean;
  saving?: boolean; hasChanges?: boolean; confirmDisabled?: boolean; confirmLabel?: string; onConfirm: () => boolean | void | Promise<boolean | void>;
  panelClassName?: string; triggerClassName?: string; contentKey?: string; children: ReactNode; iconOnly?: boolean;
}) {
  const closeGuard = useEditorCloseGuard({ scope: open ? ariaLabel : '', hasChanges, blocked: saving, onSave: onConfirm, onClose: () => onOpenChange(false) });
  return <><ChoicePopover ariaLabel={ariaLabel} open={open} onOpenChange={next => { if (next) onOpenChange(true); else closeGuard.requestClose(); }} disabled={disabled}
    triggerIconOnly={iconOnly} triggerSize='compact' showIndicator={!iconOnly} triggerSelected={selected ?? open}
    trigger={iconOnly ? <SortSymbol /> : <Text>排序</Text>} triggerClassName={triggerClassName}
    panelClassName={`sort-popover ${panelClassName}`} panelWidth={320} bodySpacing='tight' maxHeightRatio={.8} contentKey={contentKey}
    heading={<PopoverHeading className='sort-panel-heading' title='排序' actions={<ActionButton appearance='icon' size='compact' ariaLabel={`关闭${ariaLabel.replace(/^排序(.+)$/, '$1排序')}`} disabled={saving} onClick={closeGuard.requestClose}>×</ActionButton>} />}
    footer={<PopoverActions layout='fill' className='sort-panel-footer'><ActionButton appearance='primary' size='compact' width='fill' disabled={saving || confirmDisabled} loading={saving} onClick={() => { void onConfirm(); }}>{confirmLabel}</ActionButton></PopoverActions>}>
    <View className='sort-panel-content'>{children}</View>
  </ChoicePopover>{closeGuard.dialog}</>;
}

export function SortOptions<T extends string | number>({ options, value, onChange, disabled = false, className = '' }: {
  options: readonly { value: T; label: string; ariaLabel?: string }[]; value: T; onChange: (value: T) => void; disabled?: boolean; className?: string;
}) {
  return <View className={`sort-options ${className}`}>{options.map(option => <ChoiceButton key={option.value} className='form-option sort-option' size='compact' width='fill' selected={value === option.value} ariaLabel={option.ariaLabel || option.label} disabled={disabled} onClick={() => onChange(option.value)}><Text className='sort-option-label'>{option.label}</Text></ChoiceButton>)}</View>;
}

export function SortDirection({ value, onChange, disabled = false }: { value: 'asc' | 'desc'; onChange: (value: 'asc' | 'desc') => void; disabled?: boolean }) {
  return <View className='sort-direction'>{(['desc', 'asc'] as const).map(direction => <ChoiceButton className='form-option sort-option' size='compact' width='fill' key={direction} selected={value === direction} disabled={disabled} onClick={() => onChange(direction)}><Text className='sort-option-label'>{direction === 'asc' ? '升序' : '降序'}</Text></ChoiceButton>)}</View>;
}
