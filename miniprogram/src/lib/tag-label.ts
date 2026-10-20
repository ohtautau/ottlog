/** Format a tag for display without changing its stored or selected value. */
export function tagLabel(tag: string): string {
  return `#${tag.trim().replace(/^(?:#\s*)+/, '')}`;
}
