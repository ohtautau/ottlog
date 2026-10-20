import { ChoicePopover, SingleChoiceField } from '../../components/form-options';
import SingleLineInput, { NumericInputRow } from '../../components/single-line-input';
import SheetActions from '../../components/sheet-actions';
import EditorHeading from '../../components/editor-heading';
import EditorFieldsLayout from '../../components/editor-fields-layout';
import { FilterFieldHeading } from '../../components/filter-popover';
import SheetBackdrop from '../../components/sheet-backdrop';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import { CoreScreen } from '../../components/page-sections';
import { useEffect, useMemo, useRef, useState } from 'react';
import Taro, { useDidHide, useDidShow, useRouter } from '@tarojs/taro';
import { Input, ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import PageScroll from '../../components/page-scroll';
import PageToolbar, { CategoryButton, CategoryRow, PageToolbarSummary } from '../../components/page-toolbar';
import ManageSymbol from '../../components/manage-symbol';
import pomodoroToolbarSummary from '../../lib/pomodoro-toolbar-summary';
import { hasVolatilePersonalTool, syncPersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import { initialTodoState, isTodoState, toolId, type Todo } from '../../lib/tool-records';
import { cleanState as cleanHabits, initialReminders, isReminderState, type Reminder } from '../../lib/reminder-data';
import { advanceTimer, decodeTimerRouteValue, finishTimer, initialPomodoroState, isPomodoroState, normalizePomodoroState, pauseTimer, remainingSeconds, resumeTimer, startTimer, timerModes, type PomodoroState, type TimerMode, type TimerSelection, type TimerSettings } from '../../lib/pomodoro-data';
import { cancelPomodoroReminders, consumePomodoroLaunch, eligiblePomodoroReminderTemplates, getPomodoroReminderConfig, pomodoroReminderMessage, requestPomodoroReminders, type PomodoroReminderResult } from '../../lib/pomodoro-reminders';
import TomatoClock from '../../components/tomato-clock';
import DomainChoiceField from '../../components/domain-choice-field';
import LibraryIcon from '../../components/library-icon';
import { initialDomainState, isDomainState } from '../../lib/domain-data';
import HabitSelectionSheet from '../../components/habit-selection-sheet';
import TodoSelectionSheet from '../../components/todo-selection-sheet';
import { takePomodoroEntry } from '../../lib/pomodoro-navigation';
import './index.css';
import './core.css';

type DurationSetting = 'focus' | 'shortBreak' | 'longBreak' | 'longEvery';
const settingsFields: { key: DurationSetting; label: string; suffix: string; max: number }[] = [
  { key: 'focus', label: '专注', suffix: '分钟', max: 120 }, { key: 'shortBreak', label: '短休息', suffix: '分钟', max: 60 },
  { key: 'longBreak', label: '长休息', suffix: '分钟', max: 120 }, { key: 'longEvery', label: '长休息间隔', suffix: '轮专注', max: 12 },
];
const transitionOptions = [
  { value: 'autoBreak', label: '自动休息' },
  { value: 'manual', label: '不自动休息' },
] as const;
const clockLabel = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function Pomodoro() {
  const route = useRouter();
  const [params, setParams] = useState(route.params);
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState('pomodoro', initialPomodoroState);
  const valid = isPomodoroState(value);
  const { value: todoValue, ready: todosReady, owner: todoOwner } = usePersonalToolState('todos', initialTodoState);
  const { value: habitValue, ready: habitsReady, owner: habitOwner } = usePersonalToolState('reminders', initialReminders);
  const { value: domainValue, ready: domainsReady, owner: domainOwner } = usePersonalToolState('domains', initialDomainState);
  const domains = domainsReady && domainOwner === owner && isDomainState(domainValue) ? domainValue.domains : null;
  const state = useMemo(() => normalizePomodoroState(value), [value]);
  const habitState = useMemo(() => isReminderState(habitValue) ? cleanHabits(habitValue) : null, [habitValue]);
  const habits = habitState?.items.filter(item => item.enabled) ?? [];
  const todos = isTodoState(todoValue) ? todoValue.tasks.filter(task => !task.completedAt) : [];
  const allTodos = isTodoState(todoValue) ? todoValue.tasks : [];
  const [now, setNow] = useState(Date.now());
  const [visible, setVisible] = useState(true);
  const [clockSize, setClockSize] = useState(200);
  const [draft, setDraft] = useState<{ owner: string; selection: TimerSelection } | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<Record<DurationSetting, string> | null>(null);
  const [settingsOwner, setSettingsOwner] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState('');
  const [durationDraft, setDurationDraft] = useState<{ owner: string; mode: TimerMode; value: string; selectAll: boolean } | null>(null);
  const [durationOverride, setDurationOverride] = useState<{ owner: string; mode: TimerMode; minutes: number } | null>(null);
  const [durationError, setDurationError] = useState('');
  const [todoPickerOwner, setTodoPickerOwner] = useState<string | null>(null);
  const [habitPickerOwner, setHabitPickerOwner] = useState<string | null>(null);
  const [sourceMenuOwner, setSourceMenuOwner] = useState<string | null>(null);
  const [transitionDraft, setTransitionDraft] = useState<NonNullable<TimerSettings['transitionMode']>>('autoBreak');
  const [busy, setBusy] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [reminderConfig, setReminderConfig] = useState<Awaited<ReturnType<typeof getPomodoroReminderConfig>> | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [message, setMessage] = useState('');
  const settingsInitial = useRef('');
  const durationInitial = useRef('');
  const announced = useRef('');
  const requestApplied = useRef(false);
  const operation = useRef(false);
  const notificationOperation = useRef(false);
  const mounted = useRef(true);
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const active = state.active;
  const runId = active?.rootRunId || active?.id || '';
  const runRef = useRef(runId); runRef.current = runId;
  const currentMode = active?.mode ?? state.mode;
  const modeInfo = timerModes.find(mode => mode.id === currentMode)!;
  const overrideMinutes = durationOverride?.owner === owner && durationOverride.mode === currentMode ? durationOverride.minutes : undefined;
  const total = active?.totalSeconds ?? (overrideMinutes ?? state.settings[currentMode]) * 60;
  const remaining = active ? remainingSeconds(active, now) : total;
  const progress = active ? (1 - remaining / total) * 100 : 0;
  const requestedTask = typeof params.task === 'string' ? allTodos.find(task => task.id === decodeTimerRouteValue(params.task)) : undefined;
  const requestedTitle = decodeTimerRouteValue(params.event).trim().slice(0, 100);
  const chosen: TimerSelection = active?.selection ?? (draft?.owner === owner ? draft.selection : requestedTask ? { taskId: requestedTask.id, habitId: null, title: requestedTask.title } : requestedTitle ? { taskId: null, habitId: null, title: requestedTitle } : state.selection);
  const chosenDomainId = domains?.some(domain => domain.id === chosen.domainId) ? chosen.domainId! : '';
  const canPickTodo = todosReady && todoOwner === owner && isTodoState(todoValue) && (!!todos.length || !!chosen.taskId);
  const canPickHabit = habitsReady && habitOwner === owner && !!habitState && (!!habits.length || !!chosen.habitId);
  const sourceMenuOpen = !!owner && sourceMenuOwner === owner && ready && valid && currentMode === 'focus';
  const completedRounds = state.completedFocusCount ?? state.sessions.filter(session => session.mode === 'focus' && session.completed).length;
  const round = completedRounds % state.settings.longEvery + 1;
  const toolbarSummary = pomodoroToolbarSummary(state.sessions, Date.now());

  useDidShow(() => {
    setNow(Date.now()); setVisible(true);
    const entry = takePomodoroEntry();
    if (entry) { requestApplied.current = false; setParams(entry); }
    else if (requestApplied.current) setParams({});
  });
  useDidHide(() => { setVisible(false); setSourceMenuOwner(null); });
  useEffect(() => {
    if (!visible || !ready || !valid) return;
    let current = true;
    const measure = () => {
      const query = Taro.createSelectorQuery();
      query.select('.focus-timer-stage').boundingClientRect();
      query.exec(results => {
        const rect = results[0];
        if (current && rect?.width && rect?.height) setClockSize(Math.floor(Math.min(rect.width * .92, rect.height * 480 / 430)));
      });
    };
    const timer = setTimeout(measure, 60);
    Taro.onWindowResize?.(measure);
    return () => { current = false; clearTimeout(timer); Taro.offWindowResize?.(measure); };
  }, [visible, ready, valid, owner, domains, chosenDomainId]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!visible) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [visible]);
  useEffect(() => { setDraft(null); setSettingsDraft(null); setSettingsError(''); setDurationDraft(null); setDurationOverride(null); setDurationError(''); setHabitPickerOwner(null); setTodoPickerOwner(null); setSourceMenuOwner(null); setMessage(''); setReminderMessage(''); announced.current = ''; }, [owner]);
  useEffect(() => { setDurationDraft(null); setDurationError(''); setDurationOverride(null); }, [currentMode, !!active]);
  useEffect(() => { if (!visible || currentMode !== 'focus') { setHabitPickerOwner(null); setTodoPickerOwner(null); setSourceMenuOwner(null); } }, [visible, currentMode]);
  useEffect(() => { void getPomodoroReminderConfig().then(config => { if (mounted.current) setReminderConfig(config); }).catch(() => { /* Configuration feedback belongs to the statistics reminder card. */ }); }, []);
  useEffect(() => {
    if (!ready || !valid || operation.current || !active?.running || active.deadline === null || active.deadline > now || announced.current === `${owner}:${active.id}` || (params.start === '1' && !requestApplied.current)) return;
    announced.current = `${owner}:${active.id}`;
    void update(previous => advanceTimer(previous, Date.now())).then(next => {
      if (ownerRef.current !== owner || !mounted.current) return;
      if (!next) { announced.current = ''; return; }
      setMessage('');
    });
  }, [ready, valid, active, now, owner, setValue, visible, params.start]);
  useEffect(() => {
    if (!ready || !valid || !owner || operation.current || requestApplied.current || (!params.event && !params.task && !params.minutes && params.start !== '1')) return;
    if (params.task && (!todosReady || todoOwner !== owner)) return;
    requestApplied.current = true;
    const minutes = Number(params.minutes);
    const linked = requestedTask ? { taskId: requestedTask.id, habitId: null, title: requestedTask.title } : requestedTitle ? { taskId: null, habitId: null, title: requestedTitle } : state.selection;
    if (params.task && !requestedTask) { setMessage('关联待办已移除，请重新选择后开始。'); return; }
    if (!active) setDraft({ owner, selection: linked });
    const at = Date.now();
    setNow(at);
    const id = toolId();
    void update(previous => {
      let next = advanceTimer(previous, at);
      if (next.active) return params.start === '1' ? resumeTimer(next, at) : next;
      next = { ...next, mode: 'focus', selection: { ...next.selection, ...linked }, settings: Number.isInteger(minutes) && minutes >= 1 && minutes <= 120 ? { ...next.settings, focus: minutes } : next.settings };
      return params.start === '1' ? startTimer(next, at, id, linked) : next;
    }).then(async next => {
      if (!next || !mounted.current || ownerRef.current !== owner || params.start !== '1') return;
      setMessage('');
      if (params.launch && next.active) {
        const launchedRunId = next.active.rootRunId || next.active.id;
        // A pre-resolved refusal can return before React renders the saved run.
        // Keep the notification guard in sync with the successful save now.
        runRef.current = launchedRunId;
        notificationOperation.current = true; setNotificationBusy(true);
        try {
          const allowed = eligiblePomodoroReminderTemplates(next.active, next.settings).map(template => template.event);
          const result = await consumePomodoroLaunch(String(params.launch), launchedRunId, owner, allowed);
          if (result && mounted.current && ownerRef.current === owner) { applyReminderResult(result, launchedRunId); }
        } catch (error) { if (mounted.current && ownerRef.current === owner && runRef.current === launchedRunId) setReminderMessage(error instanceof Error ? error.message : '本轮微信提醒未能安排，计时继续。'); }
        finally { notificationOperation.current = false; if (mounted.current) setNotificationBusy(false); }
      }
    });
  }, [ready, valid, owner, active, params, requestedTask, requestedTitle, todosReady, todoOwner, setValue]);

  function applyReminderResult(result: PomodoroReminderResult, expectedRunId: string) {
    if (runRef.current !== expectedRunId) return;
    setReminderMessage(pomodoroReminderMessage(result));
  }
  async function update(transform: (previous: PomodoroState) => PomodoroState): Promise<PomodoroState | null> {
    if (!ready || !valid || !owner || operation.current || ownerRef.current !== owner) return null;
    operation.current = true; setBusy(true);
    let next: PomodoroState | null = null;
    try {
      await setValue(previous => { if (ownerRef.current !== owner) throw new Error('账号已切换'); if (!isPomodoroState(previous)) throw new Error('计时数据格式暂不兼容'); next = transform(normalizePomodoroState(previous)); return next; });
      if (hasVolatilePersonalTool('pomodoro', owner)) throw new Error('本机尚未保存');
      return ownerRef.current === owner ? next : null;
    } catch { if (ownerRef.current === owner && mounted.current) setMessage('暂时未能保存，请重新同步。'); return null; }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  }
  function editSelection(selection: TimerSelection) {
    if (!ready || !valid || !owner || ownerRef.current !== owner) return;
    if (!active) { setDraft({ owner, selection }); return; }
    const id = active.id;
    void setValue(previous => {
      if (ownerRef.current !== owner || !isPomodoroState(previous) || previous.active?.id !== id) return previous;
      return { ...previous, active: { ...previous.active, selection } };
    }).catch(() => { if (mounted.current && ownerRef.current === owner) setMessage('暂时未能保存，请重新同步。'); });
  }
  function selectDomain(domainId: string) {
    if (!visible || !ready || !valid || !owner || ownerRef.current !== owner || !domains || busy || notificationBusy || operation.current || hasVolatilePersonalTool('pomodoro', owner)) return;
    if (domainId && !domains.some(domain => domain.id === domainId)) return;
    const target = domainId || null;
    if ((chosen.domainId || null) === target) return;
    if (!active) { setDraft({ owner, selection: { ...chosen, domainId: target } }); return; }
    const id = active.id;
    void update(previous => previous.active?.id !== id ? previous : { ...previous,
      selection: { ...previous.selection, domainId: target },
      active: { ...previous.active, selection: { ...previous.active.selection, domainId: target } } });
  }
  function openTodoPicker() {
    if (!ready || !valid || !owner || ownerRef.current !== owner || !canPickTodo || currentMode !== 'focus') return;
    setSettingsDraft(null); setHabitPickerOwner(null); setTodoPickerOwner(owner);
  }
  function selectTodo(item: Todo | null) {
    if (!ready || !valid || !owner || todoPickerOwner !== owner || ownerRef.current !== owner || !canPickTodo || currentMode !== 'focus') return;
    const task = item ? todos.find(row => row.id === item.id) : null;
    if (item && !task) return;
    editSelection(task ? { ...chosen, taskId: task.id, habitId: null, title: task.title } : { ...chosen, taskId: null, habitId: null, title: '' });
    setTodoPickerOwner(null);
  }
  function openHabitPicker() {
    if (!ready || !valid || !owner || ownerRef.current !== owner || !canPickHabit || currentMode !== 'focus') return;
    setSettingsDraft(null); setTodoPickerOwner(null); setHabitPickerOwner(owner);
  }
  function selectHabit(item: Reminder | null) {
    if (!ready || !valid || !owner || habitPickerOwner !== owner || ownerRef.current !== owner || !canPickHabit || currentMode !== 'focus') return;
    const habit = item ? habits.find(row => row.id === item.id) : null;
    if (item && !habit) return;
    editSelection(habit ? { ...chosen, taskId: null, habitId: habit.id, title: habit.title } : { ...chosen, taskId: null, habitId: null, title: '' });
    setHabitPickerOwner(null);
  }
  function begin() {
    if (!ready || active || operation.current || notificationOperation.current) return;
    if (chosen.domainId && !domains) { setMessage('正在读取所属领域，请稍后再开始。'); return; }
    if (currentMode === 'focus' && chosen.taskId && (!todosReady || todoOwner !== owner)) { setMessage('正在读取关联待办，请稍后再开始。'); return; }
    const task = chosen.taskId ? allTodos.find(item => item.id === chosen.taskId) : null;
    if (currentMode === 'focus' && chosen.taskId && !task) { setMessage('关联待办已移除，请重新选择。'); return; }
    if (currentMode === 'focus' && chosen.habitId && (!habitsReady || habitOwner !== owner)) { setMessage('正在读取关联习惯，请稍后再开始。'); return; }
    const habit = chosen.habitId ? habits.find(item => item.id === chosen.habitId) : null;
    if (currentMode === 'focus' && chosen.habitId && !habit) { setMessage('关联习惯已归档或移除，请重新选择。'); return; }
    const linked: TimerSelection = { ...(task ? { taskId: task.id, habitId: null, title: task.title } : habit ? { taskId: null, habitId: habit.id, title: chosen.title.trim() || habit.title } : { taskId: null, habitId: null, title: chosen.title.trim() }), domainId: chosenDomainId || null };
    const at = Date.now(); setNow(at); setMessage(''); setSettingsDraft(null);
    const id = toolId();
    void update(previous => startTimer(previous, at, id, linked, overrideMinutes));
    if (owner !== 'guest' && reminderConfig?.enabled) {
      notificationOperation.current = true; setNotificationBusy(true); setReminderMessage('');
      const launched = startTimer(state, at, id, linked, overrideMinutes);
      const templates = eligiblePomodoroReminderTemplates(launched.active, launched.settings, reminderConfig.templates, at);
      // The save above begins synchronously; retain the tap for WeChat consent.
      void requestPomodoroReminders(id, owner, { ...reminderConfig, templates }).then(result => {
        if (!mounted.current || ownerRef.current !== owner) return;
        applyReminderResult(result, id);
      }).catch(error => { if (mounted.current && ownerRef.current === owner && runRef.current === id) setReminderMessage(error instanceof Error ? error.message : '微信提醒暂未开启，计时照常继续。'); }).finally(() => { notificationOperation.current = false; if (mounted.current) setNotificationBusy(false); });
    }
  }
  function togglePause() {
    if (!active || notificationOperation.current) return;
    const id = active.id, at = Date.now(); setNow(at);
    void update(previous => previous.active?.id !== id ? previous : previous.active.running ? pauseTimer(previous, at) : resumeTimer(previous, at)).then(async next => {
      if (!next || owner === 'guest') return;
      try { await syncPersonalTool('pomodoro', owner); }
      catch { if (mounted.current && ownerRef.current === owner) setReminderMessage('计时已在本机更新；请联网同步，微信提醒才能跟随暂停或继续。'); }
    });
  }
  async function end() {
    if (!active || busy || notificationOperation.current) return;
    if (active.running) return;
    const id = active.id, previousRunId = active.rootRunId || active.id, previousDeadline = active.deadline;
    const at = Date.now(); setNow(at);
    let changed = false;
    const saved = await update(previous => {
      if (previous.active?.id !== id || previous.active.running) return previous;
      changed = true;
      return finishTimer(previous, at, true);
    });
    if (!saved || ownerRef.current !== owner) return;
    if (!changed) { setMessage('这一轮已经结束，当前计时已保留。'); return; }
    setMessage('');
    if (owner !== 'guest') {
      try { await cancelPomodoroReminders(previousRunId, owner, previousDeadline ?? undefined); await syncPersonalTool('pomodoro', owner); }
      catch { if (mounted.current && ownerRef.current === owner) setReminderMessage('计时已结束；微信提醒取消尚未确认，请联网重新同步。'); }
    }
  }
  function openSettings() {
    if (!ready || !valid || !owner || operation.current || notificationOperation.current) return;
    setTodoPickerOwner(null); setHabitPickerOwner(null); setSourceMenuOwner(null); setDurationDraft(null);
    setSettingsOwner(owner);
    const fields = Object.fromEntries(settingsFields.map(field => [field.key, String(state.settings[field.key])])) as Record<DurationSetting, string>;
    const transition = state.settings.transitionMode || 'autoBreak';
    settingsInitial.current = JSON.stringify({ fields, transition });
    setSettingsDraft(fields);
    setTransitionDraft(transition); setSettingsError('');
  }
  const settingsClose = useEditorCloseGuard({
    scope: settingsDraft && settingsOwner === owner && ready && valid ? `${owner}:settings` : '',
    hasChanges: !!settingsDraft && JSON.stringify({ fields: settingsDraft, transition: transitionDraft }) !== settingsInitial.current,
    blocked: busy || notificationBusy,
    onSave: saveSettings,
    onClose: () => { if (!operation.current && !notificationOperation.current) { setSettingsDraft(null); setSettingsError(''); } },
  });
  const durationClose = useEditorCloseGuard({
    scope: durationDraft?.owner === owner && !active && ready && valid ? `${owner}:duration:${currentMode}` : '',
    hasChanges: !!durationDraft && durationDraft.value !== durationInitial.current,
    blocked: busy || notificationBusy || !!active,
    onSave: saveDuration,
    onClose: () => { setDurationDraft(null); setDurationError(''); },
  });
  async function saveSettings() {
    if (!settingsDraft || settingsOwner !== ownerRef.current || notificationOperation.current || operation.current) return;
    for (const field of settingsFields) if (!/^[1-9]\d{0,2}$/.test(settingsDraft[field.key]) || Number(settingsDraft[field.key]) > field.max) { setSettingsError(`${field.label}请填写 1 至 ${field.max} 的整数。`); return; }
    setSettingsError('');
    const settings = { ...Object.fromEntries(settingsFields.map(field => [field.key, Number(settingsDraft[field.key])])), transitionMode: transitionDraft } as TimerSettings;
    const saved = await update(previous => ({ ...previous, settings: { ...previous.settings, ...settings } }));
    if (ownerRef.current !== owner || !mounted.current) return;
    if (saved) { setSettingsDraft(null); setMessage(''); }
    else setSettingsError('暂时未能保存，请重试。');
  }
  function openDuration() {
    if (!ready || !valid || !owner || active || busy || notificationBusy) return;
    setSettingsDraft(null); setTodoPickerOwner(null); setHabitPickerOwner(null); setSourceMenuOwner(null);
    durationInitial.current = String(overrideMinutes ?? state.settings[currentMode]);
    setDurationDraft({ owner, mode: currentMode, value: durationInitial.current, selectAll: true }); setDurationError('');
  }
  function saveDuration() {
    if (!durationDraft || durationDraft.owner !== ownerRef.current || active || busy || notificationBusy || durationDraft.mode !== currentMode) return;
    const max = currentMode === 'shortBreak' ? 60 : 120;
    if (!/^[1-9]\d{0,2}$/.test(durationDraft.value) || Number(durationDraft.value) > max) { setDurationError(`请填写 1 至 ${max} 的整数。`); return; }
    setDurationOverride({ owner: durationDraft.owner, mode: currentMode, minutes: Number(durationDraft.value) }); setDurationDraft(null); setDurationError('');
  }

  return <><PageScroll animateScroll={false} snapSections={[]}><View className='tool-page focus-page core-page' onClick={() => { if (sourceMenuOpen) setSourceMenuOwner(null); }}><CoreScreen className='focus-core'>
    {!ready ? <View className='tool-empty'><Text>{status || '正在恢复你的计时…'}</Text><ActionButton className="button-label tool-secondary" onClick={retry}>重新读取</ActionButton></View> : !valid ? <View className='tool-empty'>当前计时数据格式暂不兼容，请到网页查看。原始数据已保留。</View> : <>
        <PageToolbar className='focus-page-toolbar' leading={!!owner && <PageToolbarSummary countLabel={`今日完成 ${toolbarSummary.completedToday}`} recentTitle={toolbarSummary.recentTitle} recentLabel='最近专注' />} manage={<ActionButton appearance='icon' size='compact' disabled={busy || notificationBusy} className='focus-settings-toggle' ariaLabel='调整节奏' onClick={openSettings}><ManageSymbol /></ActionButton>} />
        <CategoryRow className='focus-toolbar' contentClassName='focus-modes' ariaLabel='计时模式'>{timerModes.map(mode => <CategoryButton key={mode.id} disabled={busy || notificationBusy || (!!active && mode.id !== currentMode)} className={'button-label ' + (currentMode === mode.id ? 'is-active' : '')} onClick={() => { if (!active) void update(previous => ({ ...previous, mode: mode.id })); }}>{mode.label}</CategoryButton>)}</CategoryRow>
        <View className={`focus-clock-card ${currentMode !== 'focus' ? 'is-break' : ''}`}>
          <View className='focus-clock-top'><View className='focus-live'><View className={active?.running ? 'focus-live-dot is-running' : 'focus-live-dot'} /><Text>{active?.running ? '正在计时' : active ? '已暂停' : '准备就绪'}</Text></View><View className='focus-rounds'>{Array.from({ length: state.settings.longEvery }, (_, index) => <View key={index} className={index < round - 1 ? 'focus-round is-complete' : index === round - 1 ? 'focus-round is-current' : 'focus-round'} />)}<Text>第 {round} / {state.settings.longEvery} 轮</Text></View></View>
          <View className='focus-domain-row'><DomainChoiceField key={`${owner}:${visible}:${domainOwner}:${!!domains}:${active?.id || 'draft'}`} ariaLabel='选择番茄钟所属领域' domains={domains || []} value={chosenDomainId} optionPrefix='专注领域：' disabled={!visible || !owner || !domains || busy || notificationBusy || hasVolatilePersonalTool('pomodoro', owner)} onChange={selectDomain} /></View>
          <View className='focus-timer-stage'><TomatoClock progress={progress} resting={currentMode !== 'focus'} time={clockLabel(remaining)} label={`${modeInfo.label}时间`} size={clockSize} onEditTime={!active && !busy && !notificationBusy ? openDuration : undefined} /></View>
          <View className='focus-purpose-slot'>{currentMode === 'focus' && <>
            <View className='focus-purpose'>
              <Input className='focus-purpose-input' ariaLabel='正在做什么' cursorSpacing={80} adjustPosition maxlength={100} value={chosen.title} placeholder='正在做什么？' onFocus={() => setSourceMenuOwner(null)} onInput={event => editSelection(active ? { ...chosen, title: event.detail.value } : { ...chosen, taskId: null, habitId: null, title: event.detail.value })} />
              <ChoicePopover ariaLabel='选择专注事项来源' open={sourceMenuOpen} onOpenChange={open => setSourceMenuOwner(open ? owner : null)} disabled={busy || notificationBusy} trigger={null} triggerIconOnly triggerSize='compact' triggerClassName='focus-source-toggle' triggerSelected={!!chosen.habitId || !!chosen.taskId || sourceMenuOpen} panelClassName='focus-source-menu' panelWidth={104} bodySpacing='tight' preferredSide='above'>
                <View className='focus-source-options'>
                  <ChoiceButton size='compact' width='fill' selected={!!chosen.habitId} className='button-label focus-habit-picker' ariaLabel='从习惯选择专注事项' disabled={!canPickHabit} onClick={() => { setSourceMenuOwner(null); openHabitPicker(); }}><View className='form-choice-content'><View className='form-choice-icon' aria-hidden><LibraryIcon name='plant' /></View><Text className='form-choice-label'>习惯</Text></View></ChoiceButton>
                  <ChoiceButton size='compact' width='fill' selected={!!chosen.taskId} className='button-label focus-todo-picker' ariaLabel='从待办选择专注事项' disabled={!canPickTodo} onClick={() => { setSourceMenuOwner(null); openTodoPicker(); }}><View className='form-choice-content'><View className='form-choice-icon' aria-hidden><LibraryIcon name='calendar' /></View><Text className='form-choice-label'>待办</Text></View></ChoiceButton>
                </View>
              </ChoicePopover>
            </View>
          </>}</View>
          <View className='focus-action-area'>
          <View className='focus-primary-actions'>
            <ActionButton appearance='primary' size='large' width='fill' disabled={busy || notificationBusy} className='button-label focus-start' onClick={active ? togglePause : begin}>{active ? active.running ? '暂停' : '继续' : `开始${modeInfo.label}`}</ActionButton>
          </View>
          <View className='focus-end-slot'>{active && !active.running ? <ActionButton size='large' width='fill' disabled={busy || notificationBusy} className='button-label focus-end' onClick={() => { void end(); }}>结束</ActionButton> : <View className='focus-end-space' aria-hidden />}</View>
          </View>
        </View>
    </>}
    <ScrollView scrollY enhanced bounces={false} showScrollbar={false} className='focus-feedback-slot'>
      {!!message && <Text className='focus-feedback-message'>{message}</Text>}
      {!!reminderMessage && <Text className='focus-reminder-note focus-reminder-feedback'>{reminderMessage}</Text>}
      {!!status && <View className='tool-status'><Text>{status}</Text><ActionButton size='compact' onClick={retry}>重新同步</ActionButton></View>}
    </ScrollView>
    </CoreScreen></View></PageScroll>
    {todoPickerOwner === owner && !!owner && ready && valid && canPickTodo && currentMode === 'focus' && <TodoSelectionSheet key={owner} items={todos} sessions={state.sessions} selectedId={chosen.taskId} onSelect={selectTodo} onClose={() => setTodoPickerOwner(null)} />}
    {habitPickerOwner === owner && !!owner && ready && valid && canPickHabit && currentMode === 'focus' && <HabitSelectionSheet key={owner} items={habits} sessions={state.sessions} selectedId={chosen.habitId} onSelect={selectHabit} onClose={() => setHabitPickerOwner(null)} />}
    {settingsDraft && settingsOwner === owner && ready && valid && <View className='focus-settings-overlay'><View className='focus-settings-backdrop' catchMove onClick={event => { event.stopPropagation(); settingsClose.requestClose(); }} /><View className='focus-settings'>
      <EditorHeading className='focus-settings-heading' titleClassName='focus-settings-title' title='调整节奏' actions={<ActionButton appearance='icon' className='button-label' ariaLabel='关闭节奏设置' disabled={busy} onClick={settingsClose.requestClose}>×</ActionButton>} />
      <ScrollView scrollY className='focus-settings-scroll' enhanced bounces={false} showScrollbar={false}><EditorFieldsLayout className='focus-settings-fields'>
        <View className='focus-settings-grid'>{settingsFields.map(field => <View key={field.key}><FilterFieldHeading label={field.label} /><View className='focus-settings-number'><SingleLineInput frameClassName='focus-settings-input' ariaLabel={field.key === 'longEvery' ? '长休息间隔' : `${field.label}时长`} disabled={busy} type='number' maxlength={3} value={settingsDraft[field.key]} cursorSpacing={96} adjustPosition onInput={event => { setSettingsDraft({ ...settingsDraft, [field.key]: event.detail.value }); setSettingsError(''); }} /><Text>{field.suffix}</Text></View></View>)}</View>
        <View className='focus-transition-picker'><FilterFieldHeading label='时间结束后' /><SingleChoiceField ariaLabel='时间结束后' options={transitionOptions} value={transitionDraft} onChange={setTransitionDraft} disabled={busy} width='fill' /></View>
        {!!settingsError && <Text className='focus-settings-error'>{settingsError}</Text>}
      </EditorFieldsLayout></ScrollView>
      <SheetActions className='focus-settings-actions'><ActionButton appearance='primary' disabled={busy || notificationBusy} loading={busy} className='button-label tool-primary' onClick={() => { void saveSettings(); }}>保存节奏</ActionButton></SheetActions>
    </View></View>}
    {durationDraft?.owner === owner && !active && ready && valid && <View className='focus-quick-overlay'><SheetBackdrop onClose={durationClose.requestClose} /><View className='focus-quick-window' role='dialog' ariaLabel='本次计时时长'>
      <EditorHeading className='focus-settings-heading' titleClassName='focus-settings-title' title='本次时长' actions={<ActionButton appearance='icon' ariaLabel='关闭时长设置' disabled={busy || notificationBusy} onClick={durationClose.requestClose}>×</ActionButton>} />
      <View className='focus-quick-body'><NumericInputRow className='focus-quick-number'><SingleLineInput ariaLabel='本次计时分钟' type='number' maxlength={3} value={durationDraft.value} focus selectionStart={durationDraft.selectAll ? 0 : -1} selectionEnd={durationDraft.selectAll ? durationDraft.value.length : -1} confirmType='done' onConfirm={saveDuration} cursorSpacing={96} adjustPosition onInput={event => { setDurationDraft({ ...durationDraft, value: event.detail.value, selectAll: false }); setDurationError(''); }} /><Text>分钟</Text></NumericInputRow>{!!durationError && <Text className='focus-settings-error'>{durationError}</Text>}</View>
      <SheetActions><ActionButton appearance='primary' onClick={saveDuration}>确认</ActionButton></SheetActions>
    </View></View>}
    {settingsClose.dialog}{durationClose.dialog}
  </>;
}
