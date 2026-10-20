import { Button } from '@tarojs/components';
import type { ComponentProps, CSSProperties } from 'react';
import './ui-button.css';

type NativeProps = Omit<ComponentProps<typeof Button>, 'size'> & { 'aria-pressed'?: boolean | 'true' | 'false'; 'aria-expanded'?: boolean };
export type ButtonAppearance = 'primary' | 'secondary' | 'quiet' | 'danger' | 'icon';
export type ButtonSize = 'compact' | 'regular' | 'large';
export type ButtonWidth = 'content' | 'fill';
export type ButtonIntent = 'default' | 'danger';
export type ButtonContext = 'default' | 'overlay';
type Dimensions = { size?: ButtonSize; width?: ButtonWidth };
type ActionProps = NativeProps & Dimensions & { appearance?: ButtonAppearance; compact?: boolean; intent?: ButtonIntent; context?: ButtonContext };
type ChoiceProps = NativeProps & Dimensions & { selected?: boolean; iconOnly?: boolean; variant?: 'standard' | 'category' };

const activeClass = (className: string) => /(?:^|\s)(?:is-active|is-selected|selected)(?:\s|$)/.test(className);

function tone(appearance: ButtonAppearance, selected = false, intent: ButtonIntent = 'default', context: ButtonContext = 'default'): CSSProperties {
  if (selected) return { color: 'var(--control-selected-text)', backgroundColor: 'var(--control-selected-background)', borderColor: 'var(--control-selected-border)' };
  if (context === 'overlay') return { color: 'var(--control-overlay-text)', backgroundColor: 'var(--control-feedback-background, var(--control-overlay-background))', borderColor: 'transparent' };
  if (intent === 'danger' && (appearance === 'quiet' || appearance === 'icon')) return { color: 'var(--control-danger-text)', backgroundColor: 'var(--control-feedback-background, transparent)', borderColor: 'transparent' };
  if (intent === 'danger') return { color: 'var(--control-danger-text)', backgroundColor: 'var(--control-danger-background)', borderColor: 'var(--control-danger-border)' };
  if (appearance === 'primary') return { color: 'var(--control-primary-text)', backgroundColor: 'var(--control-primary-background)', borderColor: 'var(--control-primary-background)' };
  if (appearance === 'danger') return { color: 'var(--control-danger-text)', backgroundColor: 'var(--control-danger-background)', borderColor: 'var(--control-danger-border)' };
  if (appearance === 'quiet' || appearance === 'icon') return { color: 'var(--control-text)', backgroundColor: 'var(--control-feedback-background, transparent)', borderColor: 'transparent' };
  return { color: 'var(--control-text)', backgroundColor: 'var(--control-background)', borderColor: 'var(--control-border)' };
}

