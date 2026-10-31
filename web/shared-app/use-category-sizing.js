import { useEffect } from 'react';
import { events, toolHost } from './platform';

// The fixed "all" choice and the scrolling choices share a single size.
export default function useCategorySizing() {
  useEffect(() => {
    const host = toolHost(), bars = new Set();
    let frame = 0, alive = true;
    function measure() {
      frame = 0;
      for (const bar of bars) {
        if (!bar.isConnected) { resize.unobserve(bar); bars.delete(bar); continue; }
        const buttons = [...bar.querySelectorAll('.ui-category')];
        if (!buttons.length || !bar.clientWidth) continue;
        const gap = 6, fixed = bar.classList.contains('page-category-fixed-row');
        const natural = Math.max(84, ...buttons.map(button => {
          const range = document.createRange(); range.selectNodeContents(button);
          const style = getComputedStyle(button);
          return range.getBoundingClientRect().width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2;
        }));
        const available = bar.clientWidth;
        const fitted = (available - gap * (buttons.length - 1)) / buttons.length;
        const width = Math.floor(Math.max(fitted, Math.min(natural, fixed ? (available - gap) / 2 : available)) * 100) / 100;
        bar.dataset.browserCategories = '';
        bar.style.setProperty('--browser-category-width', `${width}px`);
        bar.style.setProperty('--browser-category-height', '40px');
        const height = Math.max(40, ...buttons.map(button => button.scrollHeight));
        bar.style.setProperty('--browser-category-height', `${height}px`);
      }
    }
    function schedule() { if (!frame && alive) frame = requestAnimationFrame(measure); }
    function scan() {
      for (const bar of host.querySelectorAll('.page-category-bar')) if (!bars.has(bar)) { bars.add(bar); resize.observe(bar); }
      schedule();
    }
    const resize = new ResizeObserver(schedule), mutations = new MutationObserver(scan);
    mutations.observe(host, { childList: true, subtree: true, characterData: true });
    scan(); events.on('resize', schedule); document.fonts.ready.then(() => { if (alive) schedule(); });
    return () => { alive = false; mutations.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); events.off('resize', schedule); };
  }, []);
}
