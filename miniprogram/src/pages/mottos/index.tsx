import { useMessageNotice } from '../../components/message-notice';
import { MottoRow } from '../../components/data-card-views';
import EmptyState from '../../components/empty-state';
import CardGroupContent from '../../components/card-group-content';
import SheetActions from '../../components/sheet-actions';
import { trimTextEnd } from '../../lib/text-whitespace';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ScrollView, Text, Textarea, View } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import { openAccount } from '../../lib/account-navigation';
import { displayedMottos, initialPersonalMottos, isPersonalMottos, MAX_MOTTO_LENGTH, mottoRotationMs, removeMotto, writeMotto } from '../../lib/motto-data';
import { writeMottoRotation } from '../../lib/motto-settings';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import FloatingCreateButton from '../../components/floating-create-button';
import PageToolbar from '../../components/page-toolbar';
import { ChoicePopover, PopoverHeading, PopoverActions } from '../../components/form-options';
import DurationWheelPicker from '../../components/duration-wheel-picker';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import Taro, { useDidHide } from '@tarojs/taro';
import { requestAppConfirmation } from '../../lib/app-dialog';
import { AppDialogHost } from '../../components/app-dialog';
import DocumentEditorSheet from '../../components/document-editor-sheet';
import ActionMenu from '../../components/action-menu';
import EditorFieldsLayout from '../../components/editor-fields-layout';
import EditorHeading from '../../components/editor-heading';
import './index.css';

