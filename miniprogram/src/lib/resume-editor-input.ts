/** Reapply unsaved fields without replacing other changes made after dismissal. */
export function resumeEditorInput<T extends object>(latest: T, baseline: T, draft: T): T {
  const resumed = { ...latest };
  const keys = new Set([...Object.keys(baseline), ...Object.keys(draft)]) as Set<keyof T>;
  for (const key of keys) {
    if (JSON.stringify(baseline[key]) !== JSON.stringify(draft[key])) resumed[key] = draft[key];
  }
  return resumed;
}
