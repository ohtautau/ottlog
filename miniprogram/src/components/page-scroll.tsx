import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { pageSnapTarget } from '../lib/page-snap';
import { AppDialogHost } from './app-dialog';

const PageScrollContext = createContext<(id: string) => void>(() => {});
export const usePageScroll = () => useContext(PageScrollContext);
let nextScrollId = 0;
const defaultSections = ['page-core', 'page-more'] as const;
type TouchEvent = { touches?: { clientX: number; clientY: number }[] };
export default function PageScroll({ children, onReachEnd, scrollIntoView, scrollTop, onScroll, scrollY = true, animateScroll = true, snapSuspended = false, snapSections = defaultSections, freeScrollSections = [] }: { children: ReactNode; onReachEnd?: () => void; scrollIntoView?: string; scrollTop?: number; onScroll?: (event: { detail: { scrollTop: number } }) => void; scrollY?: boolean; animateScroll?: boolean; snapSuspended?: boolean; snapSections?: readonly string[]; freeScrollSections?: readonly string[] }) {
  const [id] = useState(() => `page-scroll-${++nextScrollId}`);
  const [anchor, setAnchor] = useState(scrollIntoView || '');
  const [position, setPosition] = useState(scrollTop);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef(scrollTop || 0);
  const suspendedPosition = useRef<number | null>(null);
  const boundaries = useRef<number[]>([]);
  const freeRanges = useRef<{ start: number; end: number }[]>([]);
  const sections = useRef(snapSections);
  sections.current = snapSections;
  const freeSections = useRef(freeScrollSections);
  freeSections.current = freeScrollSections;
  const sectionsKey = snapSections.join('|') + ':' + freeScrollSections.join('|');
  const lockedUntil = useRef(0);
  const touching = useRef(false);
  const gesture = useRef<{ start: number; x: number; y: number; vertical: boolean; direction: 'up' | 'down' | null } | null>(null);
  const enabled = useRef(animateScroll);
  enabled.current = scrollY && animateScroll && !snapSuspended;

  function measure() {
    const measuredGesture = gesture.current;
    const sectionIds = [...sections.current];
    const freeIds = [...freeSections.current];
    const query = Taro.createSelectorQuery();
    query.select(`#${id}`).boundingClientRect();
    for (const sectionId of sectionIds) query.select(`#${id} #${sectionId}`).boundingClientRect();
    query.select(`#${id}`).scrollOffset();
    query.exec(results => {
      if (!enabled.current || sectionIds.join('|') !== sections.current.join('|') || freeIds.join('|') !== freeSections.current.join('|')) return;
      const viewport = results[0], offset = results[results.length - 1];
      const screens = results.slice(1, -1) as Array<{ top: number } | null | undefined>;
      boundaries.current = viewport && offset && screens.every((screen): screen is { top: number } => screen != null)
        ? screens.map(screen => Math.max(0, screen.top - viewport.top + offset.scrollTop)) : [];
      freeRanges.current = sectionIds.flatMap((sectionId, index) => freeIds.includes(sectionId) && boundaries.current[index + 1] !== undefined ? [{ start: boundaries.current[index], end: boundaries.current[index + 1] }] : []);
      // Native onScroll can arrive after the next touchstart on a phone.
      if (offset && measuredGesture && measuredGesture === gesture.current && !measuredGesture.vertical) {
        measuredGesture.start = offset.scrollTop;
        current.current = offset.scrollTop;
      }
    });
  }
  useEffect(() => {
    boundaries.current = [];
    freeRanges.current = [];
    const measureTimer = setTimeout(measure, 100);
    return () => {
      clearTimeout(measureTimer);
      if (timer.current) clearTimeout(timer.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [sectionsKey]);
  useEffect(() => {
    if (scrollIntoView !== undefined) {
      lockedUntil.current = Date.now() + 600;
      gesture.current = null;
      setAnchor(scrollIntoView);
    }
  }, [scrollIntoView]);
  useEffect(() => {
    if (scrollTop !== undefined) {
      setAnchor('');
      setPosition(scrollTop);
    }
  }, [scrollTop]);
  useEffect(() => {
    if (!scrollY || !animateScroll || snapSuspended) {
      touching.current = false;
      gesture.current = null;
      if (timer.current) clearTimeout(timer.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    }
  }, [scrollY, animateScroll, snapSuspended]);
  useEffect(() => {
    if (snapSuspended) {
      suspendedPosition.current = current.current;
      // Re-arm scrollTop for repeated openings at the same position.
      setAnchor(''); setPosition(undefined);
      boundaries.current = []; freeRanges.current = [];
      return;
    }
    if (suspendedPosition.current === null) return;
    const origin = suspendedPosition.current;
    suspendedPosition.current = null;
    current.current = origin;
    lockedUntil.current = Date.now() + 600;
    setAnchor(''); setPosition(origin);
    const measureTimer = setTimeout(measure, 100);
    return () => clearTimeout(measureTimer);
  }, [snapSuspended]);

  function scrollTo(id: string) {
    if (timer.current) clearTimeout(timer.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    gesture.current = null;
    lockedUntil.current = Date.now() + 600;
    setAnchor('');
    timer.current = setTimeout(() => setAnchor(id), 30);
  }
  function settle() {
    if (!enabled.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (touching.current || !enabled.current || Date.now() < lockedUntil.current) return;
      const movement = gesture.current;
      gesture.current = null;
      // Long opted-in sections must remain readable between page boundaries.
      if (freeRanges.current.some(range => current.current > range.start + 2 && current.current < range.end - 2 && (!movement || movement.start < range.end - 2))) return;
      const target = pageSnapTarget(movement?.start ?? current.current, current.current, boundaries.current, movement?.vertical ? movement.direction : null);
      if (target === null || Math.abs(target - current.current) < 2) return;
      lockedUntil.current = Date.now() + 600;
      setAnchor('');
      // Re-arm the native scroll-top property even when returning to its last value.
      setPosition(current.current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPosition(target), 30);
    }, 120);
  }
  function touchStart(event: TouchEvent) {
    if (event.touches?.length !== 1 || !enabled.current) { gesture.current = null; return; }
    if (timer.current) clearTimeout(timer.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    const touch = event.touches[0];
    touching.current = true;
    lockedUntil.current = 0;
    gesture.current = { start: current.current, x: touch.clientX, y: touch.clientY, vertical: false, direction: null };
    measure();
  }
  function touchMove(event: TouchEvent) {
    if (event.touches?.length !== 1) { gesture.current = null; return; }
    const movement = gesture.current, touch = event.touches[0];
    if (movement && touch) {
      const dx = Math.abs(touch.clientX - movement.x), dy = Math.abs(touch.clientY - movement.y);
      movement.vertical = dy >= 8 && dy > dx;
      movement.direction = movement.vertical ? touch.clientY < movement.y ? 'up' : 'down' : null;
    }
  }
  return <PageScrollContext.Provider value={scrollTo}><ScrollView id={id} className='page-scroll' scrollY={scrollY} enhanced bounces={false} showScrollbar={false} lowerThreshold={160} onScrollToLower={onReachEnd} scrollIntoView={anchor} scrollTop={position}
    onTouchStart={event => touchStart(event as unknown as TouchEvent)} onTouchMove={event => touchMove(event as unknown as TouchEvent)}
    onTouchEnd={() => { touching.current = false; settle(); }}
    onTouchCancel={() => { touching.current = false; gesture.current = null; settle(); }}
    onScroll={event => {
      if (event.target?.id && event.target.id !== id) return;
      current.current = event.detail.scrollTop;
      onScroll?.(event);
      if (!touching.current && enabled.current) settle();
    }} scrollWithAnimation={animateScroll}>
    {children}
  </ScrollView><AppDialogHost /></PageScrollContext.Provider>;
}
