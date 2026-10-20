import { trimTextEnd } from '../../lib/text-whitespace';
import { showAppMessage } from '../../lib/app-dialog';
import SectionTitle from '../../components/section-title';
import EditorHeading from '../../components/editor-heading';
import EditorFieldsLayout from '../../components/editor-fields-layout';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Taro, { useDidHide, useDidShow, useRouter } from '@tarojs/taro';
import { Button, ScrollView, Text, Textarea, View } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import { EditSymbol, DeleteSymbol } from '../../components/manage-symbol';
import PageToolbar from '../../components/page-toolbar';
import DomainDefinitionEditor from '../../components/domain-definition-editor';
import useDomainDefinition from '../../lib/use-domain-definition';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import PageScroll from '../../components/page-scroll';
import BackButton from '../../components/back-button';
import CreateButton from '../../components/create-button';
import CardCreateButton from '../../components/card-create-button';
import DomainQuickRecord from '../../components/domain-quick-record';
import { DomainRecordCard, DomainRecordColumn, DomainRecordColumns } from '../../components/domain-records';
import DomainRecordEditor from '../../components/domain-record-editor';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import LibraryIcon from '../../components/library-icon';
import HabitCard from '../../components/habit-card';
import HabitGrid from '../../components/habit-grid';
import HabitEditor from '../../components/habit-editor';
import SheetActions from '../../components/sheet-actions';
import HabitCalendar, { HabitDetailNote, HabitDetailHeader, habitDetailSheetClass } from '../../components/habit-calendar';
import useHabitCalendarEdit from '../../lib/use-habit-calendar-edit';
import { prepareHabitEdit, saveHabitEdit } from '../../lib/habit-edit';
import useHabitDetailEdit from '../../lib/use-habit-detail-edit';
import { domainDisplayState, materializeUncategorizedDomain, uncategorizedDomain } from '../../lib/domain-display';
import { confirmHabitDelete } from '../../lib/habit-delete';
import { sortHabits } from '../../lib/habit-metadata';
import { alignHabitDisplayDomain } from '../../lib/habit-domains';
import { toolId } from '../../lib/tool-records';
import { habitCompletionStats } from '../../lib/habit-reflections';
import useHabitArchive from '../../lib/use-habit-archive';
import { cleanState, initialReminders, isReminderState, toggleReminderDone, type Reminder } from '../../lib/reminder-data';
import {
  initialDomainState, isDomainState, localDateKey, completedGoalCount, domainIcon,
  saveDomainGoal, completeDomainGoal, displayedDomainGoal, undoDomainGoalCompletion,
  type Domain, type DomainState, type GoalKind, type RecordKind, type RecordItem,
} from '../../lib/domain-data';
import '../domains/index.css';
import './index.css';

type Editor =
  | { type: 'goal'; owner: string; domainId: string; kind: GoalKind; originalId: string | null; content: string }
  | { type: 'history'; owner: string; domainId: string; content: string };
