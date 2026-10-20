import { createTodo, parseTodoTags } from './todo-data';
import { isMemoState, isTodoState, memoPriority, todoQuadrant, todoQuadrants, toolId, type Memo, type MemoPriority, type Todo } from './tool-records';
import { isNoteImage as isMemoImage, MAX_NOTE_IMAGES as MAX_MEMO_IMAGES } from './note-image-data';
import { isProgressDraft, newProgressDraft, pairedProgressDraft, progressEntries, progressRecord, setProgressText, type ProgressDraft } from './progress-draft';

export type EntryMode = 'task' | 'memo' | 'progress';
export type EntryQuadrantId = (typeof todoQuadrants)[number]['id'];
export type EntryDraft = { version: 1; mode: EntryMode; task: Todo; memo: Memo; tagsText: string; progress?: ProgressDraft; lastContentMode?: 'task' | 'memo'; pendingSave?: EntryMode; captureText?: string };
export const entryDraftKey = (owner: string) => `${typeof MINIPROGRAM_PREVIEW !== 'undefined' && MINIPROGRAM_PREVIEW ? 'ottlog-mini-preview-v1:' : ''}ottlog-mini-entry-draft-v1:${owner}`;
export const homeEntryModeKey = (owner: string) => `${typeof MINIPROGRAM_PREVIEW !== 'undefined' && MINIPROGRAM_PREVIEW ? 'ottlog-mini-preview-v1:' : ''}ottlog-mini-home-entry-mode-v1:${owner}`;
export const isEntryMode = (value: unknown): value is EntryMode => value === 'task' || value === 'memo' || value === 'progress';
const priorities: MemoPriority[] = ['high', 'medium', 'low', 'none'];

/** An explicit quadrant entry changes only priority, after restoring its owner's draft. */
export function applyEntryQuadrant(draft: EntryDraft, quadrantId?: EntryQuadrantId): EntryDraft {
  if (!quadrantId || draft.pendingSave || draft.mode !== 'task') return draft;
  const index = todoQuadrants.findIndex(quadrant => quadrant.id === quadrantId);
  if (index < 0) return draft;
  const quadrant = todoQuadrants[index];
  return { ...draft, task: { ...draft.task, important: quadrant.important, urgent: quadrant.urgent }, memo: { ...draft.memo, priority: priorities[index] } };
}

export function newEntryDraft(mode: EntryMode, initialTask?: Todo, initialDomainId = ''): EntryDraft {
  const task = initialTask || createTodo();
  const stamp = new Date().toISOString();
  return { version: 1, mode, task, progress: setProgressText(newProgressDraft(initialDomainId), task.title), lastContentMode: mode === 'memo' ? 'memo' : 'task', tagsText: (task.tags || []).join('，'), memo: {
    id: toolId(), title: task.title, body: task.description, tags: [...(task.tags || [])],
    priority: priorities[todoQuadrants.findIndex(q => q.id === todoQuadrant(task).id)],
    color: 'sand', pinned: false, images: task.images?.map(image => ({ ...image })) || [], createdAt: stamp, updatedAt: stamp,
  } };
}

/** Only common fields cross types; IDs and type-specific fields remain in their own draft. */
export function switchEntryMode(draft: EntryDraft, mode: EntryMode): EntryDraft {
  if (draft.pendingSave) return draft;
  // Upgrade old v1 drafts without changing their IDs or existing contents.
  if (!draft.progress) draft = { ...draft, progress: newProgressDraft() };
  draft = { ...draft, progress: pairedProgressDraft(draft.progress!) };
  if (mode === draft.mode) return draft;
  if (mode === 'progress') return { ...draft, mode, progress: setProgressText(draft.progress!, draft.mode === 'memo' ? draft.memo.title : draft.task.title), lastContentMode: draft.mode === 'memo' ? 'memo' : 'task' };
  if (draft.mode === 'progress') {
    const title = progressRecord(draft.progress!).content;
    return switchEntryMode({ ...draft, mode: draft.lastContentMode || 'task', task: { ...draft.task, title }, memo: { ...draft.memo, title } }, mode);
  }
  const tags = parseTodoTags(draft.tagsText);
  if (mode === 'memo') return { ...draft, mode, memo: {
    ...draft.memo, title: draft.task.title, body: draft.task.description, tags, images: (draft.task.images ?? draft.memo.images ?? []).map(image => ({ ...image })),
    priority: priorities[todoQuadrants.findIndex(q => q.id === todoQuadrant(draft.task).id)],
  } };
  const quadrant = todoQuadrants[priorities.indexOf(memoPriority(draft.memo))];
  return { ...draft, mode, task: {
    ...draft.task, title: draft.memo.title, description: draft.memo.body, tags, images: (draft.memo.images || []).map(image => ({ ...image })),
    important: quadrant.important, urgent: quadrant.urgent,
  } };
}

