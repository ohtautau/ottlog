import CardGroupContent from '../../components/card-group-content';
import { trimTextEnd } from '../../lib/text-whitespace';
import PageScroll from '../../components/page-scroll';
import { CoreScreen } from '../../components/page-sections';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Taro, { useDidShow, useDidHide, useRouter } from '@tarojs/taro';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import { createTodo, toggleTodo, mergeTodoCategories, orderTodos, getTodoSortMode, applyTodoSort, todoToolbarSummary, type TodoSortMode, parseTodoTags as parseTags } from '../../lib/todo-data';
import { cancelTodoReminder, getReminderConfig, getTodoReminders, requestTodoReminder } from '../../lib/todo-reminders';
import { initialTodoState, isTodoState, localToolDay, todoQuadrant, todoQuadrants, type Todo, type TodoState, type TodoPanelId } from '../../lib/tool-records';
import { useTodoDrag } from '../../components/todo-drag';
import { SelectChevron } from '../../components/select-trigger';
import FilterPopover, { FilterFields, FilterField, FilterOptionGrid, FilterSearch } from '../../components/filter-popover';
import TodoScheduleSheet from '../../components/todo-schedule-sheet';
import type { TodoSchedule } from '../../lib/todo-schedule';
import TodoEditorFields from '../../components/todo-editor-fields';
import TaskDetailEditor from '../../components/task-detail-editor';
import TodoPrimaryTagPicker from '../../components/todo-primary-tag-picker';
import TodoPanelPicker from '../../components/todo-panel-picker';
import { getTodoPanelSource, todoPanelPresentation, todoMatchesPanel, setTodoPanelSource, saveTodoTag, deleteTodoTag, todoPrimaryTag, taskTagNames, moveTodoToPanel, retryTodoPanelMove } from '../../lib/todo-panel-source';
import { autoSaveTodo, todoEditSnapshot } from '../../lib/todo-autosave';
import { ChoicePopover, TagChoiceRow, PopoverHeading } from '../../components/form-options';
import TagTextInput from '../../components/tag-text-input';
import PrioritySelect from '../../components/priority-select';
import MarkdownNoteEditor from '../../components/markdown-note-editor';
import { noteStateFits } from '../../lib/note-image-data';
import LibraryIcon from '../../components/library-icon';
import { scheduleSummary } from '../../lib/todo-schedule';
import FloatingCreateButton from '../../components/floating-create-button';
import PageToolbar, { PageToolbarSummary, ToolbarResetButton } from '../../components/page-toolbar';
import { SortOptions, SortPopover } from '../../components/sort-options';
import { useEntryTags } from '../../lib/use-entry-tags';
import { tagLabel } from '../../lib/tag-label';
import { openPomodoro } from '../../lib/pomodoro-navigation';
import usePageNow from '../../lib/use-page-now';
import TodoTaskCard from '../../components/todo-task-card';
import AppDialog from '../../components/app-dialog';
import { showAppMessage } from '../../lib/app-dialog';
import './index.css';
import { isWebTool } from '../../lib/tool-platform';
import useTodoUndo, { type TodoUndoEdit } from '../../lib/use-todo-undo';
import { undoTodoOperation } from '../../lib/todo-undo';
import OperationToast from '../../components/operation-toast';

const notify = (error: unknown) => { void showAppMessage({ title: error instanceof Error ? error.message : '操作失败，请重试', icon: 'none' }); };
type ReminderConfig = Awaited<ReturnType<typeof getReminderConfig>>;
type Reminder = Awaited<ReturnType<typeof requestTodoReminder>>;
type TodoSortChoice = Exclude<TodoSortMode, 'custom'>;
const todoSortChoice = (mode: TodoSortMode): TodoSortChoice => mode === 'custom' ? 'schedule' : mode;
// Empty next-step input rows have no business value or dismissed-editor changes.
const cloneTask = (task: Todo): Todo => ({ ...task, images: task.images?.map(image => ({ ...image })), subtasks: task.subtasks?.map(item => ({ ...item })) || [], tags: [...(task.tags || [])], nextTasks: task.nextTasks?.filter(item => item.title.trim()).map(item => ({ ...item })) || [], ...(task.recurrence ? { recurrence: { ...task.recurrence } } : {}) });

