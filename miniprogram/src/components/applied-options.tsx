import { Text, View } from '@tarojs/components';
import './applied-options.css';
export default function AppliedOptions({ items, className = '' }: { items: string[]; className?: string }) {
  return items.length ? <View className={`applied-options ${className}`}><Text>{items.join(' · ')}</Text></View> : null;
}
