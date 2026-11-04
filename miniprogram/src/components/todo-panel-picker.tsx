import {todoPanelSourceKey} from '../lib/todo-panel-source';
import CheckSymbol from './check-symbol';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { todoQuadrants, type TodoCategory, type TodoPanelSource } from '../lib/tool-records';
import { todoCategoryChoices } from '../lib/todo-categories';
import { useHandleSort } from '../lib/use-handle-sort';
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
 const [open,setOpen]=useState(false),[adding,setAdding]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),scope=useRef(owner),lock=useRef(false);scope.current=`${owner}:${categories.map(item=>item.id).join('|')}`;
 const retry=useRef<null|(()=>Promise<void>)>(null);
 useEffect(()=>{++generation.current;lock.current=false;setOpen(false);setAdding(false);setBusy(false);setError('');retry.current=null;},[owner]);
 useEffect(()=>()=>{++generation.current;},[]);
 async function save(operation:()=>Promise<void>|void, close=false){
  if(disabled||lock.current)return;
  const expectedOwner=scope.current,token=++generation.current;lock.current=true;setBusy(true);setError('');retry.current=null;
  try{await operation();if(scope.current===expectedOwner&&token===generation.current&&close)setOpen(false);}
  catch(reason){if(scope.current===expectedOwner&&token===generation.current){setError(reason instanceof Error?reason.message:'显示方式未保存，请重试');retry.current=async()=>{await save(operation,close);};}}
  finally{if(scope.current===expectedOwner&&token===generation.current){lock.current=false;setBusy(false);}}
 }
 const choices=todoCategoryChoices({categories});
 const all:TodoPanelSource[]=[...todoQuadrants.map(item=>({kind:'quadrant' as const,quadrantId:item.id})),...choices.map(item=>({kind:'category' as const,categoryId:item.id}))];
 const queueMode=!!queue&&!!onQueueChange,selectedKeys=new Set((queue||[value]).map(todoPanelSourceKey));
 const availableKey=all.map(todoPanelSourceKey).join('|');
 useEffect(()=>{++generation.current;lock.current=false;setBusy(false);retry.current=null;setError('');setAdding(false);},[availableKey]);
 const presentation=(source:TodoPanelSource)=>{
  const quadrant=source.kind==='quadrant'?todoQuadrants.find(item=>item.id===source.quadrantId):undefined;
  const category=source.kind==='category'?choices.find(item=>item.id===source.categoryId):undefined;
  return {text:quadrant?.title||category?.name||'收集箱',icon:quadrant?<PriorityFlag color={quadrant.color} outlined={quadrant.id==='later'}/>:<LibraryIcon name={category?.iconId} fallback='notes' className='entity-choice-icon'/>};
 };
 const reorder=(from:number,to:number)=>{if(!queue||!onQueueChange||from===to)return;const next=[...queue],item=next.splice(from,1)[0];next.splice(to,0,item);void save(()=>onQueueChange(next));};
 const sorter=useHandleSort((queue||[]).map(todoPanelSourceKey),open&&queueMode&&!adding&&!busy&&!disabled,`${owner}:${availableKey}`,reorder);
 const row=(source:TodoPanelSource,index:number,ghost=false)=>{
  const key=todoPanelSourceKey(source),current=key===todoPanelSourceKey(value),p=presentation(source),d=sorter.drag;
  return <View key={key} className={`entity-choice-row${ghost?'':' handle-sort-row'}${current?' is-current':''}${!ghost&&d?.active&&d.index===index?' is-placeholder':''}${!ghost&&d?.active&&d.target===index?' is-target':''}`}>
   <ActionButton appearance='quiet' className='entity-choice-option' ariaLabel={source.kind==='quadrant'?`显示象限：${p.text}`:`显示分类：${p.text}`} aria-pressed={current} disabled={busy||ghost} onClick={()=>{if(!sorter.suppressClick())void save(()=>onChange(source));}}>{p.icon}<Text className='entity-choice-label'>{p.text}</Text></ActionButton>
   <View {...sorter.bind(index)} className='handle-sort-grip' data-sort-index={index}><ActionButton appearance='icon' ariaLabel={`拖动排序：${p.text}（上下方向键调整）`} disabled={busy||ghost} onClick={event=>event.stopPropagation()}><View className='todo-queue-grip-symbol' aria-hidden><View/><View/><View/></View></ActionButton></View>
  </View>;
 };
 return <ChoicePopover ariaLabel={ariaLabel} open={open} onOpenChange={next=>{if(!busy){sorter.cancel();setOpen(next);setAdding(false);setError('');retry.current=null;}}} disabled={disabled}
  trigger={trigger||<MoreSymbol/>} triggerAppearance={trigger?'quiet':'icon'} triggerSize='compact' triggerIconOnly={!trigger} showIndicator={!!trigger}
  triggerClassName='todo-panel-source-trigger' layerClassName='todo-panel-source-layer' panelClassName='todo-panel-source-panel' placement='anchor' align='start' preferredSide='below' panelWidth={400} maxHeightRatio={.8} bodySpacing='none' bodyScroll={queueMode?{id:sorter.id,top:sorter.scrollTop,onScroll:sorter.onScroll}:undefined} contentKey={`${JSON.stringify(queue)}:${choices.length}:${error}`}
  heading={<PopoverHeading title={queueMode?'显示队列':'更换显示'} actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭区域显示选择' disabled={busy} onClick={()=>{sorter.cancel();setOpen(false);setAdding(false);}}>×</ActionButton>}/>}>
  <View className='entity-choice-body'>
   {queueMode?<View className='entity-choice-options todo-panel-queue-options'>
    {queue!.map((source,index)=>row(source,index))}
    <ChoicePopover ariaLabel='添加显示项' open={adding} onOpenChange={next=>{if(!busy){sorter.cancel();setAdding(next);}}} disabled={busy} trigger={<Text>添加</Text>} triggerAppearance='quiet' triggerClassName='todo-panel-add' placement='anchor' align='start' preferredSide='below' panelWidth={340} maxHeightRatio={.65} bodySpacing='none' layerClassName='todo-panel-add-layer' heading={<PopoverHeading title='添加显示项' actions={<ActionButton appearance='icon' ariaLabel='关闭添加显示项' disabled={busy} onClick={()=>setAdding(false)}>×</ActionButton>}/>}>
     <View className='entity-choice-body'><View className='entity-choice-options'>{all.map(source=>{const key=todoPanelSourceKey(source),included=selectedKeys.has(key),p=presentation(source);return <ActionButton key={key} appearance='quiet' className={`entity-choice-option${included?' is-selected':''}`} ariaLabel={`${included?'移出':'加入'}显示队列：${p.text}`} aria-pressed={included} disabled={busy||included&&queue!.length===1} onClick={()=>{const next=included?queue!.filter(item=>todoPanelSourceKey(item)!==key):[...queue!,source];void save(()=>onQueueChange!(next));}}>{p.icon}<Text className='entity-choice-label'>{p.text}</Text></ActionButton>;})}</View></View>
    </ChoicePopover>
   </View>:<View className='entity-choice-options'>{all.map(source=>{const key=todoPanelSourceKey(source),selected=key===todoPanelSourceKey(value),p=presentation(source);return <View key={key} className='entity-choice-row'><ActionButton appearance='quiet' className={`entity-choice-option${selected?' is-selected':''}`} ariaLabel={source.kind==='quadrant'?`显示象限：${p.text}`:`显示分类：${p.text}`} aria-pressed={selected} disabled={busy} onClick={()=>{void save(()=>onChange(source),true);}}>{p.icon}<Text className='entity-choice-label'>{p.text}</Text></ActionButton><View className='entity-choice-selection'>{selected&&<CheckSymbol/>}</View></View>;})}</View>}
   {!!error&&<View className='todo-panel-source-error' role='alert'><Text>{error}</Text><ActionButton appearance='quiet' disabled={busy} ariaLabel='重试保存显示队列' onClick={()=>{void retry.current?.();}}>重试</ActionButton></View>}
  </View>
  {sorter.drag?.active&&sorter.drag.rect&&queue&&<View className='todo-queue-ghost' style={{position:'fixed',left:`${sorter.drag.rect.left}px`,top:`${sorter.drag.point.clientY-sorter.drag.start.clientY+sorter.drag.rect.top}px`,width:`${sorter.drag.rect.right-sorter.drag.rect.left}px`}}>{row(queue[sorter.drag.index],sorter.drag.index,true)}</View>}
 </ChoicePopover>;
}