export default function MottosPage() {
  const { value, setValue, ready, owner, status, retry } = usePersonalToolState('mottos', initialPersonalMottos);
  const defaults: string[] = [];
  const [editor, setEditor] = useState<{ owner: string; original: string | null } | null>(null);
  const [more,setMore] = useState(false),[pageMore,setPageMore]=useState(false);
  const inFlight=useRef<Promise<boolean>|null>(null),editGeneration=useRef(0);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [rotationDraft, setRotationDraft] = useState<{ owner: string; text: string; pending?: number } | null>(null);
  const [rotationBusy, setRotationBusy] = useState(false), [rotationError, setRotationError] = useState('');
  const [wheelMoving, setWheelMoving] = useState(false);
  const rotationInitial = useRef('');
  const editorPending = useRef<{ remove: boolean; text: string } | null>(null);
  const rotationSaving = useRef(false);
  const saving = useRef(false);
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const editorRef=useRef(editor),draftRef=useRef(draft);editorRef.current=editor;draftRef.current=draft;
  const commitRef=useRef<(remove?:boolean)=>Promise<boolean>>(async()=>false);
  const valid = isPersonalMottos(value);
  const signedIn = ready && !!owner && owner !== 'guest';
  const mottos = signedIn ? displayedMottos(value, defaults) : [];
  const writable = signedIn && valid;
  const rotationWritable = writable;
  const currentRotation = rotationWritable && rotationDraft?.owner === owner ? rotationDraft : null;

  useEffect(() => { ++editGeneration.current;inFlight.current=null;setMore(false);setWheelMoving(false); setEditor(null); setDraft(''); setMessage(''); setBusy(false); saving.current = false; editorPending.current = null; setRotationDraft(null); setRotationError(''); setRotationBusy(false); rotationSaving.current = false; }, [owner]);

  function changeRotationOpen(open: boolean) {
    if (rotationSaving.current || saving.current) return;
    if (!open) { rotationClose.requestClose(); return; }
    setRotationError('');
    rotationInitial.current = String(mottoRotationMs(value) / 1000);
    setRotationDraft(rotationWritable ? { owner, text: rotationInitial.current } : null);
  }
  async function saveRotation() {
    if (!currentRotation || rotationSaving.current || saving.current || wheelMoving) return;
    const capturedOwner = owner, capturedDraft = currentRotation;
    const seconds = capturedDraft.pending ?? (/^\d+$/.test(capturedDraft.text.trim()) ? Number(capturedDraft.text.trim()) : NaN);
    rotationSaving.current = true; setRotationBusy(true); setRotationError('');
    try {
      writeMottoRotation(value, seconds);
      await setValue(previous => {
        if (currentOwner.current !== capturedOwner) throw new Error('账号已变化，请重新打开');
        return writeMottoRotation(previous, seconds);
      });
      if (currentOwner.current !== capturedOwner) return;
      if (hasVolatilePersonalTool('mottos', capturedOwner)) {
        setRotationDraft({ ...capturedDraft, pending: seconds });
        throw new Error('本机存储不可用，设置已保留，请重试');
      }
      setRotationDraft(null);
    } catch (error) {
      if (currentOwner.current === capturedOwner) setRotationError(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      if (currentOwner.current === capturedOwner) { rotationSaving.current = false; setRotationBusy(false); }
    }
  }

  function open(original: string | null) {
    if (!writable || saving.current || rotationSaving.current) return;
    editorPending.current = null;
    ++editGeneration.current;setMore(false);editorRef.current={owner,original};draftRef.current=original || '';setEditor(editorRef.current); setDraft(draftRef.current); setMessage('');
  }
  function commit(remove=false):Promise<boolean> {
    if(inFlight.current)return inFlight.current;
    const target=editorRef.current;if(!target || target.owner!==currentOwner.current || !writable || saving.current)return Promise.resolve(false);
    const pending=editorPending.current, text=pending?.text ?? draftRef.current, original=target.original;
    remove=pending?.remove ?? remove;
    if(!remove && !pending && text.trim()===original && !hasVolatilePersonalTool('mottos',target.owner))return Promise.resolve(true);
    if(!remove && !text.trim() && original===null)return Promise.resolve(true);
    const generation=editGeneration.current;
    const apply=(previous:typeof value)=>{
      const rows=displayedMottos(previous,defaults);
      const applied=pending && (remove ? !rows.includes(original!) : rows.includes(text.trim()) && (original===null || original===text.trim() || !rows.includes(original)));
      return applied ? previous : remove ? removeMotto(previous,defaults,original!) : writeMotto(previous,defaults,text,original);
    };
    saving.current=true;setBusy(true);setMessage('');
    const operation=(async()=>{
      try {
        if(remove && !pending) { if(original===null)return false;const result=await requestAppConfirmation({title:'删除这句格言？',content:original,confirmText:'删除',intent:'danger'});if(!result.confirm)return false; }
        if(currentOwner.current!==target.owner || editGeneration.current!==generation)return false;
        apply(value);
        await setValue(previous=>{if(!isPersonalMottos(previous))throw new Error('数据格式暂不兼容，请重新读取');if(currentOwner.current!==target.owner)throw new Error('账号已变化，请重新打开');return apply(previous);});
        if(currentOwner.current!==target.owner || editGeneration.current!==generation)return false;
        if(hasVolatilePersonalTool('mottos',target.owner)){editorPending.current={remove,text};throw new Error('本机存储不可用，输入已保留，请重试');}
        editorPending.current=null;
        if(remove){editorRef.current=null;setEditor(null);setDraft('');}
        else { const acknowledged={owner:target.owner,original:text.trim()};editorRef.current=acknowledged;setEditor(acknowledged); }
        return true;
      }catch(error){if(currentOwner.current===target.owner && editGeneration.current===generation)setMessage(error instanceof Error?error.message:'保存失败，请重试');return false;}
      finally{if(currentOwner.current===target.owner && editGeneration.current===generation){saving.current=false;setBusy(false);}}
    })();
    inFlight.current=operation;void operation.finally(()=>{if(inFlight.current===operation)inFlight.current=null;});return operation;
  }
  commitRef.current=commit;
  async function closeEditor(){
    const generation=editGeneration.current;
    if(inFlight.current && !await inFlight.current)return;
    if(!await commit() || generation!==editGeneration.current)return;
    editorRef.current=null;setEditor(null);setDraft('');setMessage('');setMore(false);
  }
  useEffect(()=>{if(!editor || busy || message || draft===editor.original || !draft.trim())return;const timer=setTimeout(()=>{void commitRef.current();},450);return()=>clearTimeout(timer);},[editor,draft,busy,message]);
  useDidHide(()=>{if(editorRef.current && draftRef.current.trim())void commitRef.current();});
  useLayoutEffect(()=>()=>{if(editorRef.current && draftRef.current.trim())void commitRef.current();},[]);
  useEffect(()=>{if(!editor || more || typeof document==='undefined')return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();void closeEditor();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[editor,more]);
  const rotationClose = useEditorCloseGuard({
    scope: currentRotation ? `${owner}:rotation` : '',
    hasChanges: !!currentRotation && (currentRotation.text !== rotationInitial.current || currentRotation.pending !== undefined),
    blocked: busy || rotationBusy || wheelMoving, onSave: saveRotation,
    onClose: () => { if (!rotationSaving.current) { setRotationDraft(null); setRotationError(''); } },
  });

  useMessageNotice(rotationError, !rotationBusy);
  useMessageNotice(message, !busy);
  return <View className='mottos-page'>
    <AppDialogHost />
    <FloatingCreateButton className='mottos-add' label='创建格言' disabled={!writable || rotationBusy} onClick={() => open(null)} />
    <PageToolbar className='mottos-heading card-group-heading' leading={<Text className='mottos-count'>{mottos.length} 句</Text>}
      manage={<><ActionMenu ariaLabel='格言页面更多操作' open={pageMore} onOpenChange={setPageMore} disabled={!rotationWritable||busy||!!editor}><ActionButton appearance='quiet' onClick={()=>{setPageMore(false);changeRotationOpen(true);}}>设置</ActionButton></ActionMenu><View id='mottos-settings-anchor'/><ChoicePopover anchorId='mottos-settings-anchor' placement='center' ariaLabel='格言轮播设置' open={!!currentRotation} onOpenChange={changeRotationOpen} disabled={!rotationWritable || busy || !!editor}
         panelWidth={240} heightMode='content' panelClassName='mottos-rotation-popover' contentKey={rotationError}
        heading={<PopoverHeading className='mottos-rotation-heading' title='轮播设置' actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭轮播设置' disabled={rotationBusy} onClick={rotationClose.requestClose}>×</ActionButton>} />}
        footer={<View><PopoverActions className='mottos-rotation-actions' separator={false}><ActionButton appearance='primary' size='compact' width='fill' loading={rotationBusy} disabled={rotationBusy || wheelMoving} onClick={() => { void saveRotation(); }}>保存</ActionButton></PopoverActions></View>}>
        <DurationWheelPicker label='格言轮播间隔' value={currentRotation?.text || '15'} max={2147483} unit='seconds' disabled={rotationBusy || currentRotation?.pending !== undefined} onMovingChange={setWheelMoving}
          onChange={text => { if (currentRotation && !rotationSaving.current) { setRotationDraft({ ...currentRotation, text }); setRotationError(''); } }} />
        <Text className='wheel-duration-total'>共 {currentRotation?.text || '15'} 秒</Text>
      </ChoicePopover></>}
       />
    {!ready || !valid ? <View className='mottos-empty'><Text>{!ready ? status : '数据格式暂不兼容，请重新读取'}</Text><ActionButton className='button-label' onClick={retry}>重新读取</ActionButton></View> : !signedIn ? <View className='mottos-empty'><Text>登录后查看自己的格言</Text><ActionButton appearance='primary' onClick={() => { void openAccount(); }}>登录账号</ActionButton></View> : <ScrollView className='mottos-list-scroll' scrollY enhanced bounces={false} showScrollbar={false}>
      <CardGroupContent className='mottos-list floating-create-content'>{mottos.map((motto, index) => <MottoRow key={`${index}:${motto}`} text={trimTextEnd(motto)} index={index} disabled={!writable} onEdit={() => open(motto)} />)}
        {!mottos.length && <EmptyState kind='mottos' />}
        </CardGroupContent>
    </ScrollView>}
    {!!status && <View className='mottos-status'><View className='mottos-status-dot' /><Text>{status}</Text></View>}
    {editor && <DocumentEditorSheet compact titledHeading title={editor.original===null ? '新建格言' : '编辑格言'} onClose={()=>{void closeEditor();}}
      heading={<EditorHeading className='motto-editor-heading' title={editor.original===null ? '新建格言' : '编辑格言'} actions={<ActionMenu ariaLabel='格言更多操作' open={more} onOpenChange={setMore} disabled={busy}>

        {editor.original===null && <ActionButton appearance='quiet' onClick={()=>{setMore(false);setDraft('');draftRef.current='';}}>清空输入</ActionButton>}{editor.original!==null && <ActionButton appearance='quiet' intent='danger' disabled={busy} onClick={()=>{setMore(false);void commit(true);}}>删除格言</ActionButton>}
      </ActionMenu>} />}
      footer={<SheetActions className='document-autosave-footer'><View className='document-autosave-status'>{message ? <><ActionButton appearance='quiet' disabled={busy} onClick={()=>{setMessage('');void commit();}}>重试</ActionButton></> : busy ? <Text>保存中…</Text> : null}</View></SheetActions>}>
      <EditorFieldsLayout><Textarea className='mottos-input compact-motto-input' ariaLabel='格言内容' placeholder='想留给自己的一句话…' value={draft} disabled={busy || !!editorPending.current} maxlength={MAX_MOTTO_LENGTH} autoHeight cursorSpacing={96} adjustPosition fixed showConfirmBar={false} onInput={event=>{draftRef.current=event.detail.value;setDraft(event.detail.value);setMessage('');}} />
</EditorFieldsLayout>
    </DocumentEditorSheet>}
    {rotationClose.dialog}
  </View>;
}
