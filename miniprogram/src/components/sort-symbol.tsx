import { View } from '@tarojs/components';
import './sort-symbol.css';

export default function SortSymbol() {
  return <View className='sort-symbol' aria-hidden><View className='sort-symbol-up' /><View className='sort-symbol-down' /></View>;
}

export function MoveSymbol({ direction }: { direction: 'up' | 'down' }) {
  return <View className='sort-symbol' aria-hidden><View className={`sort-symbol-${direction}`} /></View>;
}
