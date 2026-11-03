import ActionMenu from './action-menu';
import { showAppMessage } from '../lib/app-dialog';
import { trimTextEnd } from '../lib/text-whitespace';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Taro, { useDidHide } from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from './ui-button';
import { applyEntryQuadrant, entryDraftKey, entryDraftForStorage, homeEntryModeKey, isEntryDraft, isEntryMode, newEntryDraft, switchEntryMode, validateEntry, type EntryDraft, type EntryMode, type EntryQuadrantId } from '../lib/entry-draft';
import { hasVolatilePersonalTool, usePersonalToolState } from '../lib/use-personal-tool-state';
import { useEntryTags } from '../lib/use-entry-tags';
import { parseTodoTags, saveTodo } from '../lib/todo-data';
import { isMemoImage, MAX_MEMO_IMAGES, memoStateFits, withMemo } from '../lib/memo-images';
import { initialMemoState, initialTodoState, isMemoState, isTodoState, localToolDay, todoQuadrant, todoQuadrants, type Todo } from '../lib/tool-records';
import { scheduleSummary } from '../lib/todo-schedule';
import type { TodoSchedule } from '../lib/todo-schedule';
import TodoEditorFields from './todo-editor-fields';
import EditorPreviewButton from './editor-preview-button';
import MemoEditorFields from './memo-editor-fields';
import TodoScheduleSheet from './todo-schedule-sheet';
import SheetActions from './sheet-actions';
import EditorHeading from './editor-heading';
import { ChoicePopover, PopoverHeading, TagChoiceRow } from './form-options';
import TaskDetailEditor, { TaskTagSymbol, TaskAttachmentSymbol } from './task-detail-editor';
import PrioritySelect from './priority-select';
import TagTextInput from './tag-text-input';
import MarkdownNoteEditor from './markdown-note-editor';
import { noteStateFits } from '../lib/note-image-data';
import TodoCategoryField from './todo-category-field';
import { resumeEditorInput } from '../lib/resume-editor-input';
import ProgressEditorFields from './progress-editor-fields';
import SwipePanels from './swipe-panels';
import EntryPreview from './entry-preview';
import { initialDomainState, isDomainState, type DomainState } from '../lib/domain-data';
import { hasProgressContent, progressEntries, progressRecord, remainingProgressDraft, saveAutoProgressDraft, setProgressText } from '../lib/progress-draft';
import './entry-composer.css';
import './document-editor-sheet.css';

const entryTool = (mode: EntryMode) => mode === 'task' ? 'todos' : mode === 'memo' ? 'memos' : 'domains';
const modeLabel = (mode: EntryMode) => mode === 'task' ? '任务' : mode === 'memo' ? '便签' : '记录';
const entryModes = ['task', 'memo', 'progress'] as const;
function activeEntrySignature(value: EntryDraft) {
  if (value.mode === 'progress') return JSON.stringify(value.progress);
  const item = value.mode === 'task' ? value.task : value.memo, { updatedAt: _, ...fields } = item;
  return JSON.stringify({ ...fields, title: item.title.trim(), ...(value.mode === 'memo' ? { body: trimTextEnd(value.memo.body) } : {}), tags: value.tagsText });
}
function entryHasContent(value: EntryDraft) { return value.mode === 'task' ? !!value.task.title.trim() : value.mode === 'memo' ? !!(value.memo.title.trim() || value.memo.body.trim() || value.memo.images?.length) : !!value.progress && hasProgressContent(value.progress); }
function editableEntrySignature(draft: EntryDraft) {
  const { mode: _mode, lastContentMode: _lastContentMode, ...fields } = draft;
  return JSON.stringify({ ...fields, task: { ...draft.task, images: draft.task.images ?? [] }, memo: { ...draft.memo, images: draft.memo.images ?? [] } });
}
function progressAlreadySaved(draft: EntryDraft, state: DomainState) {
  if (!draft.progress || !hasProgressContent(draft.progress)) return false;
  try {
    return progressEntries(draft.progress).every(({ kind, record }) => state.domains.some(domain => (kind === 'positive' ? domain.positiveRecords : domain.negativeRecords).some(item => item.id === record.id)));
  } catch { return false; }
}
type AutoSaveReceipt = Partial<Record<EntryMode, string[]>>;
type SwipeTouch = { clientX: number; clientY: number; identifier?: number };
type SwipeEvent = { target?: { dataset?: Record<string, unknown> }; touches?: SwipeTouch[]; changedTouches?: SwipeTouch[] };

