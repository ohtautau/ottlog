import { Button } from '@tarojs/components';
import type { ComponentProps } from 'react';
import { AddSymbol } from './create-button';
import './card-create-button.css';

/** A card-sized creation target; the host owns its grid cell and surface. */
export default function CardCreateButton({ ariaLabel, className = '', disabled = false, ...props }: Omit<ComponentProps<typeof Button>, 'children'> & { ariaLabel: string }) {
  return <Button {...props} className={`card-create-button ${className}`} ariaLabel={ariaLabel} disabled={disabled} hoverClass={disabled ? 'none' : 'card-create-button-pressed'}><AddSymbol /></Button>;
}
