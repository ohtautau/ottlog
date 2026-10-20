import { View } from '@tarojs/components';
import type { ShortcutColor } from '../lib/home-shortcuts';
import { defaultShortcutIcon, normalizeShortcutIcon, type ShortcutIconKey } from '../lib/shortcut-icons';
import ShortcutIcon from './shortcut-icon';
import './shortcut-background.css';

/** A chosen library icon becomes oversized, quiet line art on every card preview. */
export default function ShortcutBackground({ icon, name = 'create', color, className = '' }: {
  icon?: ShortcutIconKey; name?: string; color?: ShortcutColor; className?: string;
}) {
  const key = normalizeShortcutIcon(icon) ?? defaultShortcutIcon(name);
  return <View className={`shortcut-background${color ? ` shortcut-color-${color}` : ''} ${className}`} data-background-icon={key} aria-hidden>
    <ShortcutIcon name='create' icon={key} variant='background' className='shortcut-background-icon' />
  </View>;
}
