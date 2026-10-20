import { ChoicePopover } from './form-options';
import PriorityFlag from './priority-flag';
import PriorityOptions, { PRIORITY_POPOVER_WIDTH, type PriorityOption } from './priority-options';
import './priority-select.css';

/** Titles share this icon-only trigger; labels belong to the opened options. */
export default function PrioritySelect<T extends string>({ options, value, onChange, open, onOpenChange, ariaLabel, anchorId, triggerId, renderLayer = true, layerClassName = '', disabled = false, className = '', triggerClassName = '', panelClassName = '', optionsClassName = '', choiceClassName = '', optionsAriaLabel = '优先度' }: {
  options: readonly PriorityOption<T>[]; value: T; onChange: (value: T) => void;
  open: boolean; onOpenChange: (open: boolean) => void; ariaLabel: string; disabled?: boolean;
  className?: string; triggerClassName?: string; panelClassName?: string; optionsClassName?: string; choiceClassName?: string; optionsAriaLabel?: string;
  anchorId?: string; triggerId?: string; renderLayer?: boolean; layerClassName?: string;
}) {
  const selected = options.find(option => option.value === value) || options[options.length - 1];
  return <ChoicePopover ariaLabel={ariaLabel} className={`priority-select ${className}`} open={open} onOpenChange={onOpenChange}
    anchorId={anchorId} triggerId={triggerId} renderLayer={renderLayer} layerClassName={layerClassName}
    disabled={disabled} triggerClassName={`priority-select-trigger ${triggerClassName}`} triggerIconOnly triggerSize='compact'
    showIndicator={false} panelWidth={PRIORITY_POPOVER_WIDTH} panelClassName={`priority-popover-panel ${panelClassName}`}
    trigger={selected ? <PriorityFlag className='priority-select-flag' color={selected.color} outlined={selected.outlined} /> : null}>
    <PriorityOptions options={options} value={value} disabled={disabled} className={optionsClassName} choiceClassName={choiceClassName} ariaLabel={optionsAriaLabel}
      onChange={next => { onChange(next); onOpenChange(false); }} />
  </ChoicePopover>;
}
