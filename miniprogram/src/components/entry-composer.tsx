import { showAppMessage } from '../lib/app-dialog';
import { trimTextEnd } from '../lib/text-whitespace';
import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from './ui-button';
import { applyEntryQuadrant, entryDraftKey, entryDraftForStorage, homeEntryModeKey, isEntryDraft, isEntryMode, newEntryDraft, switchEntryMode, validateEntry, type EntryDraft, type EntryMode, type EntryQuadrantId } from '../lib/entry-draft';
import { hasVolatilePersonalTool, usePersonalToolState } from '../lib/use-personal-tool-state';
import { useEntryTags } from '../lib/use-entry-tags';
import { mergeTodoCategories, saveTodo } from '../lib/todo-data';
import { isMemoImage, MAX_MEMO_IMAGES, memoStateFits, withMemo } from '../lib/memo-images';
import { initialMemoState, initialTodoState, isMemoState, isTodoState, localToolDay, type Todo } from '../lib/tool-records';
import type { TodoSchedule } from '../lib/todo-schedule';
import TodoEditorFields from './todo-editor-fields';
import MemoEditorFields from './memo-editor-fields';
import TodoScheduleSheet from './todo-schedule-sheet';
import SheetActions from './sheet-actions';
import EditorHeading from './editor-heading';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import { DeleteSymbol } from './manage-symbol';
import ProgressEditorFields from './progress-editor-fields';
import SwipePanels from './swipe-panels';
import EntryPreview from './entry-preview';
import { initialDomainState, isDomainState, type DomainState } from '../lib/domain-data';
import { hasProgressContent, progressEntries, progressRecord, remainingProgressDraft, saveProgressDraft, setProgressText } from '../lib/progress-draft';
import './entry-composer.css';

