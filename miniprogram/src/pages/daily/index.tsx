import { trimTextEnd } from '../../lib/text-whitespace';
import { showAppMessage } from '../../lib/app-dialog';
import SectionTitle from '../../components/section-title';
import { CoreScreen } from '../../components/page-sections';
import { useEffect, useMemo, useRef, useState } from 'react';
import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { Image, Input, ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import PageScroll from '../../components/page-scroll';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import useHabitCalendarEdit from '../../lib/use-habit-calendar-edit';
import { cleanState, initialReminders, isReminderState, localDate, toggleReminderDone, type Reminder } from '../../lib/reminder-data';
import { cleanHabitOpenLog, emptyHabitOpenLog, habitOpenKey, recordHabitOpening, type HabitOpenLog } from '../../lib/habit-recommendations';
import HabitIcon from '../../components/habit-icon';
import HabitEditor from '../../components/habit-editor';
import CreateButton from '../../components/create-button';
import SheetActions from '../../components/sheet-actions';
import EditorHeading from '../../components/editor-heading';
import EditorFieldsLayout from '../../components/editor-fields-layout';
import EntityTitleRow, { EntityTitleText } from '../../components/entity-title-field';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import { EditSymbol } from '../../components/manage-symbol';
import SheetBackdrop from '../../components/sheet-backdrop';
import { prepareHabitEdit, saveHabitEdit } from '../../lib/habit-edit';
import { confirmHabitDelete } from '../../lib/habit-delete';
import { habitIconId } from '../../lib/icon-library';
import PageToolbar, { CategoryButton, CategoryRow, PageToolbarSummary, ToolbarResetButton } from '../../components/page-toolbar';
import FilterPopover, { FilterFields, FilterField, FilterOptionGrid, FilterSearch } from '../../components/filter-popover';
import useHabitGridSort from '../../components/habit-grid-sorter';
import SwipePanels from '../../components/swipe-panels';
import { SortDirection, SortOptions, SortPopover } from '../../components/sort-options';
import { orderedHabits, saveHabitOrder, longestUncheckedHabits } from '../../lib/habit-order';
import { chooseHabitReflection, habitCompletionStats, markHabitReflectionShown, saveHabitReflection } from '../../lib/habit-reflections';
import HabitCard from '../../components/habit-card';
import HabitGrid from '../../components/habit-grid';
import HabitListSection, { HabitListHeading } from '../../components/habit-list-section';
import HabitCalendar, { HabitDetailNote, HabitDetailHeader, habitDetailSheetClass } from '../../components/habit-calendar';
import { takeHomeCreation, type HomeCreationRequest } from '../../lib/home-creation-navigation';
import { initialDomainState, isDomainState } from '../../lib/domain-data';
import { alignHabitDomain, habitTone } from '../../lib/habit-domains';
import { currentHabitTimePeriod, habitPriorities, habitPriorityLabels, habitSortFields, habitSortLabels, habitTimePeriod, habitTimePeriods, habitTimePeriodLabels, type HabitPriority, type HabitSort, type HabitTimePeriod } from '../../lib/habit-metadata';
import useHabitArchive from '../../lib/use-habit-archive';
import useHabitDetailEdit from '../../lib/use-habit-detail-edit';
import './index.css';
import './core.css';

const freshReminder = (): Reminder => ({ id: '', title: '', note: '', group: '心理', kind: 'plant', minutes: 0, enabled: true, priority: 'none' });
const makeId = () => `habit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const habitStatuses = [{ id: 'pending', label: '进行中' }, { id: 'completed', label: '已完成' }, { id: 'archived', label: '已归档' }, { id: 'all', label: '全部' }] as const;
type HabitStatus = typeof habitStatuses[number]['id'];
const timedHabitPeriods = ['morning', 'noon', 'afternoon', 'night'] as const;
type TimedHabitPeriod = typeof timedHabitPeriods[number];

export default function Daily() {
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState('reminders', initialReminders);
  const domainTool = usePersonalToolState('domains', initialDomainState);
  const domains = domainTool.ready && domainTool.owner === owner && isDomainState(domainTool.value) ? domainTool.value.domains : [];
  const groups = [...new Set([...domains.map(domain => domain.name), '未分类'])];
  const categories = ['全部', ...groups];
  const valid = isReminderState(value);
  const state = useMemo(() => {
    const cleaned = cleanState(value);
    if (!domainTool.ready || domainTool.owner !== owner || !isDomainState(domainTool.value)) return cleaned;
    const domainState = domainTool.value;
    return { ...cleaned, items: cleaned.items.map(item => alignHabitDomain(item, domainState.domains)) };
  }, [value, domainTool.ready, domainTool.owner, domainTool.value, owner]);
  const [now, setNow] = useState(Date.now());
  const today = localDate(new Date(now));
  const [visible, setVisible] = useState(true);
  const [habitStatus, setHabitStatus] = useState<HabitStatus>('pending');
  const [search, setSearch] = useState('');
  const [periodFilters, setPeriodFilters] = useState<HabitTimePeriod[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<HabitPriority[]>([]);
  const [activePeriod, setActivePeriod] = useState<TimedHabitPeriod>(() => currentHabitTimePeriod());
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<Reminder | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [coreGroup, setCoreGroup] = useState('全部');
  const [showSort, setShowSort] = useState(false);
  const [sortChoice, setSortChoice] = useState<HabitSort>({ field: 'priority', direction: 'desc' });
  const sortInitialChoice: HabitSort = state.sort && state.sort.field !== 'custom' ? state.sort : { field: 'priority', direction: 'desc' };
  const sortPending = useRef<{ owner: string; ids?: string[]; choice?: HabitSort } | null>(null);
  const [sortSaving, setSortSaving] = useState(false);
  const [sortError, setSortError] = useState('');
  const sortSavingRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const [reflection, setReflection] = useState<{ item: Reminder; day: string; quote: string } | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionError, setReflectionError] = useState('');
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [openings, setOpenings] = useState<{ owner: string; log: HabitOpenLog }>({ owner: '', log: emptyHabitOpenLog() });
  const openingRef = useRef(openings); openingRef.current = openings;
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const stateRef = useRef(state); stateRef.current = state;
  const savingRef = useRef(false);
  const editorRef = useRef(editor); editorRef.current = editor;
  const deleteContext = useRef(0), deleting = useRef<object | null>(null);
  const checkingRef = useRef(false);
  const reflectionSavingRef = useRef(false);
  const [homeCreation, setHomeCreation] = useState<HomeCreationRequest | null>(null);
  useDidShow(() => { const currentTime = Date.now(); setNow(currentTime); setActivePeriod(currentHabitTimePeriod(currentTime)); setVisible(true); setHomeCreation(takeHomeCreation('habit')); });
  useDidHide(() => { ++deleteContext.current; setVisible(false); setShowSort(false); setShowFilters(false); setHomeCreation(null); });
  useEffect(() => { if (!visible) return; const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, [visible]);
  useEffect(() => {
    ++deleteContext.current; deleting.current = null;
    setEditor(null); setSelected(null); setMessage(''); setSaving(false); savingRef.current = false;
    setReflection(null); setReflectionText(''); setReflectionError(''); setReflectionSaving(false); reflectionSavingRef.current = false;
    setChecking(false); checkingRef.current = false;
    setCoreGroup('全部'); setHabitStatus('pending'); setActivePeriod(currentHabitTimePeriod()); setSearch(''); setPeriodFilters([]); setPriorityFilters([]); setShowFilters(false); setShowSort(false); setSortChoice({ field: 'priority', direction: 'desc' }); sortPending.current = null; setSortSaving(false); sortSavingRef.current = false; setSortError('');
    let log = emptyHabitOpenLog();
    if (owner) { try { log = cleanHabitOpenLog(Taro.getStorageSync(habitOpenKey(owner)), stateRef.current.items.map(item => item.id)); } catch { /* Opening history is optional; check-ins remain available. */ } }
    setOpenings({ owner, log });
  }, [owner]);

  const enabled = state.items.filter(item => item.enabled);
  const todayDone = state.done[today] ?? [];
  const completedItems = state.items.filter(item => todayDone.includes(item.id));
  const completed = completedItems.length;
  const recentId = todayDone.filter(id => completedItems.some(item => item.id === id)).reduce<string | undefined>((latest, id) => !latest || (state.checkInTimes?.[today]?.[id] ?? 0) >= (state.checkInTimes?.[today]?.[latest] ?? 0) ? id : latest, undefined);
  const recentCompletion = completedItems.find(item => item.id === recentId);
  const statusIndex = habitStatuses.findIndex(status => status.id === habitStatus);
  function itemsForStatus(status: HabitStatus) {
    return orderedHabits(state, now).filter(item => {
      if (coreGroup !== '全部' && item.group !== coreGroup) return false;
      if (search.trim() && !`${item.title} ${item.note} ${item.group}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) return false;
      if (periodFilters.length && !periodFilters.includes(habitTimePeriod(item))) return false;
      if (priorityFilters.length && !priorityFilters.includes(item.priority || 'none')) return false;
      if (status === 'all') return true;
      if (status === 'archived') return !item.enabled;
      if (!item.enabled) return false;
      return status === 'completed' ? todayDone.includes(item.id) : !todayDone.includes(item.id);
    });
  }
  const grouped = coreGroup === '全部';
  const orderedItems = itemsForStatus(habitStatus);
  const sortableItems = grouped ? [...orderedItems.filter(item => habitTimePeriod(item) === 'free'), ...orderedItems.filter(item => habitTimePeriod(item) === activePeriod)] : orderedItems;
  const neglected = useMemo(() => longestUncheckedHabits(state, now), [state, now]);
  const sorter = useHabitGridSort(sortableItems.map(item => item.id), ready && valid && !!owner && !sortSaving && visible && !showSort && !showFilters && !editor && !selected && !reflection && !checking, ids => { void persistSort({ owner, ids }); }, `${owner}:${today}:${coreGroup}:${habitStatus}:${search}:${periodFilters.join(",")}:${priorityFilters.join(",")}:${groups.join('\n')}:${activePeriod}:${orderedItems.map(item => `${item.id}:${habitTimePeriod(item)}`).join(',')}`, direction => { if (!checkingRef.current && !sortSavingRef.current) setHabitStatus(previous => habitStatuses[habitStatuses.findIndex(status => status.id === previous) + direction]?.id ?? previous); }, direction => !!habitStatuses[statusIndex + direction] && !checkingRef.current && !sortSavingRef.current, grouped ? id => habitTimePeriod(state.items.find(item => item.id === id) ?? {}) : undefined, grouped ? id => habitTimePeriod(state.items.find(item => item.id === id) ?? {}) === 'free' ? 'daily-habit-free-scroll' : 'daily-habit-period-scroll' : undefined);
  const previewStatus = sorter.swipeOffset ? habitStatuses[statusIndex + (sorter.swipeOffset < 0 ? 1 : -1)]?.id : undefined;
  const current = state.items.find(item => item.id === selected);
  const habitArchive = useHabitArchive({ state, id: editor?.id || '', owner, writable: ready && valid && !!editor && !saving && !checking, setValue, onSaved: enabled => { setEditor(previous => previous && previous.id === editor?.id ? { ...previous, enabled } : previous); if (enabled) viewStatus('pending'); } });
  const calendarEdit = useHabitCalendarEdit({ state, habitId: current?.id || '', owner, writable: ready && valid && !saving && !checking && !reflection, setValue });
  const detailEdit = useHabitDetailEdit({ state: value, habitId: current?.id || '', owner, domains,
    writable: ready && valid && domainTool.ready && domainTool.owner === owner && isDomainState(domainTool.value) && visible && !saving && !checking && !reflection && !editor && !calendarEdit.busy, setValue });
  function closeHabitDetail() { if (!checkingRef.current && !savingRef.current && !calendarEdit.busy && !detailEdit.isLocked()) setSelected(null); }
  async function update(transform: (previous: typeof initialReminders) => typeof initialReminders, onError?: (reason: string) => void) {
    if (!ready || !valid) return false;
    try { await setValue(previous => { if (!isReminderState(previous)) throw new Error('习惯数据格式暂不兼容'); return transform(previous); }); return true; }
    catch (error) { if (ownerRef.current === owner) { setMessage('暂时未能保存，请重试。'); onError?.(error instanceof Error ? error.message : '暂时未能保存，请重试。'); } return false; }
  }
  async function checkIn(item: Reminder, day = today) {
    if (!ready || !valid || !item.enabled || checkingRef.current || reflection) return;
    checkingRef.current = true; setChecking(true);
    let wasDone = false, quote = '';
    const saved = await update(previous => {
      if (!previous.items.some(row => row.id === item.id && row.enabled)) throw new Error('这个习惯已归档或移除');
      wasDone = !!previous.done[day]?.includes(item.id);
      let next = toggleReminderDone(previous, item.id, day);
      if (!wasDone && !next.done[day]?.includes(item.id)) throw new Error('这次打卡未能保存');
      if (!wasDone && next.done[day]?.includes(item.id)) {
        const memory = chooseHabitReflection(next);
        if (memory) { quote = memory.text; next = markHabitReflectionShown(next, memory.id, Date.now()); }
      }
      return next;
    });
    if (ownerRef.current !== owner) return;
    setChecking(false);
    if (!saved) { checkingRef.current = false; void showAppMessage({ title: '未能保存，请重试', icon: 'none' }); return; }
    setMessage('');
    if (wasDone) { checkingRef.current = false; return; }
    setSelected(null); setReflectionText(''); setReflectionError(''); setReflection({ item, day, quote });
    void Taro.vibrateShort({ type: 'light' }).catch(() => {});
  }
  function dismissReflection() { if (!reflectionSavingRef.current) { checkingRef.current = false; setReflection(null); setReflectionText(''); setReflectionError(''); } }
  async function finishReflection() {
    if (!reflection || reflectionSavingRef.current) return;
    if (!reflectionText.trim()) { dismissReflection(); return; }
    reflectionSavingRef.current = true; setReflectionSaving(true); setReflectionError('');
    let reason = '';
    const saved = await update(previous => saveHabitReflection(previous, { habitId: reflection.item.id, day: reflection.day, text: reflectionText, now: Date.now() }), error => { reason = error; });
    if (ownerRef.current !== owner) return;
    reflectionSavingRef.current = false; setReflectionSaving(false);
    if (!saved || hasVolatilePersonalTool('reminders', owner)) { setReflectionError(reason || '这句话还没保存，重试一下。'); return; }
    dismissReflection();
  }
  const reflectionCloseGuard = useEditorCloseGuard({ scope: reflection ? `${owner}:${reflection.item.id}:${reflection.day}` : '', hasChanges: !!reflectionText.trim(), blocked: reflectionSaving, onSave: finishReflection, onClose: dismissReflection });
  useEffect(() => {
    if (!reflection || typeof document === 'undefined') return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); reflectionCloseGuard.requestClose(); } };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [reflection, reflectionCloseGuard.requestClose]);
  async function persistSort(operation: NonNullable<typeof sortPending.current>) {
    if (!ready || !valid || !owner || operation.owner !== owner || sortSavingRef.current) return;
    sortPending.current = operation;
    sortSavingRef.current = true; setSortSaving(true); setSortError('');
    try {
      await setValue(previous => {
        if (ownerRef.current !== operation.owner || !isReminderState(previous)) throw new Error('账号或习惯数据已变化');
        return operation.ids ? saveHabitOrder(previous, operation.ids) : { ...previous, sort: operation.choice! };
      });
      if (ownerRef.current !== operation.owner) return;
      if (hasVolatilePersonalTool('reminders', operation.owner)) throw new Error('顺序尚未保存，请重试');
      sortPending.current = null; setShowSort(false);
    } catch (error) {
      if (ownerRef.current === operation.owner) setSortError(error instanceof Error ? error.message : '顺序未能保存，请重试');
    } finally {
      if (ownerRef.current === operation.owner) { sortSavingRef.current = false; setSortSaving(false); }
    }
  }
  function openHabit(item: Reminder) {
    if (!ready || !valid || !owner) return;
    setSelected(item.id); setMessage('');
    const previous = openingRef.current.owner === owner ? openingRef.current.log : emptyHabitOpenLog();
    const next = recordHabitOpening(cleanHabitOpenLog(previous, state.items.map(row => row.id)), item.id, Date.now());
    const scoped = { owner, log: next }; openingRef.current = scoped; setOpenings(scoped);
    try { Taro.setStorageSync(habitOpenKey(owner), next); } catch { setMessage('打开时间暂未保存，仍可正常打卡。'); }
  }
  function openEditor(item = { ...freshReminder(), group: coreGroup === '全部' ? (domains.find(domain => domain.id === 'mind')?.name || groups[0]) : coreGroup }) { setSelected(null); setEditor({ ...item }); setMessage(''); }
  useEffect(() => {
    if (!homeCreation || !ready || !domainTool.ready) return;
    setHomeCreation(null);
    if (homeCreation.owner && homeCreation.owner !== owner) { setMessage('账号已变化，请重新创建。'); return; }
    if (valid && owner && isDomainState(domainTool.value) && owner === domainTool.owner && (!homeCreation.owner || homeCreation.owner === owner)) openEditor();
  }, [homeCreation, ready, valid, owner, domainTool.ready, domainTool.owner, domainTool.value]);
  async function save() {
    if (!editor || !ready || savingRef.current || habitArchive.busy || habitArchive.retrying) return;
    if (!domainTool.ready || domainTool.owner !== owner || !isDomainState(domainTool.value)) { setMessage('领域数据尚未就绪，请重新读取后保存。'); return; }
    let item: Reminder;
    try {
      item = prepareHabitEdit({ ...editor, id: editor.id || makeId(), createdAt: editor.id ? editor.createdAt : Date.now() }, domains);
      saveHabitEdit(value, item, domains, !editor.id);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '请检查习惯内容。'); return; }
    savingRef.current = true; setSaving(true);
    const saved = await update(previous => {
      if (ownerRef.current !== owner) throw new Error('账号或习惯已变化，请重新打开');
      return saveHabitEdit(previous, item, domains, !editor.id);
    }, setMessage);
    if (ownerRef.current !== owner) return;
    savingRef.current = false; setSaving(false);
    if (!saved) return;
    if (hasVolatilePersonalTool('reminders', owner)) { setEditor(item); setMessage('尚未保存，请重试'); return; }
    setEditor(null); setMessage('');
  }
  async function remove(item: Reminder) {
    if (!ready || !valid || savingRef.current) return;
    const draft = editorRef.current, fromEditor = draft?.id === item.id;
    const context = deleteContext.current, operation = {};
    const isCurrent = () => ownerRef.current === owner && deleteContext.current === context && (!fromEditor || editorRef.current === draft);
    deleting.current = operation;
    savingRef.current = true; setSaving(true); setMessage('');
    try {
      const removed = await confirmHabitDelete({ item, owner, isCurrent, setValue, confirmed: true });
      if (!removed) return;
      const log = cleanHabitOpenLog(openingRef.current.log, stateRef.current.items.filter(row => row.id !== item.id).map(row => row.id));
      setOpenings({ owner, log }); try { Taro.setStorageSync(habitOpenKey(owner), log); } catch { /* Removed IDs are ignored when loading. */ }
      if (fromEditor) setEditor(null);
      if (selected === item.id) setSelected(null);
    } catch (reason) { if (isCurrent()) setMessage(reason instanceof Error ? reason.message : '删除失败，请重试。'); }
    finally { if (deleting.current === operation) { deleting.current = null; savingRef.current = false; setSaving(false); } }
  }
  function viewStatus(status: HabitStatus) { setHabitStatus(status); setShowFilters(false); setShowSort(false); }
  function resetFilters() { setSearch(''); setPeriodFilters([]); setPriorityFilters([]); setCoreGroup('全部'); setHabitStatus('pending'); }
  function restoreDefaults() {
    if (!ready || !valid || !owner || sortSavingRef.current || sortPending.current || sorter.active || saving || checking || editor || selected || reflection) return;
    resetFilters(); setActivePeriod(currentHabitTimePeriod()); setShowSort(false); setShowFilters(false);
    const choice: HabitSort = { field: 'priority', direction: 'desc' }; setSortChoice(choice);
    if (state.sort && (state.sort.field !== choice.field || state.sort.direction !== choice.direction)) void persistSort({ owner, choice });
  }
  function suggestionCards(items: Reminder[], sortable = false, preview = false) {
    return <HabitGrid className='daily-suggestion-grid'>{items.map(item => {
      const stats = habitCompletionStats(state, item.id, now);
      const done = todayDone.includes(item.id);
      return <HabitCard key={item.id} item={item} done={done} progress={stats} disabled={preview || checking || sortSaving || !item.enabled} viewProps={sortable ? sorter.bind(item.id) : undefined} className={sortable ? sorter.className(item.id) : ''} onCheck={() => { if (!preview && !sorter.suppressClick() && !sortSavingRef.current) void checkIn(item, today); }} onOpen={() => { if (!preview && !sorter.suppressClick() && !sortSavingRef.current) openHabit(item); }} />;
    })}</HabitGrid>;
  }
  function statusContent(status: HabitStatus, sortable = false) {
    const items = itemsForStatus(status);
    if (grouped) {
      const free = items.filter(item => habitTimePeriod(item) === 'free');
      const timed = items.filter(item => habitTimePeriod(item) === activePeriod);
      return <View className='daily-time-period-layout'>
        <HabitListSection className='daily-time-period-section' timePeriod='free' contentClassName='daily-habit-content' scrollKey={`${owner}:${status}`} edgeFade={free.length > 0} heading={<SectionTitle size='compact' inRow>自由</SectionTitle>}
          scrollProps={{ id: sortable ? 'daily-habit-free-scroll' : undefined, className: 'daily-time-period-scroll', scrollY: sortable, scrollTop: sortable ? sorter.scrollTopFor('daily-habit-free-scroll') : undefined, onScroll: sortable ? event => sorter.onScrollFor('daily-habit-free-scroll', event) : undefined }}>
          {free.length ? suggestionCards(free, sortable, !sortable) : <View className='daily-time-period-empty'>暂无自由习惯</View>}
        </HabitListSection>
        <HabitListSection className='daily-time-period-section' timePeriod={activePeriod} contentClassName='daily-habit-content' scrollKey={`${owner}:${status}:${activePeriod}`} edgeFade={timed.length > 0} heading={<CategoryRow size='compact' className='daily-time-period-categories' contentClassName='daily-time-period-category-row' ariaLabel='习惯时段分类'>
          {timedHabitPeriods.map(period => <CategoryButton key={period} size='compact' width='fill' selected={activePeriod === period} ariaLabel={`习惯时段分类：${period === 'night' ? '晚上' : habitTimePeriodLabels[period]}`} disabled={!sortable || checking || sortSaving || sorter.active} onTouchStart={event => event.stopPropagation()} onClick={() => { if (!sorter.suppressClick() && !sortSavingRef.current && !checkingRef.current) setActivePeriod(period); }}>{period === 'night' ? '晚上' : habitTimePeriodLabels[period]}</CategoryButton>)}
        </CategoryRow>}
          scrollProps={{ id: sortable ? 'daily-habit-period-scroll' : undefined, className: 'daily-time-period-scroll', scrollY: sortable, scrollTop: sortable ? sorter.scrollTopFor('daily-habit-period-scroll') : undefined, onScroll: sortable ? event => sorter.onScrollFor('daily-habit-period-scroll', event) : undefined }}>
          {timed.length ? suggestionCards(timed, sortable, !sortable) : <View className='daily-time-period-empty'>暂无该时段习惯</View>}
        </HabitListSection>
      </View>;
    }
    if (!items.length) return <View className='daily-core-empty'><HabitIcon name='plant' /><View>{status === 'archived' ? '暂无已归档习惯' : status === 'completed' ? '今天还没有完成习惯' : status === 'pending' && enabled.length ? '暂无进行中的习惯' : '暂无习惯'}</View><CreateButton className='tool-secondary' label='创建习惯' disabled={!sortable} onClick={() => openEditor()} /></View>;
    return <View className='daily-habit-content'>{suggestionCards(items, sortable, !sortable)}</View>;
  }
  function statusViewport(status: HabitStatus, sortable = false) {
    if (grouped) return <View className='daily-habit-scroll' {...(sortable ? sorter.swipeHandlers : {})}>{statusContent(status, sortable)}</View>;
    return <ScrollView key={`${owner}-${coreGroup}-${status}`} id={sortable ? 'daily-habit-scroll' : undefined} className='daily-habit-scroll' scrollY={sortable} enhanced bounces={false} showScrollbar scrollTop={sortable ? sorter.scrollTop : undefined} scrollWithAnimation={false} onScroll={sortable ? sorter.onScroll : undefined} {...(sortable ? sorter.swipeHandlers : {})}>{statusContent(status, sortable)}</ScrollView>;
  }

  return <><PageScroll snapSections={[]}><View className='tool-page daily-page core-page'><CoreScreen className='daily-core'>
    <PageToolbar className='daily-page-toolbar'
      leading={ready && valid && <PageToolbarSummary countLabel={`今日完成 ${completed}`} recentTitle={recentCompletion?.title} />}
      reset={<ToolbarResetButton ariaLabel='恢复习惯默认方式' disabled={!ready || !valid || !owner || sortSaving || !!sortPending.current || sorter.active || saving || checking || !!editor || !!selected || !!reflection} onReset={restoreDefaults} />}
      sort={<SortPopover ariaLabel='排序习惯' open={showSort} onOpenChange={open => { if (sortSavingRef.current) return; if (open) { setShowFilters(false); setSortChoice(sortInitialChoice); } setShowSort(open); }} disabled={!ready || !valid || sorter.active} selected={ready && valid && !!owner && !!state.sort && state.sort.field !== 'custom' && (state.sort.field !== 'priority' || state.sort.direction !== 'desc')} panelClassName='daily-sort-popover' contentKey={`${sortChoice.field}:${sortError}`} saving={sortSaving} hasChanges={!!sortPending.current && sortPending.current.owner === owner || JSON.stringify(sortChoice) !== JSON.stringify(sortInitialChoice)} onConfirm={() => persistSort({ owner, choice: sortChoice })}>
        <SortOptions options={habitSortFields.filter(field => field !== 'custom').map(field => ({ value: field, label: habitSortLabels[field] }))} value={sortChoice.field} disabled={sortSaving} onChange={field => setSortChoice({ field, direction: field === 'averageTime' ? 'asc' : 'desc' })} />
        <View className='daily-sort-direction'><SortDirection value={sortChoice.direction} disabled={sortSaving} onChange={direction => setSortChoice(previous => ({ ...previous, direction }))} /></View>
        {sortError && <Text className='daily-sort-error'>{sortError}</Text>}
      </SortPopover>}
      filter={<FilterPopover ariaLabel='筛选习惯' title='筛选习惯' open={showFilters} onOpenChange={open => { if (open) setShowSort(false); setShowFilters(open); }} disabled={!ready || !valid || sortSaving || sorter.active} triggerSelected={habitStatus !== 'pending' || coreGroup !== '全部' || !!search.trim() || !!periodFilters.length || !!priorityFilters.length} panelClassName='habit-filter-popover' contentKey={`${search}:${habitStatus}:${coreGroup}:${periodFilters.join(',')}:${priorityFilters.join(',')}`}
        closeLabel='关闭习惯筛选' onClose={() => setShowFilters(false)} resetLabel='重置习惯筛选' applyLabel={`筛选 ${orderedItems.length} 个习惯`} onReset={resetFilters}>
        <FilterFields>
          <FilterField label='关键词'><FilterSearch ariaLabel='搜索习惯' placeholder='搜索名称、备注或领域' value={search} onInput={event => setSearch(event.detail.value)} clearLabel='清空习惯搜索' onClear={() => setSearch('')} onConfirm={() => setShowFilters(false)} /></FilterField>
          <FilterField label='完成状态'><FilterOptionGrid>{habitStatuses.map(status => <ChoiceButton key={status.id} selected={habitStatus === status.id} ariaLabel={`习惯完成状态：${status.label}`} onClick={() => setHabitStatus(status.id)}>{status.label}</ChoiceButton>)}</FilterOptionGrid></FilterField>
          <FilterField label='领域'><FilterOptionGrid>{categories.map(name => <ChoiceButton key={name} selected={coreGroup === name} ariaLabel={`习惯筛选领域：${name}`} onClick={() => setCoreGroup(name)}>{name}</ChoiceButton>)}</FilterOptionGrid></FilterField>
          <FilterField label='时段'><FilterOptionGrid><ChoiceButton selected={!periodFilters.length} ariaLabel='习惯时段筛选：全部' onClick={() => setPeriodFilters([])}>全部</ChoiceButton>{habitTimePeriods.map(period => <ChoiceButton key={period} selected={periodFilters.includes(period)} ariaLabel={`习惯时段筛选：${habitTimePeriodLabels[period]}`} onClick={() => setPeriodFilters(previous => previous.includes(period) ? previous.filter(value => value !== period) : [...previous, period])}>{habitTimePeriodLabels[period]}</ChoiceButton>)}</FilterOptionGrid></FilterField>
          <FilterField label='优先度'><FilterOptionGrid><ChoiceButton selected={!priorityFilters.length} ariaLabel='习惯优先度筛选：全部' onClick={() => setPriorityFilters([])}>全部</ChoiceButton>{habitPriorities.map(priority => <ChoiceButton key={priority} selected={priorityFilters.includes(priority)} ariaLabel={`习惯优先度筛选：${habitPriorityLabels[priority]}`} onClick={() => setPriorityFilters(previous => previous.includes(priority) ? previous.filter(value => value !== priority) : [...previous, priority])}>{habitPriorityLabels[priority]}优先度</ChoiceButton>)}</FilterOptionGrid></FilterField>
        </FilterFields>
      </FilterPopover>}
      create={<CreateButton className='daily-create' label='创建习惯' disabled={!ready || !valid || sortSaving || sorter.active} onClick={() => openEditor()} />}
    />
    {!ready ? <View className='tool-empty'><Text>{status || '正在读取习惯…'}</Text><ActionButton className='button-label tool-secondary' onClick={retry}>重新读取</ActionButton></View> : !valid ? <View className='tool-empty'><Text>当前习惯数据格式暂不兼容，请到网页查看。原始数据已保留。</Text><ActionButton className='button-label tool-secondary' onClick={retry}>重新读取</ActionButton></View> : <View className='daily-habit-sections'>
      <CategoryRow className='daily-core-filter-scroll' contentClassName='daily-core-filters' ariaLabel='习惯领域分类' fixedLeading={<CategoryButton id='daily-category-0' className={`daily-core-filter${coreGroup === '全部' ? ' is-active' : ''}`} selected={coreGroup === '全部'} disabled={sortSaving || sorter.active} onClick={() => setCoreGroup('全部')}>全部</CategoryButton>} scrollIntoView={`daily-category-${categories.indexOf(coreGroup)}`} selectionOffset={1.5} contentKey={`${owner}:${categories.join('\n')}`} scrollWithAnimation>{categories.slice(1).map((name, index) => <CategoryButton id={`daily-category-${index + 1}`} className={`button-label daily-core-filter${coreGroup === name ? ' is-active' : ''}`} key={name} selected={coreGroup === name} aria-pressed={coreGroup === name} disabled={sortSaving || sorter.active} onClick={() => setCoreGroup(name)}>{name}</CategoryButton>)}</CategoryRow>
      {sortError && !showSort && <View className='daily-sort-retry'><Text className='daily-sort-error'>{sortError}</Text><ActionButton compact disabled={sortSaving} onClick={() => { if (sortPending.current) void persistSort(sortPending.current); }}>重试</ActionButton></View>}
      <View className='daily-habit-pages'><SwipePanels offset={sorter.swipeOffset} direction={sorter.swipeOffset < 0 ? 'next' : 'previous'} adjacent={previewStatus && <View className='daily-habit-preview'>{statusViewport(previewStatus)}</View>}>{statusViewport(habitStatus, true)}</SwipePanels></View>
      <View className='daily-neglected'>
        <HabitListHeading className='daily-reminder-heading'><SectionTitle size='compact' inRow>提醒</SectionTitle></HabitListHeading>
        {neglected.length ? suggestionCards(neglected) : <View className='daily-neglected-empty'>暂无提醒</View>}
      </View>
    </View>}
  {message && /未|失败|不可|暂|无法|变化|请/.test(message) && <View className='daily-message'>{message}</View>}
    {ready && !!status && <View className='tool-status'><Text>{status}</Text><ActionButton className='button-label' onClick={retry}>重新同步</ActionButton></View>}
  </CoreScreen></View></PageScroll>
    {current && valid && !editor && <View className='daily-editor-overlay'><SheetBackdrop disabled={checking || saving || calendarEdit.busy || detailEdit.locked} onClose={closeHabitDetail} /><View className={`daily-detail-sheet ${habitDetailSheetClass(current)} ${habitTone(current)}`}>
      <EditorHeading title='习惯详情' className='daily-detail-heading' actions={<ActionButton appearance='icon' size='compact' className='habit-detail-close' ariaLabel='关闭习惯详情' disabled={checking || saving || calendarEdit.busy || detailEdit.locked} onClick={closeHabitDetail}>×</ActionButton>} />
      <ScrollView scrollY className='daily-detail-scroll' enhanced bounces={false} showScrollbar={false}><View className='daily-detail-body habit-detail-body'><HabitDetailHeader key={`${owner}:${current.id}`} item={current} domains={domains} onChange={detailEdit.change} disabled={checking || saving || calendarEdit.busy || detailEdit.locked} /><HabitDetailNote key={`note:${current.id}`} note={current.note} /><HabitCalendar key={`${owner}:${current.id}`} state={state} habitId={current.id} now={now} layout='detail' onDayToggle={day => { if (!detailEdit.isLocked()) void calendarEdit.toggleDay(day); }} disabled={calendarEdit.busy || checking || saving || detailEdit.locked} error={calendarEdit.error} />{message && <View className='daily-message'>{message}</View>}</View></ScrollView>
      {!!detailEdit.error && <View className='habit-detail-save-error' role='alert'>{detailEdit.error}</View>}
      <SheetActions className='daily-detail-actions' leading={<ActionButton appearance='icon' size='compact' ariaLabel='编辑习惯' disabled={checking || saving || calendarEdit.busy || detailEdit.locked} onClick={() => { if (!detailEdit.isLocked()) openEditor(current); }}><EditSymbol /></ActionButton>}><ActionButton appearance='primary' size='large' width='fill' className='button-label daily-check-primary' disabled={detailEdit.busy || checking || saving || calendarEdit.busy || (!detailEdit.pending && !current.enabled)} loading={detailEdit.busy} onClick={() => { if (detailEdit.pending) detailEdit.retry(); else if (!detailEdit.isLocked()) void checkIn(current, today); }}>{detailEdit.pending ? '重试保存' : !current.enabled ? '已归档' : todayDone.includes(current.id) ? '撤销完成' : '已完成'}</ActionButton></SheetActions>
    </View></View>}
    {editor && ready && valid && <HabitEditor key={`${owner}:${editor.id}`} draft={editor} domains={domains} pendingSave={hasVolatilePersonalTool('reminders', owner)} saving={saving || habitArchive.busy} message={habitArchive.error || message} archiveLabel={habitArchive.label} archivePending={habitArchive.retrying} onArchive={() => { void habitArchive.toggle(); }} onChange={setEditor} onSave={save} onDelete={() => { void remove(editor); }} onClose={() => { if (!savingRef.current && !habitArchive.busy) setEditor(null); }} />}
    {reflection && valid && <View className='daily-editor-overlay daily-reflection-overlay'><SheetBackdrop disabled={reflectionSaving} onClose={reflectionCloseGuard.requestClose} /><View className={`daily-reflection-sheet ${habitTone(reflection.item)}`}>
      <EditorHeading title='打卡留言' actions={<ActionButton appearance='icon' ariaLabel='关闭打卡留言' disabled={reflectionSaving} onClick={reflectionCloseGuard.requestClose}>×</ActionButton>} />
      <ScrollView scrollY className='daily-reflection-scroll'><EditorFieldsLayout className='daily-reflection-body'>
        <EntityTitleRow className='daily-reflection-habit'><View className='daily-reflection-icon'><HabitIcon name={habitIconId(reflection.item)} /></View><EntityTitleText className='daily-reflection-title'>{trimTextEnd(reflection.item.title)}</EntityTitleText><View className='daily-reflection-success'><View className='daily-small-check' /><Text>已完成</Text></View></EntityTitleRow>
        {!!reflection.quote && <View className='daily-reflection-memory'><Text className='daily-reflection-memory-label'>之前的你说</Text><Text className='daily-reflection-quote'>{reflection.quote}</Text></View>}
        <Input className='daily-reflection-input' ariaLabel='打卡的一句话' cursorSpacing={100} adjustPosition maxlength={120} value={reflectionText} placeholder='留一句话，给下次的自己（可选）' onInput={event => setReflectionText(event.detail.value)} onConfirm={() => { void finishReflection(); }} />
        {!!reflectionError && <Text className='daily-reflection-error'>{reflectionError}</Text>}
      </EditorFieldsLayout></ScrollView>
      <SheetActions className='daily-reflection-actions'><ActionButton appearance='primary' className='button-label daily-reflection-done' loading={reflectionSaving} disabled={reflectionSaving} onClick={() => { void finishReflection(); }}>完成</ActionButton></SheetActions>
    </View></View>}
    {reflectionCloseGuard.dialog}
  </>;
}
