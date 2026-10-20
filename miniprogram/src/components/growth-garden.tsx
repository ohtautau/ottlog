import { trimTextEnd } from '../lib/text-whitespace';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { Button, ScrollView, Text, Textarea, View } from '@tarojs/components';
import { hasVolatilePersonalTool, usePersonalToolState } from '../lib/use-personal-tool-state';
import { initialGrowthState, demoGrowthState, isGrowthState, growthPoints, recordGrowth, undoGrowth, saveGrowthDomain, setGrowthGoal, completeGrowthGoal, setGrowthDomainArchived, reorderGrowthDomains, type GrowthState, type GrowthSize } from '../lib/growth-data';
import LibraryIcon from './library-icon';
import ActionButton, { ChoiceButton } from './ui-button';
import EditorHeading from './editor-heading';
import EntityTitleRow, { EntityTitleInput } from './entity-title-field';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import SheetActions from './sheet-actions';
import ManageSymbol, { EditSymbol } from './manage-symbol';
import IconLibrarySheet from './icon-library-sheet';
import SortIcon from './sort-icon';
import useGrowthDomainSort from './growth-domain-sorter';
import './growth-garden.css';

const sizes: { size: GrowthSize; label: string; note: string }[] = [{ size: 'small', label: '小进步', note: '迈出一步' }, { size: 'medium', label: '中等进步', note: '有所突破' }, { size: 'large', label: '大进步', note: '跨过一关' }];
const stop = (event: { stopPropagation?: () => void }) => event.stopPropagation?.();
const contain = { onTouchStart: stop, onTouchMove: stop, onTouchEnd: stop, onTouchCancel: stop, onScroll: stop };
type DomainEditor = { owner: string; id?: string; name: string; iconId: string };
type GoalEditor = { owner: string; domainId: string; title: string; originalId: string | null };
function Sheet({ className, title, closeLabel, onClose, children }: { className: string; title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  return <View className='growth-overlay' {...contain}><View className='growth-backdrop' catchMove onClick={onClose} /><View className={`growth-sheet ${className}`}><EditorHeading className='growth-sheet-heading' title={title} actions={<ActionButton appearance='icon' ariaLabel={closeLabel} onClick={onClose}>×</ActionButton>} />{children}</View></View>;
}
const displayTime = (stamp: string) => { const date = new Date(stamp); return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };

export default function GrowthGarden({ date, disabled = false }: { date: Date; disabled?: boolean }) {
  const defaults = useMemo(() => demoGrowthState(), []);
  const { value, setValue, ready, owner, status, retry } = usePersonalToolState('growth', defaults);
  const valid = useMemo(() => isGrowthState(value), [value]), writable = ready && valid && !!owner && !disabled;
  const state = ready && valid ? value : initialGrowthState;
  // Refresh periods immediately after an edit as well as on the home clock tick.
  const statsDate = useMemo(() => new Date(), [date, value]);
  const active = state.domains.filter(domain => !domain.archived);
  const [selection, setSelection] = useState<{ owner: string; id: string } | null>(null);
  const selected = active.find(domain => selection?.owner === owner && domain.id === selection.id) || active[0];
  const [editor, setEditor] = useState<DomainEditor | null>(null);
  const [goalEditor, setGoalEditor] = useState<GoalEditor | null>(null);
  const [detail, setDetail] = useState<{ owner: string; id: string } | null>(null);
  const [manageOwner, setManageOwner] = useState<string | null>(null);
  const [manageSelection, setManageSelection] = useState<{ owner: string; id: string } | null>(null);
  const [sortDraft, setSortDraft] = useState<{ owner: string; ids: string[] } | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<{ owner: string; id: string; domainId: string; points: number } | null>(null);
  const editorInitial = useRef(''), goalInitial = useRef('');
  const saving = useRef(false), ownerRef = useRef(owner); ownerRef.current = owner;
  useEffect(() => { setSelection(null); setEditor(null); setGoalEditor(null); setDetail(null); setManageOwner(null); setManageSelection(null); setSortDraft(null); setIconOpen(false); setRecent(null); setError(''); setBusy(false); saving.current = false; }, [owner]);
  const sorting = sortDraft?.owner === owner && writable ? sortDraft : null;
  const ordered = sorting ? reorderGrowthDomains(state, sorting.ids).domains.filter(domain => !domain.archived) : active;
  const sorter = useGrowthDomainSort(ordered.map(domain => domain.id), !!sorting && !busy, ids => setSortDraft({ owner, ids }));
  function beginSort() {
    if (!writable || busy || active.length < 2) return;
    if (selected) setSelection({ owner, id: selected.id });
    setError(''); setSortDraft({ owner, ids: active.map(domain => domain.id) });
  }
  async function saveSort() {
    if (!sorting || sorter.active) return;
    const next = await change(previous => reorderGrowthDomains(previous, sorting.ids));
    if (next) setSortDraft(null);
  }
  const managedDomain = manageOwner === owner && writable ? state.domains.find(domain => domain.id === (manageSelection?.owner === owner ? manageSelection.id : active[0]?.id)) : undefined;
  const detailDomain = detail?.owner === owner && writable ? state.domains.find(domain => domain.id === detail.id) : undefined;
  const detailEvents = useMemo(() => state.events.filter(event => event.domainId === detailDomain?.id && Date.parse(event.createdAt) <= statsDate.getTime()).slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 100), [state, detailDomain, statsDate]);
  const detailGoals = useMemo(() => state.completedGoals.filter(goal => goal.domainId === detailDomain?.id && Date.parse(goal.completedAt) <= statsDate.getTime()).slice().sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)), [state, detailDomain, statsDate]);
  const recentEvent = recent?.owner === owner ? state.events.find(event => event.id === recent.id) : undefined;
  async function change(transform: (previous: GrowthState) => GrowthState, retainPending?: (result: GrowthState) => void): Promise<GrowthState | null> {
    if (!writable || saving.current) return null;
    const capturedOwner = owner;
    saving.current = true; setBusy(true); setError('');
    try {
      // Validate before entering the shared store so a form error doesn't reload identity.
      let result = transform(value);
      await setValue(previous => {
        if (ownerRef.current !== capturedOwner || !isGrowthState(previous)) throw new Error('记录已变化，请重新读取');
        if (previous !== value) result = transform(previous);
        return result;
      });
      if (ownerRef.current !== capturedOwner) return null;
      if (hasVolatilePersonalTool('growth', capturedOwner)) { retainPending?.(result); throw new Error('本机存储不可用，输入已保留，请重试'); }
      return result;
    } catch (reason) {
      if (ownerRef.current === capturedOwner) setError(reason instanceof Error ? reason.message : '保存失败，请稍后重试');
      return null;
    } finally { if (ownerRef.current === capturedOwner) { saving.current = false; setBusy(false); } }
  }
  async function record(size: GrowthSize) {
    if (!selected) return;
    const now = new Date(), domainId = selected.id;
    const next = await change(previous => recordGrowth(previous, domainId, size, now));
    if (next) { const event = next.events[next.events.length - 1]; setRecent({ owner, id: event.id, domainId, points: growthPoints[size] }); }
  }
  async function undo(id: string) {
    const next = await change(previous => undoGrowth(previous, id));
    if (next) setRecent(previous => previous?.id === id ? null : previous);
  }
  function editDomain(id?: string) {
    if (!writable || busy) return;
    const domain = state.domains.find(entry => entry.id === id);
    const fields = { owner, id: domain?.id, name: domain?.name || '', iconId: domain?.iconId || 'plant' };
    editorInitial.current = JSON.stringify([fields.name, fields.iconId]);
    setError(''); setEditor(fields);
  }
  async function saveDomain() {
    if (!editor || editor.owner !== owner) return;
    const next = await change(previous => saveGrowthDomain(previous, { id: editor.id, name: editor.name, iconId: editor.iconId }), result => setEditor({ ...editor, id: editor.id || result.domains[result.domains.length - 1].id }));
    if (next) {
      const id = editor.id || next.domains[next.domains.length - 1].id;
      setSelection({ owner, id }); setEditor(null); setIconOpen(false); setManageOwner(null);
    }
  }
  function editGoal() {
    if (!selected || !writable || busy) return;
    goalInitial.current = selected.currentGoal?.title || '';
    setError(''); setGoalEditor({ owner, domainId: selected.id, title: goalInitial.current, originalId: selected.currentGoal?.id || null });
  }
  async function saveGoal() {
    if (!goalEditor || goalEditor.owner !== owner) return;
    const now = new Date();
    const next = await change(previous => {
      const current = previous.domains.find(domain => domain.id === goalEditor.domainId)?.currentGoal;
      if ((current?.id || null) !== goalEditor.originalId) throw new Error('小目标已变化，请重新打开后编辑');
      return setGrowthGoal(previous, goalEditor.domainId, goalEditor.title, now);
    }, result => setGoalEditor({ ...goalEditor, originalId: result.domains.find(domain => domain.id === goalEditor.domainId)?.currentGoal?.id || null }));
    if (next) setGoalEditor(null);
  }
  async function completeGoal() {
    if (!selected?.currentGoal) return;
    const now = new Date(), domainId = selected.id, goalId = selected.currentGoal.id;
    await change(previous => completeGrowthGoal(previous, domainId, now, goalId));
  }
  async function archive(id: string, archived: boolean) {
    const next = await change(previous => setGrowthDomainArchived(previous, id, archived));
    if (next) { setDetail(null); if (archived) setRecent(previous => previous?.domainId === id ? null : previous); }
  }
  const editorClose = useEditorCloseGuard({
    scope: editor?.owner === owner && writable ? `${owner}:growth-domain` : '',
    hasChanges: !!editor && JSON.stringify([editor.name, editor.iconId]) !== editorInitial.current, blocked: busy,
    onSave: saveDomain, onClose: () => { if (!saving.current) { setEditor(null); setIconOpen(false); setError(''); } },
  });
  const goalClose = useEditorCloseGuard({
    scope: goalEditor?.owner === owner && writable ? `${owner}:growth-goal:${goalEditor.domainId}` : '',
    hasChanges: !!goalEditor && goalEditor.title !== goalInitial.current, blocked: busy,
    onSave: saveGoal, onClose: () => { if (!saving.current) { setGoalEditor(null); setError(''); } },
  });
  return <>
    <View className='growth-garden'>
      <View className='growth-heading'>
        <Text className='growth-section-title'>成长足迹</Text>
        <View className='growth-heading-actions'>{sorting ? <><Button className='button-label' ariaLabel='取消领域排序' disabled={busy} onClick={() => { setSortDraft(null); setError(''); }}>×</Button><Button className='button-label growth-sort-save' ariaLabel='保存领域排序' disabled={busy || sorter.active} onClick={() => { void saveSort(); }}>✓</Button></> : <><Button className='button-label' ariaLabel='排序领域' disabled={!writable || busy || active.length < 2} onClick={beginSort}><SortIcon /></Button><ActionButton appearance='icon' size='compact' width='content' className='button-label growth-manage-button' ariaLabel='管理领域' disabled={!writable || !!sorting || busy} onClick={() => { setError(''); setManageOwner(owner); }}><ManageSymbol /></ActionButton><Button className='button-label growth-add-button' ariaLabel='添加领域' disabled={!writable || !!sorting || busy} onClick={() => editDomain()}>＋</Button></>}</View>
      </View>
      {!ready || !valid ? <View className='growth-loading'><Text>{!ready ? status : '记录暂时无法读取，请重试'}</Text><Button className='button-label' onClick={retry}>重新读取</Button></View> : <ScrollView id='growth-domain-scroll' className={`growth-domain-scroll${sorting ? ' is-sorting' : ''}`} scrollY enhanced bounces={false} showScrollbar={false} scrollTop={sorter.scrollTop} scrollWithAnimation={false} {...contain} onScroll={event => { stop(event); sorter.onScroll(event); }}><View className='growth-domain-grid' catchMove={!!sorting}>
        {ordered.map(domain => {
          return <Button key={domain.id} {...sorter.bind(domain.id)} className={`growth-domain-card${selected?.id === domain.id ? ' is-selected' : ''}${sorter.className(domain.id)}`} ariaLabel={`选择领域：${domain.name}`} aria-pressed={selected?.id === domain.id} disabled={disabled || busy} onClick={() => { if (!sorting) { setSelection({ owner, id: domain.id }); setError(''); } }}>
            <LibraryIcon name={domain.iconId} className='growth-domain-icon' />
            <View className='growth-domain-body'>
              <View className='growth-domain-top'><Text className='growth-domain-name'>{trimTextEnd(domain.name)}</Text>{selected?.id === domain.id && <View className='growth-selected-mark' />}</View>
            </View>
            <Text className={`growth-domain-goal${domain.currentGoal ? '' : ' is-empty'}`}>{trimTextEnd(domain.currentGoal?.title || '设定下一个小目标')}</Text>
          </Button>;
        })}
      </View>{!active.length && <View className='growth-empty'><Text>暂无领域</Text><Button className='button-label' onClick={() => editDomain()}>添加第一个领域</Button><Button className='button-label growth-secondary' onClick={() => setManageOwner(owner)}>查看已收起的领域</Button></View>}</ScrollView>}
      <View className='growth-record-panel'>
        {selected && <View className='growth-current-goal'>
          <Button className='growth-goal-open' ariaLabel={selected.currentGoal ? '编辑小目标' : '设置小目标'} disabled={!writable || !!sorting || busy} onClick={editGoal}><Text className='growth-goal-symbol'>{selected.currentGoal ? '◇' : '＋'}</Text><Text>{trimTextEnd(selected.currentGoal?.title || '设定下一个小目标')}</Text><EditSymbol /></Button>
          {selected.currentGoal && <Button className='button-label growth-goal-complete' ariaLabel='完成小目标' disabled={!writable || !!sorting || busy} onClick={() => { void completeGoal(); }}><View /></Button>}
          <Button className='button-label growth-detail-button' ariaLabel='查看领域详情' disabled={!writable || !!sorting || busy} onClick={() => { setError(''); setDetail({ owner, id: selected.id }); }}><View className='growth-detail-mark' aria-hidden><View /><View /><View /></View></Button>
        </View>}
        <View className='growth-record-actions'>{sizes.map(item => <Button key={item.size} className={`growth-record-button is-${item.size}`} ariaLabel={`${item.label} +${growthPoints[item.size]}`} disabled={!writable || !!sorting || !selected || busy} onClick={() => { void record(item.size); }}><Text>+{growthPoints[item.size]}</Text><Text>{item.label}</Text></Button>)}</View>
        {(error || recentEvent && recent) && <View className='growth-feedback'>{error ? <Text className='growth-error'>{error}</Text> : recentEvent && recent ? <><Text>已为{state.domains.find(domain => domain.id === recent.domainId)?.name}记下 +{recent.points}</Text><Button className='button-label' ariaLabel='撤销刚才的进步' disabled={busy} onClick={() => { void undo(recent.id); }}>撤销</Button></> : null}</View>}
      </View>
    </View>
    {detailDomain && <Sheet className='growth-detail-sheet' title={`${detailDomain.name}的足迹`} closeLabel='关闭领域详情' onClose={() => { if (!busy) setDetail(null); }}><View className='growth-detail-intro'><LibraryIcon name={detailDomain.iconId} /><View><Text>{trimTextEnd(detailDomain.name)}</Text></View></View>
      <ScrollView className='growth-sheet-scroll' scrollY {...contain}><Text className='growth-section-label'>已完成的小目标</Text>{detailGoals.map(goal => <View key={goal.id} className='growth-completed-goal'><Text className='growth-goal-check'>✓</Text><View><Text>{trimTextEnd(goal.title)}</Text><Text>{displayTime(goal.completedAt)}</Text></View></View>)}{!detailGoals.length && <Text className='growth-sheet-empty'>每完成一个小目标，都留在这里。</Text>}
        <Text className='growth-section-label'>最近的进步</Text>{detailEvents.map(event => <View key={event.id} className='growth-history-row'><Text className={`growth-history-points is-${event.size}`}>+{growthPoints[event.size]}</Text><View><Text>{sizes.find(item => item.size === event.size)?.label}</Text><Text>{displayTime(event.createdAt)}</Text>{event.note && <Text>{trimTextEnd(event.note)}</Text>}</View><Button className='button-label' ariaLabel={`撤销进步：${event.id}`} disabled={busy} onClick={() => { void undo(event.id); }}>撤销</Button></View>)}{!detailEvents.length && <Text className='growth-sheet-empty'>还没有记录，先从一个小进步开始。</Text>}
        <Text className='growth-detail-note'>展示最近 100 次进步。</Text><Button className='button-label growth-archive-button' ariaLabel='归档领域' disabled={busy} onClick={() => { void archive(detailDomain.id, true); }}>收起这个领域</Button><Text className='growth-detail-note'>记录和目标都会保留，可在领域管理中恢复。</Text>
      </ScrollView>{error && <Text className='growth-error growth-sheet-error'>{error}</Text>}{!!status && <Text className='growth-sync-status'>{status}</Text>}
      <SheetActions leading={<ActionButton appearance='icon' ariaLabel='编辑领域' disabled={busy} onClick={() => editDomain(detailDomain.id)}><EditSymbol /></ActionButton>}><ActionButton appearance='primary' size='large' width='fill' disabled={busy} onClick={() => setDetail(null)}>完成</ActionButton></SheetActions>
    </Sheet>}
    {manageOwner === owner && writable && <Sheet className='growth-manage-sheet' title='我的领域' closeLabel='关闭领域管理' onClose={() => { if (!busy) setManageOwner(null); }}><ScrollView className='growth-sheet-scroll' scrollY {...contain}>{state.domains.map(domain => <View key={domain.id} className={`growth-manage-row${domain.archived ? ' is-archived' : ''}`}><ChoiceButton className='growth-manage-select' size='compact' selected={managedDomain?.id === domain.id} ariaLabel={`选择管理领域：${domain.name}`} disabled={busy} onClick={() => setManageSelection({ owner, id: domain.id })}><LibraryIcon name={domain.iconId} /><View><Text>{trimTextEnd(domain.name)}</Text><Text>{domain.archived ? '已收起 · 记录保留' : '使用中'}</Text></View></ChoiceButton>{domain.archived ? <Button className='button-label' ariaLabel={`恢复领域：${domain.name}`} disabled={busy} onClick={() => { void archive(domain.id, false); }}>恢复</Button> : <><Button className='button-label growth-quiet' ariaLabel={`归档领域：${domain.name}`} disabled={busy} onClick={() => { void archive(domain.id, true); }}>收起</Button></>}</View>)}</ScrollView>{error && <Text className='growth-error growth-sheet-error'>{error}</Text>}<View className='growth-sheet-footer'><SheetActions leading={<ActionButton appearance='icon' ariaLabel={managedDomain ? `编辑领域：${managedDomain.name}` : '编辑选中领域'} disabled={busy || !managedDomain || managedDomain.archived} onClick={() => { if (managedDomain) editDomain(managedDomain.id); }}><EditSymbol /></ActionButton>}><ActionButton appearance='primary' size='large' width='fill' ariaLabel='添加领域' disabled={busy} onClick={() => editDomain()}>＋ 添加领域</ActionButton></SheetActions><Text className='growth-detail-note'>最多 24 个领域，收起后仍可恢复。</Text></View></Sheet>}
    {editor?.owner === owner && writable && <Sheet className='growth-editor-sheet' title={editor.id ? '编辑领域' : '添加领域'} closeLabel='关闭领域编辑' onClose={editorClose.requestClose}><View className='growth-editor-body'><EntityTitleRow><ActionButton appearance='icon' ariaLabel='选择领域图标' disabled={busy} onClick={() => { void Taro.hideKeyboard?.().catch(() => {}); setIconOpen(true); }}><LibraryIcon name={editor.iconId} /></ActionButton><EntityTitleInput ariaLabel='领域名称' placeholder='想在哪个领域，继续向前？' maxlength={20} value={editor.name} disabled={busy} onInput={event => setEditor({ ...editor, name: event.detail.value })} /></EntityTitleRow>{error && <Text className='growth-error'>{error}</Text>}</View><SheetActions className='growth-sheet-actions'><Button className='button-label growth-primary' ariaLabel='保存领域' disabled={busy || !editor.name.trim()} onClick={() => { void saveDomain(); }}>保存领域</Button></SheetActions></Sheet>}
    {goalEditor?.owner === owner && writable && <Sheet className='growth-goal-sheet' title={goalEditor.originalId ? '编辑小目标' : '下一个小目标'} closeLabel='关闭小目标编辑' onClose={goalClose.requestClose}><View className='growth-editor-body'><Text className='growth-goal-domain'>{state.domains.find(domain => domain.id === goalEditor.domainId)?.name}</Text><Textarea className='growth-goal-input' ariaLabel='小目标' placeholder='写一个具体、能完成的小目标…' maxlength={80} value={goalEditor.title} disabled={busy} cursorSpacing={96} adjustPosition fixed showConfirmBar={false} onInput={event => setGoalEditor({ ...goalEditor, title: event.detail.value })} /><View className='growth-goal-help'><Text>完成后归入足迹，再开始下一个。</Text><Text>{goalEditor.title.length}/80</Text></View>{error && <Text className='growth-error'>{error}</Text>}</View><SheetActions className='growth-sheet-actions'><Button className='button-label growth-primary' ariaLabel='保存小目标' disabled={busy || !goalEditor.title.trim()} onClick={() => { void saveGoal(); }}>保存小目标</Button></SheetActions></Sheet>}
    {iconOpen && editor?.owner === owner && writable && <View {...contain}><IconLibrarySheet selectedId={editor.iconId} onSelect={id => { if (id && editor.owner === ownerRef.current) setEditor({ ...editor, iconId: id }); setIconOpen(false); }} onClose={() => setIconOpen(false)} /></View>}
    {editorClose.dialog}{goalClose.dialog}
  </>;
}
