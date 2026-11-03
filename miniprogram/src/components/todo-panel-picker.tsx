import {todoPanelSourceKey} from '../lib/todo-panel-source';
import CheckSymbol from './check-symbol';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { todoQuadrants, type TodoCategory, type TodoPanelSource } from '../lib/tool-records';
import { todoCategoryChoices } from '../lib/todo-categories';
import LibraryIcon from './library-icon';
import { ChoicePopover, PopoverHeading } from './form-options';
import ActionButton, { ChoiceButton } from './ui-button';
import { DeleteSymbol, MoreSymbol } from './manage-symbol';
import PriorityFlag from './priority-flag';
import './todo-panel-picker.css';

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
  const choices = todoCategoryChoices({ categories });
  return <ChoicePopover ariaLabel={ariaLabel} open={open} onOpenChange={next => { if (!busy) { setOpen(next); setError(''); } }} disabled={disabled}
    trigger={trigger || <MoreSymbol />} triggerAppearance={trigger ? 'quiet' : 'icon'} triggerSize='compact' triggerIconOnly={!trigger} showIndicator={!!trigger}
    triggerClassName='todo-panel-source-trigger' layerClassName='todo-panel-source-layer' panelClassName='todo-panel-source-panel' placement='center' panelWidth={queue?400:240} menuLabels={queue?undefined:[...todoQuadrants.map(item=>item.title),...choices.map(item=>item.name)]} menuLeadingWidth={34} maxHeightRatio={.8} bodySpacing='none' contentKey={`${choices.length}:${JSON.stringify(queue)}:${error}`}
    heading={<PopoverHeading title={queue?'切换显示队列':'更换显示'} actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭区域显示选择' disabled={busy} onClick={() => setOpen(false)}>×</ActionButton>} />}>
    <View className='todo-panel-source-options'>{queue&&<><Text className='todo-panel-source-section'>从上到下循环切换</Text><View className='todo-panel-queue'>{queue.map((source,index)=>{const text=source.kind==='quadrant'?todoQuadrants.find(item=>item.id===source.quadrantId)!.title:choices.find(item=>item.id===source.categoryId)?.name||'收集箱';const move=(direction:number)=>{const next=[...queue];[next[index],next[index+direction]]=[next[index+direction],next[index]];void choose(source,next);};return <View className='todo-panel-queue-row' key={todoPanelSourceKey(source)}><Text>{index+1}. {text}</Text><ActionButton appearance='icon' size='compact' ariaLabel={`上移${text}`} disabled={busy||index===0} onClick={()=>move(-1)}>↑</ActionButton><ActionButton appearance='icon' size='compact' ariaLabel={`下移${text}`} disabled={busy||index===queue.length-1} onClick={()=>move(1)}>↓</ActionButton><ActionButton appearance='icon' size='compact' ariaLabel={`移出队列：${text}`} disabled={busy||queue.length===1} onClick={()=>{void choose(source);}}><DeleteSymbol/></ActionButton></View>;})}</View></>}<Text className='todo-panel-source-section'>优先级</Text>
      {todoQuadrants.map(quadrant => <ChoiceButton key={quadrant.id} className='todo-panel-source-option' selected={queue?queue.some(source=>source.kind==='quadrant'&&source.quadrantId===quadrant.id):value.kind==='quadrant'&&value.quadrantId===quadrant.id} disabled={busy} ariaLabel={`显示象限：${quadrant.title}`} onClick={() => { void choose({ kind: 'quadrant', quadrantId: quadrant.id }); }}><PriorityFlag color={quadrant.color} outlined={quadrant.id === 'later'} /><Text>{quadrant.title}</Text>{queue?.some(source=>source.kind==='quadrant'&&source.quadrantId===quadrant.id)&&<CheckSymbol/>}</ChoiceButton>)}
      <Text className='todo-panel-source-section'>分类</Text>
      {choices.map(category => <ChoiceButton key={category.id} className='todo-panel-source-option' selected={queue?queue.some(source=>source.kind==='category'&&source.categoryId===category.id):value.kind==='category'&&value.categoryId===category.id} disabled={busy} ariaLabel={`显示分类：${category.name}`} onClick={() => { void choose({ kind: 'category', categoryId: category.id }); }}><LibraryIcon name={category.iconId} fallback='notes' className='todo-panel-category-icon' /><Text>{category.name}</Text>{queue?.some(source=>source.kind==='category'&&source.categoryId===category.id)&&<CheckSymbol/>}</ChoiceButton>)}
      {!!error && <View className='todo-panel-source-error' role='alert'>{error}</View>}
    </View>
  </ChoicePopover>;
}
