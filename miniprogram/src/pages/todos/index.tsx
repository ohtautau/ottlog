import { useMessageNotice } from '../../components/message-notice';
import ActionMenu from '../../components/action-menu';
import { AddSymbol } from '../../components/create-button';
import CardGroupContent from '../../components/card-group-content';
import { trimTextEnd } from '../../lib/text-whitespace';
import PageScroll from '../../components/page-scroll';
import { CoreScreen } from '../../components/page-sections';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Taro, { useDidShow, useDidHide, useRouter } from '@tarojs/taro';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import { createTodo, toggleTodo, todoToolbarSummary, parseTodoTags as parseTags } from '../../lib/todo-data';
import { cancelTodoReminder, getReminderConfig, getTodoReminders, requestTodoReminder } from '../../lib/todo-reminders';
import { initialTodoState, isTodoState, localToolDay, todoQuadrant, todoQuadrants, type Todo, type TodoState, type TodoPanelId } from '../../lib/tool-records';
import { useTodoDrag } from '../../components/todo-drag';
import { SelectChevron } from '../../components/select-trigger';
import TodoScheduleSheet, {ScheduleSymbol} from '../../components/todo-schedule-sheet';
import type { TodoSchedule } from '../../lib/todo-schedule';
import TaskDetailEditor from '../../components/task-detail-editor';
import TodoCategoryField from '../../components/todo-category-field';
import TodoPanelPicker from '../../components/todo-panel-picker';
import PriorityFlag from '../../components/priority-flag';
import { getTodoPanelSource, todoPanelPresentation, todoMatchesPanel, setTodoPanelSource, moveTodoToPanel, retryTodoPanelMove, cycleTodoPanelSource, getTodoPanelQueue, setTodoPanelQueue } from '../../lib/todo-panel-source';
import { autoSaveTodo, todoEditSnapshot } from '../../lib/todo-autosave';
import { ChoicePopover, PopoverHeading } from '../../components/form-options';
import EditorTagField from '../../components/editor-tag-field';
import PrioritySelect from '../../components/priority-select';
import MarkdownNoteEditor from '../../components/markdown-note-editor';
import { noteStateFits } from '../../lib/note-image-data';
import LibraryIcon from '../../components/library-icon';
import FloatingCreateButton from '../../components/floating-create-button';
import PageToolbar, { PageToolbarSummary } from '../../components/page-toolbar';
import { useEntryTags } from '../../lib/use-entry-tags';
import { openPomodoro } from '../../lib/pomodoro-navigation';
import usePageNow from '../../lib/use-page-now';
import TodoTaskCard from '../../components/todo-task-card';
import AppDialog from '../../components/app-dialog';
import { showAppMessage } from '../../lib/app-dialog';
import useTodoPanelSwipe from '../../lib/use-todo-panel-swipe';
import SheetBackdrop from '../../components/sheet-backdrop';
import EditorHeading from '../../components/editor-heading';
import './index.css';
import { isWebTool } from '../../lib/tool-platform';
import useTodoUndo, { type TodoUndoEdit } from '../../lib/use-todo-undo';
import { undoTodoOperation } from '../../lib/todo-undo';
import OperationToast from '../../components/operation-toast';

const notify = (error: unknown) => { void showAppMessage({ title: error instanceof Error ? error.message : '操作失败，请重试', icon: 'none' }); };
type ReminderConfig = Awaited<ReturnType<typeof getReminderConfig>>;
type Reminder = Awaited<ReturnType<typeof requestTodoReminder>>;
// Empty next-step input rows have no business value or dismissed-editor changes.
const cloneTask = (task: Todo): Todo => ({ ...task, images: task.images?.map(image => ({ ...image })), subtasks: task.subtasks?.map(item => ({ ...item })) || [], tags: [...(task.tags || [])], nextTasks: task.nextTasks?.filter(item => item.title.trim()).map(item => ({ ...item })) || [], ...(task.recurrence ? { recurrence: { ...task.recurrence } } : {}) });

