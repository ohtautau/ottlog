/** Advance one screen per gesture; the last section can remain a long page. */
export function pageSnapTarget(start: number, end: number, boundaries: number | readonly number[], direction: 'up' | 'down' | null = null): number | null {
  const stops = typeof boundaries === 'number' ? [0, boundaries] : boundaries;
  if (stops.length < 2 || !Number.isFinite(start) || !Number.isFinite(end)
    || stops.some((stop, index) => !Number.isFinite(stop) || stop < 0 || (index > 0 && stop <= stops[index - 1]))) return null;
  const tolerance = 2;
  const last = stops[stops.length - 1];
  if (direction === 'down') {
    // Inside the final long page, the previous fixed screen remains one swipe away.
    let origin = 0;
    for (let index = 1; index < stops.length && stops[index] <= start + tolerance; index += 1) origin = index;
    return stops[Math.max(0, origin - 1)];
  }
  if (direction === 'up' && start < last - tolerance) {
    return stops.find(stop => stop > start + tolerance) ?? null;
  }
  // A cancelled or horizontal gesture must not leave two fixed screens visible.
  for (let index = 1; index < stops.length; index += 1) {
    const before = stops[index - 1], after = stops[index];
    if (end > before + tolerance && end < after - tolerance) return end < (before + after) / 2 ? before : after;
  }
  return null;
}
