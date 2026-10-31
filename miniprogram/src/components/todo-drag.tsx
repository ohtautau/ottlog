import { useEffect, useRef, useState } from 'react';
import Taro, { useDidHide } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { todoQuadrant, todoQuadrants, type Todo } from '../lib/tool-records';
import TodoDragCard from './todo-drag-card';
import { DeleteSymbol } from './manage-symbol';

type Point = { clientX: number; clientY: number };
type Touch = { touches?: Point[]; changedTouches?: Point[]; stopPropagation: () => void; preventDefault?: () => void };
type Rect = { id: string; left: number; right: number; top: number; bottom: number };
type Drag = { task: Todo; owner: string; x: number; y: number; startX: number; startY: number; target: string; before: string | null; moved: boolean; ending?: boolean; width?: number; height?: number; offsetX?: number; offsetY?: number; trash?: Rect; overTrash?: boolean };
export function useTodoDrag(tasks: Todo[], enabled: boolean, owner: string, commit: (id: string, quadrant: string, before: string | null) => void, options?: { onDelete: (task: Todo) => void }) {
  const current = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [scrollTop, setScrollTop] = useState<Record<string, number>>({});
  const offsets = useRef<Record<string, number>>({});
  const latest = useRef({ tasks, enabled, owner, commit, options }); latest.current = { tasks, enabled, owner, commit, options };
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
    query.selectAll('.todo-quadrant .todo-task').boundingClientRect();
    query.selectAll('.todo-quadrant-scroll').boundingClientRect();
    query.select('.todo-page').boundingClientRect();
    query.exec(results => {
      if (current.current !== item || (item.ending && !done)) return;
      const zones: Rect[] = results[0] || [], rows: Rect[] = results[1] || [], views: Rect[] = results[2] || [];
      const page: Rect | undefined = results[3];
      if (!item.width) {
        const source = rows.find(rect => rect.id === `todo-row-${snapshot.findIndex(task => task.id === item.task.id)}`);
        if (source) { item.width = source.right - source.left; item.height = source.bottom - source.top; item.offsetX = item.startX - source.left; item.offsetY = item.startY - source.top; }
      }
      if (page) {
        const width = Math.max(40, Math.min(320, page.right - page.left - 32)), left = (page.left + page.right - width) / 2;
        item.trash = { id: 'todo-drag-trash', left, right: left + width, top: page.top + 8, bottom: page.top + 64 };
      }
      item.overTrash = !!item.trash && item.x >= item.trash.left && item.x <= item.trash.right && item.y >= item.trash.top && item.y <= item.trash.bottom;
      const zone = item.overTrash ? undefined : zones.find(rect => item.x >= rect.left && item.x <= rect.right && item.y >= rect.top && item.y <= rect.bottom);
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
  function captureCard(item: Drag) {
    const index = latest.current.tasks.findIndex(task => task.id === item.task.id);
    Taro.createSelectorQuery().select(`#todo-row-${index}`).boundingClientRect().exec(results => {
      if (pending.current !== item && current.current !== item) return;
      const source: Rect | undefined = results[0];
      if (source && !item.width) { item.width = source.right - source.left; item.height = source.bottom - source.top; item.offsetX = item.startX - source.left; item.offsetY = item.startY - source.top; }
    });
  }
  function activate(item: Drag) {
    if (pending.current !== item || !latest.current.enabled || latest.current.owner !== item.owner || current.current) return;
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
      if (latest.current.enabled && latest.current.owner === item.owner) {
        if (item.overTrash) latest.current.options?.onDelete(item.task);
        else if (item.target) latest.current.commit(item.task.id, item.target, item.before);
      }
      cancel();
    });
  }
  function bind(task: Todo) {
    return {
      onTouchStart: (event: Touch) => {
        if (!latest.current.enabled || event.touches?.length !== 1) return;
        const { clientX: x, clientY: y } = event.touches[0];
        const item: Drag = { task, owner: latest.current.owner, x, y, startX: x, startY: y, target: '', before: null, moved: false };
        cancel(); pending.current = item;
        captureCard(item);
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
    deleteZone: drag?.trash ? <View className={`todo-drag-delete-zone${drag.overTrash ? ' is-over' : ''}`} role='region' ariaLabel='拖到这里删除任务' style={{ left: `${drag.trash.left}px`, top: `${drag.trash.top}px`, width: `${drag.trash.right - drag.trash.left}px` }}><DeleteSymbol /><Text>{drag.overTrash ? '松开删除任务' : '拖到这里删除'}</Text></View> : null,
    ghost: drag?.width && drag.height ? <TodoDragCard task={drag.task} x={drag.x} y={drag.y} width={drag.width} height={drag.height} offsetX={drag.offsetX ?? 0} offsetY={drag.offsetY ?? 0} overTrash={drag.overTrash} /> : null };
}
