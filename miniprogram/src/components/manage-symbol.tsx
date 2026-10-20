import { View } from '@tarojs/components';
import './manage-symbol.css';

export default function ManageSymbol() {
  return <View className='manage-symbol' aria-hidden><View /><View /><View /></View>;
}

export function EditSymbol() {
  return <View className='edit-symbol' aria-hidden><View /></View>;
}

export function DeleteSymbol() {
  return <View className='delete-symbol' aria-hidden><View /><View /></View>;
}

export function MoreSymbol() {
  return <View className='more-symbol' aria-hidden><View /><View /><View /></View>;
}

export function ReplaceSymbol() {
  return <View className='replace-symbol' aria-hidden><View /><View /></View>;
}

export function ResetSymbol() {
  return <View className='reset-symbol' aria-hidden><View /><View /></View>;
}

export function PinSymbol() {
  return <View className='pin-symbol' aria-hidden><View><View /><View /><View /></View></View>;
}
