import ActionButton from './ui-button';
import { PopoverActions } from './form-options';
import { ResetSymbol } from './manage-symbol';
import './filter-actions.css';

/** Filter windows share stable reset/apply controls; callers own the conditions. */
export default function FilterActions({ onReset, onApply, resetLabel, applyLabel, disabled = false, className = '', resetClassName = '' }: {
  onReset: () => void; onApply: () => void; resetLabel: string; applyLabel: string; disabled?: boolean; className?: string; resetClassName?: string;
}) {
  return <PopoverActions className={`filter-actions ${className}`}>
    <ActionButton appearance='icon' size='compact' className={`filter-actions-reset ${resetClassName}`} ariaLabel={resetLabel} disabled={disabled} onClick={onReset}><ResetSymbol /></ActionButton>
    <ActionButton appearance='primary' size='compact' width='fill' className='filter-actions-apply tool-primary' disabled={disabled} onClick={onApply}>{applyLabel}</ActionButton>
  </PopoverActions>;
}