const goalLabel = (kind: GoalKind) => kind === 'longTerm' ? '长期目标' : '短期目标';
const recordLabel = (kind: RecordKind) => kind === 'positive' ? '正记录' : '负记录';
const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();
const formatDate = (stamp: string) => {
  const date = new Date(stamp);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

function Sheet({ title, type, onClose, children }: { title: string; type: Editor['type']; onClose: () => void; children: ReactNode }) {
  return <View className='domain-overlay'>
    <View className='domain-backdrop' catchMove onClick={onClose} />
    <View className={`domain-sheet domain-sheet-${type}`} role='dialog' ariaLabel={title}>
      <EditorHeading className='domain-sheet-heading' title={title} actions={<ActionButton appearance='icon' className='domain-quiet button-label' ariaLabel='关闭编辑' onClick={onClose}>×</ActionButton>} />
      {children}
    </View>
  </View>;
}

export default function Domains() {
  const route = useRouter();
  const uncategorizedRoute = route.params.uncategorized === '1';
  const domainTool = usePersonalToolState('domains', initialDomainState);
  const { value, setValue, ready, owner, status, retry } = domainTool;
  const valid = isDomainState(value), sourceState = valid ? value : initialDomainState;
  const state = uncategorizedRoute ? domainDisplayState(sourceState) : sourceState;
  const domainId = uncategorizedRoute ? uncategorizedDomain(sourceState).id : route.params.id;
  const writable = ready && valid && !!owner;
  const domainSource = useRef({ owner, writable, state: sourceState });
  domainSource.current = { owner, writable, state: sourceState };
  const habitTool = usePersonalToolState('reminders', initialReminders);
  const habitsWritable = writable && habitTool.ready && habitTool.owner === owner && isReminderState(habitTool.value);
  const habitState = useMemo(() => {
    const cleaned = cleanState(habitTool.value);
    return valid ? { ...cleaned, items: cleaned.items.map(item => alignHabitDisplayDomain(item, state.domains)) } : cleaned;
  }, [habitTool.value, value, valid, uncategorizedRoute]);
  const [selectedHabit, setSelectedHabit] = useState<{ owner: string; id: string } | null>(null);
  const [habitEditor, setHabitEditor] = useState<{ owner: string; item: Reminder; pendingId?: string; pendingCreatedAt?: number } | null>(null);
  const [habitBusy, setHabitBusy] = useState(false);
  const habitSaving = useRef(false);
  const habitEditorRef = useRef(habitEditor); habitEditorRef.current = habitEditor;
  const habitDeleteContext = useRef(0);
  const [today, setToday] = useState(() => localDateKey());
  const [visible, setVisible] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [progressEditor, setProgressEditor] = useState<{ owner: string; domainId: string } | null>(null);
  const [recordEditor, setRecordEditor] = useState<{ owner: string; domainId: string; kind: RecordKind; record: RecordItem; title: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false), ownerRef = useRef(owner), previousOwner = useRef('');
  ownerRef.current = owner;
  useDidShow(() => { setToday(localDateKey()); setVisible(true); });
  useDidHide(() => { ++habitDeleteContext.current; setVisible(false); setEditor(null); setProgressEditor(null); setRecordEditor(null); setSelectedHabit(null); setHabitEditor(null); });
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setToday(localDateKey()), 15_000);
    return () => clearInterval(timer);
  }, [visible]);
  useEffect(() => {
    if (owner && previousOwner.current && owner !== previousOwner.current) { ++habitDeleteContext.current; setEditor(null); setProgressEditor(null); setRecordEditor(null); setSelectedHabit(null); setHabitEditor(null); setError(''); }
    if (owner) previousOwner.current = owner;
  }, [owner]);
  useEffect(() => {
    // Browser/desktop keyboard support; WeChat also has explicit cancel and backdrop controls.
    if (habitEditor || (!editor && !selectedHabit) || typeof document === 'undefined') return;
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !saving.current && !habitSaving.current && !detailEdit.isLocked()) { if (editor) goalCloseGuard.requestClose(); else closeHabitDetail(); } };
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, [editor, selectedHabit, habitEditor]);

  const currentEditor = writable && editor?.owner === owner ? editor : null;
  const editingDomain = currentEditor ? state.domains.find(domain => domain.id === currentEditor.domainId) : undefined;
  const goalBaseline = useRef('');
  const goalCloseGuard = useEditorCloseGuard({ scope: currentEditor ? `${owner}:${currentEditor.domainId}:${currentEditor.type === 'goal' ? currentEditor.kind : 'history'}` : '', hasChanges: currentEditor?.type === 'goal' && (currentEditor.content !== goalBaseline.current || hasVolatilePersonalTool('domains', currentEditor.owner)), blocked: busy, onSave: save, onClose: () => { setEditor(null); setError(''); } });
  function close() { goalCloseGuard.requestClose(); }
  function open(next: Editor) { if (writable && !saving.current) { goalBaseline.current = next.content; setError(''); setEditor(next); } }
  async function change(transform: (previous: DomainState) => DomainState): Promise<boolean> {
    if (!writable || saving.current || definition.busy) return false;
    const capturedOwner = owner;
    saving.current = true; setBusy(true); setError('');
    try {
      // Validate form input before touching the shared store (which reloads on persistence errors).
      const apply = (previous: DomainState) => transform(uncategorizedRoute ? materializeUncategorizedDomain(previous) : previous);
      const next = apply(value);
      await setValue(previous => {
        if (ownerRef.current !== capturedOwner || !isDomainState(previous)) throw new Error('账号或记录已变化，请重新打开');
        return previous === value ? next : apply(previous);
      });
      if (hasVolatilePersonalTool('domains', capturedOwner)) throw new Error('本机尚未保存，请重试');
      return ownerRef.current === capturedOwner;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '保存失败，请重试';
      setError(message);
      void showAppMessage({ title: message, icon: 'none' });
      return false;
    } finally { saving.current = false; setBusy(false); }
  }
  function updateContent(content: string) { setEditor(previous => previous ? { ...previous, content } : null); }
  async function save() {
    const draft = currentEditor;
    if (!draft || draft.type === 'history') return;
    let saved = false;
    let targetId = draft.originalId;
    if (draft.type === 'goal') saved = await change(previous => {
      const next = saveDomainGoal(previous, draft.domainId, draft.kind, draft.content, new Date(), draft.originalId);
      targetId = next.domains.find(domain => domain.id === draft.domainId)?.[draft.kind === 'longTerm' ? 'longTermGoal' : 'shortTermGoal']?.id || targetId;
      return next;
    });
    if (!saved) {
      if (hasVolatilePersonalTool('domains', draft.owner)) setEditor(previous => previous === draft ? { ...draft, originalId: targetId } : previous);
      return;
    }
    setEditor(null);
  }
  async function toggleGoal(domain: Domain, kind: GoalKind) {
    const goal = displayedDomainGoal(state, domain.id, kind);
    if (!goal) { open({ type: 'goal', owner, domainId: domain.id, kind, originalId: null, content: '' }); return; }
    await change(previous => goal.status === 'completed'
      ? undoDomainGoalCompletion(previous, domain.id, kind, goal.id)
      : completeDomainGoal(previous, domain.id, kind, goal.id));
  }
  async function checkHabit(item: Reminder) {
    if (!habitsWritable || habitSaving.current) return;
    const capturedOwner = owner;
    habitSaving.current = true; setHabitBusy(true); setError('');
    try {
      const day = localDateKey(); setToday(day);
      await habitTool.setValue(previous => {
        if (ownerRef.current !== capturedOwner || !isReminderState(previous)) throw new Error('账号或习惯已变化，请重新打开');
        if (!previous.items.some(habit => habit.id === item.id && habit.enabled)) throw new Error('这个习惯已归档或移除');
        return toggleReminderDone(previous, item.id, day);
      });
    } catch (reason) { if (ownerRef.current === capturedOwner) setError(reason instanceof Error ? reason.message : '打卡未能保存，请重试'); }
    finally { habitSaving.current = false; setHabitBusy(false); }
  }
  const currentHabit = habitsWritable && selectedHabit?.owner === owner ? habitState.items.find(item => item.id === selectedHabit.id && item.enabled) : undefined;
  const calendarEdit = useHabitCalendarEdit({ state: habitState, habitId: currentHabit?.id || '', owner, writable: habitsWritable && !habitBusy, setValue: habitTool.setValue });
  const detailEdit = useHabitDetailEdit({ state: habitTool.value, habitId: currentHabit?.id || '', owner, domains: sourceState.domains,
    writable: habitsWritable && visible && !habitBusy && !busy && !habitEditor && !calendarEdit.busy, setValue: habitTool.setValue });
  function closeHabitDetail() { if (!calendarEdit.busy && !habitSaving.current && !detailEdit.isLocked()) setSelectedHabit(null); }
  const currentHabitEditor = habitsWritable && habitEditor?.owner === owner ? habitEditor : null;
  const habitArchive = useHabitArchive({ state: habitState, id: currentHabitEditor?.item.id || '', owner, writable: habitsWritable && !!currentHabitEditor?.item.id && !habitBusy, setValue: habitTool.setValue, onSaved: enabled => setHabitEditor(previous => previous?.owner === owner && previous.item.id === currentHabitEditor?.item.id ? { ...previous, item: { ...previous.item, enabled } } : previous) });
  const definition = useDomainDefinition(domainTool, habitTool, {
    locked: busy || habitBusy || habitArchive.busy,
    onDeleted: id => { if (id === domainId) void Taro.switchTab({ url: '/pages/domains/index' }); },
  });
  const blocked = busy || definition.busy;
  function createHabit(domain: Domain) {
    if (!habitsWritable || habitSaving.current || habitArchive.busy) return;
    setSelectedHabit(null); setError('');
    setHabitEditor({ owner, item: { id: '', title: '', note: '', group: domain.name, domainId: domain.id, kind: 'plant', minutes: 0, enabled: true, priority: 'none' } });
  }
  function editHabit(item: Reminder) {
    if (!habitsWritable || habitSaving.current) return;
    setError(''); setHabitEditor({ owner, item: { ...item } });
  }
  function closeHabitEditor() { if (!habitSaving.current && !habitArchive.busy) { setHabitEditor(null); setError(''); } }
  async function saveHabit() {
    const draft = currentHabitEditor;
    if (!draft || habitSaving.current || habitArchive.busy || habitArchive.retrying) return;
    let item: Reminder;
    const isNew = !draft.item.id;
    const capturedOwner = owner;
    const saveTo = (previous: typeof habitTool.value) => {
      const latest = domainSource.current;
      if (ownerRef.current !== capturedOwner || latest.owner !== capturedOwner || !latest.writable || !isReminderState(previous)) throw new Error('账号或习惯已变化，请重新打开');
      if (item.domainId && !latest.state.domains.some(domain => domain.id === item.domainId)) throw new Error('领域已移除，请重新选择');
      return saveHabitEdit(previous, prepareHabitEdit(item, latest.state.domains), latest.state.domains, isNew && !(draft.pendingId && previous.items.some(row => row.id === item.id)));
    };
    try {
      item = prepareHabitEdit(draft.item, sourceState.domains);
      if (isNew) item = { ...item, id: draft.pendingId || `habit-${toolId()}`, createdAt: draft.pendingCreatedAt ?? Date.now() };
      saveTo(habitTool.value);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '请检查习惯内容。'); return; }
    if (isNew) setHabitEditor(previous => previous === draft ? { ...previous, pendingId: item.id, pendingCreatedAt: item.createdAt } : previous);
    habitSaving.current = true; setHabitBusy(true); setError('');
    try {
      await habitTool.setValue(saveTo);
      if (ownerRef.current !== capturedOwner) return;
      if (hasVolatilePersonalTool('reminders', capturedOwner)) throw new Error('尚未保存，请重试');
      setHabitEditor(null);
      if (item.domainId !== domainId) setSelectedHabit(null);
    } catch (reason) { if (ownerRef.current === capturedOwner) setError(reason instanceof Error ? reason.message : '保存失败，请重试'); }
    finally { habitSaving.current = false; setHabitBusy(false); }
  }
  async function deleteHabit() {
    const draft = currentHabitEditor;
    if (!draft?.item.id || habitSaving.current) return;
    const capturedOwner = owner;
    const context = habitDeleteContext.current;
    const isCurrent = () => ownerRef.current === capturedOwner && habitDeleteContext.current === context && habitEditorRef.current === draft;
    habitSaving.current = true; setHabitBusy(true); setError('');
    try {
      const removed = await confirmHabitDelete({ item: draft.item, owner: capturedOwner, isCurrent, setValue: habitTool.setValue, confirmed: true });
      if (!removed) return;
      setHabitEditor(null); setSelectedHabit(null);
    } catch (reason) { if (isCurrent()) setError(reason instanceof Error ? reason.message : '删除失败，请重试'); }
    finally { habitSaving.current = false; setHabitBusy(false); }
  }
  const selectedDomain = state.domains.find(domain => domain.id === domainId);
  function createRecord(domain: Domain) {
    if (!writable || blocked || habitBusy || habitArchive.busy || saving.current) return;
    setEditor(null); setRecordEditor(null); setProgressEditor({ owner, domainId: domain.id });
  }
  const domainHabits = sortHabits(habitState.items.filter(item => item.enabled && item.domainId === domainId));
  const habitEntries: (Reminder | null)[] = [...domainHabits, null];

  return <>
    <PageScroll><View className='tool-page domains-page domain-detail-page'>
      <PageToolbar className='domain-detail-toolbar' leading={<BackButton ariaLabel='返回领域列表' disabled={blocked || habitBusy || habitArchive.busy} onClick={() => void Taro.switchTab({ url: '/pages/domains/index' })} />} manage={writable && selectedDomain && <View className='domain-detail-actions'>
        <ActionButton appearance='icon' size='compact' width='content' ariaLabel={`编辑${selectedDomain.name}领域`} disabled={blocked || habitBusy || habitArchive.busy || selectedDomain.name === '未分类'} onClick={() => definition.openEdit(selectedDomain.id)}><EditSymbol /></ActionButton>
        <ActionButton appearance='icon' size='compact' width='content' intent='danger' ariaLabel={`删除${selectedDomain.name}领域`} disabled={blocked || habitBusy || habitArchive.busy || selectedDomain.name === '未分类'} onClick={() => definition.openDelete(selectedDomain.id)}><DeleteSymbol /></ActionButton>
      </View>} create={writable && selectedDomain && <CreateButton size='compact' width='content' label='创建记录' disabled={blocked || habitBusy || habitArchive.busy} onClick={() => createRecord(selectedDomain)} />} />
      {!ready && <View className='tool-status'>{status}<ActionButton className='tool-secondary button-label' onClick={retry}>重新读取</ActionButton></View>}
      {ready && !valid && <View className='notice'>暂时无法读取这份领域数据，已有内容已保留。<ActionButton className='tool-secondary button-label' onClick={retry}>重新读取</ActionButton></View>}
      {ready && valid && !selectedDomain && <View className='tool-empty'>领域不存在或已删除</View>}
      {ready && valid && <View className='domain-detail-grid'>{state.domains.filter(domain => domain.id === domainId).map(domain => <View className='tool-card domain-card' key={domain.id}>
        <View className='domain-heading'><View className='domain-heading-name'><LibraryIcon name={domainIcon(domain)} className='domain-detail-icon' /><Text className='domain-name'>{trimTextEnd(domain.name)}</Text></View>
          <ActionButton appearance='secondary' size='compact' width='content' className='domain-count' ariaLabel={`查看${domain.name}已完成目标`} onClick={() => open({ type: 'history', owner, domainId: domain.id, content: '' })}><Text className='domain-count-label'>已完成目标</Text></ActionButton>
        </View>
        <View className='domain-goals'>{(['longTerm', 'shortTerm'] as const).map(kind => {
          const goal = displayedDomainGoal(state, domain.id, kind), completed = goal?.status === 'completed';
          const activeGoal = kind === 'longTerm' ? domain.longTermGoal : domain.shortTermGoal;
          return <View key={kind} className={`domain-goal-card${goal ? ' has-goal' : ''}${completed ? ' is-completed' : ''}`}>
            <Button className='domain-goal-toggle' disabled={busy || !writable} aria-pressed={completed} ariaLabel={goal ? `${completed ? '撤销完成' : '完成'}${domain.name}${goalLabel(kind)}` : `设置${domain.name}${goalLabel(kind)}`} onClick={() => void toggleGoal(domain, kind)}>
              <View className='domain-goal-check' aria-hidden>{completed && <View className='domain-goal-mark' />}</View><View className='domain-goal-copy'><Text className='domain-label'>{goalLabel(kind)}{completed ? ' · 已完成' : ''}</Text><Text className='domain-goal-content'>{trimTextEnd(goal?.content || `设置${goalLabel(kind)}`)}</Text></View>
            </Button>
            {activeGoal ? <ActionButton appearance='icon' size='compact' className='domain-goal-edit button-label' disabled={busy || !writable} ariaLabel={`编辑${domain.name}${goalLabel(kind)}`} onClick={() => open({ type: 'goal', owner, domainId: domain.id, kind, originalId: activeGoal.id, content: activeGoal.content })}><EditSymbol /></ActionButton> : <CreateButton iconOnly className='domain-goal-create' label='创建目标' disabled={busy || !writable} ariaLabel={`创建${domain.name}${goalLabel(kind)}`} onClick={() => open({ type: 'goal', owner, domainId: domain.id, kind, originalId: null, content: '' })} />}
          </View>;
        })}</View>
        <View className='domain-habits-heading'><SectionTitle inRow className='domain-label'>每日习惯</SectionTitle></View>
        {!habitTool.ready ? <View className='domain-habit-notice'>正在读取习惯…</View> : !habitsWritable ? <View className='domain-habit-notice'>习惯数据暂不可用<ActionButton appearance='quiet' className='domain-quiet button-label' onClick={habitTool.retry}>重新读取习惯</ActionButton></View> : <ScrollView key={`habits:${owner}:${domainId}`} className={`domain-habit-scroll${habitEntries.length <= 2 ? ' is-single-row' : ''}`} scrollY enhanced bounces={false} showScrollbar={false} ariaLabel='每日习惯'><HabitGrid className='domain-habit-grid'>
          {habitEntries.map(item => {
            if (!item) return <View className='daily-suggestion domain-habit-create-card' key='habit-create-card'><CardCreateButton ariaLabel={`创建${domain.name}习惯`} disabled={!habitsWritable || habitBusy || habitArchive.busy} onClick={() => createHabit(domain)} /></View>;
            const done = !!habitState.done[today]?.includes(item.id);
            return <HabitCard key={item.id} item={item} done={done} progress={habitCompletionStats(habitState, item.id)} disabled={habitBusy} className='domain-habit-card' onCheck={() => void checkHabit(item)} onOpen={() => { setEditor(null); setSelectedHabit({ owner, id: item.id }); }} />;
          })}
        </HabitGrid></ScrollView>}
        <DomainRecordColumns scrollable>{(['negative', 'positive'] as const).map(kind => {
          const records = kind === 'positive' ? domain.positiveRecords : domain.negativeRecords;
          const recent = [...records].reverse().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
          const add = () => createRecord(domain);
          return <DomainRecordColumn key={kind} kind={kind} showHeading={false} scrollable variant='create' disabled={busy} createLabel={`添加${domain.name}${recordLabel(kind)}`} onCreate={add}>
            {recent.map(record => <DomainRecordCard key={record.id} kind={kind} record={record} disabled={busy} onClick={() => { if (writable && !saving.current) setRecordEditor({ owner, domainId: domain.id, kind, record, title: `${domain.name} · 编辑${recordLabel(kind)}` }); }} />)}
          </DomainRecordColumn>;
        })}</DomainRecordColumns>
      </View>)}</View>}
      {ready && valid && !!status && <View className='tool-status domains-status'><Text>{status}</Text><ActionButton appearance='quiet' className='domain-quiet button-label' disabled={busy} onClick={retry}>重试同步</ActionButton></View>}
      {error && !currentEditor && <Text className='domain-error'>{error}</Text>}
    </View></PageScroll>
    <DomainDefinitionEditor controller={definition} />
    {currentEditor && editingDomain && <View className='domains-editor'><Sheet type={currentEditor.type} title={`${editingDomain.name} · ${currentEditor.type === 'goal' ? goalLabel(currentEditor.kind) : '已完成目标'}`} onClose={close}>
      <ScrollView scrollY className='domain-sheet-scroll'><EditorFieldsLayout className='domain-sheet-body'>
        {currentEditor.type === 'goal' && <>
          <Textarea className='tool-input domain-goal-input' ariaLabel='目标内容' value={currentEditor.content} maxlength={200} fixed focus cursorSpacing={100} onInput={event => updateContent(event.detail.value)} placeholder='写下你的目标' />
          <Text className='domain-input-count'>{currentEditor.content.length} / 200</Text>
        </>}
        {currentEditor.type === 'history' && <>
          
          {state.completedGoals.filter(goal => goal.domainId === editingDomain.id).slice().reverse().map(goal => <View className='domain-history-item' key={goal.id}><View className='domain-history-meta'><Text>{goalLabel(goal.kind)}</Text><Text>{goal.completedAt ? formatDate(goal.completedAt) : ''}</Text></View><Text>{trimTextEnd(goal.content)}</Text></View>)}
          {!completedGoalCount(state, editingDomain.id) && <View className='domain-history-empty'>暂无已完成目标</View>}
        </>}
        {error && <View className='domain-error' role='alert'>{error}</View>}
      </EditorFieldsLayout></ScrollView>
      <SheetActions className='domain-sheet-actions'>
        {currentEditor.type === 'history' && <ActionButton appearance='primary' size='large' width='fill' disabled={busy} onClick={close}>完成</ActionButton>}
        {currentEditor.type === 'goal' && <ActionButton appearance='primary' className='tool-primary button-label' loading={busy} disabled={busy || !currentEditor.content.trim()} onClick={() => void save()}>{currentEditor.originalId ? '保存' : '创建目标'}</ActionButton>}
      </SheetActions>
    </Sheet></View>}
    {goalCloseGuard.dialog}
    {progressEditor?.owner === owner && writable && <DomainQuickRecord defaultDomainId={uncategorizedRoute && !sourceState.domains.some(domain => domain.id === progressEditor.domainId) ? '' : progressEditor.domainId} onClose={() => setProgressEditor(null)} />}
    {recordEditor?.owner === owner && writable && <DomainRecordEditor key={`${owner}:${recordEditor.record.id}`} {...recordEditor} dateLabel={formatDate(recordEditor.record.createdAt)} onClose={() => setRecordEditor(null)} />}
    {currentHabit && !currentHabitEditor && <View className='domains-editor'><View className='domain-overlay'><View className='domain-backdrop' catchMove onClick={closeHabitDetail} /><View className={`domain-sheet domain-sheet-habit-detail ${habitDetailSheetClass(currentHabit)}`} role='dialog' ariaLabel={`习惯：${currentHabit.title}`}>
      <EditorHeading title='习惯详情' className='domain-sheet-heading' actions={<ActionButton appearance='icon' size='compact' className='habit-detail-close' ariaLabel='关闭习惯详情' disabled={calendarEdit.busy || habitBusy || detailEdit.locked} onClick={closeHabitDetail}>×</ActionButton>} />
      <ScrollView scrollY className='domain-sheet-scroll' showScrollbar={false}><View className='domain-sheet-body habit-detail-body'><HabitDetailHeader key={`${owner}:${currentHabit.id}`} item={currentHabit} domains={sourceState.domains} onChange={detailEdit.change} disabled={calendarEdit.busy || habitBusy || detailEdit.locked} /><HabitDetailNote key={`note:${currentHabit.id}`} note={currentHabit.note} /><HabitCalendar key={`${owner}:${currentHabit.id}`} state={habitState} habitId={currentHabit.id} now={Date.now()} layout='detail' onDayToggle={day => { if (!detailEdit.isLocked()) void calendarEdit.toggleDay(day); }} disabled={calendarEdit.busy || habitBusy || detailEdit.locked} error={calendarEdit.error} />{error && <Text className='domain-error'>{error}</Text>}</View></ScrollView>
      {!!detailEdit.error && <View className='habit-detail-save-error' role='alert'>{detailEdit.error}</View>}
      <SheetActions className='domain-sheet-actions' leading={<ActionButton appearance='icon' size='compact' ariaLabel='编辑习惯' disabled={calendarEdit.busy || habitBusy || detailEdit.locked} onClick={() => { if (!detailEdit.isLocked()) editHabit(currentHabit); }}><EditSymbol /></ActionButton>}><ActionButton appearance='primary' size='large' width='fill' className='tool-primary button-label' disabled={habitBusy || calendarEdit.busy || detailEdit.busy} loading={detailEdit.busy} onClick={() => { if (detailEdit.pending) detailEdit.retry(); else if (!detailEdit.isLocked()) void checkHabit(currentHabit); }}>{detailEdit.pending ? '重试保存' : habitState.done[today]?.includes(currentHabit.id) ? '撤销完成' : '已完成'}</ActionButton></SheetActions>
    </View></View></View>}
    {currentHabitEditor && <HabitEditor key={`${owner}:${currentHabitEditor.item.id}`} draft={currentHabitEditor.item} domains={state.domains} pendingSave={hasVolatilePersonalTool('reminders', owner)} saving={habitBusy || habitArchive.busy} message={habitArchive.error || error} archiveLabel={habitArchive.label} archivePending={habitArchive.retrying} onArchive={() => { void habitArchive.toggle(); }} onChange={item => setHabitEditor(previous => previous?.owner === owner ? { ...previous, item } : previous)} onSave={saveHabit} onDelete={() => { void deleteHabit(); }} onClose={closeHabitEditor} />}
  </>;
}
