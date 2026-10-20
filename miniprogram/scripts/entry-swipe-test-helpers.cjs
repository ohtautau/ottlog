/* Send complete touch sequences to the real composer. The browser adapter
   forwards these events; it does not simulate a type switch for the test. */
async function touchGesture(target, { dx = -96, dy = 3, cancel = false, multiple = false, addFinger = false, endOnly = false, verticalFirst = false, differentEndFinger = false, missingEndPoint = false, remainingTouch = false, during, startPoint, moveSteps = [], onStep } = {}) {
  const box = await target.boundingBox();
  if (!box) throw new Error('The gesture target is not rendered');
  const start = { identifier: 17, clientX: startPoint?.x ?? box.x + box.width / 2, clientY: startPoint?.y ?? box.y + Math.min(box.height / 2, 40) };
  const finish = { ...start, clientX: start.clientX + dx, clientY: start.clientY + dy };
  const second = { ...start, identifier: 18, clientX: start.clientX + 8 };
  await target.dispatchEvent('touchstart', { touches: multiple ? [start, second] : [start], changedTouches: [start] });
  if (verticalFirst) await target.dispatchEvent('touchmove', { touches: [{ ...start, clientY: start.clientY + 30 }], changedTouches: [start] });
  for (const distance of moveSteps) {
    const step = { ...start, clientX: start.clientX + distance, clientY: start.clientY + dy };
    await target.dispatchEvent('touchmove', { touches: [step], changedTouches: [step] });
    await onStep?.(distance);
  }
  if (!endOnly) await target.dispatchEvent('touchmove', { touches: addFinger || multiple ? [finish, second] : [finish], changedTouches: [finish] });
  if (during) await during();
  await target.dispatchEvent(cancel ? 'touchcancel' : 'touchend', { touches: remainingTouch ? [start] : [], changedTouches: missingEndPoint ? [] : [differentEndFinger ? { ...finish, identifier: 23 } : finish] });
}

async function visibleSwipeStart(page, dx, dy, expect) {
  const hit = await page.evaluate(({ dx, dy }) => {
    const composer = document.querySelector('.entry-composer'), scroll = composer.querySelector('.entry-scroll');
    const pane = composer.getBoundingClientRect(), box = scroll.getBoundingClientRect();
    const x = dx < 0 ? box.right - 6 : box.left + 6;
    for (const y of [box.top + 20, box.top + 40, box.top + box.height / 3, box.top + box.height / 2]) {
      const node = document.elementFromPoint(x, y);
      if (node && composer.contains(node) && node.dataset.entrySwipe === 'true' && x + dx > pane.left && x + dx < pane.right && y + dy > pane.top && y + dy < pane.bottom) {
        return { x, y, safe: node.dataset.entrySwipe, target: node.className, endX: x + dx, endY: y + dy,
          bounds: { left: pane.left, right: pane.right, top: pane.top, bottom: pane.bottom } };
      }
    }
    return null;
  }, { dx, dy });
  expect(hit, 'A user can reach a marked blank swipe start within the visible editor').not.toBeNull();
  expect(hit.safe, 'The actual elementFromPoint target permits a creation swipe').toBe('true');
  expect(hit.endX).toBeGreaterThan(hit.bounds.left); expect(hit.endX).toBeLessThan(hit.bounds.right);
  expect(hit.endY).toBeGreaterThan(hit.bounds.top); expect(hit.endY).toBeLessThan(hit.bounds.bottom);
  const target = await page.evaluateHandle(({ x, y }) => document.elementFromPoint(x, y), hit);
  return { hit, target };
}

async function backgroundPosition(page) {
  return page.evaluate(() => ({ windowX: scrollX, windowY: scrollY,
    pages: [...document.querySelectorAll('.page-scroll')].map(node => ({ id: node.id, top: node.scrollTop, left: node.scrollLeft })) }));
}

async function swipeMode({ page, composer, expect, name, target, gesture, context = 'Creation gesture' }) {
  const before = await backgroundPosition(page);
  // Hit-test the real padding rather than dispatching on a parent whose center
  // may be occupied by a protected input. Explicit protected targets remain
  // unchanged for the negative tests.
  const visible = target ? null : await visibleSwipeStart(page, gesture?.dx ?? -96, gesture?.dy ?? 3, expect);
  try { await touchGesture(target || visible.target, { ...gesture, ...(visible ? { startPoint: visible.hit } : {}) }); }
  finally { if (visible) await visible.target.dispose(); }
  await expect(composer.getByRole('button', { name: `创建类型：${name}`, exact: true }), context).toHaveAttribute('aria-pressed', 'true');
  // PageScroll settles after touchend. Checking after that interval catches a
  // gesture leaking to the page beneath the independent editor.
  await page.waitForTimeout(140);
  expect(await backgroundPosition(page), `${context}: the page behind the editor does not scroll or change its section`).toEqual(before);
}

async function submitWithSwipe(button, expect, expectedName) {
  // State-layer editing is synchronous and the save returns a microtask, so
  // ordinary awaited Playwright calls miss this interval. Dispatch everything
  // in the same browser task to exercise the synchronous operating guard.
  const state = await button.evaluate(node => {
    const composer = node.closest('.entry-composer'), scroll = composer.querySelector('.entry-scroll');
    const rect = scroll.getBoundingClientRect(), x = rect.right - 6, y = rect.top + 20;
    const target = document.elementFromPoint(x, y);
    if (!target || !composer.contains(target) || target.dataset.entrySwipe !== 'true') throw new Error('No reachable blank touch target during save');
    const start = { identifier: 17, clientX: x, clientY: y };
    const finish = { ...start, clientX: start.clientX - 96 };
    node.click();
    for (const [type, touches, changedTouches] of [['touchstart', [start], [start]], ['touchmove', [finish], [finish]], ['touchend', [], [finish]]]) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: changedTouches } });
      target.dispatchEvent(event);
    }
    return { connected: composer.isConnected, name: composer.querySelector('.entry-mode[aria-pressed="true"]').getAttribute('aria-label') };
  });
  expect(state.connected, 'The touch attempt occurred before the asynchronous save completed').toBe(true);
  expect(state.name, 'A gesture during a save cannot change the selected creation type').toBe(`创建类型：${expectedName}`);
}

module.exports = { touchGesture, backgroundPosition, swipeMode, submitWithSwipe };