export default function Todos() {
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState('todos', initialTodoState);
  const state = useMemo(() => isTodoState(value) ? { ...value,sort:'custom' as const } : initialTodoState, [value]);
  const valid = isTodoState(value), writable = ready && valid;
  const [pageMenu,setPageMenu] = useState(false), [panelEditorOpen,setPanelEditorOpen] = useState(false);
  const [moveError, setMoveError] = useState('');
  const movePending = useRef<{ owner: string; id: string; slotId: TodoPanelId; target: TodoState } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const now = usePageNow(), today = localToolDay(new Date(now));
  const toolbarSummary = useMemo(() => todoToolbarSummary(state, new Date(now)), [state, now]);
  const [draft, setDraft] = useState<Todo | null>(null);
  const [editing, setEditing] = useState(false);
  const [autosaveError, setAutosaveError] = useState('');
  const [priorityOpen, setPriorityOpen] = useState(false), [moreOpen, setMoreOpen] = useState(false), [tagsOpen, setTagsOpen] = useState(false);
  const [imageSignal, setImageSignal] = useState(0);
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
      setDraft(null); persistedDraft.current = null; savingDraft.current = null; setAutosaveError(''); setMoreOpen(false); setTagsOpen(false); setPriorityOpen(false); setScheduleOpen(false); setExpanded({}); setBusy(false); setImageBusy(false); setReminder(null); setDeletion(null); setDeleteError(''); operating.current = false; ++operationGeneration.current;
    }
    if (owner) lastOwner.current = owner;
  }, [owner]);
  useEffect(() => {
    if (writable && requested) { openEditor(createTodo(), false); requestCreate(false); }
  }, [writable, requested]);
  useEffect(() => { setPageMenu(false);setPanelEditorOpen(false);setMoveError('');movePending.current=null; },[owner]);
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

  const filtered = state.tasks;
  const moveBlocked = movePending.current?.owner === owner;
  const taskUndo = useTodoUndo(owner, !writable || busy || imageBusy || !!draft || moveBlocked, restoreOperation);
  const sorter = useTodoDrag(state.tasks, writable && !busy && !moveBlocked && !draft && !pageMenu && !panelEditorOpen, owner, (id, quadrant, before) => {
    const visibleIds = filtered.filter(task => todoQuadrants.some(slot => todoMatchesPanel(task, getTodoPanelSource(state, slot.id as TodoPanelId)) && (!task.completedAt || (expanded[slot.id] ?? !isWebTool)))).map(task => task.id);
    void persistMove(id, quadrant, before, visibleIds);
    }, { onDelete: task => { if (writable && !operating.current) void performDelete({ owner, task: cloneTask(task), fromDrag: true }); } });
  const panelSwipe=useTodoPanelSwipe(owner,!writable || busy || moveBlocked || !!sorter.drag || !!draft || panelEditorOpen, (slot,direction)=>{
    const expected=owner;
    void change(previous=>cycleTodoPanelSource(previous,slot,direction),expected).then(()=>{
      if(currentOwner.current===expected && hasVolatilePersonalTool('todos',expected))throw new Error('显示方式尚未保存，请重试');
    }).catch(notify);
  });
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
    await setValue(previous => { if (!isTodoState(previous)) throw new Error('数据格式暂不兼容，请到网页查看'); return updater({ ...previous,sort:'custom' }); });
  }
  function openEditor(task: Todo, existing: boolean) {
    if (!writable || operating.current || moveBlocked || sorter.suppressClick()) return;
    draftOwner.current = owner;
    persistedDraft.current = existing ? cloneTask(task) : null; setAutosaveError(''); setPriorityOpen(false); setMoreOpen(false); setTagsOpen(false);
    setEditing(existing); setDraft(cloneTask(task));
    setTagsText((task.tags || []).join('，'));
    setScheduleOpen(false);
    setReminder(null);
  }
  function applySchedule(schedule: TodoSchedule) {
    if (!liveDraft.current || draftOwner.current !== owner || currentOwner.current !== owner) return;
    editDraft({ ...liveDraft.current, ...schedule });
  }
  function startOperation() {
    operating.current = true; setBusy(true);
    return ++operationGeneration.current;
  }
  function finishOperation(generation: number) {
    if (operationGeneration.current === generation) { setBusy(false); operating.current = false; }
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
    if (task) { const tags = parseTags(text); editDraft({ ...task, tags }); }
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

  useMessageNotice(moveError);

  return <>
    <PageScroll animateScroll={!sorter.drag} snapSections={[]}><View className='todo-stages'><CoreScreen className='todo-core'><View className='todo-page'>
      <View className='todo-toolbar'><PageToolbar className='todo-page-toolbar'
        leading={ready && valid && !!owner && <PageToolbarSummary countLabel={`今日完成 ${toolbarSummary.completedToday}`} recentTitle={toolbarSummary.recent?.title} />}
        manage={<ActionMenu ariaLabel='待办更多操作' open={pageMenu} onOpenChange={setPageMenu} disabled={!writable || busy || !!sorter.drag}>
          <ActionButton appearance='quiet' onClick={()=>{setPageMenu(false);setPanelEditorOpen(true);}}>编辑</ActionButton>
        </ActionMenu>} />
      </View>
      {moveError && <View className='todo-sort-retry'>{moveBlocked && <ActionButton size='compact' ariaLabel='重试任务排序' disabled={busy} onClick={() => { void persistMove(); }}>重试</ActionButton>}</View>}
      {!ready ? <View className='tool-empty'><Text>{status || '正在整理你的任务…'}</Text><ActionButton className='button-label' onClick={retry}>重新读取</ActionButton></View> : !valid ? <View className='tool-empty'><Text>当前数据格式暂不兼容，请到网页查看。原始数据已保留。</Text><ActionButton className='button-label' onClick={retry}>重新读取</ActionButton></View> : <View className='todo-quadrants'>{todoQuadrants.map(q => {
        const panel = todoPanelPresentation(state, q.id as TodoPanelId);
        const tasks = filtered.filter(task => todoMatchesPanel(task, panel.source));
        const pending = tasks.filter(task => !task.completedAt);
        const completed = tasks.filter(task => !!task.completedAt);
        const showCompleted = expanded[q.id] ?? !isWebTool;
        return <View id={`todo-zone-${q.id}`} key={q.id} {...panelSwipe(q.id as TodoPanelId)} style={{ borderTopColor: panel.color }} className={`todo-quadrant todo-quadrant-${panel.source.kind === 'quadrant' ? panel.source.quadrantId : 'tag'}${sorter.drag?.target === q.id ? ' is-drop-zone' : ''}`}>
          <View className='todo-quadrant-heading'><View className='todo-quadrant-label'><View className='todo-quadrant-title-row'>{panel.source.kind === 'category' ? <LibraryIcon name={panel.iconId} fallback='notes' className='todo-panel-icon' /> : <Text className='todo-quadrant-icon' aria-hidden style={{ color: panel.color }}>{panel.source.quadrantId === 'later' ? '⚐' : '⚑'}</Text>}<View className='todo-quadrant-title' style={{ color: panel.color }}>{trimTextEnd(panel.title)}</View></View><Text className='todo-quadrant-caption'>{panel.caption}</Text></View><View className='todo-quadrant-actions'><ActionButton appearance='icon' size='compact' className='todo-quadrant-add' ariaLabel={`在${panel.title}中添加任务`} disabled={!writable || busy || moveBlocked || !!sorter.drag} onClick={() => { const task = createTodo(panel.source.kind === 'quadrant' ? panel.source.quadrantId : q.id); if (panel.source.kind === 'category') task.categoryId = panel.source.categoryId; openEditor(task, false); }}><AddSymbol /></ActionButton></View></View>
          <ScrollView id={`todo-scroll-${q.id}`} scrollY scrollTop={sorter.scrollTop[q.id]} onScroll={event => sorter.onScroll(q.id, event.detail.scrollTop)} enhanced bounces={false} className='todo-quadrant-scroll'><CardGroupContent className='todo-quadrant-items floating-create-content'>
            {pending.map(task => renderTask(task, q.id))}
            {!pending.length && !completed.length && <View className={`todo-quadrant-empty ${completed.length ? 'is-clear' : ''}`}>暂时没有任务</View>}
            {!!completed.length && <><ActionButton className='button-label todo-completed-toggle' aria-expanded={showCompleted} onClick={() => setExpanded(previous => ({ ...previous, [q.id]: !(previous[q.id] ?? !isWebTool) }))}><SelectChevron expanded={showCompleted} /><Text>已完成 · {completed.length}</Text></ActionButton>{showCompleted && completed.map(task => renderTask(task, q.id))}</>}

          </CardGroupContent></ScrollView>
        </View>;
      })}</View>}
      {ready && /不可用|失败|暂存|离线|无法|等待/.test(status) && <View className='tool-status todo-sync-error'><Text>{status}</Text><ActionButton className='button-label' onClick={retry}>重试同步</ActionButton></View>}
    </View></CoreScreen></View></PageScroll>
    <FloatingCreateButton label='创建任务' disabled={!writable || busy || moveBlocked || !!sorter.drag} onClick={() => openEditor(createTodo(), false)} />
    {sorter.ghost}
    {sorter.deleteZone}
    {taskUndo.notice && <OperationToast message={taskUndo.notice.message} busy={taskUndo.busy} onUndo={taskUndo.notice.undo ? () => { void taskUndo.undo(); } : undefined} />}
    {panelEditorOpen && <View className='todo-panel-editor-overlay'><SheetBackdrop onClose={()=>setPanelEditorOpen(false)} /><View className='todo-panel-editor' role='dialog' ariaLabel='编辑象限显示'>
      <EditorHeading title='编辑象限显示' actions={<ActionButton appearance='icon' ariaLabel='关闭象限显示编辑' onClick={()=>setPanelEditorOpen(false)}>×</ActionButton>} />
      <View className='todo-panel-editor-rows'>{todoQuadrants.map((slot,index)=> <View className='todo-panel-editor-row' key={slot.id}><Text>{['左上','右上','左下','右下'][index]}</Text><TodoPanelPicker queue={getTodoPanelQueue(state,slot.id as TodoPanelId)} onQueueChange={async queue=>{const baseline=getTodoPanelQueue(state,slot.id as TodoPanelId);await change(previous=>{const current=getTodoPanelQueue(previous,slot.id as TodoPanelId);if(JSON.stringify(current)!==JSON.stringify(baseline)&&JSON.stringify(current)!==JSON.stringify(queue))throw new Error('显示队列已变化，请重新打开后调整');return setTodoPanelQueue(previous,slot.id as TodoPanelId,queue);});if(hasVolatilePersonalTool('todos',owner))throw new Error('队列尚未保存，请重试');}} owner={owner} categories={state.categories} value={getTodoPanelSource(state,slot.id as TodoPanelId)} trigger={<><TodoPanelSourceIcon panel={todoPanelPresentation(state,slot.id as TodoPanelId)}/><Text>{todoPanelPresentation(state,slot.id as TodoPanelId).title}</Text></>} disabled={!writable || busy} ariaLabel={`更换${slot.title}区域显示`} onChange={async source=>{await change(previous=>setTodoPanelSource(previous,slot.id as TodoPanelId,source));if(hasVolatilePersonalTool('todos',owner))throw new Error('显示方式尚未保存，请重试');}} /></View>)}</View>
    </View></View>}
    {draft && <TaskDetailEditor owner={owner} draft={draft} onChange={editDraft} onClose={() => { void closeEditor(); }} disabled={imageBusy || !!deletion || !writable || draftOwner.current !== owner} pending={busy} error={autosaveError} onRetry={() => { setAutosaveError(''); void persistDraft(); }}
      category={<TodoCategoryField value={draft.categoryId} owner={owner} disabled={imageBusy || busy || !writable} onChange={categoryId => { const task = liveDraft.current; if (task && draftOwner.current === currentOwner.current) editDraft({ ...task, categoryId }); }} />}
      priority={<PrioritySelect ariaLabel='任务优先级' open={priorityOpen} onOpenChange={setPriorityOpen} disabled={imageBusy} optionsAriaLabel='任务优先级' options={todoQuadrants.map((q, index) => ({ value: q.id, label: ['高','中','低','无'][index], ariaLabel: q.title, color: q.color, outlined: q.id === 'later' }))} value={todoQuadrant(draft).id} onChange={id => { const q = todoQuadrants.find(q => q.id === id); if (q) editDraft({ ...draft, important: q.important, urgent: q.urgent }); }} />}
      more={<ActionMenu ariaLabel='更多任务操作' open={moreOpen} onOpenChange={setMoreOpen} panelWidth={200} layerClassName='task-detail-popover-layer'>
        <ActionButton appearance='quiet' disabled={!savedDraft} onClick={() => { setMoreOpen(false); void closeEditor().then(closed => { if (closed) void openPomodoro({ task: draft.id, event: draft.title, minutes: '25' }); }); }}>为任务专注</ActionButton>

        <ActionButton appearance='quiet' intent='danger' onClick={() => { setMoreOpen(false); requestDelete(); }}>删除任务</ActionButton>
      </ActionMenu>}
      onToggleComplete={() => { void persistDraft().then(saved => { if (saved && liveDraft.current) void toggle(liveDraft.current); }); }} onSchedule={() => setScheduleOpen(true)} scheduleOpen={scheduleOpen} scheduleLabel='日期 · 提醒 · 重复'
      reminderAction={<ActionButton appearance='icon' size='compact' ariaLabel={`微信提醒：${reminderLabel}`} aria-pressed={reminderLocked} disabled={!canAuthorize||reminderLocked||busy||imageBusy} onClick={()=>{void authorizeReminder();}}><ScheduleSymbol kind='reminder'/></ActionButton>}
      onTags={() => setTagsOpen(true)} onAttachment={() => setImageSignal(value => value + 1)}
      notes={(preview,onPreviewChange) => <MarkdownNoteEditor className='task-detail-note' value={draft.description} images={draft.images} preview={preview} onPreviewChange={onPreviewChange} minimal emptyPreviewPlaceholder='备注' insertionSignal={imageSignal} onChange={description => editDraft({ ...draft, description })} onImagesChange={images => editDraft({ ...draft, images })} owner={owner} recordId={draft.id} disabled={!writable || draftOwner.current !== owner || !!deletion} maxLength={10000} ariaLabel='任务备注' placeholder='备注' showImageInsertion={false} canInsertImage={writable && draftOwner.current === owner && !deletion} onBusyChange={setImageBusy} checkImages={images => { if (!noteStateFits({ ...state, tasks: [{ ...draft, images }, ...state.tasks.filter(task => task.id !== draft.id)] })) throw new Error('任务空间不足，请整理图片'); }} />}
    />}
    <View id='task-tags-anchor' className='task-detail-hidden-anchor' aria-hidden />
    <ChoicePopover anchorId='task-tags-anchor' ariaLabel='任务标签' open={!!draft && tagsOpen} onOpenChange={setTagsOpen} placement='center' panelWidth={360} layerClassName='task-detail-popover-layer' heading={<PopoverHeading title='标签' />}>
      <EditorTagField text={tagsText} onChange={editTags} options={existingTags} disabled={imageBusy} label='任务标签' />
    </ChoicePopover>
    {draft && scheduleOpen && writable && draftOwner.current === owner && <TodoScheduleSheet key={`${owner}:${draft.id}`} value={draft} today={today} busy={imageBusy||!!deletion} saveError={autosaveError} onRetry={()=>{setAutosaveError('');void persistDraft();}} onChange={applySchedule} onClose={() => setScheduleOpen(false)} />}
    {deletion?.owner === owner && <AppDialog title='删除这件任务？' closeLabel='关闭任务删除确认' onClose={closeDelete} busy={busy || !!deletion.pending} error={deleteError} actions={<ActionButton appearance='danger' size='large' width='fill' loading={busy} disabled={busy} onClick={() => { void remove(); }}>{deletion.pending ? '重试删除' : '删除'}</ActionButton>}><Text>{trimTextEnd(deletion.task.title)}</Text></AppDialog>}
  </>;
}

function TodoPanelSourceIcon({panel}:{panel:ReturnType<typeof todoPanelPresentation>}){return panel.source.kind==='quadrant'?<PriorityFlag color={panel.color} outlined={panel.source.quadrantId==='later'}/>:<LibraryIcon name={panel.iconId} fallback='notes' className='todo-panel-icon'/>;}
