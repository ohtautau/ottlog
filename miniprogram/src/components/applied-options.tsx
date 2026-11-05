import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import './applied-options.css';
export default function AppliedOptions({ items, className = '', onClear, disabled = false }: { items: string[]; className?: string; onClear?: () => void; disabled?: boolean }) {
  return items.length ? <View className={`applied-options ${className}`}><Text className='applied-options-text'>{items.join(' · ')}</Text>{onClear && <ActionButton appearance='icon' className='applied-options-clear' ariaLabel='清除当前筛选和排序' disabled={disabled} onClick={onClear}>×</ActionButton>}</View> : null;
}