export default function EntryComposer({ initialMode, preferLastCreatedMode = false, autoFocusOnOpen = true, initialText = '', initialTask, initialQuadrantId, initialDomainId, onClose, onCreated, onCleared }: {
  initialMode: EntryMode; preferLastCreatedMode?: boolean; autoFocusOnOpen?: boolean; initialText?: string; initialTask?: Todo; initialQuadrantId?: EntryQuadrantId; initialDomainId?: string; onClose: (reason?: 'account') => void;
  onCreated?: (mode: EntryMode, captureConsumed: boolean) => void;
  onCleared?: () => void;
}) {
  const todos = usePersonalToolState('todos', initialTodoState), memos = usePersonalToolState('memos', initialMemoState);
  const domains = usePersonalToolState('domains', initialDomainState);
  const catalog = useEntryTags();
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [pendingDraft] = useState(() => {
    const value = applyEntryQuadrant(newEntryDraft(initialMode, initialTask, initialDomainId), initialQuadrantId);
    return initialText ? { ...value, task: { ...value.task, title: initialText }, memo: { ...value.memo, title: initialText } } : value;
  });
  const [busy, setBusy] = useState(false), [imageBusy, setImageBusy] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false), [error, setError] = useState('');
  const [info, setInfo] = useState(''), [tagsOpen, setTagsOpen] = useState(false), [nextOpen, setNextOpen] = useState(false), [moreOpen, setMoreOpen] = useState(false), [priorityOpen, setPriorityOpen] = useState(false), [imageSignal, setImageSignal] = useState(0);
  const [memoPreview,setMemoPreview] = useState(false);
  useEffect(() => { setMemoPreview(false); },[draft?.memo.id]);
  const [retryMode, setRetryMode] = useState<EntryMode | null>(null);
  const [slide, setSlide] = useState<{ offset: number; mode: EntryMode } | null>(null);
  const [focusReady, setFocusReady] = useState(false);
  const [focusRequested, setFocusRequested] = useState(autoFocusOnOpen);
  const draftOwner = useRef(''), mounted = useRef(true), operating = useRef(false), completed = useRef(false), processing = useRef(false);
  const latest = useRef(draft), close = useRef(onClose), initialDraft = useRef('');
  const baselines = useRef<Partial<Record<EntryMode, EntryDraft>>>({}), savedSignatures = useRef<Partial<Record<EntryMode, string>>>({}), savePromise = useRef<Promise<boolean> | null>(null), saveLatest = useRef<() => Promise<boolean>>(async () => true);
  const savedSomething = useRef(false), receipts = useRef<AutoSaveReceipt>({});
  latest.current = draft; close.current = onClose;
  const mode = draft?.mode || initialMode;
  const sources = { task: todos, memo: memos, progress: domains };
  const validSources = { task: isTodoState(todos.value), memo: isMemoState(memos.value), progress: isDomainState(domains.value) };
  const owner = sources[mode].owner;
  const readable = !!owner && sources[mode].ready;
  const writable = readable && validSources[mode] && !Object.values(sources).some(source => source.owner && source.owner !== owner);
  const modeReady = (kind: EntryMode) => sources[kind].ready && sources[kind].owner === owner && validSources[kind];
  const liveArchives = useRef({ task: todos.value, memo: memos.value, progress: domains.value });
  liveArchives.current = { task: todos.value, memo: memos.value, progress: domains.value };
  const current = useRef({ owner, writable, owners: [todos.owner, memos.owner, domains.owner] });
  current.current = { owner, writable, owners: [todos.owner, memos.owner, domains.owner] };
  const locked = imageBusy || !writable || owner !== draftOwner.current;
  const swipe = useRef<{ x: number; y: number; dx: number; dy: number; horizontal: boolean; identifier?: number; owner: string; mode: EntryMode } | null>(null);
  useEffect(() => { swipe.current = null; setSlide(null); }, [locked, scheduleOpen, retryMode, owner, draft?.mode]);
  useEffect(() => {
    setFocusReady(false);
    if (!draft || !focusRequested) return;
    const timer = setTimeout(() => setFocusReady(true), 100);
    return () => clearTimeout(timer);
  }, [owner, focusRequested, draft?.task.id, draft?.memo.id, draft?.progress && progressRecord(draft.progress).id]);
  useEffect(() => { todos.retry(); memos.retry(); domains.retry(); }, [todos.retry, memos.retry, domains.retry]);
  function storeDraft(value: EntryDraft, expectedOwner: string) {
    if (!expectedOwner) return;
    // Drafts have their own account-local namespace and never enter the tool save queue.
    const stored = entryDraftForStorage(value);
    if (encodeURIComponent(JSON.stringify(stored)).replace(/%[A-F\d]{2}/g, '_').length > 900 * 1024) throw new Error('草稿较大，请减少图片后重试');
    Taro.setStorageSync(entryDraftKey(expectedOwner), { ...stored, autoSave: true, autoSaveReceipt: receipts.current });
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (!completed.current && latest.current && draftOwner.current) {
        try { storeDraft(latest.current, draftOwner.current); } catch { void showAppMessage({ title: '草稿未保存，本机存储不可用', icon: 'none' }); }
      }
    };
  }, []);
  useEffect(() => {
    if (draftOwner.current && ((todos.owner && todos.owner !== draftOwner.current) || (memos.owner && memos.owner !== draftOwner.current) || (domains.owner && domains.owner !== draftOwner.current))) {
      if (latest.current) { try { storeDraft(latest.current, draftOwner.current); } catch { void showAppMessage({ title: '旧账号草稿未保存，请检查本机存储', icon: 'none' }); } }
      close.current('account'); return;
    }
    if (!writable || draftOwner.current) return;
    try {
      let requestedMode = initialMode;
      if (preferLastCreatedMode) {
        try {
          const remembered = Taro.getStorageSync(homeEntryModeKey(owner));
          if (isEntryMode(remembered)) requestedMode = remembered;
        } catch { /* A missing local preference does not block creation or draft recovery. */ }
      }
      const saved = Taro.getStorageSync(entryDraftKey(owner));
      // Recover a saved type only after its own data is ready. New tasks do
      // not wait for unrelated memo/domain requests.
      if (isEntryDraft(saved) && !modeReady(saved.mode)) return;
      const alreadySaved = isEntryDraft(saved) && !(saved as EntryDraft & { autoSave?: boolean }).autoSave && (saved.mode === 'task' ? todos.value.tasks.some(task => task.id === saved.task.id) : saved.mode === 'memo' ? memos.value.notes.some(note => note.id === saved.memo.id)
        : progressAlreadySaved(saved, domains.value))
        && !(saved.pendingSave === saved.mode && hasVolatilePersonalTool(entryTool(saved.mode), owner));
      const remaining = alreadySaved && saved.mode === 'progress' && saved.progress ? remainingProgressDraft(saved.progress) : undefined;
      const restoring = isEntryDraft(saved) && (!alreadySaved || !!remaining);
      const source = remaining ? { ...saved, progress: remaining, pendingSave: undefined, task: { ...saved.task, title: remaining.positive.content }, memo: { ...saved.memo, title: remaining.positive.content } } : saved;
      if (!modeReady(restoring && source.pendingSave ? source.pendingSave : requestedMode)) return;
      let next = applyEntryQuadrant(restoring ? switchEntryMode(source, source.pendingSave || requestedMode) : newEntryDraft(requestedMode, initialTask, initialDomainId), initialQuadrantId);
      if (initialDomainId !== undefined && next.progress && !next.pendingSave) next = { ...next, progress: { ...next.progress, domainId: initialDomainId } };
      if (next.pendingSave) setRetryMode(next.pendingSave);
      if (initialText && !next.pendingSave && (!restoring || saved.captureText !== initialText)) {
        const title = next.mode === 'progress' ? progressRecord(next.progress!).content : next.mode === 'task' ? next.task.title : next.memo.title;
        const body = next.mode === 'task' ? next.task.description : next.memo.body;
        const appendedToDraft = restoring && !!title.trim() && title !== initialText;
        if (next.mode === 'progress') {
          const content = appendedToDraft ? [title, initialText].join('\n') : initialText;
          next = { ...next, progress: setProgressText(next.progress!, content), task: { ...next.task, title: content }, memo: { ...next.memo, title: content } };
        } else if (appendedToDraft) {
          const appended = [body, initialText].filter(Boolean).join('\n');
          next = { ...next, task: { ...next.task, description: appended }, memo: { ...next.memo, body: appended } };
        } else next = { ...next, task: { ...next.task, title: initialText }, memo: { ...next.memo, title: initialText } };
        if (appendedToDraft) setInfo('已恢复草稿，新输入已追加到内容');
        next = { ...next, captureText: initialText };
      }
      draftOwner.current = owner;
      if (restoring && (saved as EntryDraft & { autoSave?: boolean }).autoSave) {
        const receipt = (saved as EntryDraft & { autoSaveReceipt?: AutoSaveReceipt }).autoSaveReceipt;
        receipts.current = Object.fromEntries(entryModes.flatMap(kind => receipt?.[kind] && Array.isArray(receipt[kind]) && receipt[kind]!.every(id => typeof id === 'string') ? [[kind, receipt[kind]]] : []));
        const existingTask = todos.value.tasks.find(row => row.id === next.task.id), existingMemo = memos.value.notes.find(row => row.id === next.memo.id);
        if (existingTask || receipts.current.task?.includes(next.task.id)) baselines.current.task = { ...next, mode: 'task', task: existingTask || next.task };
        if (existingMemo || receipts.current.memo?.includes(next.memo.id)) baselines.current.memo = { ...next, mode: 'memo', memo: existingMemo || next.memo };
        // Progress's saved IDs are deliberately retained; its model guards updates/deletions.

      }
      initialDraft.current = editableEntrySignature(next); setDraft(next);
    } catch { draftOwner.current = ''; setError('草稿读取失败，请重试'); }
  }, [owner, writable, todos.owner, memos.owner, domains.owner, todos.ready, memos.ready, domains.ready]);
  useEffect(() => {
    if (!draft || !draftOwner.current || completed.current) return;
    try { storeDraft(draft, draftOwner.current); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '草稿保存失败，请重试'); }
  }, [draft]);
  function update(next: EntryDraft) { if (!locked) { setError(''); latest.current = next; setDraft(next); } }
  function canSwitchMode() {
    return !!latest.current && mounted.current && !locked && !operating.current && !processing.current && !scheduleOpen && !retryMode && !latest.current.pendingSave && current.current.writable && current.current.owner === draftOwner.current;
  }
  function imagesBusy(value: boolean) { processing.current = value; if (mounted.current) setImageBusy(value); }
  function clearInputs() {
    if (!canSwitchMode()) return;
    swipe.current = null; setSlide(null); setFocusReady(false); setFocusRequested(true);
    const next = applyEntryQuadrant(newEntryDraft(latest.current!.mode, undefined, initialDomainId), initialQuadrantId);
    baselines.current = {}; savedSignatures.current = {}; receipts.current = {};
    initialDraft.current = editableEntrySignature(next);
    latest.current = next;
    update(next); setInfo(''); onCleared?.();
  }
  async function changeMode(kind: EntryMode) {
    swipe.current = null;
    if (!canSwitchMode() || !modeReady(kind)) return;
    if (latest.current && entryHasContent(latest.current) && activeEntrySignature(latest.current) !== savedSignatures.current[latest.current.mode] && !await save()) return;
    setSlide(null); setFocusReady(false); setFocusRequested(false);
    void Taro.hideKeyboard().catch(() => {});
    if (latest.current!.mode === kind) return;
    update(switchEntryMode(latest.current!, kind));
  }
  function swipeStart(event: SwipeEvent) {
    swipe.current = null; setSlide(null);
    // Whitelist blank containers; native inputs, images and child windows retain their own gestures.
    if (!canSwitchMode() || event.target?.dataset?.entrySwipe !== 'true' || event.touches?.length !== 1) return;
    const touch = event.touches[0];
    if (Number.isFinite(touch.clientX) && Number.isFinite(touch.clientY)) swipe.current = { x: touch.clientX, y: touch.clientY, dx: 0, dy: 0, horizontal: false, identifier: touch.identifier, owner: current.current.owner, mode: latest.current!.mode };
  }
  function swipeMove(event: SwipeEvent) {
    const movement = swipe.current, touch = event.touches?.[0];
    if (!movement) return;
    if (!canSwitchMode() || event.touches?.length !== 1 || !touch || touch.identifier !== movement.identifier) { swipe.current = null; setSlide(null); return; }
    movement.dx = touch.clientX - movement.x; movement.dy = touch.clientY - movement.y;
    if (!Number.isFinite(movement.dx) || !Number.isFinite(movement.dy) || Math.abs(movement.dy) >= 8 && Math.abs(movement.dy) >= Math.abs(movement.dx)) { swipe.current = null; setSlide(null); return; }
    if (!movement.horizontal && (Math.abs(movement.dx) < 8 || Math.abs(movement.dx) < Math.abs(movement.dy) * 1.5)) return;
    const kind = entryModes[entryModes.indexOf(movement.mode) + (movement.dx < 0 ? 1 : -1)];
    if (!kind || !modeReady(kind)) { setSlide(null); return; }
    if (!movement.horizontal) { movement.horizontal = true; setFocusReady(false); setFocusRequested(false); void Taro.hideKeyboard().catch(() => {}); }
    const width = Taro.getWindowInfo().windowWidth;
    setSlide({ offset: Math.max(-width, Math.min(width, movement.dx)), mode: kind });
  }
  function swipeEnd(event: SwipeEvent) {
    const movement = swipe.current, touch = event.changedTouches?.[0];
    swipe.current = null; setSlide(null);
    if (!movement || !canSwitchMode() || event.touches?.length || event.changedTouches?.length !== 1 || !touch || touch.identifier !== movement.identifier || movement.owner !== current.current.owner || movement.mode !== latest.current!.mode) return;
    const dx = touch.clientX - movement.x, dy = touch.clientY - movement.y;
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const kind = entryModes[entryModes.indexOf(movement.mode) + (dx < 0 ? 1 : -1)];
    if (kind) changeMode(kind);
  }
  function confirmedRemoved(value: EntryDraft) {
    const ids = receipts.current[value.mode];
    if (!ids?.length || !modeReady(value.mode) || hasVolatilePersonalTool(entryTool(value.mode), draftOwner.current)) return false;
    const liveIds = value.mode === 'task' ? liveArchives.current.task.tasks.map(row => row.id) : value.mode === 'memo' ? liveArchives.current.memo.notes.map(row => row.id) : liveArchives.current.progress.domains.flatMap(domain => [...domain.positiveRecords, ...domain.negativeRecords].map(row => row.id));
    return ids.some(id => !liveIds.includes(id));
  }
  async function dismiss() {
    if (imageBusy || processing.current || !latest.current) return;
    const expectedOwner = draftOwner.current;
    while (latest.current && current.current.owner === expectedOwner) {
      const value = latest.current;
      if (confirmedRemoved(value)) { try { storeDraft(value, expectedOwner); } catch { /* Original input remains in the current session. */ } completed.current = true; onClose(); return; }
      if (entryHasContent(value) || baselines.current[value.mode]) {
        if (!await save()) return;
        if (latest.current && activeEntrySignature(latest.current) !== savedSignatures.current[latest.current.mode]) continue;
      } else if (value.mode === 'task' && (value.task.description.trim() || value.task.images?.length)) { setError('请填写任务名称'); return; }
      completed.current = true;
      try { Taro.removeStorageSync(entryDraftKey(expectedOwner)); } catch { /* Durable tool IDs prevent duplicate creation. */ }
      if (savedSomething.current) onCreated?.(value.mode, !initialText || value.captureText === initialText);
      onClose(); return;
    }
  }
  useEffect(() => {
    if (!draft || busy || locked || error || scheduleOpen || !entryHasContent(draft) && !baselines.current[draft.mode] || activeEntrySignature(draft) === savedSignatures.current[draft.mode]) return;
    const timer = setTimeout(() => { void saveLatest.current(); }, 450); return () => clearTimeout(timer);
  }, [draft, busy, locked, error, scheduleOpen]);
  useDidHide(() => { if (latest.current && !processing.current) void saveLatest.current(); });
  useEffect(() => { if (typeof window === 'undefined') return; const flush = () => { if (latest.current && !processing.current) void saveLatest.current(); }; window.addEventListener('pagehide', flush); return () => window.removeEventListener('pagehide', flush); }, []);
  useLayoutEffect(() => () => { if (latest.current && !completed.current && draftOwner.current === current.current.owner && !processing.current) void saveLatest.current(); }, []);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !scheduleOpen && !moreOpen && !imageBusy) { event.preventDefault(); void dismiss(); } };
    document.addEventListener('keydown', cancel); return () => document.removeEventListener('keydown', cancel);
  }, [draft, imageBusy, scheduleOpen, moreOpen]);
  function save(): Promise<boolean> {
    if (savePromise.current) return savePromise.current;
    const operation = saveCaptured(); savePromise.current = operation;
    void operation.finally(() => { if (savePromise.current === operation) savePromise.current = null; }); return operation;
  }
  async function saveCaptured(): Promise<boolean> {
    const captured = latest.current, expectedOwner = draftOwner.current;
    if (!captured || processing.current || !current.current.writable || current.current.owner !== expectedOwner) return false;
    if (!entryHasContent(captured) && !baselines.current[captured.mode]) return true;
    if (activeEntrySignature(captured) === savedSignatures.current[captured.mode] && !hasVolatilePersonalTool(entryTool(captured.mode), expectedOwner)) return true;
    operating.current = true; if (mounted.current) { setBusy(true); setError(''); }
    try {
      if (confirmedRemoved(captured)) throw new Error('原内容已删除，输入已保留，请关闭后处理');
      const tags = captured.mode === 'progress' ? [] : validateEntry(captured), baseline = baselines.current[captured.mode];
      if (captured.mode === 'task') {
        await todos.setValue(previous => {
          if (current.current.owner !== expectedOwner || !isTodoState(previous)) throw new Error('账号或任务数据已变化，请重新打开');
          const existing = previous.tasks.find(row => row.id === captured.task.id);
          if (baseline && !existing) throw new Error('这件任务已删除，内容已保留');
          const task = existing && baseline ? resumeEditorInput(existing, baseline.task, { ...captured.task, tags }) : { ...captured.task, tags };
          const updated = saveTodo(previous, { ...task, categoryId: previous.categories.some(item => item.id === task.categoryId) ? task.categoryId : '' }); liveArchives.current.task = updated; return updated;
        });
      } else if (captured.mode === 'memo') {
        const note = { ...captured.memo, title: captured.memo.title.trim(), body: trimTextEnd(captured.memo.body), tags, updatedAt: new Date().toISOString() };
        const images = note.images || [];
        if (images.length > MAX_MEMO_IMAGES || images.some(image => !isMemoImage(image))) throw new Error('图片无效或超出数量限制');
        await memos.setValue(previous => {
          if (current.current.owner !== expectedOwner || !isMemoState(previous)) throw new Error('账号或便签数据已变化，请重新打开');
          const existing = previous.notes.find(row => row.id === note.id);
          if (baseline && !existing) throw new Error('这张便签已删除，内容已保留');
          if (!existing && previous.notes.length >= 50) throw new Error('最多保存 50 篇便签');
          const value = existing && baseline ? resumeEditorInput(existing, baseline.memo, note) : note, updated = withMemo(previous, value);
          if (!memoStateFits(updated)) throw new Error('便签空间不足，请整理图片'); liveArchives.current.memo = updated; return updated;
        });
      } else {
        if (!captured.progress) throw new Error('记录草稿读取失败，请重试');
        await domains.setValue(previous => {
          if (current.current.owner !== expectedOwner || !isDomainState(previous)) throw new Error('账号或记录已变化，请重新打开');
          const updated = saveAutoProgressDraft(previous, baseline?.progress || null, captured.progress!, hasVolatilePersonalTool('domains', expectedOwner)); liveArchives.current.progress = updated; return updated;
        });
      }
      if (hasVolatilePersonalTool(entryTool(captured.mode), expectedOwner)) throw new Error('本机存储不可用，内容已保留，请重试');
      baselines.current[captured.mode] = captured; savedSignatures.current[captured.mode] = activeEntrySignature(captured); savedSomething.current = true;
      receipts.current[captured.mode] = captured.mode === 'task' ? [captured.task.id] : captured.mode === 'memo' ? [captured.memo.id] : captured.progress && hasProgressContent(captured.progress) ? progressEntries(captured.progress).map(row => row.record.id) : [];
      try { storeDraft(latest.current || captured, expectedOwner); } catch { /* The business queue is already durable; keep current input for retry. */ }
      if (mounted.current && current.current.owner === expectedOwner) { setRetryMode(null); setError(''); }
      try { Taro.setStorageSync(homeEntryModeKey(expectedOwner), captured.mode); } catch { /* Choice memory is optional. */ }
      return true;
    } catch (cause) {
      if (mounted.current && draftOwner.current === expectedOwner && !current.current.owners.some(value => value && value !== expectedOwner)) setError(cause instanceof Error ? cause.message : '保存失败，请重试');
      return false;
    } finally { operating.current = false; if (mounted.current) setBusy(false); }
  }
  saveLatest.current = save;
  const today = localToolDay(), autoFocus = focusRequested && focusReady;
  const previewDraft = draft && slide ? switchEntryMode(draft, slide.mode) : null;
  const modes = <View className='entry-modes' data-entry-swipe='true'>{entryModes.map(kind => <ChoiceButton key={kind} className={`button-label entry-mode${mode === kind ? ' is-active' : ''}`} ariaLabel={`创建类型：${modeLabel(kind)}`} aria-pressed={mode === kind} disabled={locked || busy || !modeReady(kind) || !!retryMode && retryMode !== kind} onClick={() => changeMode(kind)}>{modeLabel(kind)}</ChoiceButton>)}</View>;
  const task = draft?.task || pendingDraft.task;
  const changeTask = (value: Todo) => { const active = latest.current; if (active && current.current.writable && current.current.owner === draftOwner.current) { setError(''); const next = { ...active, task: value }; latest.current = next; setDraft(next); } };
  const openSchedule = () => { setFocusReady(false); void Taro.hideKeyboard().catch(() => {}); setScheduleOpen(true); };
  return <>
    {mode === 'task' && <TaskDetailEditor draft={{ ...task, tags: parseTodoTags(draft?.tagsText || '') }} onChange={changeTask} onClose={() => { void dismiss(); }} disabled={!draft || locked} autoFocus={autoFocus && !retryMode && !scheduleOpen} ariaLabel='创建任务、便签或添加记录' panelClassName='entry-composer is-autosave'
      topBar={<View className='entry-type-heading' data-entry-swipe='true' onTouchStart={swipeStart} onTouchMove={swipeMove} onTouchEnd={swipeEnd} onTouchCancel={() => { swipe.current = null; setSlide(null); }}>{modes}</View>}
      category={<TodoCategoryField value={task.categoryId} owner={draftOwner.current} disabled={!draft || locked} onChange={categoryId => { const active = latest.current; if (active) changeTask({ ...active.task, categoryId }); }} />}
      priority={<PrioritySelect ariaLabel='任务优先级' open={priorityOpen} onOpenChange={setPriorityOpen} disabled={!draft || locked} optionsAriaLabel='任务优先级' options={todoQuadrants.map((q, index) => ({ value: q.id, label: ['高','中','低','无'][index], ariaLabel: q.title, color: q.color, outlined: q.id === 'later' }))} value={todoQuadrant(task).id} onChange={id => { const q = todoQuadrants.find(q => q.id === id); if (q) changeTask({ ...task, important: q.important, urgent: q.urgent }); }} />}
      more={<ActionMenu ariaLabel='更多编辑操作' open={moreOpen} onOpenChange={setMoreOpen} panelWidth={180}>
        <ActionButton appearance='quiet' onClick={() => { setMoreOpen(false); setNextOpen(!nextOpen); }}>后续任务</ActionButton>
        <ActionButton appearance='quiet' onClick={() => { setMoreOpen(false); void dismiss(); }}>收起</ActionButton>
        <ActionButton appearance='quiet' onClick={() => { setMoreOpen(false); clearInputs(); }}>清空输入</ActionButton>
      </ActionMenu>}
      onToggleComplete={() => changeTask({ ...task, completedAt: task.completedAt ? null : new Date().toISOString() })}
      onSchedule={openSchedule} scheduleOpen={scheduleOpen} scheduleLabel={task.dueDate || task.reminderAt || task.recurrence ? scheduleSummary(task, today) : '日期&提醒'}
      onTags={() => setTagsOpen(true)} onAttachment={() => setImageSignal(value => value + 1)} pending={busy} error={error} onRetry={() => { setError(''); void save(); }}
      notes={(preview,onPreviewChange) => <>{!!info && <View className='entry-info' role='status'>{info}</View>}{!draft && <View className='entry-load' role='status'><Text>正在确认账号与草稿…</Text><ActionButton onClick={() => sources.task.retry()}>重试</ActionButton></View>}<MarkdownNoteEditor className='task-detail-note' value={task.description} images={task.images} preview={preview} onPreviewChange={onPreviewChange} minimal emptyPreviewPlaceholder='备注' insertionSignal={imageSignal} onChange={description => changeTask({ ...task, description })} onImagesChange={images => changeTask({ ...task, images })} owner={draftOwner.current} recordId={task.id} disabled={!draft || locked} maxLength={10000} ariaLabel='任务备注' placeholder='备注' showImageInsertion={false} canInsertImage={writable} onBusyChange={imagesBusy} checkImages={images => { if (!isTodoState(todos.value) || !noteStateFits({ ...todos.value, tasks: [{ ...task, images }, ...todos.value.tasks.filter(item => item.id !== task.id)] })) throw new Error('任务空间不足，请整理图片'); }} /></>}
      nextSteps={nextOpen && draft ? <View className='task-detail-next-steps'><TodoEditorFields nextStepsOnly draft={task} onChange={changeTask} tagsText={draft.tagsText} onTagsChange={tagsText => update({ ...draft, tagsText })} tagOptions={[]} disabled={locked} owner={draftOwner.current} today={today} scheduleOpen={false} onSchedule={openSchedule} /></View> : undefined}
    />}
    <View id='entry-task-tags-anchor' className='task-detail-hidden-anchor' aria-hidden />
    <ChoicePopover anchorId='entry-task-tags-anchor' ariaLabel='任务标签' open={mode === 'task' && !!draft && tagsOpen} onOpenChange={setTagsOpen} placement='center' panelWidth={360} heading={<PopoverHeading title='标签' />}>
      <TagChoiceRow options={(catalog.owner === owner ? catalog.tags : []).map(tag => ({ value: tag, label: tag }))} value={parseTodoTags(draft?.tagsText || '')} onChange={tags => { if (draft) update({ ...draft, tagsText: tags.join('，') }); }} disabled={locked} customInputPlacement='inline' customInput={<TagTextInput ariaLabel='任务标签' value={draft?.tagsText || ''} disabled={locked} onInput={event => { if (draft) update({ ...draft, tagsText: event.detail.value }); }} />} />
    </ChoicePopover>
    {mode !== 'task' && <View className='todo-overlay entry-overlay'  catchMove><View className='todo-backdrop' onClick={() => { void dismiss(); }} /><View className={`entry-composer is-autosave todo-sheet${mode === 'memo' ? ' memo-sheet' : ''}`} role='dialog' ariaLabel='创建任务、便签或添加记录' data-entry-swipe='true' onTouchStart={swipeStart} onTouchMove={swipeMove} onTouchEnd={swipeEnd} onTouchCancel={() => { swipe.current = null; setSlide(null); }}>
      <EditorHeading className='todo-sheet-heading entry-heading' title={null} titleContent={modes} actions={<ActionMenu ariaLabel='更多编辑操作' open={moreOpen} onOpenChange={setMoreOpen} panelWidth={180}><ActionButton appearance='quiet' onClick={() => { setMoreOpen(false); void dismiss(); }}>收起</ActionButton><ActionButton appearance='quiet' onClick={() => { setMoreOpen(false); clearInputs(); }}>清空输入</ActionButton></ActionMenu>} />
      <ScrollView scrollY className='todo-sheet-scroll entry-scroll' data-entry-swipe='true' enhanced bounces={false} showScrollbar={false}><SwipePanels offset={slide?.offset} direction={slide && entryModes.indexOf(slide.mode) < entryModes.indexOf(mode) ? 'previous' : 'next'} adjacent={previewDraft && isDomainState(domains.value) ? <View className='todo-sheet-fields'><EntryPreview draft={previewDraft} domains={domains.value} /></View> : undefined}><View key={mode} className={`todo-sheet-fields${mode === 'memo' ? ' memo-sheet-body' : ''}`} data-entry-swipe='true'>
        {!!info && <View className='entry-info' role='status'>{info}</View>}
        {!draft && <><View className='entry-load' role='status'><Text>{error || (readable && !writable ? '当前类型的数据格式暂不兼容' : '正在确认账号与草稿…')}</Text><ActionButton className='button-label tool-secondary' onClick={() => { setError(''); sources[mode].retry(); }}>重试</ActionButton></View>
          {mode === 'memo' && <MemoEditorFields minimal showTags={tagsOpen} draft={pendingDraft.memo} onChange={() => {}} tagsText={pendingDraft.tagsText} onTagsChange={() => {}} tagOptions={[]} disabled owner='' onBusyChange={() => {}} />}
          {mode === 'progress' && pendingDraft.progress && <ProgressEditorFields draft={pendingDraft.progress} state={initialDomainState} owner='' disabled onBusyChange={() => {}} onChange={() => {}} />}
        </>}
        {draft && slide && isDomainState(domains.value) && <EntryPreview draft={draft} domains={domains.value} />}
        {draft && !slide && mode === 'memo' && <MemoEditorFields preview={memoPreview} onPreviewChange={setMemoPreview} minimal showTags={tagsOpen} insertionSignal={imageSignal} key={draft.memo.id} autoFocus={autoFocus && !retryMode} draft={draft.memo} onChange={memo => { if (current.current.writable && current.current.owner === draftOwner.current) { setError(''); const next = { ...draft, memo }; latest.current = next; setDraft(next); } }} tagsText={draft.tagsText} onTagsChange={tagsText => update({ ...draft, tagsText })} tagOptions={catalog.owner === owner ? catalog.tags : []} disabled={locked} owner={draftOwner.current} onBusyChange={imagesBusy} />}
        {draft?.progress && !slide && mode === 'progress' && isDomainState(domains.value) && <ProgressEditorFields insertionSignal={imageSignal} key={progressRecord(draft.progress).id} autoFocus={autoFocus && !retryMode} draft={draft.progress} state={domains.value} owner={draftOwner.current} disabled={locked} onBusyChange={imagesBusy} onChange={progress => { if (current.current.writable && current.current.owner === draftOwner.current) { setError(''); const next = { ...draft, progress }; latest.current = next; setDraft(next); } }} />}
        {!!error && !!draft && <View className='entry-error' role='alert'>{error}</View>}
      </View></SwipePanels></ScrollView>
      <SheetActions className='todo-sheet-footer entry-footer document-autosave-footer'>
        <View className='document-autosave-tools'>{mode !== 'progress' && <><ActionButton appearance='icon' ariaLabel='编辑标签' disabled={!draft || locked} onClick={() => setTagsOpen(!tagsOpen)}><TaskTagSymbol /></ActionButton><ActionButton appearance='icon' ariaLabel='编辑附件' disabled={!draft || locked} onClick={() => setImageSignal(value => value + 1)}><TaskAttachmentSymbol /></ActionButton></>}{mode === 'memo' && <EditorPreviewButton selected={memoPreview} onChange={setMemoPreview} disabled={!draft || locked} label='便签 Markdown 预览' />}</View>
        {!!error && draft && <ActionButton appearance='quiet' size='compact' disabled={busy || imageBusy} onClick={() => { setError(''); void save(); }}>重试</ActionButton>}
      </SheetActions>
    </View></View>}
    {draft && mode === 'task' && scheduleOpen && !locked && <TodoScheduleSheet key={`${owner}:${draft.task.id}`} value={draft.task} today={today} busy={busy} reminderLabel={owner === 'guest' ? '请登录' : '保存后开启'} canAuthorize={false} reminderLocked={false} onAuthorize={() => {}} onConfirm={(schedule: TodoSchedule) => { update({ ...draft, task: { ...draft.task, ...schedule } }); setScheduleOpen(false); }} onClose={() => setScheduleOpen(false)} />}
  </>;
}

import './compact-editor.css';
