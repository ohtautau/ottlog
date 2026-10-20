import { trimTextEnd } from '../lib/text-whitespace';
import { useEffect, useRef, useState } from 'react';
import Taro, { useDidHide } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { todoQuadrant, todoQuadrants, type Todo } from '../lib/tool-records';

type Point = { clientX: number; clientY: number };
type Touch = { touches?: Point[]; changedTouches?: Point[]; stopPropagation: () => void; preventDefault?: () => void };
type Rect = { id: string; left: number; right: number; top: number; bottom: number };
type Drag = { task: Todo; x: number; y: number; startX: number; startY: number; target: string; before: string | null; moved: boolean; ending?: boolean };
export function useTodoDrag(tasks: Todo[], enabled: boolean, owner: string, commit: (id: string, quadrant: string, before: string | null) => void) {
  const current = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [scrollTop, setScrollTop] = useState<Record<string, number>>({});
  const offsets = useRef<Record<string, number>>({});
  const latest = useRef({ tasks, enabled, owner, commit }); latest.current = { tasks, enabled, owner, commit };
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Drag | null>(null);
  const blockedClickUntil = useRef(0);
  const scrollLocks = useRef<{ node: Taro.ScrollViewContext; enabled: boolean }[]>([]);
  function clearHold() { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = null; pending.current = null; }
  function stopMeasuring() { if (timer.current) clearInterval(timer.current); timer.current = null; }
  function releaseScroll() {
    for (const { node, enabled } of scrollLocks.current) node.scrollEnabled = enabled;
    scrollLocks.current = [];
  }
  function cancel() { clearHold(); stopMeasuring(); current.current = null; releaseScroll(); setDrag(null); }
  useEffect(() => { cancel(); }, [owner, enabled, tasks]);
  useEffect(() => () => { clearHold(); stopMeasuring(); current.current = null; releaseScroll(); }, []);
  useDidHide(cancel);
  function lockScroll(item: Drag) {
    // Keep the touched View template and scrollY stable. Changing catchMove mid-touch
    // replaces the native template; changing scrollY can reset its scroll position.
    const query = Taro.createSelectorQuery();
    query.select('.page-scroll').node();
    for (const quadrant of todoQuadrants) query.select(`#todo-scroll-${quadrant.id}`).node();
    query.exec(results => {
      if (current.current !== item || item.ending) return;
      for (const result of results) {
        const node = result?.node as Taro.ScrollViewContext | undefined;
        if (!node || typeof node.scrollEnabled !== 'boolean') continue;
        scrollLocks.current.push({ node, enabled: node.scrollEnabled });
        node.scrollEnabled = false;
      }
    });
  }
  function measure(item: Drag, done?: () => void) {
    const snapshot = latest.current.tasks;
    const query = Taro.createSelectorQuery();
    query.selectAll('.todo-quadrant').boundingClientRect();
    query.selectAll('.todo-task').boundingClientRect();
    query.selectAll('.todo-quadrant-scroll').boundingClientRect();
    query.exec(results => {
      if (current.current !== item || (item.ending && !done)) return;
      const zones: Rect[] = results[0] || [], rows: Rect[] = results[1] || [], views: Rect[] = results[2] || [];
      const zone = zones.find(rect => item.x >= rect.left && item.x <= rect.right && item.y >= rect.top && item.y <= rect.bottom);
      item.target = zone?.id.replace('todo-zone-', '') || '';
      item.before = null;
      if (zone) {
        const view = views.find(rect => rect.id === `todo-scroll-${item.target}`);
        const candidates = rows.filter(rect => rect.left >= zone.left && rect.right <= zone.right && rect.top < (view?.bottom ?? zone.bottom) && rect.bottom > (view?.top ?? zone.top))
          .map(rect => ({ rect, task: snapshot[Number(rect.id.replace('todo-row-', ''))] }))
          .filter(row => row.task && todoQuadrant(row.task).id === item.target && row.task.id !== item.task.id && !!row.task.completedAt === !!item.task.completedAt)
          .sort((a, b) => a.rect.top - b.rect.top);
        item.before = candidates.find(row => item.y < (row.rect.top + row.rect.bottom) / 2)?.task.id || null;
        if (view && !done && item.moved) {
          const direction = item.y < view.top + 36 ? -1 : item.y > view.bottom - 36 ? 1 : 0;
          if (direction) setScrollTop(previous => ({ ...previous, [item.target]: Math.max(0, (offsets.current[item.target] || 0) + direction * 22) }));
        }
      }
      setDrag({ ...item }); done?.();
    });
  }
  function updatePoint(item: Drag, point?: Point) {
    if (!point) return;
    item.x = point.clientX; item.y = point.clientY;
    item.moved ||= Math.hypot(item.x - item.startX, item.y - item.startY) > 6;
  }
  function activate(item: Drag) {
    if (pending.current !== item || !latest.current.enabled || current.current) return;
    clearHold(); current.current = item; setDrag(item); lockScroll(item); measure(item);
    timer.current = setInterval(() => measure(item), 70);
  }
  function finish(commitDrop: boolean, event: Touch) {
    clearHold();
    const item = current.current;
    if (!item) return;
    event.stopPropagation();
    if (item.ending) return;
    stopMeasuring();
    if (commitDrop) updatePoint(item, event.changedTouches?.[0]);
    blockedClickUntil.current = Date.now() + 400;
    if (!commitDrop || !item.moved) { cancel(); return; }
    item.ending = true;
    measure(item, () => {
      if (latest.current.enabled && item.target) latest.current.commit(item.task.id, item.target, item.before);
      cancel();
    });
  }
  function bind(task: Todo) {
    return {
      onTouchStart: (event: Touch) => {
        if (!latest.current.enabled || event.touches?.length !== 1) return;
        const { clientX: x, clientY: y } = event.touches[0];
        const item: Drag = { task, x, y, startX: x, startY: y, target: '', before: null, moved: false };
        cancel(); pending.current = item;
        holdTimer.current = setTimeout(() => activate(item), 400);
      },
      onLongPress: (event: Touch) => {
        if (!pending.current || pending.current.task.id !== task.id) return;
        event.stopPropagation(); activate(pending.current);
      },
      onTouchMove: (event: Touch) => {
        if (pending.current) {
          const point = event.touches?.[0];
          if (event.touches?.length !== 1 || !point || Math.hypot(point.clientX - pending.current.startX, point.clientY - pending.current.startY) > 8) clearHold();
          return;
        }
        const item = current.current; if (!item || item.ending) return;
        event.stopPropagation(); event.preventDefault?.();
        if (event.touches?.length !== 1) { cancel(); return; }
        updatePoint(item, event.touches[0]);
        setDrag({ ...item });
      },
      onTouchEnd: (event: Touch) => finish(true, event), onTouchCancel: (event: Touch) => finish(false, event),
    };
  }
  return { bind, drag, scrollTop, onScroll: (id: string, top: number) => { offsets.current[id] = top; },
    suppressClick: () => !!current.current || Date.now() < blockedClickUntil.current,
    ghost: drag?.moved ? <View className='todo-drag-ghost' style={{ left: `${drag.x}px`, top: `${drag.y}px` }}><Text>{trimTextEnd(drag.task.title)}</Text><Text>{drag.target ? '松手放置' : '移入一个象限'}</Text></View> : null };
}
