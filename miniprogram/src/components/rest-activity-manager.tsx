import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import { type RestActivity } from '../lib/rest-activities';
import { toolId } from '../lib/tool-records';
import { getLibraryIcon } from '../lib/icon-library';
import ActionButton from './ui-button';
import EditorHeading from './editor-heading';
import EditorBackButton from './editor-back-button';
import EntityTitleRow, { EntityTitleInput } from './entity-title-field';
import LibraryIcon from './library-icon';
import IconLibrarySheet from './icon-library-sheet';
import SheetActions from './sheet-actions';
import AppDialog from './app-dialog';
import { AddSymbol } from './create-button';
import { DeleteSymbol } from './manage-symbol';
import { useMessageNotice } from './message-notice';
import './entity-choice-options.css';

export default function RestActivityManager({owner,items,disabled,onChange,onBack}:{owner:string;items:readonly RestActivity[];disabled:boolean;onChange:(change:{add:RestActivity}|{remove:string})=>Promise<void>;onBack:()=>void}){
  const [draft,setDraft]=useState<RestActivity|null>(null),[deleting,setDeleting]=useState<RestActivity|null>(null),[icons,setIcons]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const generation=useRef(0),locked=useRef(false);locked.current=busy||disabled;
  useEffect(()=>()=>{++generation.current;},[owner]);
  useMessageNotice(error);
  async function commit(change:{add:RestActivity}|{remove:string}){
    if(locked.current)return;locked.current=true;setBusy(true);setError('');const epoch=++generation.current;
    try{await onChange(change);if(epoch===generation.current){setDraft(null);setDeleting(null);}}
    catch(reason){if(epoch===generation.current)setError(reason instanceof Error?reason.message:'保存失败，请重试');}
    finally{if(epoch===generation.current){setBusy(false);locked.current=false;}}
  }
  return <>
    <EditorHeading title={draft?'添加休息建议':'编辑休息建议'} actions={<EditorBackButton ariaLabel={draft?'返回建议列表':'返回休息建议'} disabled={busy} onClick={()=>{if(draft){setDraft(null);setIcons(false);}else onBack();}}/>}/>
    <ScrollView scrollY showScrollbar={false} className='focus-suggestions-scroll'><View className='rest-manager-body'>
    {draft?<EntityTitleRow><ActionButton appearance='icon' ariaLabel='选择建议图标' disabled={busy||disabled} onClick={()=>setIcons(true)}><LibraryIcon name={draft.iconId}/></ActionButton><EntityTitleInput ariaLabel='建议名称' placeholder='建议名称' value={draft.title} maxlength={30} disabled={busy||disabled} onInput={event=>setDraft({...draft,title:event.detail.value})}/></EntityTitleRow>:<View className='entity-choice-options'>
      {items.map(item=><View className='entity-choice-row' key={item.id}><View className='entity-choice-option'><LibraryIcon className='entity-choice-icon' name={item.iconId}/><Text className='entity-choice-label'>{item.title}</Text></View><ActionButton appearance='icon' ariaLabel={`删除建议：${item.title}`} disabled={busy||disabled} onClick={()=>{setError('');setDeleting(item);}}><DeleteSymbol/></ActionButton></View>)}
      {!items.length&&<Text>{disabled?'休息建议格式不兼容，原数据已保留':'暂无休息建议'}</Text>}
      <ActionButton appearance='quiet' disabled={busy||disabled||items.length>=60} onClick={()=>{setError('');setDraft({id:toolId(),title:'',iconId:'walk'});}}><AddSymbol/><Text>添加休息建议</Text></ActionButton>
    </View>}
    </View></ScrollView>
    <SheetActions>{draft&&<ActionButton appearance='primary' width='fill' disabled={busy||disabled} loading={busy} onClick={()=>{void commit({add:draft});}}>{error?'重试添加':'添加'}</ActionButton>}</SheetActions>
    {draft&&icons&&<IconLibrarySheet back selectedId={draft.iconId} title='建议图标' ariaLabel='建议图标库' closeLabel='返回建议编辑' onClose={()=>setIcons(false)} onSelect={id=>{if(id&&getLibraryIcon(id)){setDraft({...draft,iconId:id});setIcons(false);}}}/>}
    {deleting&&<AppDialog title='删除休息建议' ariaLabel='删除休息建议' closeLabel='取消删除建议' busy={busy} error={error} onClose={()=>{if(!busy)setDeleting(null);}} actions={<ActionButton appearance='danger' disabled={busy||disabled} loading={busy} onClick={()=>{void commit({remove:deleting.id});}}>{error?'重试删除':'删除'}</ActionButton>}><Text>删除「{deleting.title}」？</Text></AppDialog>}
  </>;
}
