"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

export type TaskDrop = { quadrant: string; taskId: string; after: boolean };
type Drag = { id: string; title: string; pointerId: number; startX: number; startY: number; x: number; y: number; active: boolean; target: TaskDrop | null };

function dropAt(x: number, y: number): TaskDrop | null {
  const element = document.elementFromPoint(x, y);
  const task = element?.closest<HTMLElement>("[data-todo-id]");
  const quadrant = element?.closest<HTMLElement>("[data-quadrant]");
  return task || quadrant ? { quadrant: quadrant?.dataset.quadrant ?? "", taskId: task?.dataset.todoId ?? "", after: !!task && y > task.getBoundingClientRect().top + task.offsetHeight / 2 } : null;
}

/** Pointer capture keeps the same drag interaction available to mouse, pen and touch. */
export default function useTaskDrag(onDrop: (id: string, target: TaskDrop) => void) {
  const current = useRef<Drag | null>(null);
  const lastDrag = useRef(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const active = !!drag;
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const scroll = () => {
      const value = current.current; if (!value?.active) return;
      const element = document.elementFromPoint(value.x, value.y);
      const container = element?.closest<HTMLElement>("[data-todo-scroll]") ?? element?.closest("[data-quadrant]")?.querySelector<HTMLElement>("[data-todo-scroll]");
      if (container) {
        const bounds = container.getBoundingClientRect(), before = container.scrollTop;
        if (value.y > bounds.bottom - 38) container.scrollTop += 9;
        else if (value.y < bounds.top + 38) container.scrollTop -= 9;
        if (before !== container.scrollTop) { value.target = dropAt(value.x, value.y); setDrag({ ...value }); }
      }
      if (value.y < 65) window.scrollBy(0, -9); else if (value.y > window.innerHeight - 65) window.scrollBy(0, 9);
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  function begin(event: PointerEvent<HTMLButtonElement>, id: string, title: string) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    current.current = { id, title, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: false, target: null };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const value = current.current; if (!value || value.pointerId !== event.pointerId) return;
    if (!value.active && Math.hypot(event.clientX - value.startX, event.clientY - value.startY) < 6) return;
    value.active = true; value.x = event.clientX; value.y = event.clientY;
    value.target = dropAt(event.clientX, event.clientY);
    setDrag({ ...value });
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const value = current.current; if (!value || value.pointerId !== event.pointerId) return;
    current.current = null; setDrag(null);
    if (value.active) lastDrag.current = Date.now();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancel && value.active && value.target && value.target.taskId !== value.id) onDrop(value.id, value.target);
  }
  return { drag, begin, move, finish, shouldClick: () => Date.now() - lastDrag.current > 250 };
}