export default function Todos() {
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState('todos', initialTodoState);
  const state = useMemo(() => mergeTodoCategories(isTodoState(value) ? value : initialTodoState), [value]);
  const valid = isTodoState(value), writable = ready && valid;
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortChoice, setSortChoice] = useState<TodoSortChoice>('schedule');
  const [sortError, setSortError] = useState('');
  const sortPending = useRef<{ owner: string; choice: TodoSortMode } | null>(null);
  const [moveError, setMoveError] = useState('');
  const movePending = useRef<{ owner: string; id: string; slotId: TodoPanelId; target: TodoState } | null>(null);
  const [completion, setCompletion] = useState('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const now = usePageNow(), today = localToolDay(new Date(now));
  const toolbarSummary = useMemo(() => todoToolbarSummary(state, new Date(now)), [state, now]);
  const [draft, setDraft] = useState<Todo | null>(null);
  const [editing, setEditing] = useState(false);
  const [autosaveError, setAutosaveError] = useState('');
  const [priorityOpen, setPriorityOpen] = useState(false), [moreOpen, setMoreOpen] = useState(false), [tagsOpen, setTagsOpen] = useState(false);
  const [imageSignal, setImageSignal] = useState(0), [nextStepsOpen, setNextStepsOpen] = useState(false);
  const persistedDraft = useRef<Todo | null>(null), savingDraft = useRef<Promise<boolean> | null>(null);
  const liveDraft = useRef(draft), liveTags = useRef(''); liveDraft.current = draft;
  const [tagsText, setTagsText] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [deletion, setDeletion] = useState<{ owner: string; task: Todo; pending?: boolean; fromDrag?: boolean } | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const deletionRef = useRef(deletion); deletionRef.current = deletion;
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [requested, requestCreate] = useState(useRouter().params.create === '1');
  const [requestedTask, requestTask] = useState(useRouter().params.task || '');
  const lastOwner = useRef('');
  const currentOwner = useRef(owner);
  const currentTask = useRef(draft?.id);
  const draftOwner = useRef('');
  const operating = useRef(false);
  const operationGeneration = useRef(0);
  const catalog = useEntryTags();
  currentOwner.current = owner;
  currentTask.current = draft?.id;

  useDidShow(() => {
    if (Taro.getStorageSync('ottlog.todo-create')) { Taro.removeStorageSync('ottlog.todo-create'); requestCreate(true); }
    const focusedTask = Taro.getStorageSync('ottlog.todos.focus');
    if (typeof focusedTask === 'string' && focusedTask) { Taro.removeStorageSync('ottlog.todos.focus'); requestTask(focusedTask); }
  });
  useEffect(() => {
    let active = true;
    void getReminderConfig().then(result => { if (active) setConfig(result); }).catch(() => { if (active) setConfig({ enabled: false, reason: '暂时无法连接提醒服务，请稍后重新进入' }); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (owner && lastOwner.current && owner !== lastOwner.current) {
      setDraft(null); persistedDraft.current = null; savingDraft.current = null; setAutosaveError(''); setMoreOpen(false); setTagsOpen(false); setPriorityOpen(false); setScheduleOpen(false); setSearch(''); setTagFilter(null); setExpanded({}); setBusy(false); setImageBusy(false); setReminder(null); setDeletion(null); setDeleteError(''); operating.current = false; ++operationGeneration.current;
    }
    if (owner) lastOwner.current = owner;
  }, [owner]);
  useEffect(() => {
    if (writable && requested) { openEditor(createTodo(), false); requestCreate(false); }
  }, [writable, requested]);
  useEffect(() => { setShowSort(false); setSortError(''); setSortChoice('schedule'); sortPending.current = null; setMoveError(''); movePending.current = null; }, [owner]);
  useEffect(() => {
    if (!writable || !requestedTask) return;
    const task = state.tasks.find(item => item.id === requestedTask);
    if (task) openEditor(task, true);
    else notify(new Error('这件任务已删除，或不属于当前账号'));
    requestTask('');
  }, [writable, requestedTask, state.tasks]);
  useEffect(() => {
    setReminder(null);
    if (!editing || !draft?.id || !owner || owner === 'guest') return;
    let active = true;
    const generation = operationGeneration.current;
    void getTodoReminders(owner).then(result => {
      if (active && operationGeneration.current === generation && currentOwner.current === owner && currentTask.current === draft.id) setReminder(result.reminders.find(item => item.taskId === draft.id) || null);
    }).catch(() => { /* Reminder intent remains editable when the network is unavailable. */ });
    return () => { active = false; };
  }, [draft?.id, editing, owner]);

  const filtered = orderTodos(state).filter(task => {
    const text = `${task.title} ${task.description} ${(task.tags || []).join(' ')} ${task.subtasks?.map(item => item.title).join(' ') || ''} ${task.nextTasks?.map(item => item.title).join(' ') || ''}`.toLocaleLowerCase();
    return text.includes(search.trim().toLocaleLowerCase()) && (tagFilter === null || (task.tags || []).includes(tagFilter));
  });
  const filtersActive = !!search.trim() || tagFilter !== null || completion !== 'all';
  const matchingCount = filtered.filter(task => completion === 'all' || (completion === 'done' ? !!task.completedAt : !task.completedAt)).length;
  const moveBlocked = movePending.current?.owner === owner;
  const sortBlocked = sortPending.current?.owner === owner;
  const taskUndo = useTodoUndo(owner, !writable || busy || imageBusy || !!draft || moveBlocked || sortBlocked, restoreOperation);
  const sorter = useTodoDrag(state.tasks, writable && !busy && !moveBlocked && !draft && !showFilters && !showSort, owner, (id, quadrant, before) => {
    const visibleIds = filtered.filter(task => (completion !== 'done' || !!task.completedAt) && (completion !== 'open' || !task.completedAt) && todoQuadrants.some(slot => todoMatchesPanel(task, getTodoPanelSource(state, slot.id as TodoPanelId)) && (!task.completedAt || (expanded[slot.id] ?? !isWebTool)))).map(task => task.id);
    void persistMove(id, quadrant, before, visibleIds);
    }, { onDelete: task => { if (writable && !operating.current) void performDelete({ owner, task: cloneTask(task), fromDrag: true }); } });
  const savedDraft = editing && draft ? state.tasks.find(item => item.id === draft.id) : undefined;
  const existingTags = catalog.owner === owner ? catalog.tags : [];
  liveTags.current = tagsText;
  const draftChanged = !!draft && (!persistedDraft.current || todoEditSnapshot({ ...draft, tags: parseTags(tagsText) }) !== todoEditSnapshot(persistedDraft.current));
  useEffect(() => {
    if (!draft || !draftChanged || !draft.title.trim() || busy || imageBusy || !writable || draftOwner.current !== owner || autosaveError) return;
    const timer = setTimeout(() => { void persistDraft(); }, 450);
    return () => clearTimeout(timer);
  }, [draft, tagsText, draftChanged, busy, imageBusy, writable, owner, autosaveError]);
  useEffect(() => {
    if (!draft || scheduleOpen || deletion || priorityOpen || moreOpen || tagsOpen || typeof document === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); void closeEditor(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [draft?.id, scheduleOpen, deletion, priorityOpen, moreOpen, tagsOpen]);
  const flushOnLeave = useRef(() => {});
  flushOnLeave.current = () => { if (liveDraft.current?.title.trim()) void persistDraft(); };
  useDidHide(() => flushOnLeave.current());
  // Write the last input to the original local queue before passive store cleanup.
  useLayoutEffect(() => () => flushOnLeave.current(), []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flush = () => flushOnLeave.current();
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);
  const canAuthorize = !!(draft && savedDraft && !draftChanged && draft.reminderAt && draft.reminderAt === savedDraft.reminderAt && !draft.completedAt && owner && owner !== 'guest' && config?.enabled && config.templateId);
  const activeReminder = reminder && draft?.reminderAt && new Date(reminder.remindAt).getTime() === new Date(draft.reminderAt).getTime() ? reminder : null;
  const reminderLocked = !!activeReminder && ['pending', 'dispatching', 'sent', 'failed', 'unknown'].includes(activeReminder.status);
  const reminderLabel = owner === 'guest' ? '请登录' : !config ? '读取中' : !config.enabled ? '未开通'
    : !savedDraft || draftChanged ? '保存后开启' : draft?.completedAt ? '已完成'
    : activeReminder ? ({ pending: '已开启', dispatching: '发送中', sent: '已发送', failed: '发送失败', unknown: '结果未确认', cancelled: '开启' }[activeReminder.status]) : '开启';

  async function change(updater: (old: TodoState) => TodoState, expectedOwner = owner) {
    if (!writable || currentOwner.current !== expectedOwner) throw new Error('账号或数据状态已变化，请重新打开任务');
    await setValue(previous => { if (!isTodoState(previous)) throw new Error('数据格式暂不兼容，请到网页查看'); return updater(mergeTodoCategories(previous)); });
  }
  function openEditor(task: Todo, existing: boolean) {
    if (!writable || operating.current || moveBlocked || sorter.suppressClick()) return;
    draftOwner.current = owner;
    persistedDraft.current = existing ? cloneTask(task) : null; setAutosaveError(''); setPriorityOpen(false); setMoreOpen(false); setTagsOpen(false); setNextStepsOpen(false);
    setEditing(existing); setDraft(cloneTask(task));
    setTagsText((task.tags || []).join('，'));
    setScheduleOpen(false);
    setReminder(null);
  }
  function applySchedule(schedule: TodoSchedule) {
    if (!draft || busy || draftOwner.current !== owner || currentOwner.current !== owner) return;
    editDraft({ ...draft, ...schedule });
    setScheduleOpen(false);
  }
  function startOperation() {
    operating.current = true; setBusy(true);
    return ++operationGeneration.current;
  }
  function finishOperation(generation: number) {
    if (operationGeneration.current === generation) { setBusy(false); operating.current = false; }
  }
  async function applySort(requestedMode?: TodoSortMode) {
    if (!writable || operating.current || busy || moveBlocked || !owner) return;
    const expectedOwner = owner, choice = sortPending.current?.owner === owner ? sortPending.current.choice : requestedMode ?? sortChoice, generation = startOperation();
    sortPending.current = { owner: expectedOwner, choice };
    setSortError('');
    try {
      await change(previous => applyTodoSort(previous, choice), expectedOwner);
      if (currentOwner.current !== expectedOwner || operationGeneration.current !== generation) return;
      if (hasVolatilePersonalTool('todos', expectedOwner)) throw new Error('排序尚未保存，请重试');
      sortPending.current = null;
      setShowSort(false);
    } catch (error) {
      if (currentOwner.current === expectedOwner && operationGeneration.current === generation) { setSortError(error instanceof Error ? error.message : '排序未能保存，请重试'); if (requestedMode !== undefined) setShowSort(true); }
    } finally { finishOperation(generation); }
  }
  function restoreDefaults() {
    if (!writable || operating.current || busy || moveBlocked || sortBlocked || sorter.drag || draft) return;
    setShowSort(false); setShowFilters(false); setSortChoice('schedule');
    setSearch(''); setTagFilter(null); setCompletion('all'); setExpanded({});
    const defaultMode = getTodoSortMode(initialTodoState);
    if (getTodoSortMode(state) !== defaultMode) void applySort(defaultMode);
  }
  async function persistMove(id?: string, quadrant = '', before: string | null = null, visibleIds: string[] = []) {
    if (!writable || operating.current || !owner || moveBlocked && id) return;
    const expectedOwner = owner, pending = movePending.current, generation = startOperation();
    setMoveError('');
    try {
      await change(previous => {
        if (pending?.owner === expectedOwner) {
          if (!previous.tasks.some(task => task.id === pending.id)) { movePending.current = null; throw new Error('任务已删除，请重新排序'); }
          return retryTodoPanelMove(previous, pending.target, pending.id, pending.slotId);
        }
        const next = moveTodoToPanel(previous, id!, quadrant as TodoPanelId, before, visibleIds);
        if (next !== previous) movePending.current = { owner: expectedOwner, id: id!, slotId: quadrant as TodoPanelId, target: next };
        return next;
      }, expectedOwner);
      if (currentOwner.current !== expectedOwner || operationGeneration.current !== generation) return;
      if (hasVolatilePersonalTool('todos', expectedOwner)) throw new Error('排序尚未保存，请重试');
      if (movePending.current) {
        const targetSlot = movePending.current.slotId;
        const task = movePending.current.target.tasks.find(item => item.id === movePending.current!.id);
        if (task) setExpanded(previous => ({ ...previous, [targetSlot]: true }));
        movePending.current = null;
      }
    } catch (error) {
      if (currentOwner.current === expectedOwner && operationGeneration.current === generation) setMoveError(error instanceof Error ? error.message : '排序尚未保存，请重试');
    } finally { finishOperation(generation); }
  }
  async function cancelReminder(taskId: string, expectedOwner: string, expectedRemindAt?: string) {
    if (!expectedOwner || expectedOwner === 'guest') return;
    try { await cancelTodoReminder(taskId, expectedOwner, expectedRemindAt); }
    catch { if (currentOwner.current === expectedOwner) notify(new Error('任务已本地保存，提醒取消失败，联网后请重试同步')); }
  }
  async function restoreOperation(edit: TodoUndoEdit) {
    if (!writable || busy || operating.current || currentOwner.current !== edit.owner) throw new Error('账号或任务状态已变化，无法撤销');
    const generation = startOperation();
    let restored: TodoState | null = null;
    try {
      await change(previous => { restored = undoTodoOperation(previous, edit.before, edit.after); return restored; }, edit.owner);
      if (currentOwner.current !== edit.owner || operationGeneration.current !== generation) throw new Error('账号已变化，无法继续撤销');
      if (hasVolatilePersonalTool('todos', edit.owner)) throw new Error('撤销尚未保存，请重试');
      const state = restored as TodoState | null;
      for (const task of edit.after.tasks) {
        if (!task.reminderAt || JSON.stringify(task) === JSON.stringify(edit.before.tasks.find(item => item.id === task.id))) continue;
        const next = state?.tasks.find(item => item.id === task.id);
        if (!next || next.completedAt || next.reminderAt !== task.reminderAt) await cancelReminder(task.id, edit.owner, task.reminderAt);
      }
    } finally { finishOperation(generation); }
  }
  async function persistDraft(): Promise<boolean> {
    if (savingDraft.current) return savingDraft.current;
    const source = liveDraft.current;
    if (!source || imageBusy || !writable || draftOwner.current !== currentOwner.current) return false;
    if (!source.title.trim()) { setAutosaveError('请填写任务名称，修改仍保留在此窗口'); return false; }
    const captured = cloneTask({ ...source, tags: parseTags(liveTags.current) });
    const baseline = persistedDraft.current && cloneTask(persistedDraft.current), expectedOwner = draftOwner.current;
    if (baseline && todoEditSnapshot(captured) === todoEditSnapshot(baseline) && !hasVolatilePersonalTool('todos', expectedOwner)) return true;
    if (operating.current) return false;
    const generation = startOperation(); setAutosaveError('');
    let promise!: Promise<boolean>;
    promise = (async () => {
      try {
        await change(previous => autoSaveTodo(previous, baseline, captured, (captured.tags || []).join('，')), expectedOwner);
        if (currentOwner.current !== expectedOwner || currentTask.current !== captured.id || operationGeneration.current !== generation) return false;
        if (hasVolatilePersonalTool('todos', expectedOwner)) throw new Error('本机存储不可用，修改已保留，请重试');
        persistedDraft.current = captured; setEditing(true);
        if (baseline?.reminderAt && baseline.reminderAt !== captured.reminderAt) { setReminder(null); void cancelReminder(captured.id, expectedOwner, baseline.reminderAt); }
        return true;
      } catch (error) { if (currentOwner.current === expectedOwner) setAutosaveError(error instanceof Error ? error.message : '自动保存失败，请重试'); return false; }
      finally { finishOperation(generation); if (savingDraft.current === promise) savingDraft.current = null; }
    })();
    savingDraft.current = promise;
    return promise;
  }
  async function toggle(task: Todo) {
    if (operating.current) return;
    const expectedOwner = owner;
    const generation = startOperation();
    try {
      let nextTask: Todo | undefined;
      await change(previous => { const next = toggleTodo(previous, task.id); nextTask = next.tasks.find(item => item.id === task.id); return next; }, expectedOwner);
      if (currentOwner.current === expectedOwner && currentTask.current === task.id && nextTask) { persistedDraft.current = cloneTask(nextTask); setDraft(cloneTask(nextTask)); }
      if (!task.completedAt && task.reminderAt) await cancelReminder(task.id, expectedOwner, task.reminderAt);
    } catch (error) { notify(error); }
    finally { finishOperation(generation); }
  }
  function requestDelete() {
    if (!draft || busy || imageBusy || operating.current || draftOwner.current !== owner) return;
    setDeletion({ owner, task: cloneTask(draft) }); setDeleteError('');
  }
  function closeDelete() { if (!operating.current && !deletionRef.current?.pending) { setDeletion(null); setDeleteError(''); } }
  async function remove() {
    if (!deletion || busy || imageBusy || operating.current) return;
    await performDelete(deletion);
  }
  async function performDelete(target: NonNullable<typeof deletion>) {
    const task = target.task, expectedOwner = target.owner;
    if (!writable || busy || imageBusy || operating.current || currentOwner.current !== expectedOwner || (!target.fromDrag && currentTask.current !== task.id)) return;
    const generation = startOperation();
    try {
      await change(previous => ({ ...previous, tasks: previous.tasks.filter(item => item.id !== task.id) }), expectedOwner);
      if (currentOwner.current !== expectedOwner || operationGeneration.current !== generation) return;
      if (hasVolatilePersonalTool('todos', expectedOwner)) { setDeletion({ ...target, pending: true }); throw new Error('本机存储不可用，删除尚未保存，请重试'); }
      setDeletion(null); setDeleteError(''); setDraft(null);
      if (task.reminderAt) await cancelReminder(task.id, expectedOwner, task.reminderAt);
    } catch (error) { if (currentOwner.current === expectedOwner && operationGeneration.current === generation) { setDeletion({ ...target, pending: true }); setDeleteError(error instanceof Error ? error.message : '删除失败，请重试'); } }
    finally { finishOperation(generation); }
  }
  async function closeEditor(): Promise<boolean> {
    const task = liveDraft.current, expectedOwner = draftOwner.current;
    if (!task || imageBusy || deletion || expectedOwner !== currentOwner.current) return false;
    if (persistedDraft.current && writable && !hasVolatilePersonalTool('todos', expectedOwner) && !state.tasks.some(item => item.id === task.id)) { setDraft(null); return true; }
    if (!task.title.trim() && !persistedDraft.current && !task.description.trim() && !(task.subtasks?.length) && !(task.images?.length)) { setDraft(null); return true; }
    if (savingDraft.current && !await savingDraft.current) return false;
    if (!await persistDraft()) return false;
    const latest = liveDraft.current;
    if (!latest || expectedOwner !== currentOwner.current || latest.id !== task.id) return false;
    if (persistedDraft.current && todoEditSnapshot({ ...latest, tags: parseTags(liveTags.current) }) !== todoEditSnapshot(persistedDraft.current)) return closeEditor();
    setScheduleOpen(false); setDraft(null); setMoreOpen(false); setTagsOpen(false); setPriorityOpen(false); return true;
  }
  function editDraft(next: Todo) { if (draftOwner.current !== currentOwner.current) return; liveDraft.current = next; setAutosaveError(''); setDraft(next); }
  function editTags(text: string) {
    liveTags.current = text; setTagsText(text); setAutosaveError('');
    const task = liveDraft.current;
    if (task) { const tags = parseTags(text); editDraft({ ...task, tags, ...(todoPrimaryTag(task) && !tags.includes(todoPrimaryTag(task)) ? { primaryTag: '' } : {}) }); }
  }
  async function upsertTag(tag: {originalName?: string; name: string; iconId: string}) {
    const expectedOwner = owner;
    await change(previous => saveTodoTag(previous, tag), expectedOwner);
    const task = liveDraft.current;
    if (currentOwner.current === expectedOwner && task && tag.originalName && tag.originalName !== tag.name) {
      const tags = parseTags(liveTags.current).map(name => name === tag.originalName ? tag.name : name);
      liveTags.current = tags.join('，'); setTagsText(liveTags.current);
      editDraft({ ...task, tags, ...(todoPrimaryTag(task) === tag.originalName ? { primaryTag: tag.name } : {}) });
    }
    if (hasVolatilePersonalTool('todos', owner)) throw new Error('标签尚未保存，请重试');
  }
  async function removeTag(tag: string) {
    const expectedOwner = owner;
    await change(previous => deleteTodoTag(previous, tag), expectedOwner);
    if (currentOwner.current !== expectedOwner) return;
    if (liveDraft.current && todoPrimaryTag(liveDraft.current) === tag) { const tags = (liveDraft.current.tags || []).filter(item => item !== tag); editDraft({ ...liveDraft.current, primaryTag: '', tags }); setTagsText(tags.join('，')); }
    if (hasVolatilePersonalTool('todos', owner)) throw new Error('标签尚未保存，请重试');
  }
  async function authorizeReminder() {
    if (!draft || !canAuthorize || !config || busy || operating.current || reminderLocked) return;
    if (new Date(draft.reminderAt!).getTime() <= Date.now()) { notify(new Error('请选择未来的提醒时间')); return; }
    const expectedOwner = draftOwner.current;
    const generation = startOperation();
    try {
      // This helper must request subscription before its first asynchronous network step.
      const result = await requestTodoReminder(draft.id, draft.reminderAt!, expectedOwner, config);
      if (currentOwner.current !== expectedOwner) return;
      setReminder(result);
      const messages: Record<Reminder['status'], string> = {
        pending: '微信提醒已开启', dispatching: '这次提醒正在发送', sent: '这次提醒已经发送',
        failed: '这次提醒发送失败，请修改通知时间', unknown: '发送结果未确认，请先查看微信', cancelled: '这次提醒已取消，尚未开启',
      };
      void showAppMessage({ title: messages[result.status], icon: result.status === 'pending' ? 'success' : 'none' });
    } catch (error) { if (currentOwner.current === expectedOwner) notify(error); }
    finally { finishOperation(generation); }
  }
  function renderTask(task: Todo, panelId: string) {
    return <TodoTaskCard key={task.id} task={task} now={now} rootProps={{ id: `todo-row-${state.tasks.indexOf(task)}-${panelId}`, ...sorter.bind(task, panelId) }} className={`${sorter.drag?.sourceId === `todo-row-${state.tasks.indexOf(task)}-${panelId}` ? ' is-drag-source' : ''}${sorter.drag?.target === panelId && sorter.drag?.before === task.id ? ' is-insert-before' : ''}`} disabled={!writable || busy || moveBlocked} ariaLabel={`编辑任务：${task.title}`} onOpen={() => openEditor(task, true)}
      leading={check => <Button className='button-label todo-complete' aria-label={task.completedAt ? `重新打开：${task.title}` : `完成：${task.title}`} disabled={!writable || busy || moveBlocked} onClick={() => { if (!sorter.suppressClick()) void toggle(task); }}>{check}</Button>} />;
  }

  return <>
    <PageScroll animateScroll={!sorter.drag} snapSections={[]}><View className='todo-stages'><CoreScreen className='todo-core'><View className='todo-page'>
      <View className='todo-toolbar'><PageToolbar className='todo-page-toolbar'
        leading={ready && valid && !!owner && <PageToolbarSummary countLabel={`今日完成 ${toolbarSummary.completedToday}`} recentTitle={toolbarSummary.recent?.title} />}
        reset={<ToolbarResetButton ariaLabel='恢复任务默认方式' disabled={!writable || busy || imageBusy || moveBlocked || sortBlocked || !!sorter.drag || !!draft} onReset={restoreDefaults} />}
        sort={<SortPopover ariaLabel='排序' open={showSort} hasChanges={sortBlocked || sortChoice !== todoSortChoice(getTodoSortMode(state))} onOpenChange={open => { if (!operating.current) { setShowSort(open); if (open) { setShowFilters(false); if (!sortBlocked) setSortError(''); setSortChoice(todoSortChoice(sortBlocked ? sortPending.current!.choice : getTodoSortMode(state))); } } }} disabled={!writable || moveBlocked} triggerClassName='todo-sort-toggle' selected={showSort || getTodoSortMode(state) !== getTodoSortMode(initialTodoState)} panelClassName='todo-sort-popover' contentKey={sortError} saving={busy} confirmDisabled={!writable} onConfirm={applySort}>
          <SortOptions className='todo-sort-options' options={[{ value: 'schedule', label: '日程时间最近' }, { value: 'created', label: '创建时间最近' }]} value={sortChoice} disabled={busy || sortBlocked} onChange={setSortChoice} />
          {!!sortError && <View className='todo-sort-error' role='alert'><Text>{sortError}</Text></View>}
        </SortPopover>}
        filter={<FilterPopover ariaLabel='筛选' title='筛选任务' open={showFilters} onOpenChange={open => { if (!operating.current) { setShowFilters(open); if (open) setShowSort(false); } }} triggerClassName='todo-filter-toggle' triggerSelected={filtersActive} panelClassName='todo-filter-popover todo-filter-sheet'
          headingClassName='todo-filter-heading' actionsClassName='todo-filter-actions' resetClassName='todo-filter-reset' closeLabel='关闭筛选' onClose={() => setShowFilters(false)} resetLabel='重置任务筛选' applyLabel={`查看 ${matchingCount} 件任务`} onReset={() => { setSearch(''); setTagFilter(null); setCompletion('all'); }}>
          <FilterFields>
            <FilterField label='关键词'><FilterSearch className='todo-filter-search' ariaLabel='筛选关键词' value={search} placeholder='搜索任务、备注、标签' onInput={event => setSearch(event.detail.value)} clearLabel='清除关键词' onClear={() => setSearch('')} onConfirm={() => setShowFilters(false)} /></FilterField>
            <FilterField label='完成状态'><FilterOptionGrid>{[['all', '全部'], ['open', '待完成'], ['done', '已完成']].map(([id, label]) => <ChoiceButton key={id} selected={completion === id} ariaLabel={`筛选状态：${label}`} onClick={() => { setCompletion(id); if (id === 'done') setExpanded(Object.fromEntries(todoQuadrants.map(q => [q.id, true]))); }}>{label}</ChoiceButton>)}</FilterOptionGrid></FilterField>
            <FilterField label='标签'><FilterOptionGrid className='todo-filter-tags'><ChoiceButton selected={tagFilter === null} ariaLabel='不限标签' onClick={() => setTagFilter(null)}>不限</ChoiceButton>{existingTags.map(tag => <ChoiceButton key={tag} selected={tagFilter === tag} ariaLabel={`筛选标签：${tag}`} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}>{tagLabel(tag)}</ChoiceButton>)}</FilterOptionGrid></FilterField>
          </FilterFields>
        </FilterPopover>}
      />
      </View>
      {moveError && <View className='todo-sort-retry'><View className='todo-sort-error' role='alert'>{moveError}</View>{moveBlocked && <ActionButton size='compact' ariaLabel='重试任务排序' disabled={busy} onClick={() => { void persistMove(); }}>重试</ActionButton>}</View>}
      {(search || tagFilter) && <Text className='todo-filter-summary'>{search ? `关键词：${search} · ` : ''}{tagFilter ? `标签：${tagLabel(tagFilter)} · ` : ''}{matchingCount} 件匹配</Text>}
      {!ready ? <View className='tool-empty'><Text>{status || '正在整理你的任务…'}</Text><ActionButton className='button-label' onClick={retry}>重新读取</ActionButton></View> : !valid ? <View className='tool-empty'><Text>当前数据格式暂不兼容，请到网页查看。原始数据已保留。</Text><ActionButton className='button-label' onClick={retry}>重新读取</ActionButton></View> : <View className='todo-quadrants'>{todoQuadrants.map(q => {
        const panel = todoPanelPresentation(state, q.id as TodoPanelId);
        const tasks = filtered.filter(task => todoMatchesPanel(task, panel.source));
        const pending = tasks.filter(task => !task.completedAt);
        const completed = tasks.filter(task => !!task.completedAt);
        const showCompleted = expanded[q.id] ?? !isWebTool;
        return <View id={`todo-zone-${q.id}`} key={q.id} style={{ borderTopColor: panel.color }} className={`todo-quadrant todo-quadrant-${panel.source.kind === 'quadrant' ? panel.source.quadrantId : 'tag'}${sorter.drag?.target === q.id ? ' is-drop-zone' : ''}`}>
          <View className='todo-quadrant-heading'><View className='todo-quadrant-label'><View className='todo-quadrant-title-row'>{panel.source.kind === 'tag' ? <LibraryIcon name={panel.iconId} fallback='notes' className='todo-panel-icon' /> : <Text className='todo-quadrant-icon' aria-hidden style={{ color: panel.color }}>{panel.source.quadrantId === 'later' ? '⚐' : '⚑'}</Text>}<View className='todo-quadrant-title' style={{ color: panel.color }}>{trimTextEnd(panel.title)}</View></View><Text className='todo-quadrant-caption'>{panel.caption}</Text></View><TodoPanelPicker owner={owner} tags={taskTagNames(state)} value={panel.source} disabled={!writable || busy || !!sorter.drag} ariaLabel={`更换${q.title}区域显示`} onChange={async source => { await change(previous => setTodoPanelSource(previous, q.id as TodoPanelId, source)); if (hasVolatilePersonalTool('todos', owner)) throw new Error('显示方式尚未保存，请重试'); }} /></View>
          <ScrollView id={`todo-scroll-${q.id}`} scrollY scrollTop={sorter.scrollTop[q.id]} onScroll={event => sorter.onScroll(q.id, event.detail.scrollTop)} enhanced bounces={false} className='todo-quadrant-scroll'><CardGroupContent className='todo-quadrant-items floating-create-content'>
            {completion !== 'done' && pending.map(task => renderTask(task, q.id))}
            {completion !== 'done' && !pending.length && (completion === 'open' || !completed.length) && <View className={`todo-quadrant-empty ${completed.length ? 'is-clear' : ''}`}>{search || tagFilter !== null ? '没有匹配的待办' : completed.length ? '待办已清空' : '暂时没有任务'}</View>}
            {completion !== 'open' && !!completed.length && <><ActionButton className='button-label todo-completed-toggle' aria-expanded={showCompleted} onClick={() => setExpanded(previous => ({ ...previous, [q.id]: !(previous[q.id] ?? !isWebTool) }))}><SelectChevron expanded={showCompleted} /><Text>已完成 · {completed.length}</Text></ActionButton>{showCompleted && completed.map(task => renderTask(task, q.id))}</>}
            {completion === 'done' && !completed.length && <View className='todo-quadrant-empty'>还没有已完成任务</View>}
          </CardGroupContent></ScrollView>
        </View>;
      })}</View>}
      {ready && /不可用|失败|暂存|离线|无法|等待/.test(status) && <View className='tool-status todo-sync-error'><Text>{status}</Text><ActionButton className='button-label' onClick={retry}>重试同步</ActionButton></View>}
    </View></CoreScreen></View></PageScroll>
    <FloatingCreateButton label='创建任务' disabled={!writable || busy || moveBlocked || !!sorter.drag} onClick={() => openEditor(createTodo(), false)} />
    {sorter.ghost}
    {sorter.deleteZone}
    {taskUndo.notice && <OperationToast message={taskUndo.notice.message} busy={taskUndo.busy} onUndo={taskUndo.notice.undo ? () => { void taskUndo.undo(); } : undefined} />}
    {draft && <TaskDetailEditor draft={draft} onChange={editDraft} onClose={() => { void closeEditor(); }} disabled={imageBusy || !!deletion || !writable || draftOwner.current !== owner} pending={busy} error={autosaveError} onRetry={() => { setAutosaveError(''); void persistDraft(); }}
      category={<TodoPrimaryTagPicker tags={taskTagNames(state)} styles={state.tagStyles} value={todoPrimaryTag(draft)} owner={owner} disabled={imageBusy || busy} onChange={primaryTag => { const current = liveDraft.current; if (!current) return; const tags = primaryTag ? [...new Set([...(current.tags || []), primaryTag])] : current.tags || []; liveTags.current = tags.join('，'); editDraft({ ...current, primaryTag, tags }); setTagsText(liveTags.current); }} onUpsert={upsertTag} onDelete={removeTag} />}
      priority={<PrioritySelect ariaLabel='任务优先级' open={priorityOpen} onOpenChange={setPriorityOpen} disabled={imageBusy} optionsAriaLabel='任务优先级' options={todoQuadrants.map((q, index) => ({ value: q.id, label: ['高','中','低','无'][index], ariaLabel: q.title, color: q.color, outlined: q.id === 'later' }))} value={todoQuadrant(draft).id} onChange={id => { const q = todoQuadrants.find(q => q.id === id); if (q) editDraft({ ...draft, important: q.important, urgent: q.urgent }); }} />}
      more={<ChoicePopover ariaLabel='更多任务操作' open={moreOpen} onOpenChange={setMoreOpen} trigger={<Text>···</Text>} triggerIconOnly showIndicator={false} panelWidth={200} layerClassName='task-detail-popover-layer'>
        <ActionButton appearance='quiet' onClick={() => { setMoreOpen(false); setNextStepsOpen(!nextStepsOpen); }}>后续任务</ActionButton>
        <ActionButton appearance='quiet' disabled={!savedDraft} onClick={() => { setMoreOpen(false); void closeEditor().then(closed => { if (closed) void openPomodoro({ task: draft.id, event: draft.title, minutes: '25' }); }); }}>为任务专注</ActionButton>
        <ActionButton appearance='quiet' onClick={() => { setMoreOpen(false); void closeEditor(); }}>收起</ActionButton>
        <ActionButton appearance='quiet' intent='danger' onClick={() => { setMoreOpen(false); requestDelete(); }}>删除任务</ActionButton>
      </ChoicePopover>}
      onToggleComplete={() => { void persistDraft().then(saved => { if (saved && liveDraft.current) void toggle(liveDraft.current); }); }} onSchedule={() => setScheduleOpen(true)} scheduleOpen={scheduleOpen} scheduleLabel={draft.dueDate || draft.reminderAt || draft.recurrence ? scheduleSummary(draft, today) : '日期&提醒'}
      onTags={() => setTagsOpen(true)} onAttachment={() => setImageSignal(value => value + 1)}
      notes={<MarkdownNoteEditor className='task-detail-note' value={draft.description} images={draft.images} defaultPreview minimal emptyPreviewPlaceholder='备注' insertionSignal={imageSignal} onChange={description => editDraft({ ...draft, description })} onImagesChange={images => editDraft({ ...draft, images })} owner={owner} recordId={draft.id} disabled={!writable || draftOwner.current !== owner || !!deletion} maxLength={10000} ariaLabel='任务备注' placeholder='备注' showImageInsertion={false} canInsertImage={writable} onBusyChange={setImageBusy} checkImages={images => { if (!noteStateFits({ ...state, tasks: [{ ...draft, images }, ...state.tasks.filter(task => task.id !== draft.id)] })) throw new Error('任务空间不足，请整理图片'); }} />}
      nextSteps={nextStepsOpen ? <View className='task-detail-next-steps'><TodoEditorFields nextStepsOnly draft={draft} onChange={editDraft} tagsText={tagsText} onTagsChange={setTagsText} tagOptions={existingTags} disabled={imageBusy} owner={owner} today={today} scheduleOpen={false} onSchedule={() => setScheduleOpen(true)} /></View> : undefined}
    />}
    <View id='task-tags-anchor' className='task-detail-hidden-anchor' aria-hidden />
    <ChoicePopover anchorId='task-tags-anchor' ariaLabel='任务标签' open={!!draft && tagsOpen} onOpenChange={setTagsOpen} placement='center' panelWidth={360} layerClassName='task-detail-popover-layer' heading={<PopoverHeading title='标签' />}>
      <TagChoiceRow options={existingTags.map(tag => ({ value: tag, label: tag }))} value={parseTags(tagsText)} onChange={tags => editTags(tags.join('，'))} customInputPlacement='inline' customInput={<TagTextInput ariaLabel='任务标签' value={tagsText} onInput={event => editTags(event.detail.value)} />} />
    </ChoicePopover>
    {draft && scheduleOpen && writable && draftOwner.current === owner && <TodoScheduleSheet key={`${owner}:${draft.id}`} value={draft} today={today} busy={busy} reminderLabel={reminderLabel} canAuthorize={canAuthorize} reminderLocked={reminderLocked} onAuthorize={() => { void authorizeReminder(); }} onConfirm={applySchedule} onClose={() => { if (!busy) setScheduleOpen(false); }} />}
    {deletion?.owner === owner && <AppDialog title='删除这件任务？' closeLabel='关闭任务删除确认' onClose={closeDelete} busy={busy || !!deletion.pending} error={deleteError} actions={<ActionButton appearance='danger' size='large' width='fill' loading={busy} disabled={busy} onClick={() => { void remove(); }}>{deletion.pending ? '重试删除' : '删除'}</ActionButton>}><Text>{trimTextEnd(deletion.task.title)}</Text></AppDialog>}
  </>;
}
