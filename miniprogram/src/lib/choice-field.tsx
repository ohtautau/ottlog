import PageScroll from '../components/page-scroll';
import { MoreSection } from '../components/page-sections';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button, Text, View } from '@tarojs/components';
import { makeChoiceRegions } from './choice-geometry';
import ChoiceAlignedBoard from './choice-aligned-board';
import './choice-field.css';

export const choiceSurfaces = ['#254d62', '#79503e', '#435741', '#454466', '#235c5b', '#713b4b', '#354e6b', '#6a5831', '#554c44'];
export type NativeChoiceOption = { id: string; label: string; caption: string; detail?: string };
type Progress = { completed: number; total: number; furthest?: number; onJump?: (step: number) => void };

export function ChoiceProgress({ progress, disabled = false }: { progress: Progress; disabled?: boolean }) {
  const total = Math.max(1, progress.total), completed = Math.min(total, Math.max(0, progress.completed));
  const segments = Math.min(total, 10), filled = total > 10 ? Math.floor(completed * 10 / total) : completed;
  return <View className='choice-progress'>
    {Array.from({ length: segments }, (_, index) => {
      const target = total > 10 ? Math.ceil(index * total / segments) : index;
      return <Button key={index} className={`choice-progress-hit ${index < filled ? 'is-done' : ''} ${completed < total && index === filled ? 'is-current' : ''}`}
        ariaLabel={`第 ${target + 1} 步${target > (progress.furthest ?? completed) ? '，尚未到达' : ''}`}
        disabled={disabled || !progress.onJump || target > (progress.furthest ?? completed) || target === completed}
        onClick={() => progress.onJump?.(target)}><View className='choice-progress-line' /></Button>;
    })}
  </View>;
}

/** A native full-screen Choice Field. Text and taps stay native; only the region edges are clipped. */
export default function ChoiceField({ title, eyebrow, options, onChoose, onDirect, selected, stage = 0, progress = { completed: 0, total: 1 }, onBack, onNext, footer, children, disabled = false, aligned = false }: {
  title: string; eyebrow: string; options: NativeChoiceOption[]; onChoose: (id: string) => void;
  onDirect?: (id: string) => void; selected?: string; stage?: number; progress?: Progress;
  onBack?: () => void; onNext?: () => void; footer?: ReactNode; children?: ReactNode; disabled?: boolean; aligned?: boolean;
}) {
  const regions = useMemo(() => makeChoiceRegions(options.length), [options.length]);
  const [leaving, setLeaving] = useState<number | null>(null);
  const locked = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function choose(index: number, direct = false) {
    if (disabled || locked.current) return;
    locked.current = true;
    setLeaving(index);
    timer.current = setTimeout(() => {
      (direct ? onDirect : onChoose)?.(options[index].id);
      locked.current = false;
      setLeaving(null);
    }, 160);
  }
  const busy = disabled || leaving !== null;
  return <PageScroll key={`${eyebrow}/${stage}`}><View id='page-core' className={`choice-field choice-count-${options.length} ${aligned ? 'choice-aligned-field' : ''} ${children ? 'choice-with-extra' : ''} ${onDirect ? 'choice-with-direct' : ''}`}>
    {aligned ? <ChoiceAlignedBoard options={options} selected={selected} leaving={leaving} disabled={busy} onChoose={choose} /> : <View className='choice-board'>
      {options.map((option, index) => <Button key={option.id}
        className={`choice-region ${selected === option.id ? 'is-selected' : ''} ${leaving === index ? 'is-leaving' : ''}`}
        hoverClass='choice-region-pressed' disabled={busy} ariaLabel={`${option.label}，${option.caption}`}
        style={{ clipPath: regions[index].clip, backgroundColor: choiceSurfaces[(index + stage * 2) % choiceSurfaces.length] } as CSSProperties}
        onClick={() => choose(index)}>
        <View className='choice-region-copy' style={{ left: `${regions[index].center[0] * 100}%`, top: `${regions[index].center[1] * 100}%` }}>
          <Text className='choice-option-number'>{String(index + 1).padStart(2, '0')}{selected === option.id ? ' · 已选' : ''}</Text>
          <View className={`choice-mark choice-mark-${(index + stage) % 4}`}><View /><View /><View /></View>
          <Text className='choice-option-label'>{option.label}</Text>
          {option.caption && <Text className='choice-option-caption'>{option.caption}</Text>}
          {option.detail && <Text className='choice-option-detail'>{option.detail}</Text>}
        </View>
      </Button>)}
    </View>}
    <View className='choice-plate'>
      <View className='choice-meta'><Text>{eyebrow}</Text><Text>{progress.total > 10 ? `${Math.floor(progress.completed * 100 / progress.total)}%` : `${Math.min(progress.completed + 1, progress.total)} / ${progress.total}`}</Text></View>
      <Text className='choice-prompt'>{title}</Text>
      {aligned ? <View className='choice-aligned-nav'><Button className='choice-nav-button' ariaLabel='上一步' disabled={busy || !onBack} onClick={onBack}><View className='choice-chevron' /></Button><ChoiceProgress progress={progress} disabled={busy} /><Button className='choice-nav-button is-next' ariaLabel='下一步' disabled={busy || !onNext} onClick={onNext}><View className='choice-chevron' /></Button></View> : <ChoiceProgress progress={progress} disabled={busy} />}
    </View>
    {!aligned && onBack && <Button className='choice-edge choice-edge-back' ariaLabel='上一步' disabled={busy} onClick={onBack}><View className='choice-chevron' /></Button>}
    {!aligned && onNext && <Button className='choice-edge choice-edge-next' ariaLabel='下一步' disabled={busy} onClick={onNext}><View className='choice-chevron' /></Button>}
    {!aligned && leaving !== null && <View className='choice-bloom' style={{ left: `${regions[leaving].center[0] * 100}%`, top: `${regions[leaving].center[1] * 100}%`, backgroundColor: choiceSurfaces[(leaving + stage * 2) % choiceSurfaces.length] }} />}
    <View className='choice-bottom'>
      {onDirect && <View className='choice-direct'>{options.map((option, index) => <Button key={option.id} className="button-label choice-direct-button" disabled={busy} onClick={() => choose(index, true)}>就吃这个 · {option.label}</Button>)}</View>}
      {footer && <View className='choice-footer'>{footer}</View>}
    </View>
  </View><View className='choice-more'><MoreSection title='选项'>{children && <View className='choice-extra'>{children}</View>}<View className='choice-option-list'>{options.map((option, index) => <Button key={option.id} className='choice-list-option' disabled={busy} onClick={() => choose(index)}><View>{option.label}</View>{option.caption && <Text>{option.caption}</Text>}{option.detail && <Text>{option.detail}</Text>}</Button>)}</View></MoreSection></View></PageScroll>;
}
