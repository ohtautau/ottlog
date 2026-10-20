import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Taro from '@tarojs/taro';

type TouchEvent = { touches?: { clientX: number; clientY: number }[]; stopPropagation: () => void };
type Rect = { id: string; left: number; right: number; top: number; bottom: number; height: number };
type Drag = { id: string; target: string; startX: number; startY: number; pointX: number; pointY: number; x: number; y: number; startScroll: number; rects: Rect[]; viewport: Rect | null; maxScroll: number };

export default function useGrowthDomainSort(ids: string[], enabled: boolean, onChange: (ids: string[]) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [scrollTop, setScrollTop] = useState<number>();
  const dragging = useRef<Drag | null>(null);
  const scroll = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  function stop() { if (timer.current) clearInterval(timer.current); timer.current = null; }
  useEffect(() => () => { stop(); dragging.current = null; }, []);
  useEffect(() => { if (!enabled) { stop(); dragging.current = null; setDrag(null); setScrollTop(undefined); } }, [enabled]);
  function refresh(current: Drag) {
    if (!current.rects.length) return;
    const offset = scroll.current - current.startScroll;
    current.x = current.pointX - current.startX;
    current.y = current.pointY - current.startY + offset;
    const viewport = current.viewport;
    const within = viewport && current.pointX >= viewport.left && current.pointX <= viewport.right;
    const distance = (rect: Rect) => Math.hypot((rect.left + rect.right) / 2 - current.pointX, (rect.top + rect.bottom) / 2 - offset - current.pointY);
    const nearest = within ? current.rects.reduce((best, rect) => distance(rect) < distance(best) ? rect : best) : null;
    current.target = nearest ? nearest.id.slice('growth-sort-'.length) : current.id;
    setDrag({ ...current });
  }
  function start(event: TouchEvent, id: string) {
    if (!enabled || event.touches?.length !== 1) return;
    event.stopPropagation(); stop();
    const point = event.touches[0];
    const current: Drag = { id, target: id, startX: point.clientX, startY: point.clientY, pointX: point.clientX, pointY: point.clientY, x: 0, y: 0, startScroll: scroll.current, rects: [], viewport: null, maxScroll: 0 };
    dragging.current = current;
    const query = Taro.createSelectorQuery();
    query.selectAll('.growth-domain-scroll .growth-sort-tile').boundingClientRect();
    query.select('.growth-domain-scroll').boundingClientRect();
    query.select('.growth-domain-scroll').scrollOffset();
    query.select('.growth-domain-scroll .growth-domain-grid').boundingClientRect();
    query.exec(result => {
      if (dragging.current !== current) return;
      current.rects = Array.isArray(result[0]) ? result[0] : [];
      current.viewport = result[1];
      current.maxScroll = Math.max(0, (result[3]?.height || 0) - (result[1]?.height || 0));
      if (typeof result[2]?.scrollTop === 'number') { current.startScroll = result[2].scrollTop; scroll.current = result[2].scrollTop; }
      refresh(current);
      timer.current = setInterval(() => {
        const viewport = current.viewport;
        if (!viewport || dragging.current !== current) return;
        const edge = Math.min(40, viewport.height / 5);
        const direction = current.pointY < viewport.top + edge ? -1 : current.pointY > viewport.bottom - edge ? 1 : 0;
        if (direction) setScrollTop(Math.min(current.maxScroll, Math.max(0, scroll.current + direction * 16)));
      }, 40);
    });
  }
  function move(event: TouchEvent) {
    const current = dragging.current;
    if (!current) return;
    event.stopPropagation();
    if (event.touches?.length !== 1) { finish(false); return; }
    current.pointX = event.touches[0].clientX; current.pointY = event.touches[0].clientY;
    refresh(current);
  }
  function finish(commit: boolean) {
    const current = dragging.current;
    stop(); dragging.current = null; setDrag(null);
    if (!commit || !current || current.id === current.target) return;
    const from = ids.indexOf(current.id), to = ids.indexOf(current.target);
    if (from < 0 || to < 0) return;
    const next = [...ids]; next.splice(from, 1); next.splice(to, 0, current.id); onChange(next);
  }
  return {
    active: !!drag, scrollTop,
    bind: (id: string) => !enabled ? { id: `growth-sort-${id}` } : {
      id: `growth-sort-${id}`, style: drag?.id === id ? { transform: `translate(${drag.x}px, ${drag.y}px)` } as CSSProperties : undefined,
      onTouchStart: (event: TouchEvent) => start(event, id), onTouchMove: move,
      onTouchEnd: () => finish(true), onTouchCancel: () => finish(false),
    },
    className: (id: string) => ` growth-sort-tile${drag?.id === id ? ' is-dragging' : ''}${drag?.target === id && drag.id !== id ? ' is-drop-target' : ''}`,
    onScroll: (event: { detail: { scrollTop: number } }) => { scroll.current = event.detail.scrollTop; if (dragging.current) refresh(dragging.current); },
  };
}
