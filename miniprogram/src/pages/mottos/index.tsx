import SheetActions, { SheetDeleteButton } from '../../components/sheet-actions';
import { trimTextEnd } from '../../lib/text-whitespace';
import { useEffect, useRef, useState } from 'react';
import { useDidShow } from '@tarojs/taro';
import { Button, ScrollView, Text, Textarea, View } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import ManageSymbol, { EditSymbol } from '../../components/manage-symbol';
import { api } from '../../api';
import { defaultMottos } from '../../lib/motto-defaults';
import { displayedMottos, initialPersonalMottos, isPersonalMottos, MAX_MOTTO_LENGTH, mottoRotationMs, removeMotto, writeMotto } from '../../lib/motto-data';
import { writeMottoRotation } from '../../lib/motto-settings';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import CreateButton from '../../components/create-button';
import PageToolbar from '../../components/page-toolbar';
import { ChoicePopover, PopoverHeading, PopoverActions } from '../../components/form-options';
import SingleLineInput, { NumericInputRow } from '../../components/single-line-input';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import { requestAppConfirmation } from '../../lib/app-dialog';
import { AppDialogHost } from '../../components/app-dialog';
import EditorHeading from '../../components/editor-heading';
import EditorFieldsLayout from '../../components/editor-fields-layout';
import './index.css';

