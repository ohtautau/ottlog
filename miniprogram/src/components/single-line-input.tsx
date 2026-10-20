import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Input, View } from '@tarojs/components';
import './single-line-input.css';

/** A native input and a read-only line use the same protected frame. */
export function SingleLineField({ children, className = '', size = 'regular', ...props }: ComponentProps<typeof View> & { children: ReactNode; size?: 'compact' | 'regular' }) {
  return <View {...props} className={`single-line-field is-${size} ${className}`}>{children}</View>;
}

/** Numeric settings keep their inputs and units centered together in small windows. */
export function NumericInputRow({ children, className = '', ...props }: ComponentProps<typeof View> & { children: ReactNode }) {
  return <View {...props} className={`numeric-input-row ${className}`}>{children}</View>;
}

/** The touch frame and native text line have separate, protected geometry. */
export default function SingleLineInput({ className = '', frameClassName = '', size = 'regular', align = 'center', trailing, focus = false, onBlur, style, ...props }: ComponentProps<typeof Input> & {
  frameClassName?: string; size?: 'compact' | 'regular'; align?: 'left' | 'center'; trailing?: ReactNode;
}) {
  const [focused, setFocused] = useState(focus);
  useEffect(() => { setFocused(focus); }, [focus]);
  const numeric = props.type === 'number' || props.type === 'digit';
  const numericFrame = numeric ? { flex: 'none', width: 'var(--numeric-input-width)', minWidth: 'var(--numeric-input-width)', maxWidth: 'var(--numeric-input-width)', height: 'var(--numeric-input-height)', minHeight: 'var(--numeric-input-height)' } : undefined;
  const lineStyle = { display: 'block', boxSizing: 'border-box' as const, flex: '1', width: '100%', minWidth: '0', height: '24px', minHeight: '24px',
    margin: '0', padding: '0', border: '0', borderRadius: '0', background: 'transparent', color: 'inherit', fontSize: '16px', lineHeight: '24px', textAlign: align };
  return <SingleLineField size={numeric ? 'compact' : size} className={`${numeric ? 'is-numeric' : ''} ${frameClassName}`} style={numericFrame} onClick={() => { if (!props.disabled) setFocused(true); }}>
    <Input {...props} focus={focused} onBlur={event => { setFocused(false); onBlur?.(event); }}
      className={`single-line-input ${className}`} style={typeof style === 'string' ? `${style};display:block;box-sizing:border-box;flex:1;width:100%;min-width:0;height:24px;min-height:24px;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:inherit;font-size:16px;line-height:24px;text-align:${align}` : { ...style, ...lineStyle }} />
    {trailing}
  </SingleLineField>;
}
