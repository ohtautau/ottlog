import { View } from '@tarojs/components';
import './check-symbol.css';

export default function CheckSymbol({ className = '' }: { className?: string }) {
  return <View className={`check-symbol ${className}`} aria-hidden><View /></View>;
}