export default function MottosPage() {
  const { value, setValue, ready, owner, status, retry } = usePersonalToolState('mottos', initialPersonalMottos);
  const [defaults, setDefaults] = useState(defaultMottos);
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [editor, setEditor] = useState<{ owner: string; original: string | null } | null>(null);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [rotationDraft, setRotationDraft] = useState<{ owner: string; text: string; pending?: number } | null>(null);
  const [rotationBusy, setRotationBusy] = useState(false), [rotationError, setRotationError] = useState('');
  const rotationInitial = useRef('');
  const editorPending = useRef<{ remove: boolean; text: string } | null>(null);
  const rotationSaving = useRef(false);
  const saving = useRef(false);
  const generation = useRef(0);
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const valid = isPersonalMottos(value);
  const mottos = displayedMottos(value, defaults);
  const writable = ready && valid && (!loadingDefaults || value.mottos !== null);
  const rotationWritable = ready && valid && !!owner;
  const currentRotation = rotationWritable && rotationDraft?.owner === owner ? rotationDraft : null;

  useDidShow(() => {
    const version = ++generation.current;
    setLoadingDefaults(true);
    void api<{ mottos: string[] }>('/mottos').then(result => {
      if (version !== generation.current) return;
      if (Array.isArray(result.mottos) && result.mottos.length && result.mottos.every(text => typeof text === 'string' && text.trim() && text.length <= MAX_MOTTO_LENGTH)) setDefaults(result.mottos);
    }).catch(() => {}).finally(() => { if (version === generation.current) setLoadingDefaults(false); });
  });
  useEffect(() => () => { ++generation.current; }, []);
  useEffect(() => { setEditor(null); setDraft(''); setMessage(''); setBusy(false); saving.current = false; editorPending.current = null; setRotationDraft(null); setRotationError(''); setRotationBusy(false); rotationSaving.current = false; }, [owner]);

  function changeRotationOpen(open: boolean) {
    if (rotationSaving.current || saving.current) return;
    if (!open) { rotationClose.requestClose(); return; }
    setRotationError('');
    rotationInitial.current = String(mottoRotationMs(value) / 1000);
    setRotationDraft(rotationWritable ? { owner, text: rotationInitial.current } : null);
  }
  async function saveRotation() {
    if (!currentRotation || rotationSaving.current || saving.current) return;
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
    setEditor({ owner, original }); setDraft(original || ''); setMessage('');
  }
  async function commit(remove = false) {
    if (!editor || editor.owner !== owner || !writable || saving.current) return;
    const capturedOwner = owner, original = editor.original;
    const pending = editorPending.current;
    remove = pending?.remove ?? remove;
    const text = pending?.text ?? draft;
    const apply = (previous: typeof value) => {
      const current = displayedMottos(previous, defaults);
      const alreadyApplied = pending && (remove ? !current.includes(original!) : current.includes(text.trim()) && (original === null || original === text.trim() || !current.includes(original)));
      return alreadyApplied ? previous : remove ? removeMotto(previous, defaults, original!) : writeMotto(previous, defaults, text, original);
    };
    saving.current = true; setBusy(true); setMessage('');
    try {
      if (remove && !pending) {
        if (original === null) return;
        const confirmation = await requestAppConfirmation({ title: '删除这句格言？', content: original, confirmText: '删除', intent: 'danger' });
        if (!confirmation.confirm) return;
      }
      if (currentOwner.current !== capturedOwner) return;
      // Catch ordinary form errors before the shared store treats a failed edit
      // as stale account state and reloads it. Recheck inside the updater too.
      apply(value);
      await setValue(previous => {
        if (!isPersonalMottos(previous)) throw new Error('数据格式暂不兼容，请重新读取');
        if (currentOwner.current !== capturedOwner) throw new Error('账号已变化，请重新打开');
        return apply(previous);
      });
      if (currentOwner.current !== capturedOwner) return;
      if (hasVolatilePersonalTool('mottos', capturedOwner)) { editorPending.current = { remove, text }; throw new Error('本机存储不可用，输入已保留，请重试'); }
      editorPending.current = null; setEditor(null); setDraft('');
    } catch (error) {
      if (currentOwner.current === capturedOwner) setMessage(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      if (currentOwner.current === capturedOwner) { saving.current = false; setBusy(false); }
    }
  }

  const editorClose = useEditorCloseGuard({
    scope: editor?.owner === owner && writable ? `${owner}:motto:${editor.original ?? 'new'}` : '',
    hasChanges: !!editor && (draft !== (editor.original || '') || !!editorPending.current),
    blocked: busy || rotationBusy, onSave: () => commit(),
    onClose: () => { if (!saving.current) { setEditor(null); setDraft(''); setMessage(''); editorPending.current = null; } },
  });
  const rotationClose = useEditorCloseGuard({
    scope: currentRotation ? `${owner}:rotation` : '',
    hasChanges: !!currentRotation && (currentRotation.text !== rotationInitial.current || currentRotation.pending !== undefined),
    blocked: busy || rotationBusy, onSave: saveRotation,
    onClose: () => { if (!rotationSaving.current) { setRotationDraft(null); setRotationError(''); } },
  });

  return <View className='mottos-page'>
    <AppDialogHost />
    <PageToolbar className='mottos-heading' leading={<Text className='mottos-count'>{mottos.length} 句</Text>}
      manage={<ChoicePopover ariaLabel='格言轮播设置' open={!!currentRotation} onOpenChange={changeRotationOpen} disabled={!rotationWritable || busy || !!editor}
        trigger={<ManageSymbol />} triggerIconOnly triggerSize='compact' showIndicator={false} panelWidth={240} heightMode='content' panelClassName='mottos-rotation-popover' contentKey={rotationError}
        heading={<PopoverHeading className='mottos-rotation-heading' title='轮播设置' actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭轮播设置' disabled={rotationBusy} onClick={rotationClose.requestClose}>×</ActionButton>} />}
        footer={<View><PopoverActions className='mottos-rotation-actions' separator={false}><ActionButton appearance='primary' size='compact' width='fill' loading={rotationBusy} disabled={rotationBusy} onClick={() => { void saveRotation(); }}>保存</ActionButton></PopoverActions>{rotationError && <View className='mottos-rotation-error' role='alert'>{rotationError}</View>}</View>}>
        <NumericInputRow className='mottos-rotation-field'><Text>间隔</Text><SingleLineInput size='compact' type='number' ariaLabel='格言轮播间隔' value={currentRotation?.text || ''} disabled={rotationBusy || currentRotation?.pending !== undefined} maxlength={7}
          onInput={event => { if (currentRotation && !rotationSaving.current) { setRotationDraft({ ...currentRotation, text: event.detail.value }); setRotationError(''); } }} /><Text>秒</Text></NumericInputRow>
      </ChoicePopover>}
      create={<CreateButton className='mottos-add' label='创建格言' disabled={!writable || rotationBusy} onClick={() => open(null)} />} />
    {!ready || !valid ? <View className='mottos-empty'><Text>{!ready ? status : '数据格式暂不兼容，请重新读取'}</Text><ActionButton className='button-label' onClick={retry}>重新读取</ActionButton></View> : <ScrollView className='mottos-list-scroll' scrollY enhanced bounces={false} showScrollbar={false}>
      <View className='mottos-list'>{mottos.map((motto, index) => <Button key={`${index}:${motto}`} className='mottos-row' ariaLabel={`编辑第 ${index + 1} 句格言`} disabled={!writable} onClick={() => open(motto)}><Text className='mottos-number'>{String(index + 1).padStart(2, '0')}</Text><Text className='mottos-text'>{trimTextEnd(motto)}</Text><EditSymbol /></Button>)}
        {!mottos.length && <View className='mottos-empty'><Text className='mottos-empty-mark' aria-hidden>“</Text><Text>还没有格言</Text><CreateButton label='创建格言' onClick={() => open(null)} /></View>}
      </View>
    </ScrollView>}
    {!!status && <View className='mottos-status'><View className='mottos-status-dot' /><Text>{status}</Text></View>}
    {editor && <View className='mottos-editor-overlay'><View className='mottos-editor-backdrop' catchMove onClick={editorClose.requestClose} /><View className='mottos-editor-sheet'>
      <EditorHeading embedded className='mottos-editor-heading' title={editor.original === null ? '创建格言' : '编辑格言'} actions={<ActionButton appearance='icon' className='button-label' ariaLabel='关闭格言编辑' disabled={busy} onClick={editorClose.requestClose}>×</ActionButton>} />
      <EditorFieldsLayout><Textarea className='mottos-input' ariaLabel='格言内容' placeholder='想留给自己的一句话…' value={draft} disabled={busy || !!editorPending.current} maxlength={MAX_MOTTO_LENGTH} cursorSpacing={96} adjustPosition fixed showConfirmBar={false} onInput={event => setDraft(event.detail.value)} />
      <View className='mottos-editor-meta'><Text>{draft.length} / {MAX_MOTTO_LENGTH}</Text></View>
      {message && <Text className='mottos-message'>{message}</Text>}</EditorFieldsLayout>
      <SheetActions className='mottos-editor-footer' leading={editor.original !== null ? <SheetDeleteButton ariaLabel='删除格言' disabled={busy || !!editorPending.current} onClick={() => { void commit(true); }} /> : undefined}><ActionButton appearance='primary' className='button-label mottos-save' disabled={busy || !draft.trim()} loading={busy} onClick={() => { void commit(); }}>{editor.original === null ? '创建格言' : '保存'}</ActionButton></SheetActions>
    </View></View>}
    {editorClose.dialog}{rotationClose.dialog}
  </View>;
}
