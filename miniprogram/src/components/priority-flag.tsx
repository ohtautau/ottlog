import { View } from '@tarojs/components';
import './priority-flag.css';

/** Priority meaning stays in the flag, independently of the control text color. */
export default function PriorityFlag({ color, outlined = false, className = '' }: { color: string; outlined?: boolean; className?: string }) {
  return <View className={`priority-flag${outlined ? ' is-none' : ''} ${className}`} style={{ color }} aria-hidden />;
}
