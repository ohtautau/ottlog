import { View } from '@tarojs/components';
import './focus-progress.css';

/** Five continuous intervals. Replace the subtree at mode/session boundaries so
 * width transitions only interpolate within the same timer, including resume. */
export default function FocusProgress({ progress,resting=false,resetKey }: { progress:number;resting?:boolean;resetKey?:string }) {
  const value=Number.isFinite(progress) ? Math.max(0,Math.min(100,progress)) : 0;
  return <View key={resetKey} className={`focus-progress${resting ? ' is-resting' : ''}`} role='progressbar' ariaLabel='本轮计时进度' aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(value.toFixed(2))}>
    {Array.from({length:5},(_,index)=><View className='focus-progress-segment' key={index}><View className='focus-progress-fill' style={{width:`${Math.max(0,Math.min(100,(value-index*20)*5))}%`}} /></View>)}
  </View>;
}