/** Preserve caller layout while protecting the shared control appearance from page CSS. */
function controlStyle(style: NativeProps['style'], appearance: ButtonAppearance, { compact = false, selected = false, row = false, category = false, size, width, intent = 'default', context = 'default' }: Dimensions & { compact?: boolean; selected?: boolean; row?: boolean; category?: boolean; intent?: ButtonIntent; context?: ButtonContext } = {}): NativeProps['style'] {
  const resolvedSize = size ?? (appearance === 'primary' && !compact ? 'large' : 'compact');
  const large = resolvedSize === 'large', icon = appearance === 'icon';
  const height = large ? 'var(--control-primary-height)' : resolvedSize === 'regular' ? 'var(--control-regular-height)' : 'var(--control-height)';
  const palette = category ? {
    color: selected ? 'var(--category-selected-text)' : 'var(--category-text)',
    backgroundColor: selected ? 'var(--category-selected-background)' : 'var(--control-feedback-background, transparent)',
    borderColor: 'transparent',
  } : tone(appearance, selected, intent, context);
  const shared: CSSProperties = {
    ...(row ? { color: palette.color, backgroundColor: palette.backgroundColor } : palette),
    fontFamily: 'var(--control-font-family)',
    fontSize: category ? 'var(--category-font-size)' : icon ? '22px' : large ? 'var(--control-primary-font-size)' : 'var(--control-font-size)',
    fontWeight: category ? 'var(--category-font-weight)' : large && appearance === 'primary' ? 'var(--control-primary-font-weight)' : 'var(--control-font-weight)',
    lineHeight: 'var(--control-line-height)',
    letterSpacing: 0,
    textTransform: 'none',
    backgroundImage: 'none', boxShadow: 'none', textShadow: 'none',
    ...(!row ? { borderRadius: context === 'overlay' ? '50%' : category ? 'var(--category-radius)' : 'var(--control-radius)', borderWidth: category ? '0' : '1px', borderStyle: 'solid' } : {}),
    minHeight: height,
    height: icon ? height : 'auto',
    padding: category ? '6px 8px' : icon ? '0' : large ? '10px 16px' : resolvedSize === 'regular' ? '10px 12px' : '8px 10px',
    ...(icon || category ? { minWidth: height } : {}),
    ...(width === 'content' ? { display: 'inline-flex', width: 'auto', maxWidth: '100%', alignSelf: 'flex-start', justifySelf: 'start', flex: 'none' } : width === 'fill' ? { width: '100%', maxWidth: '100%', alignSelf: 'stretch' } : {}),
    ...(size || width ? { whiteSpace: 'normal', overflowWrap: 'anywhere' } : {}),
  };
  if (typeof style === 'string') {
    const css = Object.entries(shared).map(([key, value]) => `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}:${value}`).join(';');
    return `${style};${css}`;
  }
  return { ...style, ...shared };
}

// Existing action class names remain layout hooks during migration; new callers specify appearance.
function legacyAppearance(className: string, children: NativeProps['children']): ButtonAppearance {
  if (/tool-danger|domain-remove|domain-delete|motto-remove/.test(className)) return 'danger';
  if (/tool-primary|daily-check-primary|daily-reflection-done|focus-start|home-editor-save|account-submit/.test(className)) return 'primary';
  if (typeof children === 'string' && /^[×✕＋+↑↓‹›]$/.test(children.trim()) || /(?:^|\s)(?:todo-complete|todo-time-order|memo-pin-setting|memo-icon-picker)(?:\s|$)/.test(className)) return 'icon';
  if (/domain-quiet|todo-schedule-row|completed-toggle/.test(className)) return 'quiet';
  return 'secondary';
}

export default function ActionButton({ appearance, compact = false, size, width, intent = 'default', context = 'default', className = '', style, children, disabled, hoverClass, ...props }: ActionProps) {
  const kind = appearance || legacyAppearance(className, children);
  const borderless = kind === 'quiet' || kind === 'icon';
  return <Button {...props} disabled={disabled} hoverClass={disabled ? 'none' : hoverClass ?? (borderless ? 'ui-control-pressed' : undefined)} className={`button-label ui-button ui-button-${kind}${borderless ? ' ui-control-borderless' : ''}${context === 'overlay' ? ' ui-control-overlay' : ''} ${className}`} style={controlStyle(style, kind, { compact, size, width, intent, context, row: /(?:^|\s)todo-schedule-row(?:\s|$)/.test(className) })}>{children}</Button>;
}

export function ChoiceButton({ selected, iconOnly = false, variant = 'standard', size, width, className = '', style, children, disabled, hoverClass, ...props }: ChoiceProps) {
  const chosen = selected ?? (props['aria-pressed'] === true || props['aria-pressed'] === 'true' || activeClass(className));
  const category = variant === 'category';
  const borderless = (iconOnly || category) && !chosen;
  return <Button {...props} disabled={disabled} hoverClass={disabled ? 'none' : hoverClass ?? (borderless ? 'ui-control-pressed' : undefined)} aria-pressed={chosen} className={`button-label ui-choice${category ? ' ui-category' : ''}${chosen ? ' is-selected' : ''}${borderless ? ' ui-control-borderless' : ''} ${className}`} style={controlStyle(style, iconOnly ? 'icon' : 'secondary', { compact: true, size, width, selected: chosen, category })}>{children}</Button>;
}

export function choiceControlStyle(selected = false, dimensions: Dimensions = {}): NativeProps['style'] {
  return controlStyle(undefined, 'secondary', { compact: true, selected, ...dimensions });
}
