'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { choiceCustomLimit, choiceQuestions, deriveChoiceResult } from './choice-data';
import { makeChoiceRegions } from './choice-geometry';
import styles from './choice.module.css';

import { ChoiceMark, surfaces } from '@/components/choice-visuals';
import ChoiceStepNavigation from '@/components/choice-step-navigation';

export default function ChoiceExperience() {
  const [answers, setAnswers] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const customDialog = useRef<HTMLDialogElement>(null);
  const customInput = useRef<HTMLTextAreaElement>(null);
  const keyboardChoice = useRef(false);
  const total = choiceQuestions.length;
  const complete = step === total;
  const question = choiceQuestions[Math.min(step, choiceQuestions.length - 1)];
  const regions = useMemo(() => makeChoiceRegions(question.options.length), [question.options.length]);
  const result = complete ? deriveChoiceResult(answers) : null;
  const selectedOptions = answers.map((id, index) => choiceQuestions[index].options.find(option => option.id === id)!);
  const closingOption = complete ? selectedOptions[total - 1] : null;
  const closingLine = closingOption?.custom ? customAnswer : closingOption?.label;
  const sectorAngle = 360 / total;
  const sectorEnd = [300 + Math.sin(sectorAngle * Math.PI / 180) * 300, 300 - Math.cos(sectorAngle * Math.PI / 180) * 300];

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update);
    return () => { media.removeEventListener('change', update); if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    if (keyboardChoice.current) { heading.current?.focus({ preventScroll: true }); keyboardChoice.current = false; }
  }, [step]);

  function choose(index: number, keyboard = false, text?: string) {
    if (locked.current || complete) return;
    if (question.options[index].custom) {
      if (text === undefined) {
        customDialog.current?.showModal();
        customInput.current?.focus({ preventScroll: true });
        return;
      }
      const trimmed = text.replace(/\s+/g, ' ').trim();
      if (!trimmed || trimmed.length > choiceCustomLimit) return;
      setCustomAnswer(trimmed);
      setCustomDraft(trimmed);
      customDialog.current?.close();
    }
    locked.current = true;
    keyboardChoice.current = keyboard;
    setLeaving(index);
    timer.current = setTimeout(() => {
      setAnswers(previous => previous[step] === question.options[index].id ? previous : [...previous.slice(0, step), question.options[index].id]);
      setStep(step + 1);
      setLeaving(null); setHovered(null); locked.current = false;
    }, reduced ? 320 : 440);
  }
  function goBack(index = Math.max(0, step - 1)) {
    if (locked.current) return;
    setStep(Math.min(answers.length, Math.max(0, index))); setHovered(null);
    keyboardChoice.current = true;
  }
  function restart() {
    if (locked.current) return;
    goBack(0);
    setAnswers([]);
    setCustomDraft(''); setCustomAnswer('');
  }

  return <div className={styles.experience} data-choice-scene data-testid='choice-experience' data-step={step} data-count={question.options.length} data-leaving={leaving !== null} style={{ '--rounds': total } as CSSProperties}>
    {!complete && <div className={styles.board} key={step} role='group' aria-label={`第 ${step + 1} 题：${question.prompt}`}>
      {question.options.map((option, index) => {
        const region = regions[index];
        const color = surfaces[(index + step * 2) % surfaces.length];
        return <button key={option.id} ref={node => { optionRefs.current[index] = node; }} type='button' className={styles.region} data-testid='choice-option'
          aria-label={`${index + 1}. ${option.label}，${option.caption}`} aria-disabled={leaving !== null}
          aria-haspopup={option.custom ? 'dialog' : undefined}
          data-hovered={hovered === index} data-chosen={leaving === index}
          style={{ clipPath: region.clip, '--surface': color, '--cx': `${region.center[0] * 100}%`, '--cy': `${region.center[1] * 100}%`, '--delay': `${index * 22}ms` } as CSSProperties}
          onPointerEnter={event => { if (event.pointerType === 'mouse' && !locked.current) setHovered(index); }} onPointerLeave={() => setHovered(null)}
          onFocus={() => { if (!locked.current) setHovered(index); }} onBlur={() => setHovered(null)}
          onClick={event => { if (option.custom || event.detail <= 1) choose(index, event.detail === 0); }}
          onKeyDown={event => {
            const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
            if (direction) { event.preventDefault(); optionRefs.current[(index + direction + question.options.length) % question.options.length]?.focus({ preventScroll: true }); }
          }}>
          <span className={styles.texture} aria-hidden='true'/>
          <span className={styles.regionContent}>
            <span className={styles.optionNumber} aria-hidden='true'>{String(index + 1).padStart(2, '0')}<i/></span>
            <ChoiceMark variant={index + step * 3}/>
            <span className={styles.optionLabel}>{option.label}</span>
            <span className={styles.optionCaption}>{option.caption}</span>
          </span>
        </button>;
      })}
      <svg className={styles.seams} viewBox='0 0 1000 1000' preserveAspectRatio='none' aria-hidden='true'>
        {regions.map((region, index) => <polygon key={index} points={region.path} className={hovered === index ? styles.activeSeam : ''}/>)}
        {hovered !== null && <polygon points={regions[hovered].path} className={styles.activeSeam}/>}
      </svg>
    </div>}

    {result && <div className={styles.result} data-testid='choice-result'>
      <div className={styles.resultArt} aria-hidden='true'>
        <svg viewBox='0 0 600 600'><defs><clipPath id='choice-result-disc'><circle cx='300' cy='300' r='240'/></clipPath></defs>
          <g clipPath='url(#choice-result-disc)'>{answers.map((id, index) => {
            const selected = choiceQuestions[index].options.findIndex(option => option.id === id);
            return <g key={id} transform={`rotate(${index * sectorAngle} 300 300)`}><path d={`M300 300 300 0 A300 300 0 0 1 ${sectorEnd[0]} ${sectorEnd[1]}Z`} fill={surfaces[(selected + index * 2) % surfaces.length]} stroke='#14242c' strokeWidth='4'/><circle cx='365' cy='118' r={12 + selected * 3} fill='none' stroke='#f1e8d4' strokeWidth='4'/><path d={`M315 ${100 + selected * 11}h56`} stroke='#f1e8d4' strokeWidth='4'/></g>;
          })}</g><circle cx='300' cy='300' r='250' fill='none' stroke='#b0bbb2' strokeWidth='2' strokeDasharray='2 12'/><circle cx='300' cy='300' r='69' fill='#14242c'/><text x='300' y='320' textAnchor='middle' fill='#f1e8d4' fontSize='54' fontFamily='Arial'>{String(total).padStart(2, '0')}</text>
        </svg><span>YOUR CHOICES, IN ORBIT.</span>
      </div>
      <div className={styles.resultCopy}><p className={styles.eyebrow}>九次直觉，一种此刻的形状。</p><h2>{result.title}</h2><p className={styles.resultDescription}>{result.description}</p>
        <blockquote className={styles.closingLine} data-testid='choice-result-quote'><small>留给此刻</small><p>{closingLine}</p></blockquote>
        <div className={styles.keywords}>{result.keywords.map(word => <span key={word}>{word}</span>)}</div>
        <div className={styles.scores}>{result.scores.map((value, index) => <div key={index}><span>{result.labels[index]}<b>{value}</b></span><i style={{ '--score': `${value}%` } as CSSProperties}/></div>)}</div>
        <p className={styles.resultNote}>{result.explanation}</p>
        <button className={styles.restart} type='button' onClick={restart}>重来一次 <span aria-hidden='true'>↻</span></button>
      </div>
      <div className={styles.answerTrail}>{selectedOptions.map((option, index) => <button key={option.id} type='button' onClick={() => goBack(index)} aria-label={`回到第 ${index + 1} 题`} title={option.custom ? customAnswer : option.label}><small>{String(index + 1).padStart(2, '0')}</small><span>{option.custom ? customAnswer : option.label}</span></button>)}</div>
    </div>}

    <ChoiceStepNavigation onPrevious={step ? () => goBack() : undefined} onNext={step < answers.length ? () => goBack(step + 1) : undefined} disabled={leaving !== null}>
    <header className={styles.questionPlate}>
      <div className={styles.questionMeta}><span>选境 <i>/</i> CHOICE FIELD</span><span>{complete ? '完成' : String(step + 1).padStart(2, '0')} <i>/</i> {String(total).padStart(2, '0')}</span></div>
      <h1 ref={heading} tabIndex={-1} aria-live='polite'>{complete ? '这是，你选出的形状。' : question.prompt}</h1>
      <div className={styles.progress} aria-label={`已完成 ${step} / ${total} 题`}>{choiceQuestions.map((item, index) => <button key={item.id} type='button' disabled={index > answers.length || index === step || leaving !== null} aria-label={`回到第 ${index + 1} 题`} aria-current={index === step ? 'step' : undefined} onClick={() => goBack(index)} data-done={index < step}><span/></button>)}</div>
    </header>
    </ChoiceStepNavigation>
    <nav className={styles.edgeNav} aria-label='选择体验导航'>
      <Link href='/' aria-label='返回首页' className={styles.home}><span aria-hidden='true'>τ</span><span>首页</span></Link>
      <span className={styles.edgeCaption}>{complete ? '每次选择，都可以不同。' : `${question.options.length} 个选项 · 跟着直觉，点一块颜色。`}</span>
      <button type='button' aria-label='返回上一步' disabled={!step || leaving !== null} onClick={() => goBack()}><span aria-hidden='true'>↶</span> 返回</button>
    </nav>
    {leaving !== null && <div className={styles.bloom} style={{ background: surfaces[(leaving + step * 2) % surfaces.length], '--x': `${regions[leaving].center[0] * 100}%`, '--y': `${regions[leaving].center[1] * 100}%` } as CSSProperties} aria-hidden='true'/>}
    <dialog ref={customDialog} className={styles.customDialog} data-testid='choice-custom-dialog' aria-labelledby='choice-custom-title'>
      <form onSubmit={event => { event.preventDefault(); choose(question.options.findIndex(option => option.custom), true, customDraft); }}>
        <span className={styles.customEyebrow}>最后一块 · 由你落笔</span>
        <h2 id='choice-custom-title'>用自己的话。</h2>
        <label htmlFor='choice-custom-answer'>自定义回答</label>
        <textarea id='choice-custom-answer' ref={customInput} data-testid='choice-custom-answer' value={customDraft} onChange={event => setCustomDraft(event.target.value)} maxLength={choiceCustomLimit} rows={3} placeholder='此刻，想留下一句什么？' aria-describedby='choice-custom-count' required/>
        <p id='choice-custom-count' className={styles.customCount}>{customDraft.length} / {choiceCustomLimit}</p>
        <div className={styles.customActions}><button type='button' onClick={() => customDialog.current?.close()}>取消</button><button type='submit' disabled={!customDraft.trim()}>用这句话</button></div>
      </form>
    </dialog>
  </div>;
}
