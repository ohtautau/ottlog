import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useRef, useState } from 'react';
import type { WheelColumn } from './wheel-picker';
import type { ITouchEvent } from '@tarojs/components';

/** A touch-driven wheel avoids the system picker's inseparable sound feedback. */
export default function SilentWheelColumn({ column, rowHeight, disabled, onChange, onMovingChange }: {
  column: WheelColumn; rowHeight: number; disabled: boolean; onChange: (value: string) => void; onMovingChange: (moving: boolean) => void;
}) {
  const selected = Math.max(0, column.values.indexOf(column.value));
  const [position, setPosition] = useState(selected);
  const [snapping, setSnapping] = useState(false);
  const state = useRef({ position: selected, active: false, y: 0, time: 0, velocity: 0, tick: selected, feedbackAt: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef({ column, disabled, onChange, onMovingChange });
  latest.current = { column, disabled, onChange, onMovingChange };
  const bounded = (value: number) => Math.max(0, Math.min(latest.current.column.values.length - 1, value));
  function display(value: number, feedback = false) {
    const next = bounded(value), index = Math.round(next), now = Date.now();
    if (feedback && index !== state.current.tick && now - state.current.feedbackAt >= 45) {
      state.current.feedbackAt = now;
      void Taro.vibrateShort({ type: 'light' }).catch(() => {});
    }
    state.current.tick = index; state.current.position = next; setPosition(next);
  }
  useEffect(() => {
    if (!state.current.active) { state.current.position = selected; state.current.tick = selected; setPosition(selected); }
  }, [selected, column.values.length]);
  useEffect(() => () => { clearTimeout(timer.current); latest.current.onMovingChange(false); }, []);
  function finish(cancel = false) {
    if (!state.current.active) return;
    const current = state.current;
    const target = cancel ? Math.max(0, latest.current.column.values.indexOf(latest.current.column.value))
      : Math.round(bounded(current.position + Math.max(-5, Math.min(5, current.velocity * 100 / rowHeight))));
    setSnapping(true); display(target, !cancel);
    timer.current = setTimeout(() => {
      state.current.active = false; setSnapping(false);
      if (!cancel && !latest.current.disabled) latest.current.onChange(latest.current.column.values[target]);
      latest.current.onMovingChange(false);
    }, 180);
  }
  return <View className={`time-wheel-column${snapping ? ' is-snapping' : ''}`} catchMove
    role='slider' ariaLabel={column.ariaLabel} aria-valuemin={0} aria-valuemax={column.values.length - 1} aria-valuenow={Math.round(position)} aria-valuetext={column.values[Math.round(position)]}
    onTouchStart={event => {
      const touch = event as ITouchEvent;
      if (latest.current.disabled || !touch.touches[0]) return;
      event.stopPropagation(); clearTimeout(timer.current); setSnapping(false);
      Object.assign(state.current, { active: true, y: touch.touches[0].clientY, time: Date.now(), velocity: 0 });
      latest.current.onMovingChange(true);
    }} onTouchMove={event => {
      const touch = event as ITouchEvent;
      if (!state.current.active || latest.current.disabled || !touch.touches[0]) return;
      event.stopPropagation(); const now = Date.now(), y = touch.touches[0].clientY;
      const delta = state.current.y - y;
      state.current.velocity = delta / Math.max(1, now - state.current.time);
      state.current.y = y; state.current.time = now; display(state.current.position + delta / rowHeight, true);
    }} onTouchEnd={event => { event.stopPropagation(); if (Date.now() - state.current.time > 80) state.current.velocity = 0; finish(); }}
    onTouchCancel={() => finish(true)}>
    <View className='time-wheel-track' style={{ transform: `translateY(${-position * rowHeight}px)` }}>
      <View className='time-wheel-spacer' />
      {column.values.map(value => <Text className='time-wheel-value' key={value}>{value}</Text>)}
      <View className='time-wheel-spacer' />
    </View>
  </View>;
}
