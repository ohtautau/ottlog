import { Button, Image, Text, View } from '@tarojs/components';
import './tomato-clock.css';

export default function TomatoClock({ progress, resting, time, label, size, onEditTime }: {
  progress: number; resting: boolean; time: string; label: string; size: number; onEditTime?: () => void;
}) {
  const completed = Math.max(0, Math.min(100, progress));
  return <View className={`focus-tomato-scene${resting ? ' is-resting' : ''}`} style={{ width: `${size}px`, height: `${size * 430 / 480}px` }}>
    <View className='focus-tomato-ticks'>{Array.from({ length: 36 }, (_, index) => {
      const angle = index * Math.PI / 18;
      return <View key={index} className={`focus-tomato-tick${index % 3 === 0 ? ' is-major' : ''}${completed > 0 && index / 36 < completed / 100 ? ' is-lit' : ''}`}
        style={{ left: `${(240 + Math.sin(angle) * 173) / 480 * 100}%`, top: `${(217 - Math.cos(angle) * 173) / 430 * 100}%`, transform: `translate(-50%, -50%) rotate(${index * 10}deg)` }} />;
    })}</View>
    <Image className='focus-tomato-art' src={`/pages/pomodoro/assets/tomato-${resting ? 'rest' : 'focus'}.png`} mode='aspectFit' />
    <View className='focus-tomato-face'><Text className='focus-dial-kind' style={{ fontSize: `${Math.max(9, Math.min(16, size * .048))}px` }}>{label}</Text><Button className='focus-time' ariaLabel={onEditTime ? '修改当前计时时长' : '当前计时剩余时间'} disabled={!onEditTime} hoverClass='focus-time-pressed' style={{ fontSize: `${size * (time.length > 5 ? .18 : .215)}px` }} onClick={onEditTime}>{time}</Button></View>
    <View className='focus-tomato-progress'><View style={{ width: `${completed}%` }} /></View>
  </View>;
}
