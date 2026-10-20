import { useEffect, useRef, useState, type ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import { SelectChevron } from './select-trigger';
import { tagLabel } from '../lib/tag-label';
import { trimTextEnd } from '../lib/text-whitespace';
import './form-options.css';
import ActionButton, { ChoiceButton, choiceControlStyle, type ButtonAppearance, type ButtonSize, type ButtonWidth } from './ui-button';
import SingleLineInput from './single-line-input';
import EditorHeading from './editor-heading';

let nextFieldId = 0;
const openPopoverIds: string[] = [];
type Choice<T extends string> = { value: T; label: string; ariaLabel?: string; icon?: ReactNode };
type Rect = { left: number; right: number; top: number; bottom: number; width: number; height: number };

/** Small option windows share chrome; callers compose their own controls and state. */
export function PopoverHeading({ title, actions, className = '' }: { title: ReactNode; actions?: ReactNode; className?: string }) {
  return <EditorHeading className={`popover-heading ${className}`} title={title} actions={actions} />;
}

export function PopoverActions({ children, className = '', layout = 'end', separator = false }: {
  children: ReactNode; className?: string; layout?: 'end' | 'fill'; separator?: boolean;
}) {
  return <View className={`popover-actions is-${layout}${separator ? ' has-separator' : ''} ${className}`}>{children}</View>;
}

/** Anchored app-owned options; opening and dismissing only changes editor UI. */
export function ChoicePopover({ ariaLabel, open, onOpenChange, trigger, anchorId, triggerId, renderLayer = true, layerClassName = '', disabled = false, className = '', triggerClassName = '', panelClassName = '', panelWidth = 440, heightMode = 'measured', bodySpacing = 'compact', showIndicator = true, triggerAppearance, triggerSize, triggerWidth, triggerIconOnly = false, triggerSelected, placement = 'anchor', preferredSide = 'auto', maxHeightRatio = .65, contentKey = '', heading, footer, children }: {
  ariaLabel: string; open: boolean; onOpenChange: (open: boolean) => void; trigger?: ReactNode; disabled?: boolean;
  /** Render only the layer, beside an editor's scroll area, using an existing trigger. */
  anchorId?: string;
  /** Pair a trigger inside a scroll area with an anchorId layer outside it. */
  triggerId?: string; renderLayer?: boolean; layerClassName?: string;
  className?: string; triggerClassName?: string; panelClassName?: string; panelWidth?: number; showIndicator?: boolean; triggerAppearance?: ButtonAppearance;
  triggerSize?: ButtonSize; triggerWidth?: ButtonWidth;
  triggerIconOnly?: boolean; triggerSelected?: boolean;
  /** Short settings can grow immediately when feedback appears beneath their actions. */
  heightMode?: 'measured' | 'content';
  /** Tight suits sorting; none lets composed filter fields own their padding. */
  bodySpacing?: 'compact' | 'tight' | 'none';
  placement?: 'anchor' | 'center';
  /** Prefer a side only when its available space contains the complete panel. */
  preferredSide?: 'auto' | 'above' | 'below';
  maxHeightRatio?: number; contentKey?: string; heading?: ReactNode; footer?: ReactNode; children: ReactNode;
}) {
  const [id] = useState(() => anchorId || triggerId || `form-choice-${++nextFieldId}`);
  const currentOpenChange = useRef(onOpenChange); currentOpenChange.current = onOpenChange;
  const [position, setPosition] = useState<{ left: number; top: number; bottom?: number; width: number; maxHeight: number; height: number } | null>(null);
  useEffect(() => {
    if (!open || disabled || !renderLayer) return;
    openPopoverIds.push(id);
    void Taro.hideKeyboard?.().catch(() => {});
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openPopoverIds[openPopoverIds.length - 1] === id) { event.stopImmediatePropagation(); event.preventDefault(); currentOpenChange.current(false); }
    };
    if (typeof document !== 'undefined') document.addEventListener('keydown', dismiss, true);
    return () => {
      const index = openPopoverIds.indexOf(id); if (index >= 0) openPopoverIds.splice(index, 1);
      if (typeof document !== 'undefined') document.removeEventListener('keydown', dismiss, true);
    };
  }, [open, disabled, renderLayer, id]);
  useEffect(() => {
    if (!open || disabled || !renderLayer) { setPosition(null); return; }
    let active = true;
    const measure = () => {
      const query = Taro.createSelectorQuery();
      query.select(`#${id}`).boundingClientRect();
      query.select(`#${id}-layer`).boundingClientRect();
      query.select(`#${id}-panel`).boundingClientRect();
      query.select(`#${id}-panel .form-popover-body`).boundingClientRect();
      query.select(`#${id}-panel .form-popover-heading`).boundingClientRect();
      query.select(`#${id}-panel .form-popover-footer`).boundingClientRect();
      query.exec(results => {
        if (!active) return;
        const [anchor, layer, panel, body, header, actions] = results as (Rect | null)[];
        if (!anchor || !layer) return;
        const gap = 8, edge = 12, width = Math.min(panelWidth, layer.width - edge * 2);
        const above = anchor.top - layer.top - edge - gap, below = layer.bottom - anchor.bottom - edge - gap;
        const limit = Math.min(layer.height - edge * 2, placement === 'center' ? layer.height : layer.height * maxHeightRatio);
        const height = Math.min(body ? body.height + (header?.height || 0) + (actions?.height || 0) + 2 : panel?.height || 220, limit);
        const down = preferredSide === 'above' && above >= height ? false : preferredSide === 'below' && below >= height ? true : below >= height || below >= above;
        const maxHeight = Math.max(44, placement === 'center' ? limit : Math.min(limit, down ? below : above));
        const top = placement === 'center' ? Math.max(edge, (layer.height - height) / 2) : down ? anchor.bottom - layer.top + gap : Math.max(edge, anchor.top - layer.top - gap - Math.min(height, maxHeight));
        const left = placement === 'center' ? (layer.width - width) / 2 : Math.max(edge, Math.min(anchor.right - layer.left - width, layer.width - width - edge));
        setPosition({ left, top, ...(placement === 'anchor' && !down ? { bottom: layer.bottom - anchor.top + gap } : {}), width, maxHeight, height: Math.min(height, maxHeight) });
      });
    };
    const timer = setTimeout(measure, 0);
    Taro.onWindowResize?.(measure);
    return () => { active = false; clearTimeout(timer); Taro.offWindowResize?.(measure); };
  }, [open, disabled, renderLayer, id, panelWidth, heightMode, bodySpacing, placement, preferredSide, maxHeightRatio, contentKey]);
  const triggerProps = { id, className: `button-label form-choice-trigger${triggerIconOnly && (!showIndicator || trigger == null) ? ' form-choice-trigger-icon' : ''} ${triggerClassName}${open ? ' is-open' : ''}`, size: triggerSize, width: triggerWidth, ariaLabel, 'aria-expanded': open, disabled, onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onOpenChange(!open); } };
  const triggerContent = <>{trigger}{showIndicator && <SelectChevron expanded={open} />}</>;
  const layer = renderLayer && open && !disabled ? <View id={`${id}-layer`} className={`form-popover-layer ${layerClassName}`} catchMove>
      <View className='form-popover-backdrop' onClick={event => { event.stopPropagation(); onOpenChange(false); }} />
      <View id={`${id}-panel`} className={`form-popover-panel body-${bodySpacing}${heading || footer ? ' has-chrome' : ''}${position ? ' is-positioned' : ''}${heightMode === 'content' ? ' is-content-height' : ''}${placement === 'center' ? ' is-centered' : ''} ${panelClassName}`} role='dialog' ariaLabel={ariaLabel} style={position ? { left: `${position.left}px`, top: position.bottom === undefined ? `${position.top}px` : 'auto', ...(position.bottom === undefined ? {} : { bottom: `${position.bottom}px` }), width: `${position.width}px`, maxHeight: `${position.maxHeight}px`, ...(heightMode === 'measured' && (heading || footer) ? { height: `${position.height}px` } : {}) } : { visibility: 'hidden' }} onClick={event => event.stopPropagation()}>
        {!!heading && <View className='form-popover-heading'>{heading}</View>}
        <ScrollView scrollY className='form-popover-scroll' showScrollbar={false}><View className='form-popover-body'>{children}</View></ScrollView>
        {!!footer && <View className='form-popover-footer'>{footer}</View>}
      </View>
    </View> : null;
  if (anchorId) return layer;
  return <View className={`form-choice-field${triggerWidth === 'fill' ? ' is-fill' : ''} ${className}`}>
    {triggerAppearance ? <ActionButton {...triggerProps} appearance={triggerAppearance}>{triggerContent}</ActionButton> : <ChoiceButton {...triggerProps} iconOnly={triggerIconOnly} selected={triggerSelected ?? open}>{triggerContent}</ChoiceButton>}
    {layer}
  </View>;
}

