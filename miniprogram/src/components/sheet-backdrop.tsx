import { View } from '@tarojs/components';
import './sheet-backdrop.css';

/** Separate hit area prevents panel taps from dismissing or reaching the page. */
export default function SheetBackdrop({ onClose, disabled = false }: { onClose: () => void; disabled?: boolean }) {
  return <View className='sheet-backdrop' catchMove onClick={event => { event.stopPropagation(); if (!disabled) onClose(); }} />;
}
