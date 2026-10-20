import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Taro from '@tarojs/taro';

type TouchPoint = { clientX: number; clientY: number; identifier?: number };
type TouchEvent = { touches?: TouchPoint[]; changedTouches?: TouchPoint[]; stopPropagation: () => void; preventDefault?: () => void };
const singleTouch = (points?: TouchPoint[]) => points && points.length === 1 ? points[0] : null;
type Rect = { id: string; left: number; right: number; top: number; bottom: number; height: number };
type Drag = { id: string; target: string; scrollId: string; context: string; startX: number; startY: number; pointX: number; pointY: number; x: number; y: number; startScroll: number; rects: Rect[]; viewport: Rect | null; maxScroll: number };
type ScrollEvent = { detail: { scrollTop: number } };
const defaultScrollId = 'daily-habit-scroll';

export default function useHabitGridSort(ids: string[], enabled: boolean, onChange: (ids: string[]) => void, context: string, onSwipe: (direction: number) => void, canSwipe: (direction: number) => boolean = () => true, groupForId?: (id: string) => string, scrollIdForItem?: (id: string) => string) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [scrollTop, setScrollTop] = useState<number>();
  const dragging = useRef<Drag | null>(null);
  const scroll = useRef(0);
  const scrollPositions = useRef<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ point: TouchPoint; id: string; context: string } | null>(null);
  const latest = useRef({ ids, enabled, onChange, context, onSwipe, canSwipe, groupForId, scrollIdForItem }); latest.current = { ids, enabled, onChange, context, onSwipe, canSwipe, groupForId, scrollIdForItem };
  const swipe = useRef<{ point: TouchPoint; context: string } | null>(null);
  const blockedClickUntil = useRef(0);
  const locks = useRef<{ node: Taro.ScrollViewContext; enabled: boolean }[]>([]);
  function clearHold() { if (hold.current) clearTimeout(hold.current); hold.current = null; pending.current = null; }
  function releaseScroll() { for (const lock of locks.current) lock.node.scrollEnabled = lock.enabled; locks.current = []; }
  function stop() { if (timer.current) clearInterval(timer.current); timer.current = null; }
  useEffect(() => () => { clearHold(); stop(); releaseScroll(); dragging.current = null; }, []);
  useEffect(() => { swipe.current = null; setSwipeOffset(0); clearHold(); stop(); releaseScroll(); dragging.current = null; setDrag(null); setScrollTop(undefined); }, [enabled, context, ids.join('\n')]);
  function currentDrag(current: Drag) { return dragging.current === current && latest.current.enabled && latest.current.context === current.context && latest.current.ids.includes(current.id); }
  function withinViewport(current: Drag) {
    const viewport = current.viewport;
    return !!viewport && current.pointX >= viewport.left && current.pointX <= viewport.right && current.pointY >= viewport.top && current.pointY <= viewport.bottom;
  }
  function refresh(current: Drag) {
    if (!currentDrag(current) || !current.rects.length) return;
    const offset = scroll.current - current.startScroll;
    current.x = current.pointX - current.startX;
    current.y = current.pointY - current.startY + offset;
    const distance = (rect: Rect) => Math.hypot((rect.left + rect.right) / 2 - current.pointX, (rect.top + rect.bottom) / 2 - offset - current.pointY);
    const nearest = withinViewport(current) ? current.rects.reduce((best, rect) => distance(rect) < distance(best) ? rect : best) : null;
    const candidate = nearest ? nearest.id.slice('habit-sort-'.length) : current.id;
    const group = latest.current.groupForId;
    current.target = !group || group(candidate) === group(current.id) ? candidate : current.id;
    setDrag({ ...current });
  }
  function start(point: TouchPoint, id: string) {
    if (!latest.current.enabled || !latest.current.ids.includes(id)) return;
    swipe.current = null; setSwipeOffset(0); clearHold(); stop();
    const scrollId = latest.current.scrollIdForItem?.(id) || defaultScrollId;
    const selector = `#${scrollId}`;
    scroll.current = scrollPositions.current[scrollId] ?? 0;
    setScrollTop(undefined);
    const current: Drag = { id, target: id, scrollId, context: latest.current.context, startX: point.clientX, startY: point.clientY, pointX: point.clientX, pointY: point.clientY, x: 0, y: 0, startScroll: scroll.current, rects: [], viewport: null, maxScroll: 0 };
    dragging.current = current;
    const lockQuery = Taro.createSelectorQuery();
    lockQuery.select('.page-scroll').node(); lockQuery.select(selector).node();
    lockQuery.exec(results => {
      if (!currentDrag(current)) return;
      for (const result of results) {
        const node = result?.node as Taro.ScrollViewContext | undefined;
        if (node && typeof node.scrollEnabled === 'boolean') { locks.current.push({ node, enabled: node.scrollEnabled }); node.scrollEnabled = false; }
      }
    });
    const query = Taro.createSelectorQuery();
    query.selectAll(`${selector} .habit-sort-tile`).boundingClientRect();
    query.select(selector).boundingClientRect();
    query.select(selector).scrollOffset();
    query.select(`${selector} .daily-habit-content`).boundingClientRect();
    query.exec(result => {
      if (!currentDrag(current)) return;
      current.rects = Array.isArray(result[0]) ? result[0].filter((rect: Rect) => latest.current.ids.includes(rect.id.slice('habit-sort-'.length))) : [];
      current.viewport = result[1];
      current.maxScroll = Math.max(0, (result[3]?.height || 0) - (result[1]?.height || 0));
      if (typeof result[2]?.scrollTop === 'number') { current.startScroll = result[2].scrollTop; scroll.current = result[2].scrollTop; scrollPositions.current[scrollId] = result[2].scrollTop; }
      refresh(current);
      timer.current = setInterval(() => {
        const viewport = current.viewport;
        if (!viewport || !currentDrag(current) || !withinViewport(current)) return;
        const edge = Math.min(40, viewport.height / 5);
        const direction = current.pointY < viewport.top + edge ? -1 : current.pointY > viewport.bottom - edge ? 1 : 0;
        if (direction) setScrollTop(Math.min(current.maxScroll, Math.max(0, scroll.current + direction * 16)));
      }, 40);
    });
  }
  function move(event: TouchEvent) {
    if (pending.current) {
      const first = pending.current.point, point = singleTouch(event.touches);
      if (!point || Math.hypot(first.clientX - point.clientX, first.clientY - point.clientY) > 8) clearHold();
      return;
    }
    const current = dragging.current;
    if (!current) return;
    event.stopPropagation(); event.preventDefault?.();
    if (event.touches?.length !== 1) { finish(false); return; }
    current.pointX = event.touches[0].clientX; current.pointY = event.touches[0].clientY;
    refresh(current);
  }
  function finish(commit: boolean) {
    clearHold();
    const current = dragging.current;
    stop(); releaseScroll(); dragging.current = null; setDrag(null);
    if (current) blockedClickUntil.current = Date.now() + 400;
    if (!commit || !current || current.context !== latest.current.context || !withinViewport(current) || current.id === current.target) return;
    const { ids, enabled, onChange, groupForId } = latest.current;
    if (!enabled) return;
    const candidates = groupForId ? ids.filter(id => groupForId(id) === groupForId(current.id)) : ids;
    const from = candidates.indexOf(current.id), to = candidates.indexOf(current.target);
    if (from < 0 || to < 0) return;
    const next = [...candidates]; next.splice(from, 1); next.splice(to, 0, current.id); onChange(next);
  }
  function onScrollFor(scrollId: string, event: ScrollEvent) {
    scrollPositions.current[scrollId] = event.detail.scrollTop;
    const current = dragging.current;
    if (current && current.scrollId !== scrollId) return;
    scroll.current = event.detail.scrollTop;
    if (current) refresh(current);
  }
  return {
    active: !!drag, scrollTop, swipeOffset,
    scrollTopFor: (scrollId: string) => drag?.scrollId === scrollId ? scrollTop : undefined,
    onScrollFor,
    swipeHandlers: {
      onTouchStart: (event: TouchEvent) => {
        event.stopPropagation(); swipe.current = null; setSwipeOffset(0);
        const point = singleTouch(event.touches);
        if (latest.current.enabled && point) swipe.current = { point, context: latest.current.context };
      },
      onTouchMove: (event: TouchEvent) => {
        event.stopPropagation();
        const movement = swipe.current, point = singleTouch(event.touches);
        if (!movement) return;
        if (!latest.current.enabled || !point || point.identifier !== movement.point.identifier || movement.context !== latest.current.context) { swipe.current = null; setSwipeOffset(0); return; }
        const dx = point.clientX - movement.point.clientX, dy = point.clientY - movement.point.clientY;
        if (Math.abs(dy) >= 8 && Math.abs(dy) >= Math.abs(dx)) { swipe.current = null; setSwipeOffset(0); return; }
        if (Math.abs(dx) >= 8 && Math.abs(dx) >= Math.abs(dy) * 1.5) {
          clearHold(); event.preventDefault?.();
          blockedClickUntil.current = Date.now() + 400;
          const direction = dx < 0 ? 1 : -1;
          setSwipeOffset(latest.current.canSwipe(direction) ? Math.sign(dx) * Math.min(Math.abs(dx), Taro.getWindowInfo().windowWidth) : 0);
        } else setSwipeOffset(0);
      },
      onTouchEnd: (event: TouchEvent) => {
        event.stopPropagation();
        const movement = swipe.current, point = singleTouch(event.changedTouches); swipe.current = null; setSwipeOffset(0);
        if (!movement || !latest.current.enabled || dragging.current || movement.context !== latest.current.context || event.touches && event.touches.length || !point || point.identifier !== movement.point.identifier) return;
        const dx = point.clientX - movement.point.clientX, dy = point.clientY - movement.point.clientY;
        if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        blockedClickUntil.current = Date.now() + 400;
        const direction = dx < 0 ? 1 : -1;
        if (latest.current.canSwipe(direction)) latest.current.onSwipe(direction);
      },
      onTouchCancel: (event: TouchEvent) => { event.stopPropagation(); swipe.current = null; setSwipeOffset(0); },
    },
    suppressClick: () => !!dragging.current || Date.now() < blockedClickUntil.current,
    bind: (id: string) => !enabled ? { id: `habit-sort-${id}` } : {
      id: `habit-sort-${id}`, style: drag?.id === id ? { transform: `translate(${drag.x}px, ${drag.y}px)` } as CSSProperties : undefined,
      onTouchStart: (event: TouchEvent) => {
        const point = singleTouch(event.touches);
        clearHold();
        if (!latest.current.enabled || !point) return;
        pending.current = { point, id, context: latest.current.context };
        hold.current = setTimeout(() => { const item = pending.current; if (item?.id === id && item.context === latest.current.context) start(item.point, id); }, 400);
      },
      onLongPress: () => { const item = pending.current; if (item?.id === id && item.context === latest.current.context) start(item.point, id); }, onTouchMove: move,
      onTouchEnd: (event: TouchEvent) => {
        const current = dragging.current, point = singleTouch(event.changedTouches);
        if (current && point) { current.pointX = point.clientX; current.pointY = point.clientY; refresh(current); }
        finish(!event.touches?.length);
      }, onTouchCancel: () => finish(false),
    },
    className: (id: string) => ` habit-sort-tile${drag?.id === id ? ' is-dragging' : ''}${drag?.target === id && drag.id !== id ? ' is-drop-target' : ''}`,
    onScroll: (event: ScrollEvent) => onScrollFor(defaultScrollId, event),
  };
}
