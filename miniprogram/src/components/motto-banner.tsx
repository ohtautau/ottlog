import { trimTextEnd } from '../lib/text-whitespace';
import { useEffect, useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import { EditSymbol } from './manage-symbol';
import { displayedMottos, initialPersonalMottos, mottoRotationMs } from '../lib/motto-data';
import { usePersonalToolState } from '../lib/use-personal-tool-state';
import './motto-banner.css';

export default function MottoBanner({ mottos: defaults, active, visible = true }: { mottos: string[]; active: boolean; visible?: boolean }) {
  const { value, ready } = usePersonalToolState('mottos', initialPersonalMottos);
  const mottos = useMemo(() => displayedMottos(ready ? value : initialPersonalMottos, defaults), [defaults, ready, value]);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * mottos.length));
  const [touching, setTouching] = useState(false);
  const currentIndex = Math.max(0, Math.min(index, mottos.length - 1));
  const motto = mottos[currentIndex];
  const rotationMs = mottoRotationMs(ready ? value : initialPersonalMottos);
  useEffect(() => {
    if (!visible) return;
    setIndex(Math.floor(Math.random() * mottos.length));
  }, [mottos, visible]);
  function next() {
    if (mottos.length < 2) return;
    const candidate = Math.floor(Math.random() * (mottos.length - 1));
    setIndex(candidate >= currentIndex ? candidate + 1 : candidate);
  }
  useEffect(() => {
    if (!active || !visible || touching || mottos.length < 2) return;
    const timer = setTimeout(next, rotationMs);
    return () => clearTimeout(timer);
  }, [active, visible, touching, index, mottos, rotationMs]);
  return <View className='today-quote' aria-label='生活格言' onTouchStart={() => setTouching(true)} onTouchEnd={() => setTouching(false)} onTouchCancel={() => setTouching(false)}>
    <View className='today-quote-body'>
      <View className='today-quote-content'><Text className={`today-quote-text${!motto ? ' is-empty' : ''}`}>{trimTextEnd(motto || '暂无格言')}</Text></View>
    </View>
    <View className='today-quote-side'>
      <ActionButton appearance='icon' size='compact' className='today-quote-manage' ariaLabel='管理格言' onClick={() => { void Taro.navigateTo({ url: '/pages/mottos/index' }); }}><EditSymbol /></ActionButton>
      <Text className='today-quote-count'><Text className='today-quote-current'>{String(mottos.length ? currentIndex + 1 : 0).padStart(2, '0')}</Text><Text className='today-quote-count-divider'>/</Text>{String(mottos.length).padStart(2, '0')}</Text>
    </View>
  </View>;
}
