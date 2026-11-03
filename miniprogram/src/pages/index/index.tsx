import CardGroupContent from '../../components/card-group-content';
import AccountWindow from '../../components/account-window';
import { takeAccountRequest } from '../../lib/account-navigation';
import { showAppMessage } from '../../lib/app-dialog';
import SectionTitle from '../../components/section-title';
import { CoreScreen, MoreSection } from '../../components/page-sections';
import { useEffect, useRef, useState } from 'react';
import Taro, { useDidHide, useDidShow, useShareAppMessage } from '@tarojs/taro';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import PageScroll from '../../components/page-scroll';
import HomeFeatureList from '../../components/home-feature-list';
import PageToolbar from '../../components/page-toolbar';
import ManageSymbol from '../../components/manage-symbol';
import SortSymbol from '../../components/sort-symbol';
import HomeShortcutCard, { HomeShortcutCreateCard } from '../../components/home-shortcut-card';
import MottoBanner from '../../components/motto-banner';
import { openPomodoro } from '../../lib/pomodoro-navigation';
import { openHomeCreation } from '../../lib/home-creation-navigation';
import useHomeFeatureOrder from '../../lib/use-home-feature-order';
import HomeShortcutEditor from '../../components/home-shortcut-editor';
import { defaultHomeShortcuts, homeShortcutsStorageKey, moveHomeShortcutBy, normalizeHomeShortcuts, shortcutCatalog, type HomeShortcuts, type ShortcutKey } from '../../lib/home-shortcuts';
import { homeFeatureGroups, type HomeFeatureKey } from '../../lib/home-features';
import { defaultShortcutIcon } from '../../lib/shortcut-icons';
import { api, type Session } from '../../api';
import { getPomodoroReminderConfig, preparePomodoroLaunch, type PomodoroReminderConfig } from '../../lib/pomodoro-reminders';
import './index.css';
import EntryComposer from '../../components/entry-composer';
import FloatingCreateButton from '../../components/floating-create-button';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import type { EntryMode } from '../../lib/entry-draft';

function ShortcutLabel({ shortcutKey, label, className = '' }: { shortcutKey: HomeFeatureKey; label: string; className?: string }) {
  return <View className={className}>{label}</View>;
}