const entryTool = (mode: EntryMode) => mode === 'task' ? 'todos' : mode === 'memo' ? 'memos' : 'domains';
const modeLabel = (mode: EntryMode) => mode === 'task' ? '任务' : mode === 'memo' ? '备忘' : '进展';
const entryModes = ['task', 'memo', 'progress'] as const;
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
  const [busy, setBusy] = useState(false), [imageBusy, setImageBusy] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false), [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [retryMode, setRetryMode] = useState<EntryMode | null>(null);
  const [slide, setSlide] = useState<{ offset: number; mode: EntryMode } | null>(null);
  const [focusReady, setFocusReady] = useState(false);
  const [focusRequested, setFocusRequested] = useState(autoFocusOnOpen);
  const draftOwner = useRef(''), mounted = useRef(true), operating = useRef(false), completed = useRef(false), processing = useRef(false);
  const latest = useRef(draft), close = useRef(onClose), initialDraft = useRef('');
  latest.current = draft; close.current = onClose;
  const owner = todos.owner && todos.owner === memos.owner && todos.owner === domains.owner ? todos.owner : '';
  const readable = !!owner && todos.ready && memos.ready && domains.ready;
  const writable = readable && isTodoState(todos.value) && isMemoState(memos.value) && isDomainState(domains.value);
  const current = useRef({ owner, writable, owners: [todos.owner, memos.owner, domains.owner] });
  current.current = { owner, writable, owners: [todos.owner, memos.owner, domains.owner] };
  const locked = busy || imageBusy || !writable || owner !== draftOwner.current;
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
    Taro.setStorageSync(entryDraftKey(expectedOwner), stored);
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
    draftOwner.current = owner;
    try {
      let requestedMode = initialMode;
      if (preferLastCreatedMode) {
        try {
          const remembered = Taro.getStorageSync(homeEntryModeKey(owner));
          if (isEntryMode(remembered)) requestedMode = remembered;
        } catch { /* A missing local preference does not block creation or draft recovery. */ }
      }
      const saved = Taro.getStorageSync(entryDraftKey(owner));
      const alreadySaved = isEntryDraft(saved) && (saved.mode === 'task' ? todos.value.tasks.some(task => task.id === saved.task.id) : saved.mode === 'memo' ? memos.value.notes.some(note => note.id === saved.memo.id)
        : progressAlreadySaved(saved, domains.value))
        && !(saved.pendingSave === saved.mode && hasVolatilePersonalTool(entryTool(saved.mode), owner));
      const remaining = alreadySaved && saved.mode === 'progress' && saved.progress ? remainingProgressDraft(saved.progress) : undefined;
      const restoring = isEntryDraft(saved) && (!alreadySaved || !!remaining);
      const source = remaining ? { ...saved, progress: remaining, pendingSave: undefined, task: { ...saved.task, title: remaining.positive.content }, memo: { ...saved.memo, title: remaining.positive.content } } : saved;
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
      initialDraft.current = editableEntrySignature(next); setDraft(next);
    } catch { draftOwner.current = ''; setError('草稿读取失败，请重试'); }
  }, [owner, writable, todos.owner, memos.owner, domains.owner]);
  useEffect(() => {
    if (!draft || !draftOwner.current || completed.current) return;
    try { storeDraft(draft, draftOwner.current); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '草稿保存失败，请重试'); }
  }, [draft]);
  function update(next: EntryDraft) { if (!locked) { setError(''); setDraft(next); } }
  function canSwitchMode() {
    return !!latest.current && mounted.current && !locked && !operating.current && !processing.current && !scheduleOpen && !retryMode && !latest.current.pendingSave && current.current.writable && current.current.owner === draftOwner.current;
  }
  function imagesBusy(value: boolean) { processing.current = value; if (mounted.current) setImageBusy(value); }
  function clearInputs() {
    if (!canSwitchMode()) return;
    swipe.current = null; setSlide(null); setFocusReady(false); setFocusRequested(true);
    const next = applyEntryQuadrant(newEntryDraft(latest.current!.mode, undefined, initialDomainId), initialQuadrantId);
    initialDraft.current = editableEntrySignature(next);
    latest.current = next;
    update(next); setInfo(''); onCleared?.();
  }
  function changeMode(kind: EntryMode) {
    swipe.current = null;
    if (!canSwitchMode()) return;
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
    if (!kind) { setSlide(null); return; }
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
  function dismiss() {
    if (busy || imageBusy || processing.current) return;
    try { if (draft) storeDraft(draft, draftOwner.current); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '草稿保存失败，请重试'); }
  }
  const closeGuard = useEditorCloseGuard({ scope: `${draftOwner.current || owner || 'loading'}:entry`, hasChanges: !!draft && (editableEntrySignature(draft) !== initialDraft.current || !!draft.pendingSave || !!draft.task.title.trim() || !!draft.task.description.trim() || !!draft.memo.title.trim() || !!draft.memo.body.trim() || !!draft.memo.images?.length || !!draft.tagsText.trim() || !!draft.progress && hasProgressContent(draft.progress)), blocked: busy || imageBusy, onSave: save, onClose: dismiss });
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !scheduleOpen && !operating.current && !imageBusy) closeGuard.requestClose(); };
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, [draft, busy, imageBusy, scheduleOpen, closeGuard.requestClose]);
  async function save() {
    if (!draft || locked || operating.current || processing.current || draft !== latest.current) return;
    const captured = draft, expectedOwner = draftOwner.current;
    try {
      const tags = validateEntry(captured);
      operating.current = true; setBusy(true); setError('');
      let savedTask: Todo | undefined;
      if (captured.mode === 'task') {
        await todos.setValue(previous => {
          if (!isTodoState(previous)) throw new Error('任务数据格式暂不兼容，请重试');
          if (previous.tasks.some(task => task.id === captured.task.id) && !(captured.pendingSave === 'task' && hasVolatilePersonalTool('todos', expectedOwner))) throw new Error('这件任务已创建，请关闭后重新打开');
          const updated = saveTodo(mergeTodoCategories(previous), { ...captured.task, tags });
          savedTask = updated.tasks.find(task => task.id === captured.task.id); return updated;
        });
      } else if (captured.mode === 'memo') {
        const images = captured.memo.images || [];
        if (images.length > MAX_MEMO_IMAGES || images.some(image => !isMemoImage(image))) throw new Error('图片无效或超出数量限制，请重新选择');
        const note = { ...captured.memo, title: captured.memo.title.trim(), body: trimTextEnd(captured.memo.body), tags, updatedAt: new Date().toISOString() };
        await memos.setValue(previous => {
          if (!isMemoState(previous)) throw new Error('备忘录数据格式暂不兼容，请重试');
          const exists = previous.notes.some(item => item.id === note.id);
          if (exists && !(captured.pendingSave === 'memo' && hasVolatilePersonalTool('memos', expectedOwner))) throw new Error('这篇备忘录已创建，请关闭后重新打开');
          if (!exists && previous.notes.length >= 50) throw new Error('最多保存 50 篇便签，请先清理一些');
          const updated = withMemo(previous, note);
          if (!memoStateFits(updated)) throw new Error('便签空间不足，请减少图片后重试');
          return updated;
        });
      } else {
        if (!captured.progress) throw new Error('记录草稿读取失败，请重试');
        const progress = captured.progress;
        await domains.setValue(previous => {
          if (current.current.owner !== expectedOwner || !isDomainState(previous)) throw new Error('账号或记录已变化，请重新打开');
          return saveProgressDraft(previous, progress, captured.pendingSave === 'progress');
        });
      }
      if (hasVolatilePersonalTool(entryTool(captured.mode), expectedOwner)) {
        if (mounted.current && current.current.owner === expectedOwner) setDraft({ ...captured, pendingSave: captured.mode });
        setRetryMode(captured.mode);
        throw new Error('本机存储不可用，内容已保留，请重试保存');
      }
      completed.current = true;
      const remaining = captured.mode === 'progress' && captured.progress ? remainingProgressDraft(captured.progress) : undefined;
      try {
        if (remaining) {
          const next = newEntryDraft('progress', undefined, remaining.domainId);
          storeDraft({ ...next, progress: remaining, task: { ...next.task, title: remaining.positive.content }, memo: { ...next.memo, title: remaining.positive.content } }, expectedOwner);
        } else Taro.removeStorageSync(entryDraftKey(expectedOwner));
      } catch { /* Saved IDs prevent duplicate restoration and recover any remaining legacy boxes. */ }
      if (!mounted.current || current.current.owner !== expectedOwner || !current.current.writable) return;
      let remembered = true;
      try { Taro.setStorageSync(homeEntryModeKey(expectedOwner), captured.mode); }
      catch { remembered = false; }
      onCreated?.(captured.mode, !initialText || captured.captureText === initialText); onClose();
      if (!remembered || savedTask?.reminderAt) void showAppMessage({ title: !remembered ? '内容已保存，默认类型未记住' : '请开启微信提醒', icon: 'none' });
      if (captured.mode === 'task') void Taro.switchTab({ url: '/pages/todos/index' }).catch(() => {
        void showAppMessage({ title: '任务已保存，进入待办页失败，请从底部打开待办', icon: 'none' });
      });
    } catch (cause) {
      // Failed updates reload their source and briefly clear its owner. Preserve this
      // form's feedback while every known source still belongs to the captured owner.
      if (mounted.current && draftOwner.current === expectedOwner && !current.current.owners.some(value => value && value !== expectedOwner)) setError(cause instanceof Error ? cause.message : '保存失败，请重试');
    }
    finally { operating.current = false; if (mounted.current) setBusy(false); }
  }
  const today = localToolDay(), mode = draft?.mode || initialMode, autoFocus = focusRequested && focusReady;
  const previewDraft = draft && slide ? switchEntryMode(draft, slide.mode) : null;
  return <>
    <View className='todo-overlay entry-overlay' catchMove><View className='todo-backdrop' onClick={closeGuard.requestClose} /><View className={`entry-composer todo-sheet${mode === 'memo' ? ' memo-sheet' : ''}`} role='dialog' ariaLabel='创建任务、备忘或记录进展' data-entry-swipe='true' onTouchStart={swipeStart} onTouchMove={swipeMove} onTouchEnd={swipeEnd} onTouchCancel={() => { swipe.current = null; setSlide(null); }}>
      <EditorHeading className='todo-sheet-heading entry-heading' title={null} titleContent={<View className='entry-modes' data-entry-swipe='true'>{entryModes.map(kind => <ChoiceButton key={kind} className={`button-label entry-mode${mode === kind ? ' is-active' : ''}`} ariaLabel={`创建类型：${modeLabel(kind)}`} aria-pressed={mode === kind} disabled={locked || !!retryMode && retryMode !== kind} onClick={() => changeMode(kind)}>{modeLabel(kind)}</ChoiceButton>)}</View>} actions={<ActionButton appearance='icon' className='button-label todo-sheet-close' ariaLabel='关闭编辑' disabled={busy || imageBusy} onClick={closeGuard.requestClose}>×</ActionButton>} />
      <ScrollView scrollY className='todo-sheet-scroll entry-scroll' data-entry-swipe='true' enhanced bounces={false} showScrollbar={false}><SwipePanels offset={slide?.offset} direction={slide && entryModes.indexOf(slide.mode) < entryModes.indexOf(mode) ? 'previous' : 'next'} adjacent={previewDraft && isDomainState(domains.value) ? <View className='todo-sheet-fields'><EntryPreview draft={previewDraft} domains={domains.value} /></View> : undefined}><View key={mode} className={`todo-sheet-fields${mode === 'memo' ? ' memo-sheet-body' : ''}`} data-entry-swipe='true'>
        {!!info && <View className='entry-info' role='status'>{info}</View>}
        {!draft && <View className='entry-load'><Text>{error || (readable && !writable ? '数据格式暂不兼容' : '正在读取…')}</Text><ActionButton className='button-label tool-secondary' onClick={() => { setError(''); todos.retry(); memos.retry(); domains.retry(); }}>重试</ActionButton></View>}
        {draft && slide && isDomainState(domains.value) && <EntryPreview draft={draft} domains={domains.value} />}
        {draft && !slide && mode === 'task' && <TodoEditorFields key={draft.task.id} autoFocus={autoFocus && !retryMode && !scheduleOpen} draft={draft.task} onChange={task => { if (!busy && current.current.writable && current.current.owner === draftOwner.current) { setError(''); setDraft({ ...draft, task }); } }} tagsText={draft.tagsText} onTagsChange={tagsText => update({ ...draft, tagsText })} tagOptions={catalog.owner === owner ? catalog.tags : []} disabled={locked} owner={draftOwner.current} onBusyChange={imagesBusy} today={today} scheduleOpen={scheduleOpen} onSchedule={() => { setFocusReady(false); void Taro.hideKeyboard().catch(() => {}); setScheduleOpen(true); }} />}
        {draft && !slide && mode === 'memo' && <MemoEditorFields key={draft.memo.id} autoFocus={autoFocus && !retryMode} draft={draft.memo} onChange={memo => { if (!busy && current.current.writable && current.current.owner === draftOwner.current) { setError(''); setDraft({ ...draft, memo }); } }} tagsText={draft.tagsText} onTagsChange={tagsText => update({ ...draft, tagsText })} tagOptions={catalog.owner === owner ? catalog.tags : []} disabled={locked} owner={draftOwner.current} onBusyChange={imagesBusy} />}
        {draft?.progress && !slide && mode === 'progress' && isDomainState(domains.value) && <ProgressEditorFields key={progressRecord(draft.progress).id} autoFocus={autoFocus && !retryMode} draft={draft.progress} state={domains.value} owner={draftOwner.current} disabled={locked || retryMode === 'progress'} onBusyChange={imagesBusy} onChange={progress => { if (!busy && retryMode !== 'progress' && current.current.writable && current.current.owner === draftOwner.current) { setError(''); setDraft({ ...draft, progress }); } }} />}
        {!!error && !!draft && <View className='entry-error' role='alert'>{error}</View>}
      </View></SwipePanels></ScrollView>
      <SheetActions className='todo-sheet-footer entry-footer'>
        <ActionButton appearance='icon' size='compact' className='entry-clear' ariaLabel='清空所有输入' disabled={!canSwitchMode()} onClick={clearInputs}><DeleteSymbol /></ActionButton>
        {mode === 'progress' ? <ActionButton appearance='primary' size='large' width='fill' className='entry-submit' loading={busy} disabled={!draft || locked || !draft.progress || !hasProgressContent(draft.progress)} onClick={() => { void save(); }}>保存记录</ActionButton> : <ActionButton appearance='primary' className='button-label tool-primary entry-submit' loading={busy} disabled={!draft || locked || (mode === 'task' ? !draft.task.title.trim() : !draft.memo.title.trim() && !draft.memo.body.trim() && !draft.memo.images?.length)} onClick={() => { void save(); }}>{mode === 'task' ? '创建任务' : '创建便签'}</ActionButton>}
      </SheetActions>
    </View></View>
    {draft && mode === 'task' && scheduleOpen && !locked && <TodoScheduleSheet key={`${owner}:${draft.task.id}`} value={draft.task} today={today} busy={busy} reminderLabel={owner === 'guest' ? '请登录' : '保存后开启'} canAuthorize={false} reminderLocked={false} onAuthorize={() => {}} onConfirm={(schedule: TodoSchedule) => { update({ ...draft, task: { ...draft.task, ...schedule } }); setScheduleOpen(false); }} onClose={() => setScheduleOpen(false)} />}
    {closeGuard.dialog}
  </>;
}
