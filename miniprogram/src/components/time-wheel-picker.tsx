import WheelPicker from './wheel-picker';

const hours = Array.from({ length: 24 }, (_, value) => String(value).padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, value) => String(value).padStart(2, '0'));

/** Two shared wheels edit a bounded HH:mm draft, without opening a keyboard. */
export default function TimeWheelPicker({ hour, minute, label, disabled = false, onChange, onMovingChange }: {
  hour: string; minute: string; label: string; disabled?: boolean;
  onChange: (hour: string, minute: string) => void; onMovingChange: (moving: boolean) => void;
}) {
  return <WheelPicker label={`${label}时间`} disabled={disabled} onMovingChange={onMovingChange}
    columns={[{ label: '时', ariaLabel: `${label}小时`, values: hours, value: hour }, { label: '分', ariaLabel: `${label}分钟`, values: minutes, value: minute }]}
    onChange={values => onChange(values[0], values[1])} />;
}