export function SingleChoiceField<T extends string>({ options, value, onChange, readOnly = false, ariaLabel, disabled = false, className = '', size, width }: {
  options: readonly Choice<T>[]; value: T; ariaLabel: string; disabled?: boolean; className?: string;
  size?: ButtonSize; width?: ButtonWidth;
} & ({ readOnly: true; onChange?: never } | { readOnly?: false; onChange: (value: T) => void })) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  const label = trimTextEnd(selected?.label || value || ariaLabel);
  const content = (option: Choice<T>) => <View className='form-choice-content'><View className='form-choice-icon' aria-hidden>{option.icon}</View><Text className='form-choice-label'>{trimTextEnd(option.label)}</Text></View>;
  if (readOnly) return <View className={`form-choice-field${width === 'fill' ? ' is-fill' : ''} ${className}`}><View className='button-label form-choice-trigger form-choice-readonly' ariaLabel={ariaLabel} style={choiceControlStyle(false, { size, width })}>{selected?.icon ? content(selected) : <Text>{label}</Text>}</View></View>;
  return <ChoicePopover className={className} ariaLabel={ariaLabel} open={open} onOpenChange={setOpen} disabled={disabled} triggerSize={size} triggerWidth={width} trigger={selected?.icon ? content(selected) : <Text>{label}</Text>}>
    <View className='form-option-grid'>{options.map(option => <ChoiceButton key={option.value} className={`button-label form-option${value === option.value ? ' is-selected' : ''}`} ariaLabel={option.ariaLabel || option.label} aria-pressed={value === option.value} disabled={disabled} onClick={() => { onChange?.(option.value); setOpen(false); }}>{option.icon ? content(option) : trimTextEnd(option.label)}</ChoiceButton>)}</View>
  </ChoicePopover>;
}

