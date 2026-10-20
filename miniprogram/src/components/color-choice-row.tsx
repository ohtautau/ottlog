import { View } from '@tarojs/components';
import { ChoiceButton } from './ui-button';
import './color-choice-row.css';

type ColorOption<Key extends string> = { key: Key; label: string; color?: string; dotClassName?: string; ariaLabel?: string };

/** One shared row of color swatches; the caller owns the palette and saved value. */
export default function ColorChoiceRow<Key extends string>({ options, value, onChange, disabled = false, readOnly = false, className = '', buttonClassName = '', dotClassName = '' }: {
  options: readonly ColorOption<Key>[]; value: Key; onChange?: (value: Key) => void; disabled?: boolean; readOnly?: boolean;
  className?: string; buttonClassName?: string; dotClassName?: string;
}) {
  return <View className={`color-choice-row ${className}`}>
    {options.map(option => {
      const selected = value === option.key;
      const dot = <View className={`color-choice-dot ${dotClassName} ${option.dotClassName || ''}`} style={option.color ? { backgroundColor: option.color } : undefined} aria-hidden>{selected ? '✓' : ''}</View>;
      return readOnly ? <View key={option.key} className={`color-choice-static${selected ? ' is-selected' : ''}`} ariaLabel={option.ariaLabel || option.label}>{dot}</View>
        : <ChoiceButton key={option.key} size='compact' width='fill' className={`color-choice-button ${buttonClassName}`} selected={selected} ariaLabel={option.ariaLabel || option.label} disabled={disabled} onClick={() => onChange?.(option.key)}>{dot}</ChoiceButton>;
    })}
  </View>;
}
