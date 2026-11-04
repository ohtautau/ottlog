import { RECORD_CONTENT_PLACEHOLDER } from './editor-copy';
import { Text, View } from '@tarojs/components';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MAX_DOMAIN_RECORD_LENGTH, type DomainState, type RecordItem, type RecordKind } from '../lib/domain-data';
import { clearProgressInput, MAX_PROGRESS_PAIRS, hasProgressContent, newProgressInput, progressRows, saveProgressDraft, writeProgressInput, type ProgressDraft } from '../lib/progress-draft';
import { hasSubtaskText } from '../lib/todo-subtasks';
import type { MemoImage } from '../lib/tool-records';
import DomainChoiceField from './domain-choice-field';
import MarkdownNoteEditor from './markdown-note-editor';
import ActionButton from './ui-button';
import { TaskAttachmentSymbol } from './task-detail-editor';
import './progress-editor-fields.css';
import EditorFieldsLayout from './editor-fields-layout';

export function ProgressRecordField({ slot, kind, pairIndex = 0, children }: { slot:'positive'|'negative';kind:RecordKind;pairIndex?:number;children:ReactNode }) {
  return <EditorFieldsLayout topSpace={false} className='progress-record-field' data-progress-slot={slot} data-progress-pair={pairIndex}>{children}</EditorFieldsLayout>;
}
const filled=(record:RecordItem)=>hasSubtaskText(record.content)||!!record.images?.length;