export default function Today() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountSession, setAccountSession] = useState<Session | null>();
  const [shortcuts, setShortcuts] = useState(() => {
    try { return normalizeHomeShortcuts(Taro.getStorageSync(homeShortcutsStorageKey)); }
    catch { return defaultHomeShortcuts(); }
  });
  const [customizing, setCustomizing] = useState<{ kind: 'edit' | 'replace' | 'select'; key?: ShortcutKey } | null>(null);
  const [shortcutMode, setShortcutMode] = useState<'browse' | 'sort' | 'manage'>('browse');
  const [directorySorting, setDirectorySorting] = useState(false);
  const featureOrder = useHomeFeatureOrder();
  const [sortRetry, setSortRetry] = useState<HomeShortcuts | null>(null);
  const shortcutsRef = useRef(shortcuts), sortRetryRef = useRef(sortRetry);
  shortcutsRef.current = shortcuts; sortRetryRef.current = sortRetry;
  const shortcutContext = useRef({ mode: shortcutMode, customizing });
  shortcutContext.current = { mode: shortcutMode, customizing };
  const editingShortcuts = useRef(false);
  editingShortcuts.current = accountOpen || !!customizing || shortcutMode !== 'browse' || !!sortRetry || directorySorting || featureOrder.pending;
  const [shown, setShown] = useState(true);
  const [date, setDate] = useState(new Date());
  const [recent, setRecent] = useState('');
  const [capture, setCapture] = useState('');
  const [composer, setComposer] = useState<{ mode: EntryMode; text: string; preferLastCreatedMode?: boolean; autoFocusOnOpen?: boolean } | null>(null);
  const [reminderSetup, setReminderSetup] = useState<{ owner: string; config: PomodoroReminderConfig | null }>({ owner: '', config: null });
  const opening = useRef(false);
  const setupGeneration = useRef(0);
  function refreshAccountSetup() {
    const generation = ++setupGeneration.current;
    setReminderSetup({ owner: '', config: null });
    setAccountSession(undefined);
    const sessionRequest = api<Session>('/account/profile').then(session => {
      if (setupGeneration.current === generation) setAccountSession(session);
      return session;
    }).catch(() => {
      if (setupGeneration.current === generation) setAccountSession(null);
      return null;
    });
    void Promise.all([sessionRequest, getPomodoroReminderConfig().catch(() => null)]).then(([session, config]) => {
      if (session && setupGeneration.current === generation) setReminderSetup({ owner: session.authenticated ? `${session.isAdmin ? 'admin' : 'reader'}:${session.userName}` : 'guest', config });
    });
  }
  useDidShow(() => {
    setShown(true);
    if (takeAccountRequest()) setAccountOpen(true);
    opening.current = false;
    refreshAccountSetup();
    setDate(new Date()); setRecent(Taro.getStorageSync('ottlog.recent-tool') || '');

  });
  useDidHide(() => { setShown(false); setAccountOpen(false); setShortcutMode('browse'); setDirectorySorting(false); });
  useEffect(() => {
    const open = () => { if (takeAccountRequest()) setAccountOpen(true); };
    const refresh = () => { refreshAccountSetup(); };
    Taro.eventCenter.on('ottlog-open-account', open);
    Taro.eventCenter.on('ottlog-session', refresh);
    return () => { ++setupGeneration.current; Taro.eventCenter.off('ottlog-open-account', open); Taro.eventCenter.off('ottlog-session', refresh); };
  }, []);
  useEffect(() => {
    if (!shown) return;
    const timer = setInterval(() => setDate(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [shown]);
  useShareAppMessage(() => ({ title: 'Ottlog · 开始一件小事', path: '/pages/index/index' }));
  function customize(key?: ShortcutKey, kind: 'edit' | 'replace' = 'edit') {
    if (sortRetryRef.current || directorySorting || featureOrder.pending) return;
    editingShortcuts.current = true; setCustomizing({ kind: key ? kind : 'select', key });
  }
  function closeCustomize() { editingShortcuts.current = shortcutMode !== 'browse' || !!sortRetryRef.current; setCustomizing(null); }
  function persistShortcuts(value: HomeShortcuts) {
    try {
      Taro.setStorageSync(homeShortcutsStorageKey, value);
      shortcutsRef.current = value; setShortcuts(value);
      sortRetryRef.current = null; setSortRetry(null);
      return true;
    } catch { return false; }
  }
  function saveShortcuts(value: HomeShortcuts, close = true) {
    if (sortRetryRef.current) return false;
    if (persistShortcuts(value)) {
      if (close) closeCustomize();
      return true;
    }
    if (close) void showAppMessage({ title: '保存失败，请重试', icon: 'none' });
    return false;
  }
  function toggleSort() {
    if (customizing || directorySorting || featureOrder.pending) return;
    if (sortRetryRef.current) {
      if (!persistShortcuts(sortRetryRef.current)) void showAppMessage({ title: '保存失败，请重试', icon: 'none' });
      return;
    }
    const next = shortcutMode === 'sort' ? 'browse' : 'sort';
    setShortcutMode(next); editingShortcuts.current = next !== 'browse';
  }
  function moveShortcut(key: ShortcutKey, direction: -1 | 1) {
    if (shortcutContext.current.mode !== 'sort' || shortcutContext.current.customizing || sortRetryRef.current) return;
    const items = moveHomeShortcutBy(shortcutsRef.current.items, key, direction);
    if (items === shortcutsRef.current.items) return;
    const target = normalizeHomeShortcuts({ version: 1, items: items.map(item => ({ ...item, icon: item.icon || defaultShortcutIcon(item.key) })) });
    if (!persistShortcuts(target)) {
      sortRetryRef.current = target; setSortRetry(target);
      void showAppMessage({ title: '保存失败，请重试', icon: 'none' });
    }
  }
  function toggleManage() {
    if (sortRetryRef.current || customizing || directorySorting || featureOrder.pending) return;
    const next = shortcutMode === 'manage' ? 'browse' : 'manage';
    setShortcutMode(next); editingShortcuts.current = next !== 'browse';
  }
  function openCapture() {
    if (!customizing && !editingShortcuts.current) {
      void Taro.hideKeyboard().catch(() => {});
      setComposer({ mode: 'task', text: capture, preferLastCreatedMode: true, autoFocusOnOpen: capture.length === 0 });
    }
  }
  function open(key: HomeFeatureKey) {
    if (opening.current || editingShortcuts.current) return;
    if (key === 'pomodoro') {
      opening.current = true;
      const launch = preparePomodoroLaunch(reminderSetup.owner, reminderSetup.config);
      Taro.setStorageSync('ottlog.recent-tool', key);
      void openPomodoro({ start: '1', launch }).catch(() => { opening.current = false; });
      return;
    }
    Taro.setStorageSync('ottlog.recent-tool', key);
    if (key === 'create-habit' || key === 'create-domain') {
      opening.current = true;
      void openHomeCreation(key === 'create-habit' ? 'habit' : 'domain', reminderSetup.owner).catch(() => {
        opening.current = false;
        void showAppMessage({ title: '打开失败，请重试', icon: 'none' });
      });
      return;
    }
    if (key === 'pomodoro-page') { void openPomodoro(); return; }
    if (key === 'memo-list') { void Taro.navigateTo({ url: '/pages/memos/index' }); return; }
    if (key === 'journal') { void Taro.navigateTo({ url: '/pages/articles/index' }); return; }
    if (key === 'growth') { void Taro.switchTab({ url: '/pages/domains/index' }); return; }
    if (key === 'create') {
      setComposer({ mode: 'task', text: capture });
    } else if (key === 'memos') {
      setComposer({ mode: 'memo', text: capture });
    } else if (shortcutCatalog.find(entry => entry.key === key)?.tab) {
      void Taro.switchTab({ url: '/pages/' + key + '/index' });
    } else {
      void Taro.navigateTo({ url: '/pages/' + key + '/index' });
    }
  }
  const entries = shortcuts.items;
  const cards = entries;
  const shortcutsScrollable = cards.length + 1 > 6;
  const last = entries.find(entry => entry.key === recent) || homeFeatureGroups.flatMap(group => group.items).find(entry => entry.key === recent);
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return <><PageScroll snapSuspended={!shown || !!composer}><View className='today-page core-page'><CoreScreen className={shortcutsScrollable ? 'today-many-shortcuts' : ''} nextLabel='查看全部入口'>
    <View className='today-brand'><View className='today-wordmark'><Image src='/assets/ottlog-logo.png' mode='aspectFit' /><Text>ottlog</Text></View><View className='today-header-actions'><Text className='today-date'>{String(date.getMonth() + 1).padStart(2, '0')} / {String(date.getDate()).padStart(2, '0')} · {week}</Text><ActionButton appearance='icon' size='compact' className='today-account-button' ariaLabel={`打开账号窗口，${accountSession?.authenticated ? `已登录：${accountSession.userName}` : accountSession === undefined ? '正在确认账号' : accountSession === null ? '账号状态未确认' : '未登录'}`} disabled={!!customizing || !!composer} onClick={() => { void Taro.hideKeyboard(); setAccountOpen(true); }}><View className={`account-symbol${accountSession?.authenticated ? ' is-authenticated' : accountSession == null ? ' is-unconfirmed' : ''}`} aria-hidden /></ActionButton></View></View>

    <MottoBanner showEdit={false} active={shown && !editingShortcuts.current} visible={shown} />
    <PageToolbar className='today-shortcut-toolbar card-group-heading' leading={<View className='today-shortcut-heading-group'><SectionTitle inRow className='today-shortcut-heading'>我的快捷方式</SectionTitle>{sortRetry && <Text className='today-shortcut-overflow-hint'>未保存</Text>}</View>}
      sort={<ChoiceButton iconOnly size='compact' selected={shortcutMode === 'sort' || !!sortRetry} ariaLabel={sortRetry ? '重试快捷方式排序' : '排序快捷方式'} disabled={cards.length < 2 || !!customizing || directorySorting || featureOrder.pending} onClick={toggleSort}><SortSymbol /></ChoiceButton>}
      manage={<ChoiceButton iconOnly size='compact' selected={shortcutMode === 'manage'} ariaLabel='设置快捷方式' disabled={!!sortRetry || !!customizing || directorySorting || featureOrder.pending} onClick={toggleManage}><ManageSymbol /></ChoiceButton>} />
    <ScrollView className='today-shortcut-scroll' scrollY={shortcutsScrollable} enhanced bounces={false} showScrollbar={false} ariaLabel='我的快捷方式'><CardGroupContent className='today-grid floating-create-content'>{cards.map((entry, index) => <HomeShortcutCard key={entry.key} item={entry} rootProps={{ id: `home-sort-${entry.key}` }} className='today-entry' disabled={!!sortRetry || !!customizing} onMoveUp={shortcutMode === 'sort' ? () => moveShortcut(entry.key, -1) : undefined} onMoveDown={shortcutMode === 'sort' ? () => moveShortcut(entry.key, 1) : undefined} upDisabled={index === 0} downDisabled={index === cards.length - 1} onOpen={shortcutMode === 'browse' ? () => open(entry.key) : undefined} onEdit={shortcutMode === 'manage' ? () => customize(entry.key) : undefined} onReplace={shortcutMode === 'manage' ? () => customize(entry.key, 'replace') : undefined} />)}<HomeShortcutCreateCard disabled={shortcutMode === 'sort' || !!sortRetry || !!customizing || directorySorting || featureOrder.pending} onCreate={() => customize()} /></CardGroupContent></ScrollView>

    </CoreScreen>
    <MoreSection className='floating-create-content' title='全部功能' showReturn={false} actions={<View className='page-toolbar-actions'><ChoiceButton iconOnly size='compact' selected={directorySorting || featureOrder.pending} ariaLabel={featureOrder.pending ? '重试全部功能排序' : '排序全部功能'} disabled={!!customizing || shortcutMode !== 'browse' || !!sortRetry} onClick={() => { if (featureOrder.pending) featureOrder.retry(); else setDirectorySorting(!directorySorting); }}><SortSymbol /></ChoiceButton></View>}>
    {last && <ActionButton className='today-recent' disabled={editingShortcuts.current} onClick={() => open(last.key)}><ShortcutLabel shortcutKey={last.key} label={`最近打开 · ${last.name}`} /><Text>继续 →</Text></ActionButton>}
    {featureOrder.pending && <View className='tool-status' role='alert'><Text>排序尚未保存，请重试</Text></View>}
    <HomeFeatureList className='today-feature-directory' groups={featureOrder.groups} sorting={directorySorting || featureOrder.pending} onMove={featureOrder.move} disabled={!!customizing || shortcutMode !== 'browse' || !!sortRetry || featureOrder.pending} onChoose={entry => open(entry.key)} />
  </MoreSection></View></PageScroll><FloatingCreateButton label='创建记录' disabled={editingShortcuts.current || !!accountOpen || !!customizing} onClick={openCapture} />{accountOpen && <AccountWindow onClose={() => setAccountOpen(false)} />}{customizing && <HomeShortcutEditor groups={featureOrder.groups} key={`${customizing.kind}:${customizing.key || 'select'}`} initialKey={customizing.kind === 'edit' ? customizing.key : undefined} replacementKey={customizing.kind === 'replace' ? customizing.key : undefined} value={shortcuts} onSave={saveShortcuts} onCancel={closeCustomize} />}{composer && <EntryComposer initialMode={composer.mode} preferLastCreatedMode={composer.preferLastCreatedMode} autoFocusOnOpen={composer.autoFocusOnOpen} initialText={composer.text} onCleared={() => { setCapture(''); setComposer(previous => previous ? { ...previous, text: '' } : previous); }} onClose={reason => { setComposer(null); if (reason === 'account') setCapture(''); }} onCreated={(_, captureConsumed) => { if (captureConsumed) setCapture(''); }} />}</>;
}
