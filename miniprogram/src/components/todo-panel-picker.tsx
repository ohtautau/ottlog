import {todoPanelSourceKey} from '../lib/todo-panel-source';
import CheckSymbol from './check-symbol';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { todoQuadrants, type TodoCategory, type TodoPanelSource } from '../lib/tool-records';
import { todoCategoryChoices } from '../lib/todo-categories';
import LibraryIcon from './library-icon';
import { ChoicePopover, PopoverHeading } from './form-options';
import ActionButton from './ui-button';
import { MoreSymbol } from './manage-symbol';
import PriorityFlag from './priority-flag';
import './todo-panel-picker.css';
import './entity-choice-options.css';

/** Display sources only; hosts own task matching, assignment and persistence. */
export default function TodoPanelPicker({ categories, value, onChange, disabled = false, ariaLabel = '更换区域显示', owner = '', trigger, queue, onQueueChange }: {
  categories: readonly TodoCategory[]; value: TodoPanelSource; onChange: (source: TodoPanelSource) => Promise<void> | void;
  queue?:readonly TodoPanelSource[];onQueueChange?:(queue:TodoPanelSource[])=>Promise<void>;disabled?: boolean; ariaLabel?: string; owner?: string; trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const generation = useRef(0), scope = useRef(owner), lock = useRef(false); scope.current = owner;
  useEffect(() => { ++generation.current; lock.current = false; setOpen(false); setBusy(false); setError(''); }, [owner]);
  useEffect(() => () => { ++generation.current; }, []);
  async function choose(source: TodoPanelSource, replacement?:TodoPanelSource[]) {
    if (disabled || lock.current) return;
    const expectedOwner = owner, operation = ++generation.current;
    lock.current = true; setBusy(true); setError('');
    try {
      if(onQueueChange&&queue){const key=todoPanelSourceKey(source),included=queue.some(item=>todoPanelSourceKey(item)===key);await onQueueChange(replacement || (included?queue.filter(item=>todoPanelSourceKey(item)!==key):[...queue,source]));}else await onChange(source);
      if (scope.current === expectedOwner && operation === generation.current && !onQueueChange) setOpen(false);
    } catch (reason) {
      if (scope.current === expectedOwner && operation === generation.current) setError(reason instanceof Error ? reason.message : '显示方式未保存，请重试');
    } finally {
      if (scope.current === expectedOwner && operation === generation.current) { lock.current = false; setBusy(false); }
    }
  }
  const choices=todoCategoryChoices({categories});
  const all:TodoPanelSource[]=[...todoQuadrants.map(item=>({kind:'quadrant' as const,quadrantId:item.id})),...choices.map(item=>({kind:'category' as const,categoryId:item.id}))];
  const selectedKeys=new Set((queue||[value]).map(todoPanelSourceKey));
  const ordered=queue?[...queue,...all.filter(source=>!selectedKeys.has(todoPanelSourceKey(source)))]:all;
  return <ChoicePopover ariaLabel={ariaLabel} open={open} onOpenChange={next=>{if(!busy){setOpen(next);setError('');}}} disabled={disabled}
    trigger={trigger||<MoreSymbol/>} triggerAppearance={trigger?'quiet':'icon'} triggerSize='compact' triggerIconOnly={!trigger} showIndicator={!!trigger}
    triggerClassName='todo-panel-source-trigger' layerClassName='todo-panel-source-layer' panelClassName='todo-panel-source-panel' placement='anchor' align='start' preferredSide='below' panelWidth={400} maxHeightRatio={.8} bodySpacing='none' contentKey={`${JSON.stringify(queue)}:${choices.length}:${error}`}
    heading={<PopoverHeading title={queue?'显示队列':'更换显示'} actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭区域显示选择' disabled={busy} onClick={()=>setOpen(false)}>×</ActionButton>}/>}>
    <View className='entity-choice-body'><View className='entity-choice-options'>{ordered.map(source=>{
      const key=todoPanelSourceKey(source),included=selectedKeys.has(key),index=queue?.findIndex(item=>todoPanelSourceKey(item)===key)??-1;
      const quadrant=source.kind==='quadrant'?todoQuadrants.find(item=>item.id===source.quadrantId):undefined;
      const category=source.kind==='category'?choices.find(item=>item.id===source.categoryId):undefined;
      const text=quadrant?.title||category?.name||'收集箱';
      const move=(direction:number)=>{if(!queue||index<0||index+direction<0||index+direction>=queue.length)return;const next=[...queue];[next[index],next[index+direction]]=[next[index+direction],next[index]];void choose(source,next);};
      return <View className='entity-choice-row' key={key}>
        <ActionButton appearance='quiet' className={`entity-choice-option${included?' is-selected':''}`} ariaLabel={source.kind==='quadrant'?`显示象限：${text}`:`显示分类：${text}`} aria-pressed={included} disabled={busy||!!queue&&included&&queue.length===1} onClick={()=>{void choose(source);}}>
          {quadrant?<PriorityFlag color={quadrant.color} outlined={quadrant.id==='later'}/>:<LibraryIcon name={category?.iconId} fallback='notes' className='entity-choice-icon'/>}<Text className='entity-choice-label'>{text}</Text>
        </ActionButton>
        {queue&&<><ActionButton appearance='icon' size='compact' ariaLabel={`上移${text}`} disabled={busy||index<=0} onClick={()=>move(-1)}>↑</ActionButton><ActionButton appearance='icon' size='compact' ariaLabel={`下移${text}`} disabled={busy||index<0||index===queue.length-1} onClick={()=>move(1)}>↓</ActionButton></>}
        <View className='entity-choice-selection'>{included&&<CheckSymbol/>}</View>
      </View>;
    })}</View>{!!error&&<View className='todo-panel-source-error' role='alert'>{error}</View>}</View>
  </ChoicePopover>;
}