/** Each sign has one trailing input, stable record IDs and its own attachment target. */
export default function ProgressEditorFields({ draft,onChange,state,disabled,owner,onBusyChange,autoFocus,actions }: {
  draft:ProgressDraft;onChange:(draft:ProgressDraft)=>void;state:DomainState;disabled:boolean;owner:string;
  onBusyChange:(busy:boolean)=>void;autoFocus?:boolean;actions?:ReactNode;
}) {
  const current=useRef({draft,disabled,owner});current.current={draft,disabled,owner};
  const autoFocusTaken=useRef(false);
  const known=useRef(new Set(progressRows(draft).filter(row=>filled(row.record)).map(row=>row.record.id)));
  const [spares,setSpares]=useState(()=>({positive:newProgressInput(),negative:newProgressInput()}));
  const [focused,setFocused]=useState(''),[insertions,setInsertions]=useState<Record<string,number>>({});
  const [navigationId]=useState(()=>`records-${draft.positive.id}`);
  const moveRef=useRef<(id:string,direction:number)=>void>(()=>{});
  const rows=progressRows(draft),total=rows.filter(row=>filled(row.record)).length;
  const columns=(['negative','positive'] as const).map(kind=>{
    const items=rows.filter(row=>row.kind===kind && (filled(row.record)||known.current.has(row.record.id)&&focused===row.record.id));
    const unused=rows.find(row=>row.kind===kind&&!filled(row.record)&&!known.current.has(row.record.id));
    const placeholder=unused?.record || spares[kind];
    return {kind,items,placeholder,visible:[...items.map(row=>row.record),...(total<MAX_PROGRESS_PAIRS*2?[placeholder]:[])]};
  });
  function emit(next:ProgressDraft){current.current.draft=next;onChange(next);}
  function change(kind:RecordKind,record:RecordItem){
    if(current.current.disabled)return;
    const existing=progressRows(current.current.draft).some(row=>row.record.id===record.id);
    if(!existing && !filled(record)){setSpares(previous=>({...previous,[kind]:record}));return;}
    const clean=!hasSubtaskText(record.content)?{...record,content:''}:record;
    emit(writeProgressInput(current.current.draft,kind,clean));
    if(filled(clean)){known.current.add(record.id);if(spares[kind].id===record.id)setSpares(previous=>({...previous,[kind]:newProgressInput()}));setFocused(record.id);}
  }
  function leave(id:string){
    setFocused(previous=>previous===id?'':previous);
    const row=progressRows(current.current.draft).find(item=>item.record.id===id);
    if(!current.current.disabled&&row&&!filled(row.record)&&known.current.has(id))emit(clearProgressInput(current.current.draft,id));
  }
  function move(id:string,direction:number){
    if(current.current.disabled)return;
    const column=columns.find(item=>item.visible.some(record=>record.id===id));if(!column)return;
    const index=column.visible.findIndex(record=>record.id===id),next=column.visible[Math.max(0,Math.min(column.visible.length-1,index+direction))];if(next)setFocused(next.id);
  }
  moveRef.current=move;
  useEffect(()=>{
    if(typeof document==='undefined')return;
    const arrow=(event:KeyboardEvent)=>{if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||!['ArrowUp','ArrowDown'].includes(event.key))return;const target=event.target as HTMLElement;if(target?.getAttribute('data-editor-list')!==navigationId)return;event.preventDefault();moveRef.current(target.getAttribute('data-editor-row')||'',event.key==='ArrowUp'?-1:1);};
    document.addEventListener('keydown',arrow,true);return()=>document.removeEventListener('keydown',arrow,true);
  },[navigationId]);
  function attach(kind:RecordKind) {
    if(current.current.disabled)return;
    const candidates=progressRows(current.current.draft).filter(row=>row.kind===kind&&filled(row.record));
    const target=candidates[candidates.length-1]?.record || columns.find(column=>column.kind===kind)!.placeholder;
    // Capture the column's stable ID at click time, independent of focus.
    setInsertions(previous=>({...previous,[target.id]:(previous[target.id]||0)+1}));
  }
  function checkImages(kind:RecordKind,record:RecordItem,images:MemoImage[]){
    const next=writeProgressInput(current.current.draft,kind,{...record,images});
    if(hasProgressContent(next)){
      const own=new Set(progressRows(next).map(row=>row.record.id));
      saveProgressDraft({...state,domains:state.domains.map(domain=>({...domain,positiveRecords:domain.positiveRecords.filter(item=>!own.has(item.id)),negativeRecords:domain.negativeRecords.filter(item=>!own.has(item.id))}))},next);
    }
  }
  return <EditorFieldsLayout className='progress-editor-fields'>
    <View className='entry-pane-heading progress-domain-row'><DomainChoiceField compact ariaLabel='选择记录领域' domains={state.domains} value={draft.domainId} optionPrefix='记录到' disabled={disabled} onChange={domainId=>emit({...current.current.draft,domainId})}/>{actions}</View>
    <View className='progress-columns'>{columns.map(({kind,placeholder,visible})=><View className={`progress-record-column is-${kind}`} key={kind}>
      <View className={`progress-record-heading is-${kind}`}><Text>{kind==='negative'?'负记录':'正记录'}</Text></View>
      {visible.map((record,index)=>{const empty=record.id===placeholder.id;return <ProgressRecordField key={record.id} slot={kind} kind={kind} pairIndex={index}>
        <MarkdownNoteEditor minimal format='plain' density='compact' showImageInsertion={false} insertionSignal={insertions[record.id]||0} navigationId={navigationId}
          onFocus={()=>{autoFocusTaken.current=true;setFocused(record.id);}} onBlur={()=>leave(record.id)} onConfirm={()=>move(record.id,1)} autoFocus={focused===record.id || !focused&&!autoFocusTaken.current&&!!autoFocus&&kind==='positive'&&index===0}
          value={record.content} images={record.images} owner={owner} recordId={record.id} disabled={disabled} canInsertImage={!disabled} onBusyChange={onBusyChange} maxLength={MAX_DOMAIN_RECORD_LENGTH}
          ariaLabel={index===0 ? kind==='positive'?'记录内容':'第二条记录内容' : `第 ${index+1} 条${kind==='negative'?'负':'正'}记录内容`} placeholder={RECORD_CONTENT_PLACEHOLDER}
          onChange={content=>change(kind,{...record,content})} onImagesChange={images=>change(kind,{...record,images})} checkImages={images=>checkImages(kind,record,images)}/>
        <View className='progress-record-tools'>{!empty&&<ActionButton appearance='icon' size='compact' intent='danger' ariaLabel={`删除第 ${index+1} 条${kind==='negative'?'负':'正'}记录`} disabled={disabled} onClick={()=>{emit(clearProgressInput(current.current.draft,record.id));setFocused('');}}>×</ActionButton>}

        </View>
      </ProgressRecordField>;})}
      <View className='progress-column-tools'><ActionButton appearance='icon' size='compact' ariaLabel={`${kind==='negative'?'负':'正'}记录附件`} disabled={disabled || total>=MAX_PROGRESS_PAIRS*2&&!visible.some(filled)} onClick={()=>attach(kind)}><TaskAttachmentSymbol/></ActionButton></View>
    </View>)}</View>
  </EditorFieldsLayout>;
}
