import { useEffect, useRef, useState } from 'react';
import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { takeHomeCreation, type HomeCreationRequest } from '../../lib/home-creation-navigation';
import { moveAdjacentItem } from '../../lib/card-order';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import PageScroll from '../../components/page-scroll';
import DomainDefinitionEditor from '../../components/domain-definition-editor';
import useDomainDefinition from '../../lib/use-domain-definition';
import DomainQuickRecord from '../../components/domain-quick-record';
import DomainRecentRecords from '../../components/domain-recent-records';
import DomainRecordEditor from '../../components/domain-record-editor';
import CreateButton from '../../components/create-button';
import CardCreateButton from '../../components/card-create-button';
import SortSymbol from '../../components/sort-symbol';
import { CardMoveActions } from '../../components/card-corner-actions';
import PageToolbar, { PageToolbarSummary, ToolbarResetButton } from '../../components/page-toolbar';
import { DomainProgressSummary } from '../../components/domain-progress';
import { domainCompletionCounts, domainToolbarSummary } from '../../lib/domain-completion';
import usePageNow from '../../lib/use-page-now';
import { domainProgressScale } from '../../lib/domain-progress';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import { initialDomainState, isDomainState, MAX_DOMAIN_COUNT, reorderDomains, type DomainState, type RecentDomainRecord } from '../../lib/domain-data';
import { initialReminders, isReminderState } from '../../lib/reminder-data';
import { domainDisplayState, isUncategorizedDomain, uncategorizedDomain } from '../../lib/domain-display';
import './index.css';

function recordDate(stamp: string) {
  const date = new Date(stamp);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}
