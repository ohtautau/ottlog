import { trimTextEnd } from '../../lib/text-whitespace';
import PageScroll from '../../components/page-scroll';
import { CoreScreen } from '../../components/page-sections';
import SheetActions, { SheetDeleteButton } from '../../components/sheet-actions';
import EditorHeading from '../../components/editor-heading';
import { useEffect, useMemo, useRef, useState } from 'react';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import { createTodo, saveTodo, toggleTodo, mergeTodoCategories, moveTodo, retryTodoMove, orderTodos, getTodoSortMode, applyTodoSort, todoToolbarSummary, type TodoSortMode, parseTodoTags as parseTags } from '../../lib/todo-data';
import { cancelTodoReminder, getReminderConfig, getTodoReminders, requestTodoReminder } from '../../lib/todo-reminders';
import { demoTodos, initialTodoState, isTodoState, localToolDay, todoQuadrant, todoQuadrants, type Todo, type TodoState } from '../../lib/tool-records';
import { useTodoDrag } from '../../components/todo-drag';
import { SelectChevron } from '../../components/select-trigger';
import FilterPopover, { FilterFields, FilterField, FilterOptionGrid, FilterSearch } from '../../components/filter-popover';
import TodoScheduleSheet from '../../components/todo-schedule-sheet';
import type { TodoSchedule } from '../../lib/todo-schedule';
import TodoEditorFields from '../../components/todo-editor-fields';
import EntryComposer from '../../components/entry-composer';
import { AddSymbol } from '../../components/create-button';
import PageToolbar, { PageToolbarSummary, ToolbarResetButton } from '../../components/page-toolbar';
import { SortOptions, SortPopover } from '../../components/sort-options';
import { useEntryTags } from '../../lib/use-entry-tags';
import { tagLabel } from '../../lib/tag-label';
import { openPomodoro } from '../../lib/pomodoro-navigation';
import { resumeEditorInput } from '../../lib/resume-editor-input';
import type { EntryQuadrantId } from '../../lib/entry-draft';
import usePageNow from '../../lib/use-page-now';
import TodoTaskCard from '../../components/todo-task-card';
import AppDialog from '../../components/app-dialog';
import { showAppMessage } from '../../lib/app-dialog';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import './index.css';

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
  const movePending = useRef<{ owner: string; id: string; target: TodoState } | null>(null);
  const [completion, setCompletion] = useState('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const now = usePageNow(), today = localToolDay(new Date(now));
  const toolbarSummary = useMemo(() => todoToolbarSummary(state, new Date(now)), [state, now]);
  const [draft, setDraft] = useState<Todo | null>(null);
  const [editing, setEditing] = useState(false);
  const [creation, setCreation] = useState<{ task: Todo; quadrantId?: EntryQuadrantId } | null>(null);
  const [tagsText, setTagsText] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [deletion, setDeletion] = useState<{ owner: string; task: Todo; pending?: boolean } | null>(null);
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
  const dismissedEditors = useRef(new Map<string, { owner: string; draft: Todo; baseline: Todo; tags: string }>());
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
      dismissedEditors.current.clear();
      setDraft(null); setCreation(null); setScheduleOpen(false); setSearch(''); setTagFilter(null); setExpanded({}); setBusy(false); setImageBusy(false); setReminder(null); setDeletion(null); setDeleteError(''); operating.current = false; ++operationGeneration.current;
    }
    if (owner) lastOwner.current = owner;
  }, [owner]);
  useEffect(() => {
    if (writable && requested) { setCreation({ task: createTodo() }); requestCreate(false); }
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
  const sorter = useTodoDrag(state.tasks, writable && !busy && !moveBlocked && !draft && !creation && !showFilters && !showSort, owner, (id, quadrant, before) => {
    const visibleIds = filtered.filter(task => (completion !== 'done' || !!task.completedAt) && (completion !== 'open' || !task.completedAt) && (!task.completedAt || expanded[todoQuadrant(task).id] !== false)).map(task => task.id);
    void persistMove(id, quadrant, before, visibleIds);
  });
  const savedDraft = editing && draft ? state.tasks.find(item => item.id === draft.id) : undefined;
  const existingTags = catalog.owner === owner ? catalog.tags : [];
  const draftChanged = !!(draft && savedDraft && (JSON.stringify(cloneTask(savedDraft)) !== JSON.stringify(cloneTask(draft)) || tagsText !== (savedDraft.tags || []).join('，')));
  const closeGuard = useEditorCloseGuard({ scope: draft && draftOwner.current === owner ? `${owner}:${draft.id}` : '', hasChanges: draftChanged || !!draft && hasVolatilePersonalTool('todos', owner), blocked: busy || imageBusy || !!deletion, onSave: saveAndClose, onClose: closeEditor });
  useEffect(() => {
    if (!draft || scheduleOpen || deletion || typeof document === 'undefined') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closeGuard.requestClose(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [draft?.id, scheduleOpen, deletion, closeGuard.requestClose]);
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
    const retained = dismissedEditors.current.get(task.id);
    const resume = existing && retained?.owner === owner && retained.draft.id === task.id ? retained : null;
    dismissedEditors.current.delete(task.id);
    setEditing(existing); setDraft(cloneTask(resume ? resumeEditorInput(task, resume.baseline, resume.draft) : task));
    setTagsText(resume && resume.tags !== (resume.baseline.tags || []).join('，') ? resume.tags : (task.tags || []).join('，'));
    setScheduleOpen(false);
    setReminder(null);
  }
  function applySchedule(schedule: TodoSchedule) {
    if (!draft || busy || draftOwner.current !== owner || currentOwner.current !== owner) return;
    const id = draft.id;
    setDraft(previous => previous?.id === id ? { ...previous, ...schedule } : previous);
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
    if (!writable || operating.current || busy || moveBlocked || sortBlocked || sorter.drag || draft || creation) return;
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
          return retryTodoMove(previous, pending.target, pending.id);
        }
        const next = moveTodo(previous, id!, quadrant, before, visibleIds);
        if (next !== previous) movePending.current = { owner: expectedOwner, id: id!, target: next };
        return next;
      }, expectedOwner);
      if (currentOwner.current !== expectedOwner || operationGeneration.current !== generation) return;
      if (hasVolatilePersonalTool('todos', expectedOwner)) throw new Error('排序尚未保存，请重试');
      if (movePending.current) {
        const task = movePending.current.target.tasks.find(item => item.id === movePending.current!.id);
        if (task) setExpanded(previous => ({ ...previous, [todoQuadrant(task).id]: true }));
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
  async function save(): Promise<boolean> {
    if (!draft || busy || imageBusy || operating.current || !writable) return false;
    if (!draft.title.trim()) { notify(new Error('先写下任务名称')); return false; }
    const captured: Todo = { ...draft, tags: parseTags(tagsText) };
    if (captured.reminderAt && captured.reminderAt !== savedDraft?.reminderAt && new Date(captured.reminderAt).getTime() <= Date.now()) { notify(new Error('请选择未来的通知时间')); return false; }
    const expectedOwner = draftOwner.current;
    const previousReminder = savedDraft?.reminderAt;
    const generation = startOperation();
    try {
      let saved = captured;
      await change(previous => {
        if (editing && !previous.tasks.some(task => task.id === captured.id)) throw new Error('这件任务已删除，请重新添加');
        const updated = saveTodo(previous, captured);
        saved = updated.tasks.find(task => task.id === captured.id)!;
        return updated;
      }, expectedOwner);
      if (currentOwner.current !== expectedOwner) return false;
      if (hasVolatilePersonalTool('todos', expectedOwner)) throw new Error('本机存储不可用，内容已保留，请重试保存');
      if (!editing) { setCompletion('all'); setSearch(''); setTagFilter(null); }
      if (captured.reminderAt) { setEditing(true); setDraft(cloneTask(saved)); setTagsText((saved.tags || []).join('，')); }
      else setDraft(null);
      dismissedEditors.current.delete(captured.id);
      if (captured.reminderAt && previousReminder !== captured.reminderAt) void showAppMessage({ title: '请开启微信提醒', icon: 'none' });
      if (previousReminder && previousReminder !== captured.reminderAt) { setReminder(null); await cancelReminder(captured.id, expectedOwner, previousReminder); }
      return true;
    } catch (error) { if (currentOwner.current === expectedOwner) notify(error); return false; }
    finally { finishOperation(generation); }
  }
  async function saveAndClose() {
    const expectedOwner = draftOwner.current, expectedTask = draft?.id, generation = operationGeneration.current + 1;
    if (await save() && currentOwner.current === expectedOwner && currentTask.current === expectedTask && operationGeneration.current === generation) { setScheduleOpen(false); setDraft(null); }
  }
  async function toggle(task: Todo) {
    if (operating.current) return;
    const expectedOwner = owner;
    const generation = startOperation();
    try {
      await change(previous => toggleTodo(previous, task.id), expectedOwner);
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
    const target = deletion, task = target.task, expectedOwner = target.owner;
    if (currentOwner.current !== expectedOwner || currentTask.current !== task.id) return;
    const generation = startOperation();
    try {
      await change(previous => ({ ...previous, tasks: previous.tasks.filter(item => item.id !== task.id) }), expectedOwner);
      if (currentOwner.current !== expectedOwner || operationGeneration.current !== generation) return;
      if (hasVolatilePersonalTool('todos', expectedOwner)) { setDeletion({ ...target, pending: true }); throw new Error('本机存储不可用，删除尚未保存，请重试'); }
      dismissedEditors.current.delete(task.id); setDeletion(null); setDeleteError(''); setDraft(null);
      if (task.reminderAt) await cancelReminder(task.id, expectedOwner, task.reminderAt);
    } catch (error) { if (currentOwner.current === expectedOwner && operationGeneration.current === generation) setDeleteError(error instanceof Error ? error.message : '删除失败，请重试'); }
    finally { finishOperation(generation); }
  }
  function closeEditor() {
    if (!draft) return;
    const expectedOwner = draftOwner.current, expectedTask = draft.id;
    if (currentOwner.current !== expectedOwner || currentTask.current !== expectedTask) return;
    const baseline = savedDraft ? cloneTask(savedDraft) : cloneTask(createTodo());
    dismissedEditors.current.set(draft.id, { owner: expectedOwner, draft: cloneTask(draft), baseline, tags: tagsText });
    setScheduleOpen(false); setDraft(null);
  }
  async function authorizeReminder() {
    if (!draft || !canAuthorize || !config || busy || operating.current || reminderLocked) return;
    if (new Date(draft.reminderAt!).getTime() <= Date.now()) { notify(new Error('请选择未来的通知时间并保存')); return; }
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
  function renderTask(task: Todo) {
    return <TodoTaskCard key={task.id} task={task} now={now} rootProps={{ id: `todo-row-${state.tasks.indexOf(task)}`, ...sorter.bind(task) }} className={`${sorter.drag?.task.id === task.id ? ' is-drag-source' : ''}${sorter.drag?.before === task.id ? ' is-insert-before' : ''}`} disabled={!writable || busy || moveBlocked} ariaLabel={`编辑任务：${task.title}`} onOpen={() => openEditor(task, true)}
      leading={check => <Button className='button-label todo-complete' aria-label={task.completedAt ? `重新打开：${task.title}` : `完成：${task.title}`} disabled={!writable || busy || moveBlocked} onClick={() => { if (!sorter.suppressClick()) void toggle(task); }}>{check}</Button>} />;
  }

  return <>
    <PageScroll animateScroll={!sorter.drag} snapSections={[]}><View className='todo-stages'><CoreScreen className='todo-core'><View className='todo-page'>
      <View className='todo-toolbar'><PageToolbar className='todo-page-toolbar'
        leading={ready && valid && !!owner && <PageToolbarSummary countLabel={`今日完成 ${toolbarSummary.completedToday}`} recentTitle={toolbarSummary.recent?.title} />}
        reset={<ToolbarResetButton ariaLabel='恢复任务默认方式' disabled={!writable || busy || imageBusy || moveBlocked || sortBlocked || !!sorter.drag || !!draft || !!creation} onReset={restoreDefaults} />}
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
        const tasks = filtered.filter(task => todoQuadrant(task).id === q.id);
        const pending = tasks.filter(task => !task.completedAt);
        const completed = tasks.filter(task => !!task.completedAt);
        const showCompleted = expanded[q.id] !== false;
        return <View id={`todo-zone-${q.id}`} key={q.id} className={`todo-quadrant todo-quadrant-${q.id}${sorter.drag?.target === q.id ? ' is-drop-zone' : ''}`}>
          <View className='todo-quadrant-heading'><View className='todo-quadrant-label'><View className='todo-quadrant-title-row'><Text className='todo-quadrant-icon' aria-hidden style={{ color: q.color }}>{q.id === 'later' ? '⚐' : '⚑'}</Text><View className='todo-quadrant-title' style={{ color: q.color }}>{trimTextEnd(q.title)}</View></View><Text className='todo-quadrant-caption'>{q.caption}</Text></View><ActionButton appearance='icon' className='todo-quadrant-add' ariaLabel={`创建${q.title}任务`} disabled={!writable || busy || moveBlocked} onClick={() => setCreation({ task: createTodo(q.id), quadrantId: q.id })}><AddSymbol /></ActionButton></View>
          <ScrollView id={`todo-scroll-${q.id}`} scrollY scrollTop={sorter.scrollTop[q.id]} onScroll={event => sorter.onScroll(q.id, event.detail.scrollTop)} enhanced bounces={false} className='todo-quadrant-scroll'><View className='todo-quadrant-items'>
            {completion !== 'done' && pending.map(renderTask)}
            {completion !== 'done' && !pending.length && (completion === 'open' || !completed.length) && <View className={`todo-quadrant-empty ${completed.length ? 'is-clear' : ''}`}>{search || tagFilter !== null ? '没有匹配的待办' : completed.length ? '待办已清空' : '暂时没有任务'}{!state.tasks.length && q.id === 'do' && <ActionButton className='button-label tool-secondary' disabled={busy} onClick={() => { void change(previous => previous.tasks.length ? previous : { ...previous, tasks: demoTodos() }).catch(notify); }}>生成示例待办</ActionButton>}</View>}
            {completion !== 'open' && !!completed.length && <><ActionButton className='button-label todo-completed-toggle' aria-expanded={showCompleted} onClick={() => setExpanded(previous => ({ ...previous, [q.id]: previous[q.id] === false }))}><SelectChevron expanded={showCompleted} /><Text>已完成 · {completed.length}</Text></ActionButton>{showCompleted && completed.map(renderTask)}</>}
            {completion === 'done' && !completed.length && <View className='todo-quadrant-empty'>还没有已完成任务</View>}
          </View></ScrollView>
        </View>;
      })}</View>}
      {ready && /不可用|失败|暂存|离线|无法|等待/.test(status) && <View className='tool-status todo-sync-error'><Text>{status}</Text><ActionButton className='button-label' onClick={retry}>重试同步</ActionButton></View>}
    </View></CoreScreen></View></PageScroll>
    {sorter.ghost}
    {creation && <EntryComposer initialMode='task' initialTask={creation.task} initialQuadrantId={creation.quadrantId} onClose={() => setCreation(null)} onCreated={kind => { if (kind === 'task') { setCompletion('all'); setSearch(''); setTagFilter(null); } }} />}
    {draft && <View className='todo-overlay'><View className='todo-backdrop' onClick={closeGuard.requestClose} /><View className='todo-sheet'>
      <EditorHeading className='todo-sheet-heading' titleClassName='todo-sheet-title' title={editing ? '编辑任务' : '创建任务'} actions={<ActionButton appearance='icon' size='compact' className='button-label' aria-label='关闭编辑' disabled={busy || imageBusy} onClick={closeGuard.requestClose}>×</ActionButton>} />
      <ScrollView scrollY className='todo-sheet-scroll' enhanced bounces={false} showScrollbar={false}><View className='todo-sheet-fields'>
        <TodoEditorFields defaultPreview={editing} draft={draft} onChange={setDraft} tagsText={tagsText} onTagsChange={setTagsText} tagOptions={existingTags} disabled={busy || !writable} owner={owner} onBusyChange={setImageBusy} today={today} scheduleOpen={scheduleOpen} onSchedule={() => setScheduleOpen(true)} />
        {editing && <View className='todo-editor-actions'><ActionButton className='button-label tool-secondary' disabled={busy || imageBusy} onClick={() => { void openPomodoro({ task: draft.id, event: draft.title, minutes: '25' }); }}>◷ 为任务专注</ActionButton></View>}
      </View></ScrollView>
      <SheetActions className='todo-sheet-footer' leading={editing ? <SheetDeleteButton ariaLabel='删除任务' disabled={busy || imageBusy} onClick={requestDelete} /> : undefined}><ActionButton appearance='primary' className='button-label tool-primary' loading={busy} disabled={busy || imageBusy || !writable || !draft.title.trim()} onClick={() => { void save(); }}>{editing ? '保存' : '创建任务'}</ActionButton></SheetActions>
    </View></View>}
    {draft && scheduleOpen && writable && draftOwner.current === owner && <TodoScheduleSheet key={`${owner}:${draft.id}`} value={draft} today={today} busy={busy} reminderLabel={reminderLabel} canAuthorize={canAuthorize} reminderLocked={reminderLocked} onAuthorize={() => { void authorizeReminder(); }} onConfirm={applySchedule} onClose={() => { if (!busy) setScheduleOpen(false); }} />}
    {closeGuard.dialog}
    {deletion?.owner === owner && <AppDialog title='删除这件任务？' closeLabel='关闭任务删除确认' onClose={closeDelete} busy={busy || !!deletion.pending} error={deleteError} actions={<ActionButton appearance='danger' size='large' width='fill' loading={busy} disabled={busy} onClick={() => { void remove(); }}>{deletion.pending ? '重试删除' : '删除'}</ActionButton>}><Text>{trimTextEnd(deletion.task.title)}</Text></AppDialog>}
  </>;
}
