import { Text, View } from '@tarojs/components';
import LibraryIcon from './library-icon';
import './domain-goal-count.css';

export default function DomainGoalCount({ count, className = '' }: { count: number; className?: string }) {
  return <View className={`domain-goal-count ${className}`}>
    <View className='domain-goal-count-art' aria-hidden><LibraryIcon name='goal' className='domain-goal-count-icon' /></View>
    <Text>{count}</Text>
  </View>;
}
