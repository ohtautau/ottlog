import { View } from '@tarojs/components';
import './filter-symbol.css';

export default function FilterSymbol() {
  return <View className='filter-symbol' aria-hidden><View className='filter-symbol-mouth' /><View className='filter-symbol-stem' /></View>;
}
