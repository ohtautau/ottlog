import WheelPicker, { NumberWheelPicker, wheelNumbers } from './wheel-picker';

export default function DurationWheelPicker({ value, max, unit, label, disabled, onChange, onMovingChange }: {
  value: string; max: number; unit: 'minutes' | 'seconds'; label: string; disabled?: boolean;
  onChange: (value: string) => void; onMovingChange?: (moving: boolean) => void;
}) {
  if (max <= 365) return <NumberWheelPicker value={value} max={max} label={label} unit={unit === 'minutes' ? '分钟' : '秒'} disabled={disabled} onChange={onChange} onMovingChange={onMovingChange} />;
  const total = Math.min(max, Math.max(1, Number(value) || 1));
  const units = unit === 'seconds' ? [{ label: '天', factor: 86400 }, { label: '时', factor: 3600 }, { label: '分', factor: 60 }, { label: '秒', factor: 1 }] : [{ label: '时', factor: 60 }, { label: '分', factor: 1 }];
  const values = units.map((item, index) => Math.floor(total / item.factor) % (index === 0 ? max + 1 : units[index - 1].factor / item.factor));
  return <WheelPicker label={label} disabled={disabled} onMovingChange={onMovingChange}
    columns={units.map((item, index) => ({ label: item.label, ariaLabel: `${label}${item.label}`, value: String(values[index]).padStart(2, '0'),
      values: wheelNumbers(0, index === 0 ? Math.floor(max / item.factor) : units[index - 1].factor / item.factor - 1, true) }))}
    onChange={next => onChange(String(Math.min(max, Math.max(1, next.reduce((sum, number, index) => sum + Number(number) * units[index].factor, 0)))))} />;
}
