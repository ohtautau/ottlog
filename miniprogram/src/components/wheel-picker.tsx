import { PickerView, PickerViewColumn, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import SilentWheelColumn from './silent-wheel-column';
import './time-wheel-picker.css';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

const WHEEL_ROW_HEIGHT = 28;
const WHEEL_VISIBLE_ROWS = 3;

export type WheelColumn = { label: string; ariaLabel: string; values: readonly string[]; value: string };
/** The only owner of wheel geometry, typography, indicator and fade. */
export default function WheelPicker({ columns, label, prefix, disabled = false, onChange, onMovingChange }: {
  columns: readonly WheelColumn[]; label: string; prefix?: string; disabled?: boolean;
  onChange: (values: string[]) => void; onMovingChange?: (moving: boolean) => void;
}) {
  const moving = useRef(new Set<number>());
  const current = useRef({ columns, onChange, onMovingChange }); current.current = { columns, onChange, onMovingChange };
  const silent = typeof Taro.getEnv === 'function' && Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
  useEffect(() => () => current.current.onMovingChange?.(false), []);
  return <View className={`time-wheel${disabled ? ' is-disabled' : ''}`} style={{ '--wheel-row-height': `${WHEEL_ROW_HEIGHT}px`, '--wheel-center-offset': `${WHEEL_ROW_HEIGHT * (WHEEL_VISIBLE_ROWS-1)/2}px`, '--wheel-height': `${WHEEL_ROW_HEIGHT * WHEEL_VISIBLE_ROWS}px` } as CSSProperties}>
    <View className='time-wheel-labels'>{prefix && <Text />}{columns.map(column => <Text key={column.ariaLabel}>{column.label}</Text>)}</View>
    <View className='time-wheel-stage'>
      {prefix && <Text className='time-wheel-prefix'>{prefix}</Text>}
      {silent ? <View className='time-wheel-silent' style={{ width: `${columns.length * 25}%` }}>
        {columns.map((column, index) => <SilentWheelColumn key={column.ariaLabel} column={column} rowHeight={WHEEL_ROW_HEIGHT} disabled={disabled}
          onMovingChange={active => { if (active) moving.current.add(index); else moving.current.delete(index); onMovingChange?.(moving.current.size > 0); }}
          onChange={value => {
            const values = current.current.columns.map(item => item.value); values[index] = value;
            current.current.columns = current.current.columns.map((item, columnIndex) => ({ ...item, value: values[columnIndex] }));
            current.current.onChange(values);
          }} />)}
      </View> : <PickerView className='time-wheel-picker' ariaLabel={`${label}滚轮`} style={{ width: `${columns.length * 25}%` }}
      value={columns.map(column => Math.max(0, column.values.indexOf(column.value)))} immediateChange
      indicatorStyle={`height:${WHEEL_ROW_HEIGHT}px;border:0;`} maskStyle='background:transparent;'
      onPickStart={() => { if (!disabled) onMovingChange?.(true); }} onPickEnd={() => onMovingChange?.(false)}
      onChange={event => {
        const values = columns.map((column, index) => column.values[event.detail.value[index]]);
        if (!disabled && values.every(value => value !== undefined)) onChange(values);
      }}>
      {columns.map(column => <PickerViewColumn key={column.ariaLabel} aria-label={column.ariaLabel}>
        {column.values.map(value => <View key={value} className='time-wheel-value'>{value}</View>)}
      </PickerViewColumn>)}
    </PickerView>}
      <View className='time-wheel-indicator' aria-hidden /><View className='time-wheel-fade' aria-hidden /></View>
  </View>;
}

export const wheelNumbers = (start: number, end: number, pad = false) => Array.from({ length: end - start + 1 }, (_, index) => pad ? String(index + start).padStart(2, '0') : String(index + start));

export function NumberWheelPicker({ value, min = 1, max, label, unit, disabled, onChange, onMovingChange }: {
  value: string; min?: number; max: number; label: string; unit: string; disabled?: boolean;
  onChange: (value: string) => void; onMovingChange?: (moving: boolean) => void;
}) {
  return <WheelPicker label={label} disabled={disabled} onMovingChange={onMovingChange}
    columns={[{ label: unit, ariaLabel: label, values: wheelNumbers(min, max), value }]}
    onChange={values => onChange(values[0])} />;
}