/** Store shared image bytes once, in the active type; old v1 drafts still restore. */
export function entryDraftForStorage(draft: EntryDraft): EntryDraft {
  const contentMode = draft.mode === 'progress' ? draft.lastContentMode || 'task' : draft.mode;
  const images = contentMode === 'task' ? draft.task.images ?? draft.memo.images : draft.memo.images ?? draft.task.images;
  return { ...draft, task: { ...draft.task, images: contentMode === 'task' ? images : undefined },
    memo: { ...draft.memo, images: contentMode === 'memo' ? images : undefined } };
}

export function isEntryDraft(value: unknown): value is EntryDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as EntryDraft;
  return draft.version === 1 && isEntryMode(draft.mode) && typeof draft.tagsText === 'string'
    && (draft.lastContentMode === undefined || ['task', 'memo'].includes(draft.lastContentMode))
    && (draft.progress === undefined ? draft.mode !== 'progress' : isProgressDraft(draft.progress))
    && (draft.pendingSave === undefined || draft.pendingSave === draft.mode)
    && (draft.captureText === undefined || typeof draft.captureText === 'string')
    && isTodoState({ version: 1, tasks: [draft.task], categories: [] })
    && isMemoState({ version: 1, notes: [draft.memo] })
    && typeof draft.task.important === 'boolean' && typeof draft.task.urgent === 'boolean'
    && typeof draft.task.createdAt === 'string' && typeof draft.task.updatedAt === 'string'
    && typeof draft.memo.pinned === 'boolean' && typeof draft.memo.createdAt === 'string' && typeof draft.memo.updatedAt === 'string'
    && (draft.memo.images === undefined || Array.isArray(draft.memo.images) && draft.memo.images.length <= MAX_MEMO_IMAGES && draft.memo.images.every(isMemoImage));
}

export function validateEntry(draft: EntryDraft) {
  if (draft.mode === 'progress') {
    if (!draft.progress) throw new Error('记录草稿读取失败，请重试');
    progressEntries(draft.progress);
    return [];
  }
  const tags = parseTodoTags(draft.tagsText);
  if (tags.length > 5 || tags.some(tag => tag.length > 20)) throw new Error('最多 5 个标签，每个不超过 20 字');
  if (draft.mode === 'task') {
    if (!draft.task.title.trim()) throw new Error('请先输入任务名称');
    if (draft.task.title.length > 100) throw new Error('任务名称最多 100 字');
    if (draft.task.description.length > 10000) throw new Error('任务备注最多 10000 字');
    if ((draft.task.nextTasks?.filter(step => step.title.trim()).length || 0) > 50 || draft.task.nextTasks?.some(step => step.title.trim() && step.title.length > 100)) throw new Error('最多 50 个下一步任务，每个不超过 100 字');
    if (draft.task.reminderAt && Date.parse(draft.task.reminderAt) <= Date.now()) throw new Error('请选择未来的通知时间');
  } else {
    if (!draft.memo.title.trim() && !draft.memo.body.trim() && !draft.memo.images?.length) throw new Error('请先输入备忘录内容');
    if (draft.memo.title.length > 80) throw new Error('备忘录标题最多 80 字');
    if (draft.memo.body.length > 6000) throw new Error('备忘录内容最多 6000 字');
  }
  return tags;
}
