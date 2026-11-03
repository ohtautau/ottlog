import type { TodoSubtask } from './tool-records';

/** Spaces, format controls and isolated combining marks have no checklist content. */
export const hasSubtaskText = (title: string) => /[^\s\p{Cf}\p{Cc}\p{M}]/u.test(title);
export const visibleSubtasks = (items: readonly TodoSubtask[] | undefined) => (items || []).filter(item => hasSubtaskText(item.title));
