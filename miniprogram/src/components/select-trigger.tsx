import { Text, View } from '@tarojs/components';
import './select-trigger.css';
import { choiceControlStyle, type ButtonSize, type ButtonWidth } from './ui-button';

export function SelectChevron({ expanded = false }: { expanded?: boolean }) {
  return <View className={`select-chevron${expanded ? ' is-expanded' : ''}`} aria-hidden><View className='select-chevron-mark' /></View>;
}

/** The surrounding native Picker owns the tap and selection interaction. */
export default function SelectTrigger({ label, active = false, showIndicator = true, size, width }: { label: string; active?: boolean; showIndicator?: boolean; size?: ButtonSize; width?: ButtonWidth }) {
  return <View className={`select-trigger${active ? ' is-active' : ''}`} style={choiceControlStyle(active, { size, width })} hoverClass='select-trigger-pressed'>
    <Text className='select-trigger-label'>{label}</Text>{showIndicator && <SelectChevron />}
  </View>;
}
