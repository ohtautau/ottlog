import type { ReactNode } from 'react';
import { Button, View } from '@tarojs/components';
import './data-card-views.css';

/** One frame for navigable, read-only preview, sorting and creation cells. */
export default function DomainEntryCard({ children, id, className = '', label, disabled, onOpen, actions, badge, create = false }: {
  children: ReactNode; id?: string; className?: string; label?: string; disabled?: boolean;
  onOpen?: () => void; actions?: ReactNode; badge?: ReactNode; create?: boolean;
}) {
  return <View id={id} className={`domain-entry-shell ${className}`} ariaLabel={onOpen ? undefined : label}>
    {create ? children : onOpen ? <Button className='domain-entry' disabled={disabled} ariaLabel={label} onClick={onOpen}>{children}</Button> : <View className='domain-entry'>{children}</View>}
    {badge}{actions}
  </View>;
}
