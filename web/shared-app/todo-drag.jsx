import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DeleteSymbol } from '../../miniprogram/src/components/manage-symbol';
import TodoDragCard from '../../miniprogram/src/components/todo-drag-card';

/** Browser input only. Task mutations remain in the shared page/model/owner queue. */
export function useTodoDrag(tasks, enabled, owner, commit, options = {}) {
  const latest = useRef({tasks, enabled, owner, commit, options});
  useLayoutEffect(() => { latest.current = {tasks, enabled, owner, commit, options}; });
  const current = useRef(null), frame = useRef(), hold = useRef(), cleanups = useRef([]), blocked = useRef(0);
  const [drag, setDrag] = useState(null);
  const detach = useCallback(() => { cleanups.current.splice(0).forEach(cleanup => cleanup()); clearTimeout(hold.current); cancelAnimationFrame(frame.current); }, []);
  const cancel = useCallback(() => {
    const item = current.current;
    current.current = null;
    detach();
    if (item?.captured && item.node.isConnected && item.node.hasPointerCapture(item.pointer)) item.node.releasePointerCapture(item.pointer);
    setDrag(null);
  }, [detach]);
  useLayoutEffect(() => {
    const stale = current.current;
    if (!stale) return;
    const scheduled = requestAnimationFrame(() => { if (current.current === stale) cancel(); });
    return () => cancelAnimationFrame(scheduled);
  }, [owner, enabled, tasks, cancel]);
  useEffect(() => {
    const click = event => { if (Date.now() < blocked.current) { event.preventDefault(); event.stopImmediatePropagation(); } };
    const freshPointer = () => { if (!current.current) blocked.current = 0; };
    const escape = event => { if (event.key === 'Escape' && current.current) { blocked.current = Date.now() + 350; cancel(); event.preventDefault(); } };
    document.addEventListener('click', click, true);
    document.addEventListener('pointerdown', freshPointer, true);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('blur', cancel);
    return () => { cancel(); document.removeEventListener('click', click, true); document.removeEventListener('pointerdown', freshPointer, true); document.removeEventListener('keydown', escape, true); window.removeEventListener('blur', cancel); };
  }, [cancel]);
  function trashRect(item) {
    const host = item.host.getBoundingClientRect(), width = Math.min(360, host.width - 32);
    return {left: host.left + (host.width - width) / 2, right: host.left + (host.width + width) / 2, top: host.top + 8, bottom: host.top + 64, width};
  }
  const contains = (rect, item) => item.x >= rect.left && item.x <= rect.right && item.y >= rect.top && item.y <= rect.bottom;
  function measure(item, autoScroll = false) {
    if (!item.active || current.current !== item || !item.host.isConnected) return;
    const trash = trashRect(item);
    item.overTrash = contains(trash, item);
    const zone = item.overTrash ? null : [...item.host.querySelectorAll('.todo-quadrant')].find(node => contains(node.getBoundingClientRect(), item));
    item.target = zone?.id.replace('todo-zone-', '') || '';
    item.before = null;
    if (zone) {
      const scroll = zone.querySelector('.todo-quadrant-scroll'), view = scroll.getBoundingClientRect();
      const rows = [...zone.querySelectorAll('.todo-task')].map(node => ({node, rect: node.getBoundingClientRect(), task: latest.current.tasks[Number(node.id.replace('todo-row-', ''))]}))
        .filter(row => row.task && row.task.id !== item.task.id && !!row.task.completedAt === !!item.task.completedAt && row.rect.bottom > view.top && row.rect.top < view.bottom);
      item.before = rows.find(row => item.y < (row.rect.top + row.rect.bottom) / 2)?.task.id || null;
      if (autoScroll && item.y >= view.top && item.y <= view.bottom) {
        const delta = item.y < view.top + 32 ? -10 : item.y > view.bottom - 32 ? 10 : 0;
        if (delta) scroll.scrollTop += delta;
      }
    }
    const signature = `${item.x}:${item.y}:${item.target}:${item.before}:${item.overTrash}`;
    if (signature !== item.signature) { item.signature = signature; setDrag({...item, trash}); }
  }
  function activate(item) {
    if (current.current !== item || !latest.current.enabled || latest.current.owner !== item.owner) return;
    clearTimeout(hold.current);
    item.active = true;
    if (item.node.isConnected) { item.node.setPointerCapture(item.pointer); item.captured = true; }
    const tick = () => { if (current.current !== item) return; measure(item, true); frame.current = requestAnimationFrame(tick); };
    tick();
  }
  function start(event, task) {
    if (!latest.current.enabled || event.button !== 0 || event.isPrimary === false || event.target.closest('.todo-complete')) return;
    cancel();
    const rect = event.currentTarget.getBoundingClientRect();
    const item = {task, owner: latest.current.owner, pointer: event.pointerId, mouse: event.pointerType === 'mouse', node: event.currentTarget, host: event.currentTarget.closest('.tool-app-root'), x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, width: rect.width, height: rect.height, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, active: false, moved: false, target: '', before: null};
    if (!item.host) return;
    current.current = item;
    const move = e => {
      if (e.pointerId !== item.pointer || current.current !== item) return;
      item.x = e.clientX; item.y = e.clientY;
      const distance = Math.hypot(item.x - item.startX, item.y - item.startY);
      if (!item.active) {
        if (item.mouse && distance >= 5) activate(item);
        else if (!item.mouse && distance > 8) { cancel(); return; }
      }
      if (item.active) { item.moved ||= distance >= 5; e.preventDefault(); measure(item); }
    };
    const finish = (e, dropped) => {
      if (e.pointerId !== item.pointer || current.current !== item) return;
      item.x = e.clientX; item.y = e.clientY;
      if (!item.active) { cancel(); return; }
      measure(item);
      blocked.current = Date.now() + 350;
      e.preventDefault(); e.stopPropagation();
      const valid = dropped && item.moved && latest.current.enabled && latest.current.owner === item.owner;
      cancel();
      if (valid && item.overTrash) latest.current.options.onDelete?.(item.task);
      else if (valid && item.target) latest.current.commit(item.task.id, item.target, item.before);
    };
    const up = e => finish(e, true), abort = e => finish(e, false);
    // PointerEvent.preventDefault does not stop a touch pan. Keep ordinary
    // scrolling until the hold activates; after that preserve the captured drag.
    const touchMove = e => {
      if (current.current !== item || !item.active) return;
      if (e.touches.length !== 1) { cancel(); return; }
      e.preventDefault();
    };
    document.addEventListener('pointermove', move, {capture: true, passive: false});
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', abort, true);
    if (!item.mouse) document.addEventListener('touchmove', touchMove, {capture: true, passive: false});
    cleanups.current.push(() => { document.removeEventListener('pointermove', move, true); document.removeEventListener('pointerup', up, true); document.removeEventListener('pointercancel', abort, true); document.removeEventListener('touchmove', touchMove, true); });
    if (!item.mouse) hold.current = setTimeout(() => activate(item), 400);
  }
  return {
    bind: task => ({onPointerDownCapture: event => start(event, task), onLostPointerCapture: () => { if (current.current?.task.id === task.id && current.current.active) cancel(); }}),
    drag, scrollTop: {}, onScroll: () => {}, suppressClick: () => !!current.current?.active || Date.now() < blocked.current,
    deleteZone: drag ? <div className={`todo-drag-delete-zone${drag.overTrash ? ' is-over' : ''}`} role='region' aria-label='拖到这里删除任务' style={{left: drag.trash.left, top: drag.trash.top, width: drag.trash.width}}><DeleteSymbol />{drag.overTrash ? '松开删除任务' : '拖到这里删除'}</div> : null,
    ghost: drag ? <TodoDragCard task={drag.task} x={drag.x} y={drag.y} width={drag.width} height={drag.height} offsetX={drag.offsetX} offsetY={drag.offsetY} overTrash={drag.overTrash} /> : null,
  };
}
