import { View } from '@tarojs/components';
import './sort-icon.css';

export default function SortIcon() {
  return <View className='sort-icon' aria-hidden><View className='sort-icon-up' /><View className='sort-icon-down' /></View>;
}
