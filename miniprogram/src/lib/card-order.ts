/** Adjacent card movement preserves IDs and collection bounds. */
export function moveAdjacentItem<T>(items: T[], item: T, direction: -1 | 1): T[] {
  const from = items.indexOf(item), to = from + direction;
  if (from < 0 || to < 0 || to >= items.length) return items;
  const moved = [...items];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved;
}
