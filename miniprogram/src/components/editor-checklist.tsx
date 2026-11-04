import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { Input, ScrollView, View } from '@tarojs/components';
import { toolId, type TodoSubtask } from '../lib/tool-records';
import { hasSubtaskText } from '../lib/todo-subtasks';
import { isEditorChecklist } from '../lib/editor-checklist-data';
import { useHandleSort } from '../lib/use-handle-sort';
import ActionButton from './ui-button';
import './editor-checklist.css';
export type EditorChecklistHandle = { add(): void };
type Props = { items?: TodoSubtask[]; owner:string; recordId:string; disabled?:boolean; color:string; onChange:(rows:TodoSubtask[])=>void; insertionSignal?:number };
/** UI only: parent retains record identity, autosave, retries and undo. */
const EditorChecklist=forwardRef<EditorChecklistHandle,Props>(function EditorChecklist({items,owner,recordId,disabled=false,color,onChange,insertionSignal=0},ref){
 const valid=items===undefined||isEditorChecklist(items),rows=valid?(items||[]):[];
 const [visible,setVisible]=useState(rows.length>0),[emptyId,setEmptyId]=useState(toolId),[focus,setFocus]=useState('');
 const [prefix]=useState(()=>`checklist-${toolId()}`),scope=JSON.stringify([owner,recordId]);
 const latest=useRef({rows,disabled:disabled||!valid,onChange,scope,emptyId});latest.current={rows,disabled:disabled||!valid,onChange,scope,emptyId};
 const previousScope=useRef(scope);
 function update(change:(rows:TodoSubtask[])=>TodoSubtask[]){const now=latest.current;if(now.disabled||now.scope!==previousScope.current||now.scope!==scope)return;const next=change(now.rows);if(next===now.rows)return;latest.current.rows=next;now.onChange(next);}
 function add(){const now=latest.current;if(now.disabled||now.scope!==scope||now.rows.length>=50)return;setVisible(true);setFocus(now.emptyId);}
 useImperativeHandle(ref,()=>({add}));
 useEffect(()=>{previousScope.current=scope;setVisible(latest.current.rows.length>0);setFocus('');setEmptyId(toolId());},[scope]);
 const signal=useRef(insertionSignal);useEffect(()=>{if(signal.current!==insertionSignal){signal.current=insertionSignal;add();}},[insertionSignal]);
 function moveFocus(id:string,direction:number){if(latest.current.disabled)return;const ids=[...latest.current.rows.map(row=>row.id),latest.current.emptyId],at=ids.indexOf(id);if(at>=0){setVisible(true);setFocus(ids[Math.max(0,Math.min(ids.length-1,at+direction))]);}}
 const move=useRef(moveFocus);move.current=moveFocus;
 useEffect(()=>{if(typeof document==='undefined')return;const key=(event:KeyboardEvent)=>{if(event.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey)return;const target=event.target as HTMLElement;if(target?.getAttribute('data-subtask-editor')!==prefix)return;if(['ArrowUp','ArrowDown','Enter'].includes(event.key)){event.preventDefault();event.stopPropagation();move.current(target.getAttribute('data-subtask-id')||'',event.key==='ArrowUp'?-1:1);}};document.addEventListener('keydown',key,true);return()=>document.removeEventListener('keydown',key,true);},[prefix]);
 // Programmatic focus must move the real input, including after reordering.
 useEffect(()=>{if(!focus||typeof document==='undefined')return;document.querySelector<HTMLInputElement>(`[data-subtask-editor="${prefix}"][data-subtask-id="${focus}"]`)?.focus();},[focus,prefix,rows.length]);
 const sorter=useHandleSort(rows.map(row=>row.id),!disabled&&valid,scope,(from,to)=>update(current=>{const next=[...current],row=next.splice(from,1)[0];next.splice(to,0,row);return next;}));
 function title(id:string,value:string){if(latest.current.disabled||latest.current.scope!==scope)return;update(current=>current.some(row=>row.id===id)?current.map(row=>row.id===id?{...row,title:value}:row):hasSubtaskText(value)&&current.length<50?[...current,{id,title:value,completed:false}]:current);if(id===emptyId&&hasSubtaskText(value)){setEmptyId(toolId());setFocus(id);}}
 function row(item:TodoSubtask,index:number,ghost=false){const empty=item.id===emptyId,d=sorter.drag;return <View key={item.id} data-checklist-id={item.id} className={`editor-checklist-row${empty||ghost?'':' handle-sort-row'}${item.completed?' is-completed':''}${!ghost&&d?.active&&d.index===index?' is-placeholder':''}${!ghost&&d?.active&&d.target===index?' is-target':''}`}>
  <ActionButton appearance='icon' size='compact' ariaLabel={`${item.completed?'重新打开':'完成'}子任务 ${index+1}`} disabled={disabled||!valid||empty||ghost} onClick={()=>update(current=>current.map(r=>r.id===item.id?{...r,completed:!r.completed}:r))}><View className={`editor-checklist-check${item.completed?' is-checked':''}`} aria-hidden>{item.completed&&<View/>}</View></ActionButton>
  <Input className='editor-checklist-input' data-focus-group={prefix} data-subtask-editor={prefix} data-subtask-id={item.id} ariaLabel={`子任务 ${index+1}`} placeholder={empty?'换行即可添加子任务':'子任务'} value={item.title} disabled={disabled||!valid||ghost||empty&&rows.length>=50} maxlength={100} focus={!ghost&&focus===item.id} onFocus={()=>setFocus(item.id)} onBlur={()=>{setFocus(current=>current===item.id?'':current);if(!empty&&!hasSubtaskText(latest.current.rows.find(r=>r.id===item.id)?.title||''))update(current=>current.filter(r=>r.id!==item.id));}} cursorSpacing={96} adjustPosition confirmType='next' onConfirm={()=>moveFocus(item.id,1)} onInput={event=>title(item.id,event.detail.value)}/>
  {empty?<ActionButton appearance='icon' size='compact' ariaLabel='取消新增清单项' disabled={disabled||!valid} onClick={()=>{setVisible(false);setFocus('');}}>×</ActionButton>:<View {...sorter.bind(index)} className='handle-sort-grip' data-sort-index={index}><ActionButton appearance='icon' size='compact' ariaLabel={`拖动清单项 ${index+1}（上下方向键调整）`} disabled={disabled||!valid||ghost} onClick={e=>e.stopPropagation()}><View className='editor-checklist-grip' aria-hidden><View/><View/><View/></View></ActionButton></View>}
 </View>;}
 return <View className='editor-checklist' style={{'--checklist-color':color} as CSSProperties} data-checklist-record={recordId}>
  {(rows.length>0||visible)&&<ScrollView id={sorter.id} className='editor-checklist-scroll' style={{height:`${(rows.length+(visible?1:0))*49}px`}} scrollY scrollTop={sorter.scrollTop} onScroll={event=>sorter.onScroll(event.detail.scrollTop)} enhanced bounces={false} showScrollbar={false}>{rows.map((item,index)=>row(item,index))}{visible&&row({id:emptyId,title:'',completed:false},rows.length)}</ScrollView>}
  {sorter.drag?.active&&sorter.drag.rect&&rows[sorter.drag.index]&&<View className='editor-checklist-ghost' style={{position:'fixed',left:`${sorter.drag.rect.left}px`,top:`${sorter.drag.rect.top+sorter.drag.point.clientY-sorter.drag.start.clientY}px`,width:`${sorter.drag.rect.right-sorter.drag.rect.left}px`}}>{row(rows[sorter.drag.index],sorter.drag.index,true)}</View>}
 </View>;
});
export default EditorChecklist;
