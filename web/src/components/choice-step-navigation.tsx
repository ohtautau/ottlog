import type { ReactNode } from 'react';
import styles from './choice-step-navigation.module.css';

export default function ChoiceStepNavigation({ children, onPrevious, onNext, disabled = false }: {
  children: ReactNode; onPrevious?: () => void; onNext?: () => void; disabled?: boolean;
}) {
  return <div className={styles.row}>
    <button type='button' className={styles.arrow} aria-label='上一步' title='上一步' disabled={disabled || !onPrevious} onClick={onPrevious}>
      <svg viewBox='0 0 12 56' aria-hidden='true'><path d='M9 4 3 28 9 52'/></svg>
    </button>
    {children}
    <button type='button' className={styles.arrow} aria-label='下一步' title='下一步' disabled={disabled || !onNext} onClick={onNext}>
      <svg viewBox='0 0 12 56' aria-hidden='true'><path d='M3 4 9 28 3 52'/></svg>
    </button>
  </div>;
}
