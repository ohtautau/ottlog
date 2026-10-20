import { Text, View } from '@tarojs/components';
import type { ComponentProps, ReactNode } from 'react';
import './create-button.css';
import ActionButton from './ui-button';

export function AddSymbol() {
  return <View className='button-add-symbol' aria-hidden><View /><View /></View>;
}

export function CreateActionLabel({ label, showAddSymbol = true }: { label: string; showAddSymbol?: boolean }) {
  return <>{showAddSymbol && <AddSymbol />}<Text className='create-button-label'>{label}</Text></>;
}

type Props = Omit<ComponentProps<typeof ActionButton>, 'children'> & { label: string; trailing?: ReactNode; showAddSymbol?: boolean; iconOnly?: boolean };

/** Adjacent input creation uses a lone add symbol with the full accessible action name. */
export default function CreateButton({ label, trailing, showAddSymbol = true, iconOnly = false, appearance = 'primary', size = 'compact', className = '', ariaLabel = label, ...props }: Props) {
  return <ActionButton {...props} appearance={appearance} size={size} className={`create-button${iconOnly ? ` create-button-icon-only create-button-${size}` : ''} ${className}`} ariaLabel={ariaLabel}>{iconOnly ? <AddSymbol /> : <><CreateActionLabel label={label} showAddSymbol={showAddSymbol} />{trailing}</>}</ActionButton>;
}