export default function Domains() {
  const now = new Date(usePageNow());
  const domainTool = usePersonalToolState('domains', initialDomainState);
  const { value, setValue, ready, owner, status, retry } = domainTool;
  const habitTool = usePersonalToolState('reminders', initialReminders);
  const valid = isDomainState(value), writable = ready && valid && !!owner;
  const state = valid ? value : initialDomainState;
  const displayState = domainDisplayState(state);
  const ordinaryDomains = state.domains.filter(domain => !isUncategorizedDomain(domain));
  const progressReady = writable && habitTool.ready && habitTool.owner === owner && isReminderState(habitTool.value);
  const progressCounts = progressReady ? domainCompletionCounts(displayState, habitTool.value, now) : [];
  const toolbarSummary = writable ? domainToolbarSummary(state, now) : undefined;
  const progressScale = domainProgressScale(progressCounts);
  const progressStatus = !habitTool.ready ? habitTool.status || '正在读取完成记录…' : habitTool.owner !== owner ? '正在确认记录所属账号…' : !isReminderState(habitTool.value) ? '习惯记录暂不可用' : /失败|不可用|暂存|离线|无法/.test(habitTool.status) ? habitTool.status : '';
  const [sorting, setSorting] = useState(false);
  const [moveRetry, setMoveRetry] = useState<string | null>(null);
  const [quick, setQuick] = useState(false);
  const [recordEditor, setRecordEditor] = useState<(RecentDomainRecord & { owner: string }) | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const definition = useDomainDefinition(domainTool, habitTool, { locked: busy });
  const [homeCreation, setHomeCreation] = useState<HomeCreationRequest | null>(null);
  useDidShow(() => { setHomeCreation(takeHomeCreation('domain')); });
  useEffect(() => {
    if (!homeCreation || !ready) return;
    setHomeCreation(null);
    if (homeCreation.owner && homeCreation.owner !== owner) { setError('账号已变化，请重新创建。'); return; }
    if (!writable) return;
    if (state.domains.length >= MAX_DOMAIN_COUNT) { setError('领域数量已达上限，请先整理领域。'); return; }
    definition.openCreate();
  }, [homeCreation, ready, writable, owner]);
  const blocked = busy || definition.busy;
  const saving = useRef(false), ownerRef = useRef(owner), previousOwner = useRef('');
  ownerRef.current = owner;
  const currentRecordEditor = writable && recordEditor?.owner === owner && state.domains.some(domain => domain.id === recordEditor.domainId) ? recordEditor : null;
  useDidHide(() => { setSorting(false); setQuick(false); setRecordEditor(null); setHomeCreation(null); });
  useEffect(() => {
    if (owner && previousOwner.current && owner !== previousOwner.current) { setQuick(false); setSorting(false); setMoveRetry(null); setRecordEditor(null); setError(''); }
    if (owner) previousOwner.current = owner;
  }, [owner]);
  async function change(transform: (previous: DomainState) => DomainState) {
    if (!writable || saving.current || definition.busy) return false;
    const capturedOwner = owner;
    saving.current = true; setBusy(true); setError('');
    try {
      const next = transform(value);
      await setValue(previous => {
        if (ownerRef.current !== capturedOwner || !isDomainState(previous)) throw new Error('账号或领域已变化，请重新打开');
        return previous === value ? next : transform(previous);
      });
      if (ownerRef.current !== capturedOwner) return false;
      if (hasVolatilePersonalTool('domains', capturedOwner)) throw new Error('本机尚未保存，请重试');
      setMoveRetry(null);
      return true;
    } catch (reason) { if (ownerRef.current === capturedOwner) setError(reason instanceof Error ? reason.message : '保存失败，请重试'); return false; }
    finally { saving.current = false; setBusy(false); }
  }
  async function move(id: string, direction: -1 | 1) {
    if (moveRetry) return;
    const moved = await change(previous => {
      const ids = previous.domains.filter(domain => !isUncategorizedDomain(domain)).map(domain => domain.id);
      const moved = moveAdjacentItem(ids, id, direction);
      return moved === ids ? previous : reorderDomains(previous, moved);
    });
    if (!moved && ownerRef.current === owner && hasVolatilePersonalTool('domains', owner)) setMoveRetry(id);
  }
  async function retryMove() { await change(previous => previous); }
  const entryCard = (domain: typeof state.domains[number], index?: number) => {
    const system = isUncategorizedDomain(domain), moving = sorting && !system;
    const counts = progressReady ? progressCounts.find(item => item.domainId === domain.id) ?? null : null;
    const url = system ? '/pages/domain-detail/index?uncategorized=1' : `/pages/domain-detail/index?id=${encodeURIComponent(domain.id)}`;
    const summary = <DomainProgressSummary domain={domain} state={displayState} counts={moving ? null : counts} scale={progressScale} showGoals={false} showShortTermGoal showProgress={!moving} />;
    return <View id={`domain-entry-${domain.id}`} className={`domain-entry-shell${system ? ' domain-uncategorized-shell' : moving ? ' is-sorting' : ''}`} key={domain.id}>
      {moving ? <View className='domain-entry'>{summary}</View> : <Button className='domain-entry' disabled={blocked} ariaLabel={`打开${domain.name}领域`} onClick={() => void Taro.navigateTo({ url })}>{summary}</Button>}
      {moving && <CardMoveActions className='domain-entry-actions' objectLabel={`${domain.name}领域`} disabled={blocked || !!moveRetry} upDisabled={index === 0} downDisabled={index === ordinaryDomains.length - 1} onMoveUp={() => void move(domain.id, -1)} onMoveDown={() => void move(domain.id, 1)} />}
    </View>;
  };
  const cards = ordinaryDomains.map(entryCard);
  const systemCard = entryCard(uncategorizedDomain(state));
  const createDisabled = sorting || blocked || state.domains.length >= MAX_DOMAIN_COUNT;
  const createCard = <View className='domain-entry-shell domain-create-shell'><CardCreateButton className='domain-create-card' ariaLabel='创建领域' disabled={createDisabled} onClick={definition.openCreate} /></View>;
  return <>
    <PageScroll snapSections={[]} scrollY={false}><View className='tool-page domains-page domains-list'><View className='domains-index'>
      <PageToolbar className='domains-page-toolbar' leading={writable && toolbarSummary && <PageToolbarSummary countLabel={`今日记录 ${toolbarSummary.createdToday}`} recentTitle={toolbarSummary.recentShortTermGoal?.content} recentLabel='最近完成短期目标' />} reset={<ToolbarResetButton ariaLabel='恢复领域默认方式' disabled={!writable || blocked || !!moveRetry} onReset={() => { if (writable && !blocked && !saving.current && !moveRetry) setSorting(false); }} />} sort={<ChoiceButton iconOnly size='compact' disabled={!writable || blocked} ariaLabel='排序领域' selected={sorting} onClick={() => setSorting(!sorting)}><SortSymbol /></ChoiceButton>} create={<CreateButton className='domain-record-trigger' label='记录进展' disabled={!writable || blocked} onClick={() => setQuick(true)} />} />
      {!ready && <View className='tool-status'>{status}<ActionButton className='tool-secondary button-label' onClick={retry}>重新读取</ActionButton></View>}
      {ready && !valid && <View className='notice'>领域数据暂不可用<ActionButton className='tool-secondary button-label' onClick={retry}>重新读取</ActionButton></View>}
      {writable && <DomainRecentRecords key={owner} state={state} disabled={blocked} onEdit={item => { if (!saving.current && !definition.busy) setRecordEditor({ ...item, owner }); }} />}
      {writable && <ScrollView key={`cards:${owner}`} id='domain-entry-scroll' className='domain-entry-scroll' scrollY enhanced bounces={false} showScrollbar={false} ariaLabel='领域卡片'>
        <View className='domain-entry-grid domain-first-grid'>{cards.slice(0, 8)}{cards.length < 8 && createCard}</View>
        <View className='domain-entry-grid domain-continuation-grid'>{cards.slice(8)}{systemCard}{cards.length >= 8 && createCard}</View>
      </ScrollView>}
      {!!(error || moveRetry || status || progressStatus) && <ScrollView className='domains-feedback-scroll' scrollY showScrollbar={false} enhanced bounces={false} ariaLabel='领域保存反馈'>
        {(error || moveRetry) && <View className='domain-error domain-move-retry' role='alert'><Text>{error || '正在保存…'}</Text>{moveRetry && <ActionButton size='compact' disabled={blocked} ariaLabel='重试领域排序' onClick={() => { void retryMove(); }}>重试</ActionButton>}</View>}
        {!!(status || progressStatus) && <View className='tool-status domains-status'><Text>{[status, progressStatus].filter(Boolean).join(' · ')}</Text>{(!ready || !!progressStatus || /不可用|失败|暂存|离线|无法/.test(status)) && <ActionButton appearance='quiet' className='domain-quiet button-label' disabled={blocked} onClick={() => { retry(); habitTool.retry(); }}>重试</ActionButton>}</View>}
      </ScrollView>}
    </View></View></PageScroll>
    <DomainDefinitionEditor controller={definition} />
    {quick && <DomainQuickRecord onClose={() => setQuick(false)} />}
    {currentRecordEditor && <DomainRecordEditor key={`${owner}:${currentRecordEditor.record.id}`} owner={owner} domainId={currentRecordEditor.domainId} kind={currentRecordEditor.kind} record={currentRecordEditor.record}
      title={`${currentRecordEditor.domainName} · 编辑${currentRecordEditor.kind === 'positive' ? '正' : '负'}记录`}
      dateLabel={recordDate(currentRecordEditor.record.createdAt)} onClose={() => setRecordEditor(null)} />}
  </>;
}
