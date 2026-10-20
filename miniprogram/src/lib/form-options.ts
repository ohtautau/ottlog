/** Rank this owner's saved values without persisting a separate usage cache. */
export function rankCommonValues(values: readonly string[], fallback: readonly string[] = []): string[] {
  const counts = new Map<string, number>();
  for (const value of [...values, ...fallback]) if (!counts.has(value)) counts.set(value, 0);
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.keys()].sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
}
