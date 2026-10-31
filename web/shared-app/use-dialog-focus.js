import { useEffect } from 'react';
import { toolHost } from './platform';

// Browser focus and background navigation belong to the platform, not each form.
export default function useDialogFocus() {
  useEffect(() => {
    let current = null, previous = null, scheduled = 0;
    const host = toolHost();
    const navigation = [...document.querySelectorAll('body > header,body > footer,.tool-workspace-heading')];
    const visible = node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== 'hidden'; };
    const level = node => { let highest = 0; for (let p = node; p; p = p.parentElement) highest = Math.max(highest, Number(getComputedStyle(p).zIndex) || 0); return highest; };
    const controls = () => current ? [...current.querySelectorAll('button,a[href],input,textarea,select,[tabindex]')].filter(n => !n.disabled && n.tabIndex >= 0 && visible(n)) : [];
    function update() {
      scheduled = 0;
      const candidates = [...host.querySelectorAll('[role=dialog],.todo-sheet,.memo-sheet,.focus-settings,.meal-sheet')].filter(visible);
      const next = candidates.sort((a, b) => level(a) - level(b)).at(-1) || null;
      if (next === current) return;
      if (current && !next && previous?.isConnected) previous.focus({ preventScroll: true });
      if (next && !current) previous = document.activeElement;
      current = next; navigation.forEach(n => { n.inert = !!next; });
      if (next && !next.contains(document.activeElement)) { next.tabIndex = -1; next.focus({ preventScroll: true }); }
    }
    const observer = new MutationObserver(() => { if (!scheduled) scheduled = requestAnimationFrame(update); });
    observer.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
    const trap = event => {
      if (event.key !== 'Tab' || !current) return;
      const list = controls(), first = list[0], last = list.at(-1);
      if (!list.length) { event.preventDefault(); current.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !current.contains(document.activeElement) || document.activeElement === current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap, true);
    return () => { observer.disconnect(); cancelAnimationFrame(scheduled); document.removeEventListener('keydown', trap, true); navigation.forEach(n => { n.inert = false; }); };
  }, []);
}
