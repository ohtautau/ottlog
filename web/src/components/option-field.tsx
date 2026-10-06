'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChoiceMark, surfaces } from './choice-visuals';
import { makeChoiceRegions } from '@/app/choose/choice-geometry';
import styles from '@/app/choose/choice.module.css';
import layout from './option-field.module.css';
import ChoiceStepNavigation from './choice-step-navigation';

export type FieldOption = { id: string; label: string; caption: string; detail?: string; mark?: number };

/** All explicitly named options use the Choice Field geometry, surfaces and motion. */
export default function OptionField({ title, eyebrow = 'TAU / 日常', options, onChoose, onDirect, footer, children, backHref = '/', backLabel = '↶ 返回', onBack, onNext, disabled = false, stage = 0, progress = { completed: 0, total: 1 } }: {
  title: string; eyebrow?: string; options: FieldOption[]; onChoose: (id: string) => void;
  onDirect?: (id: string) => void; footer?: ReactNode; children?: ReactNode;
  backHref?: string; backLabel?: string; onBack?: () => void; onNext?: () => void; disabled?: boolean; stage?: number;
  progress?: { completed: number; total: number; furthest?: number; onJump?: (step: number) => void };
}) {
  const total = Number.isFinite(progress.total) ? Math.max(1, Math.floor(progress.total)) : 1;
  const completed = Number.isFinite(progress.completed) ? Math.min(total, Math.max(0, Math.floor(progress.completed))) : 0;
  const percentage = Math.floor(completed * 100 / total);
  const segments = Math.min(total, 10);
  // Long flows light a segment only after crossing its full 10% threshold.
  const filled = total > 10 ? Math.floor(completed * 10 / total) : completed;
  const furthest = Math.min(total, Math.max(completed, progress.furthest ?? completed));
  const regions = useMemo(() => makeChoiceRegions(options.length), [options.length]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [leaving, setLeaving] = useState<number | null>(null);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const keyboard = useRef(false);
  const scene = options.map(option => option.id).join('|');
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (keyboard.current) { heading.current?.focus(); keyboard.current = false; } }, [scene]);
  function choose(index: number, fromKeyboard: boolean, direct = false) {
    if (locked.current || disabled) return;
    locked.current = true; keyboard.current = fromKeyboard; setLeaving(index);
    timer.current = setTimeout(() => {
      (direct ? onDirect : onChoose)?.(options[index].id);
      setLeaving(null); setHovered(null); locked.current = false;
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 320 : 440);
  }
  function navigate(action: () => void) {
    if (locked.current || disabled) return;
    keyboard.current = true; setHovered(null); action();
  }
  return <div className={`${styles.experience} ${layout.field}`} data-choice-scene data-option-field data-count={options.length} data-leaving={leaving !== null}>
    <div className={`${styles.board} ${layout.board}`} role='group' aria-label={title}>
      {options.map((option, index) => <button type='button' key={option.id} ref={node => { buttons.current[index] = node; }}
        className={styles.region} data-testid='field-option' data-option-id={option.id} disabled={disabled} aria-disabled={disabled || leaving !== null}
        aria-label={`${option.label}，${option.caption}`} data-hovered={hovered === index} data-chosen={leaving === index}
        style={{ clipPath: regions[index].clip, '--surface': surfaces[(index + stage * 2) % surfaces.length], '--cx': `${regions[index].center[0] * 100}%`, '--cy': `${regions[index].center[1] * 100}%`, '--delay': `${index * 22}ms` } as CSSProperties}
        onPointerEnter={event => { if (event.pointerType === 'mouse' && !locked.current) setHovered(index); }} onPointerLeave={() => setHovered(null)}
        onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} onClick={event => { if (event.detail <= 1) choose(index, event.detail === 0); }}
        onKeyDown={event => { const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0; if (direction) { event.preventDefault(); buttons.current[(index + direction + options.length) % options.length]?.focus(); } }}>
        <span className={styles.texture} aria-hidden='true'/><span className={styles.regionContent}>
          <span className={styles.optionNumber} aria-hidden='true'>{String(index + 1).padStart(2, '0')}<i/></span>
          <ChoiceMark variant={option.mark ?? index + stage * 3}/><span className={styles.optionLabel}>{option.label}</span>
          <span className={styles.optionCaption}>{option.caption}</span>{option.detail && <span className={layout.detail}>{option.detail}</span>}
        </span>
      </button>)}
      <svg className={styles.seams} viewBox='0 0 1000 1000' preserveAspectRatio='none' aria-hidden='true'>
        {regions.map((region, index) => <polygon key={index} points={region.path} className={hovered === index ? styles.activeSeam : ''}/>)}
        {hovered !== null && <polygon points={regions[hovered].path} className={styles.activeSeam}/>}
      </svg>
      {onDirect && <div className={layout.direct}>{options.map((option, index) => <button key={option.id} disabled={disabled || leaving !== null} onClick={event => choose(index, event.detail === 0, true)}>就吃这个 · {option.label}</button>)}</div>}
      {leaving !== null && <div className={styles.bloom} style={{ background: surfaces[(leaving + stage * 2) % surfaces.length], '--x': `${regions[leaving].center[0] * 100}%`, '--y': `${regions[leaving].center[1] * 100}%` } as CSSProperties} aria-hidden='true'/>}
    </div>
    <ChoiceStepNavigation onPrevious={onBack ? () => navigate(onBack) : undefined} onNext={onNext ? () => navigate(onNext) : undefined} disabled={disabled || leaving !== null}>
    <header className={styles.questionPlate}>
      <div className={styles.questionMeta}><span>{eyebrow}</span><span>{options.length} OPTIONS · {total > 10 ? `${percentage}%` : `${completed} / ${total}`}</span></div>
      <h1 tabIndex={-1} ref={heading} aria-live='polite'>{title}</h1>
      <div className={layout.progressValue} role='progressbar' aria-label='选择进度' aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} aria-valuetext={`当前位置 ${completed} / ${total} 步，${percentage}%`}/>
      <nav className={layout.progress} aria-label='进度跳转' data-mode={total > 10 ? 'percentage' : 'steps'} style={{ '--segments': segments } as CSSProperties}>
        {Array.from({ length: segments }, (_, index) => {
          const target = total > 10 ? Math.ceil(index * total / segments) : index;
          const label = `${total > 10 ? `${index * 10}% · ` : ''}跳转到第 ${target + 1} 步`;
          return <button type='button' key={index} className={layout.segment} data-done={index < filled} data-current={total <= 10 ? index === completed : index === Math.min(9, filled)}
            aria-label={label} title={target > furthest ? '完成前面的选择后可跳转' : label} aria-current={target === completed ? 'step' : undefined}
            disabled={disabled || leaving !== null || !progress.onJump || target > furthest || target === completed}
            onClick={() => navigate(() => progress.onJump?.(target))}><i aria-hidden='true'/></button>;
        })}
      </nav>
    </header>
    </ChoiceStepNavigation>
    {children && <div className={layout.extra}>{children}</div>}
    <nav className={styles.edgeNav} aria-label='功能导航'><Link href='/'>τ 首页</Link><div className={layout.footer}>{footer}</div>{onBack ? <button disabled={disabled || leaving !== null} onClick={() => navigate(onBack)}>{backLabel}</button> : <Link href={backHref}>{backLabel}</Link>}</nav>
  </div>;
}
