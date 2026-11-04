import type { TodoSubtask } from './tool-records';
import { hasSubtaskText } from './todo-subtasks';
/** Unknown legacy fields remain untouched: only fully shaped lists are editable. */
export function isEditorChecklist(value: unknown): value is TodoSubtask[] {
  return Array.isArray(value) && value.length <= 50 && value.every(row => row && typeof row.id === 'string' && !!row.id && typeof row.title === 'string' && typeof row.completed === 'boolean') && new Set(value.map(row => row.id)).size === value.length;
}
export function checklistItems(value: unknown): TodoSubtask[] { return isEditorChecklist(value) ? value.filter(row => hasSubtaskText(row.title)) : []; }
export const checklistSummary = (value: unknown) => { const rows=checklistItems(value);return rows.length ? `清单 ${rows.filter(row=>row.completed).length}/${rows.length}` : ''; };
