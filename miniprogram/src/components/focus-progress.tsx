import { View } from '@tarojs/components';
import './focus-progress.css';

/** Five equal 20% intervals; each interval fills continuously, rather than snapping. */
export default function FocusProgress({ progress,resting=false }: { progress:number;resting?:boolean }) {
  const value=Number.isFinite(progress) ? Math.max(0,Math.min(100,progress)) : 0;
  return <View className={`focus-progress${resting ? ' is-resting' : ''}`} role='progressbar' ariaLabel='本轮计时进度' aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(value.toFixed(2))}>
    {Array.from({length:5},(_,index)=><View className='focus-progress-segment' key={index}><View className='focus-progress-fill' style={{width:`${Math.max(0,Math.min(100,(value-index*20)*5))}%`}} /></View>)}
  </View>;
}
