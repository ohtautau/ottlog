import { View } from '@tarojs/components';
import type { ShortcutKey } from '../lib/home-shortcuts';
import { defaultShortcutIcon, shortcutLibraryIcon, type ShortcutIconKey } from '../lib/shortcut-icons';
import LibraryIcon from './library-icon';
import './shortcut-icon.css';

export default function ShortcutIcon({ name, icon, variant = 'standard', className = '' }: {
  name: ShortcutKey;
  icon?: ShortcutIconKey;
  /** Large decorative line art shares the same icon geometry at a finer stroke. */
  variant?: 'standard' | 'background';
  className?: string;
}) {
  const libraryId = shortcutLibraryIcon(icon) ?? shortcutLibraryIcon(defaultShortcutIcon(name))!;
  return <View className={`shortcut-icon${variant === 'background' ? ' is-background' : ''} ${className}`} data-icon={`library:${libraryId}`} aria-hidden><LibraryIcon name={libraryId} variant={variant === 'background' ? 'outline' : 'colored'} className='shortcut-icon-library' /></View>;
}
