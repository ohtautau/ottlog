import { useEffect } from 'react';
import IconLibrarySheet from './icon-library-sheet';
import { libraryShortcutIcon, shortcutLibraryIcon, type ShortcutIconKey } from '../lib/shortcut-icons';

/** Selecting changes the parent's local appearance draft; this sheet never saves. */
export default function ShortcutIconPicker({ icon, onSelect, onCancel }: {
  icon?: ShortcutIconKey; onSelect: (icon: ShortcutIconKey) => void; onCancel: () => void;
}) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onCancel(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onCancel]);
  return <IconLibrarySheet selectedId={shortcutLibraryIcon(icon)} title='选择背景图标' ariaLabel='选择快捷方式背景图标' optionPrefix='选择背景图标：' closeLabel='关闭背景图标选择'
    onSelect={id => { if (id) onSelect(libraryShortcutIcon(id)); }} onClose={onCancel} />;
}
