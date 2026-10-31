import { Text, View } from '@tarojs/components';
import WheelPicker, { wheelNumbers } from './wheel-picker';
import ActionButton from './ui-button';
import { monthDays, wheelDate } from '../lib/wheel-time-data';

const months = wheelNumbers(1, 12, true), hours = wheelNumbers(0, 23, true), minutes = wheelNumbers(0, 59, true);
export default function DateTimeWheelPicker({ date, hour, minute, label, disabled, onChange, onMovingChange }: {
  date: string; hour: string; minute: string; label: string; disabled?: boolean;
  onChange: (date: string, hour: string, minute: string) => void; onMovingChange?: (moving: boolean) => void;
}) {
  const [year, month, day] = date.split('-').map(Number);
  return <View>
    <View className='wheel-year-context'>
      <ActionButton appearance='icon' size='compact' ariaLabel={`${label}上一年`} disabled={disabled || year <= 1000} onClick={() => onChange(wheelDate(year - 1, month, day), hour, minute)}>‹</ActionButton>
      <Text>{year}年</Text>
      <ActionButton appearance='icon' size='compact' ariaLabel={`${label}下一年`} disabled={disabled || year >= 9999} onClick={() => onChange(wheelDate(year + 1, month, day), hour, minute)}>›</ActionButton>
    </View>
    <WheelPicker label={label} disabled={disabled} onMovingChange={onMovingChange} columns={[
      { label: '月', ariaLabel: `${label}月份`, values: months, value: String(month).padStart(2, '0') },
      { label: '日', ariaLabel: `${label}日期`, values: wheelNumbers(1, monthDays(year, month), true), value: String(day).padStart(2, '0') },
      { label: '时', ariaLabel: `${label}小时`, values: hours, value: hour },
      { label: '分', ariaLabel: `${label}分钟`, values: minutes, value: minute },
    ]} onChange={values => onChange(wheelDate(year, Number(values[0]), Number(values[1])), values[2], values[3])} />
  </View>;
}