export function TagChoiceRow<T extends string>({ options, value, onChange, ariaLabel = '选择标签', frequentValues, disabled = false, className = '', customInput, contentKey = '', labelKind = 'tag' }: {
  options: readonly Choice<T>[]; value: readonly T[]; onChange: (value: T[]) => void; ariaLabel?: string;
  frequentValues?: readonly T[]; disabled?: boolean; className?: string; customInput?: ReactNode; contentKey?: string;
  labelKind?: 'tag' | 'plain';
}) {
  const [open, setOpen] = useState(false);
  const frequent = frequentValues ? frequentValues.map(key => options.find(option => option.value === key)).filter((option): option is Choice<T> => !!option) : options.slice(0, 4);
  const toggle = (key: T) => onChange(value.includes(key) ? value.filter(item => item !== key) : [...value, key]);
  const choices = [...options, ...value.filter(key => !options.some(option => option.value === key)).map(key => ({ value: key, label: key }))];
  const choice = (option: Choice<T>, location: string) => <ChoiceButton key={`${location}:${option.value}`} className={`button-label form-option${value.includes(option.value) ? ' is-selected' : ''}`} ariaLabel={option.ariaLabel || option.label} aria-pressed={value.includes(option.value)} disabled={disabled} onClick={() => toggle(option.value)}><Text className='form-option-label'>{labelKind === 'tag' ? tagLabel(option.label) : option.label}</Text></ChoiceButton>;
  return <View className={`form-tag-field ${className}`}>
    <View className='form-tag-row'>{!!frequent.length && <View className='form-tag-common'>{frequent.map(option => choice(option, 'common'))}</View>}
      <ChoicePopover ariaLabel={ariaLabel} open={open} onOpenChange={setOpen} disabled={disabled} contentKey={`${contentKey}-${JSON.stringify(choices.map(option => [option.value, option.label]))}-${JSON.stringify(value)}`} trigger={value.length ? <Text className='form-tag-count'>{value.length}</Text> : null}
        footer={<PopoverActions layout='fill'><ActionButton className='button-label form-popover-done' size='compact' width='fill' onClick={() => setOpen(false)}>完成</ActionButton></PopoverActions>}>
        <View className='form-option-grid form-tag-options'>{choices.map(option => choice(option, 'all'))}</View>
        {!!customInput && <View className='form-tag-custom'>{customInput}</View>}
      </ChoicePopover>
    </View>
  </View>;
}

export function CustomChoiceRow({ options, value, onChange, inputAriaLabel, placeholder = '自定义', type = 'number', maxlength = 3, disabled = false, className = '' }: {
  options: readonly Choice<string>[]; value: string; onChange: (value: string) => void; inputAriaLabel: string;
  placeholder?: string; type?: 'number' | 'digit' | 'text'; maxlength?: number; disabled?: boolean; className?: string;
}) {
  return <View className={`form-custom-row ${className}`}>
    <ScrollView scrollX className='form-custom-options-scroll' showScrollbar={false}><View className='form-custom-options'>{options.map(option => <ChoiceButton key={option.value} className={`button-label form-option${value === option.value ? ' is-selected' : ''}`} ariaLabel={option.ariaLabel || option.label} aria-pressed={value === option.value} disabled={disabled} onClick={() => onChange(option.value)}>{option.label}</ChoiceButton>)}</View></ScrollView>
    <SingleLineInput frameClassName='form-custom-field' className='form-custom-input' ariaLabel={inputAriaLabel} placeholder={placeholder} type={type} maxlength={maxlength} value={value} disabled={disabled} cursorSpacing={96} adjustPosition onInput={event => onChange(event.detail.value)} />
  </View>;
}
