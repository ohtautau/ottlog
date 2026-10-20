import { useEffect, useMemo, useRef } from 'react';
import { Button, Image, Text, View, type ITouchEvent } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { findAlignedChoiceRegion, makeAlignedChoiceRegions } from './choice-aligned-geometry';
import type { NativeChoiceOption } from './choice-field';
import './choice-aligned-board.css';

export default function ChoiceAlignedBoard({ options, selected, leaving, disabled, onChoose }: {
  options: NativeChoiceOption[]; selected?: string; leaving: number | null; disabled: boolean; onChoose: (index: number) => void;
}) {
  const regions = useMemo(() => makeAlignedChoiceRegions(options.length), [options.length]);
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);
  function caption(index: number) {
    const text = options[index].caption;
    if ((options.length === 4 || options.length >= 7) && regions[index].copySize[0] < .31 && text.length > 7 && !text.includes('\n')) {
      const middle = Math.ceil(text.length / 2);
      return `${text.slice(0, middle)}\n${text.slice(middle)}`;
    }
    return text;
  }
  function tap(event: ITouchEvent) {
    if (disabled) return;
    const point = event.changedTouches?.[0] || event.touches?.[0];
    const mouse = event as unknown as { clientX?: number; clientY?: number };
    const x = point?.clientX ?? mouse.clientX ?? event.detail?.x;
    const y = point?.clientY ?? mouse.clientY ?? event.detail?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const current = ++request.current;
    Taro.createSelectorQuery().select('#choice-aligned-board').boundingClientRect().exec(results => {
      const box = results[0];
      if (!box?.width || !box.height || request.current !== current) return;
      const index = findAlignedChoiceRegion(regions, [(x - box.left) / box.width, (y - box.top) / box.height]);
      if (index !== -1) onChoose(index);
    });
  }
  return <View id='choice-aligned-board' className={`choice-aligned-board choice-aligned-count-${options.length}`} onClick={tap}>
    <Image className='choice-aligned-background' src={`/assets/choice/layout-${options.length}.png`} mode='scaleToFill' style={{ objectFit: 'fill' }} showMenuByLongpress={false} />
    {options.map((option, index) => <Button key={option.id} className={`choice-aligned-option ${selected === option.id ? 'is-selected' : ''} ${leaving === index ? 'is-leaving' : ''}`}
      disabled={disabled} ariaLabel={`${option.label}，${option.caption}`} hoverClass='choice-aligned-pressed'
      style={{ left: `${regions[index].center[0] * 100}%`, top: `${regions[index].center[1] * 100}%`, width: `${regions[index].copySize[0] * 100}%`, height: `${regions[index].copySize[1] * 100}%` }}
      onClick={event => { event.stopPropagation(); request.current += 1; onChoose(index); }}>
      <Text className='choice-aligned-number'>{String(index + 1).padStart(2, '0')}{selected === option.id ? ' · 已选' : ''}</Text>
      <Text className='choice-aligned-label'>{option.label}</Text>
      <Text className='choice-aligned-caption'>{caption(index)}</Text>
    </Button>)}
  </View>;
}
