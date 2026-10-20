/** Decode one navigation query value; keep malformed external share links readable. */
export function decodeRouteValue(value: string | undefined): string {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch { return value; }
}
