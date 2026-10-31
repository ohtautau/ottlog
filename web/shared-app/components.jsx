import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { websiteRoute } from './routes';

const asset = source => /^\/(?:assets\/|pages\/pomodoro\/assets\/)/.test(source || '') ? `/tool-app${source}` : source;
function domProps(props) {
  const result = { ...props, 'aria-label': props.ariaLabel || props['aria-label'] };
  for (const key of ['ariaLabel', 'hoverClass', 'hoverStartTime', 'hoverStayTime', 'catchMove', 'onLongPress', 'animation', 'disableScroll']) delete result[key];
  if (/\btime-wheel\b/.test(props.className || '') && /\bis-disabled\b/.test(props.className || '')) { result.inert = true; result['aria-disabled'] = true; }
  return result;
}
function useGestures(props) {
  const hold = useRef(), start = useRef(), latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; }, [props]);
  useEffect(() => () => clearTimeout(hold.current), []);
  function touch(event, ending = false) { const point = { identifier: event.pointerId, clientX: event.clientX, clientY: event.clientY, pageX: event.pageX, pageY: event.pageY }; return { target: event.target, currentTarget: event.currentTarget, timeStamp: event.timeStamp, touches: ending ? [] : [point], changedTouches: [point], detail: { x: point.clientX, y: point.clientY }, preventDefault: () => event.preventDefault(), stopPropagation: () => event.stopPropagation() }; }
  return {
    onPointerDown(event) {
      if (event.button !== 0) return;
      const t = touch(event); start.current = { x: event.clientX, y: event.clientY };
      if (event.pointerType === 'mouse') latest.current.onTouchStart?.(t);
      if (props.onLongPress) {
        const owner = event.currentTarget, pointer = event.pointerId;
        hold.current = setTimeout(() => { if (!start.current) return; if (latest.current.onTouchMove && owner.isConnected) owner.setPointerCapture(pointer); latest.current.onLongPress?.(t); }, 500);
      }
    },
    onPointerMove(event) { if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) clearTimeout(hold.current); if (event.pointerType === 'mouse' && start.current) latest.current.onTouchMove?.(touch(event)); },
    onPointerUp(event) { clearTimeout(hold.current); if (event.pointerType === 'mouse' && start.current) latest.current.onTouchEnd?.(touch(event, true)); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); start.current = null; },
    onPointerCancel(event) { clearTimeout(hold.current); if (event.pointerType === 'mouse') latest.current.onTouchCancel?.(touch(event, true)); start.current = null; },
    onContextMenu: props.onLongPress ? event => { event.preventDefault(); latest.current.onLongPress?.(touch(event)); } : undefined,
  };
}
const basic = tag => function Element({ children, ...props }) {
  const gestures = useGestures(props);
  return React.createElement(tag, { ...domProps(props), ...gestures }, children);
};
export const View = basic('div'), Text = basic('span'), Label = basic('label'), Form = basic('form');
export function ScrollView({ children, scrollY, scrollX, scrollIntoView, scrollTop, scrollLeft, onScroll, scrollWithAnimation, enhanced, bounces, showScrollbar, lowerThreshold = 50, onScrollToLower, ...props }) {
  const ref = useRef(); const gestures = useGestures(props);
  useEffect(() => { if (ref.current && scrollTop !== undefined) ref.current.scrollTop = scrollTop; }, [scrollTop]);
  useEffect(() => { if (ref.current && scrollLeft !== undefined) ref.current.scrollLeft = scrollLeft; }, [scrollLeft]);
  useEffect(() => { const root = ref.current, target = scrollIntoView && document.getElementById(scrollIntoView); if (!root || !target || !root.contains(target)) return; const a = root.getBoundingClientRect(), b = target.getBoundingClientRect(); if (scrollY) root.scrollTop += b.top - a.top; if (scrollX) root.scrollLeft += b.left - a.left; }, [scrollIntoView, scrollY, scrollX]);
  return <div {...domProps(props)} {...gestures} ref={ref} data-enhanced-scroll={enhanced ? 'true' : undefined} data-scroll-enabled='true' data-scrollbar-hidden={showScrollbar === false ? 'true' : undefined} style={{ ...props.style, overflowY: scrollY ? 'auto' : undefined, overflowX: scrollX ? 'auto' : scrollX === false || scrollY ? 'hidden' : undefined, overscrollBehavior: bounces === false ? 'contain' : undefined }} onScroll={event => { const node = event.currentTarget; onScroll?.({ detail: { scrollTop: node.scrollTop, scrollLeft: node.scrollLeft } }); if (node.scrollHeight - node.scrollTop - node.clientHeight < lowerThreshold) onScrollToLower?.(); }}>{children}</div>;
}
export function Button({ children, loading, disabled, openType, formType, ...props }) {
  const gestures = useGestures(disabled ? {} : props);
  return <button {...domProps(props)} {...gestures} type='button' disabled={disabled} aria-busy={loading || undefined}>{children}</button>;
}
export function Image({ src, mode, lazyLoad, webp, showMenuByLongpress, ...props }) { return <img {...domProps(props)} src={asset(src)} alt={props.alt || ''} loading={lazyLoad ? 'lazy' : undefined} style={{ objectFit: mode === 'aspectFill' ? 'cover' : 'contain', ...props.style }} />; }
function requestInputFocus(node) {
  const active = document.activeElement;
  // Shared forms request initial focus after opening. Keep a user's newer field
  // selection when that delayed request arrives during typing or pasting.
  if (active !== node && active?.matches('input,textarea,select,[contenteditable="true"]')) return false;
  node.focus(); return true;
}
export function Input({ onInput, onConfirm, maxlength, password, type, confirmType, cursorSpacing, adjustPosition, focus, selectionStart, selectionEnd, ...props }) {
  const ref = useRef();
  useEffect(() => { if (!focus || !ref.current || !requestInputFocus(ref.current)) return; if (selectionStart >= 0 && selectionEnd >= 0) ref.current.setSelectionRange(selectionStart, selectionEnd); }, [focus, selectionStart, selectionEnd]);
  const numeric = type === 'number' || type === 'digit';
  return <input {...domProps(props)} ref={ref} maxLength={maxlength} type={password ? 'password' : numeric ? 'text' : type || 'text'} inputMode={numeric ? type === 'digit' ? 'decimal' : 'numeric' : undefined} onChange={event => onInput?.({ detail: { value: event.target.value } })} onKeyDown={event => { props.onKeyDown?.(event); if (event.key === 'Enter' && !event.nativeEvent.isComposing) onConfirm?.({ detail: { value: event.target.value } }); }} />;
}
export function Textarea({ onInput, onConfirm, maxlength, autoHeight, showConfirmBar, fixed, focus, confirmType, cursorSpacing, adjustPosition, disableDefaultPadding, placeholderStyle, ...props }) {
  const ref = useRef();
  useEffect(() => { if (focus && ref.current) requestInputFocus(ref.current); }, [focus]);
  useLayoutEffect(() => { if (autoHeight && ref.current) { const node = ref.current; node.style.height = '0px'; node.style.height = `${Math.max(node.scrollHeight, parseFloat(getComputedStyle(node).minHeight) || 0)}px`; } }, [autoHeight, props.value]);
  return <textarea {...domProps(props)} ref={ref} maxLength={maxlength} onChange={event => onInput?.({ detail: { value: event.target.value } })} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && confirmType === 'done' && !event.nativeEvent.isComposing) { event.preventDefault(); onConfirm?.({ detail: { value: event.target.value } }); } }} />;
}
export function Picker({ children, range = [], rangeKey, value = 0, mode, start, end, disabled, onChange, ...props }) {
  return <div {...domProps(props)} className={`browser-picker ${props.className || ''}`}>{children}{mode === 'date' || mode === 'time' ? <input aria-label={mode === 'date' ? '选择日期' : '选择时间'} type={mode} min={start} max={end} value={value || ''} disabled={disabled} onChange={event => onChange?.({ detail: { value: event.target.value } })} /> : <select aria-label='筛选选择' value={value} disabled={disabled} onChange={event => onChange?.({ detail: { value: Number(event.target.value) } })}>{range.map((item, i) => <option key={i} value={i}>{rangeKey ? item[rangeKey] : item}</option>)}</select>}</div>;
}
export function PickerViewColumn({ children }) { return <>{children}</>; }
function WheelColumn({ column, selected, rowHeight, onSelect, onStart, onEnd }) {
  const items = React.Children.toArray(column.props.children), ref = useRef(), moving = useRef(false), timer = useRef(), drag = useRef(), suppressClick = useRef(false), current = useRef(selected);
  const [scrolling, setScrolling] = useState(false);
  const label = column.props.ariaLabel || column.props['aria-label'];
  function begin() { if (!moving.current) { moving.current = true; setScrolling(true); onStart?.(); } }
  function settle() { clearTimeout(timer.current); timer.current = setTimeout(() => { moving.current = false; setScrolling(false); const index = Math.min(items.length - 1, Math.max(0, current.current)); if (ref.current) ref.current.scrollTop = index * rowHeight; onEnd?.(); }, 150); }
  useLayoutEffect(() => { current.current = selected; if (ref.current && !moving.current) ref.current.scrollTop = selected * rowHeight; }, [selected, items.length, rowHeight]);
  useEffect(() => () => { clearTimeout(timer.current); onEnd?.(); }, []);
  function pick(index) { const bounded = Math.max(0, Math.min(items.length - 1, index)); current.current = bounded; onSelect(bounded); if (ref.current) ref.current.scrollTop = bounded * rowHeight; }
  return <div className='browser-wheel-column' style={{ '--browser-wheel-row': `${rowHeight}px` }}>
    <div className='browser-wheel-scroll' role='listbox' aria-label={label} aria-activedescendant={`${label}-${selected}`} data-moving={scrolling} tabIndex={0} ref={ref}
      onKeyDown={event => { const step = ({ ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 })[event.key]; if (step !== undefined || event.key === 'Home' || event.key === 'End') { event.preventDefault(); pick(event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : current.current + step); } }}
      onWheel={() => { begin(); settle(); }}
      onScroll={event => { const index = Math.min(items.length - 1, Math.max(0, Math.round(event.currentTarget.scrollTop / rowHeight))); if (index !== current.current) { begin(); current.current = index; onSelect(index); } if (moving.current) settle(); }}
      onPointerDown={event => { suppressClick.current = false; begin(); if (event.pointerType !== 'mouse' || event.button !== 0) return; drag.current = { y: event.clientY, top: event.currentTarget.scrollTop, moved: false }; }}
      onPointerMove={event => { if (!drag.current) return; const delta = drag.current.y - event.clientY; if (Math.abs(delta) > 3) { drag.current.moved = true; if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId); } if (drag.current.moved) event.currentTarget.scrollTop = drag.current.top + delta; }}
      onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); suppressClick.current = !!drag.current?.moved; if (suppressClick.current) event.preventDefault(); drag.current = null; settle(); }}
      onPointerCancel={() => { drag.current = null; settle(); }}>
      {items.map((item, index) => <div id={`${label}-${index}`} role='option' aria-selected={selected === index} key={item.key || index} className='browser-wheel-option' onClick={() => { if (!suppressClick.current) pick(index); suppressClick.current = false; }}>{item}</div>)}
    </div><div className='browser-wheel-indicator' aria-hidden />
  </div>;
}
export function PickerView({ children, value = [], onChange, onPickStart, onPickEnd, indicatorStyle, indicatorClass, maskStyle, maskClass, immediateChange, ...props }) {
  const latest = useRef(value); useLayoutEffect(() => { latest.current = value; }, [value]);
  const height = Number(indicatorStyle?.match(/height:\s*(\d+)px/)?.[1] || 32);
  return <div {...domProps(props)} style={{ ...props.style, display: 'flex' }}>{React.Children.map(children, (column, index) => <WheelColumn column={column} selected={value[index] || 0} rowHeight={height} onStart={() => onPickStart?.({})} onEnd={() => onPickEnd?.({})} onSelect={selected => { const next = [...latest.current]; next[index] = selected; latest.current = next; onChange?.({ detail: { value: next } }); }} />)}</div>;
}
export function RichText({ nodes, ...props }) { return <div {...domProps(props)} dangerouslySetInnerHTML={{ __html: typeof nodes === 'string' ? nodes : '' }} />; }
export const Swiper = basic('div'), SwiperItem = basic('div');
export const Navigator = ({ url, children, ...props }) => <a {...domProps(props)} href={websiteRoute(url)}>{children}</a>;
export function Switch({ checked, disabled, onChange, color, ...props }) { return <input {...domProps(props)} role='switch' type='checkbox' checked={checked} disabled={disabled} onChange={event => onChange?.({ detail: { value: event.target.checked } })} style={{ width: 40, minHeight: 30, accentColor: color }} />; }
