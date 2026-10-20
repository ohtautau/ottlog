import { useEffect, useRef, useState } from 'react';
import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { deleteDomain, domainIcon, isDomainState, MAX_DOMAIN_COUNT, saveDomain, type DomainState } from './domain-data';
import { alignHabitDomain } from './habit-domains';
import { cleanState, isReminderState, type ReminderState } from './reminder-data';
import { hasVolatilePersonalTool, type PersonalToolSetter } from './use-personal-tool-state';
import useEditorCloseGuard from './use-editor-close-guard';

type ToolSource<T> = { value: T; setValue: PersonalToolSetter<T>; ready: boolean; owner: string };
export type DomainDefinitionDraft = { owner: string; id?: string; pendingId?: string; name: string; iconId: string };
type DeleteDraft = { owner: string; id: string; name: string };
type Options = { locked?: boolean; onSaved?: (id: string) => void; onDeleted?: (id: string) => void };

/** Domain list and detail share definitions; the existing tool store owns every write. */
export default function useDomainDefinition(domainTool: ToolSource<DomainState>, habitTool: ToolSource<ReminderState>, options: Options = {}) {
  const context = useRef({ domainTool, habitTool, options });
  context.current = { domainTool, habitTool, options };
  const mounted = useRef(true), saving = useRef(false), visible = useRef(true), generation = useRef(0), previousOwner = useRef('');
  const [editor, setEditor] = useState<DomainDefinitionDraft | null>(null);
  const [deleteDraft, setDeleteDraft] = useState<DeleteDraft | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ owner: string; text: string } | null>(null);
  const writable = domainTool.ready && !!domainTool.owner && isDomainState(domainTool.value);
  const currentEditor = writable && editor?.owner === domainTool.owner ? editor : null;
  const currentDelete = writable && deleteDraft?.owner === domainTool.owner ? deleteDraft : null;
  const blocked = busy || !!options.locked;
  const original = currentEditor?.id ? domainTool.value.domains.find(domain => domain.id === currentEditor.id) : undefined;
  const closeGuard = useEditorCloseGuard({ scope: currentEditor ? `${currentEditor.owner}:${currentEditor.id || 'new'}` : '', hasChanges: !!currentEditor && (currentEditor.name !== (original?.name || '') || currentEditor.iconId !== (original ? domainIcon(original) : 'star') || !!currentEditor.pendingId || hasVolatilePersonalTool('domains', currentEditor.owner)), blocked, onSave: save, onClose: () => { setEditor(null); setIconOpen(false); setFeedback(null); } });

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++generation.current; }; }, []);
  useDidShow(() => { visible.current = true; });
  useDidHide(() => { visible.current = false; ++generation.current; setEditor(null); setDeleteDraft(null); setIconOpen(false); });
  useEffect(() => {
    if (domainTool.owner && previousOwner.current && domainTool.owner !== previousOwner.current) {
      ++generation.current; setEditor(null); setDeleteDraft(null); setIconOpen(false); setFeedback(null);
    }
    if (domainTool.owner) previousOwner.current = domainTool.owner;
  }, [domainTool.owner]);
  useEffect(() => {
    if ((!currentEditor && !currentDelete) || typeof document === 'undefined') return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving.current || context.current.options.locked) return;
      event.preventDefault(); event.stopPropagation();
      if (iconOpen) setIconOpen(false);
      else if (currentDelete) closeDelete(); else closeGuard.requestClose();
    };
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, [currentEditor, currentDelete, iconOpen, closeGuard.requestClose]);

  function available() {
    const current = context.current;
    return mounted.current && visible.current && !saving.current && !current.options.locked
      && current.domainTool.ready && !!current.domainTool.owner && isDomainState(current.domainTool.value);
  }
  function openCreate() {
    if (!available()) return;
    const { owner, value } = context.current.domainTool;
    if (value.domains.length >= MAX_DOMAIN_COUNT) return;
    setDeleteDraft(null); setIconOpen(false); setFeedback(null);
    setEditor({ owner, name: '', iconId: 'star' });
  }
  function openEdit(id: string) {
    if (!available()) return;
    const { owner, value } = context.current.domainTool;
    const domain = value.domains.find(item => item.id === id);
    if (!domain || domain.name === '未分类') return;
    setDeleteDraft(null); setIconOpen(false); setFeedback(null);
    setEditor({ owner, id, name: domain.name, iconId: domainIcon(domain) });
  }
  function openDelete(id: string) {
    if (!available()) return;
    const { owner, value } = context.current.domainTool;
    const domain = value.domains.find(item => item.id === id);
    if (!domain || domain.name === '未分类') return;
    setEditor(null); setIconOpen(false); setFeedback(null);
    setDeleteDraft({ owner, id, name: domain.name });
  }
  function close() {
    if (saving.current || context.current.options.locked) return;
    if (iconOpen) { setIconOpen(false); return; }
    closeGuard.requestClose();
  }
  function closeDelete() {
    if (saving.current || context.current.options.locked) return;
    setDeleteDraft(null); setFeedback(null);
  }
  function setName(name: string) {
    if (!available()) return;
    const owner = context.current.domainTool.owner;
    setEditor(previous => previous?.owner === owner ? { ...previous, name } : previous);
  }
  function openIcons() {
    if (!currentEditor || !available()) return;
    void Taro.hideKeyboard().catch(() => {}); setIconOpen(true);
  }
  function closeIcons() { if (!saving.current) setIconOpen(false); }
  function setIcon(iconId: string) {
    if (!available()) return;
    const owner = context.current.domainTool.owner;
    setEditor(previous => previous?.owner === owner ? { ...previous, iconId } : previous);
    setIconOpen(false);
  }

  async function save() {
    const draft = currentEditor;
    if (!draft || !available()) return;
    const captured = context.current, token = generation.current;
    const isCurrent = () => mounted.current && visible.current && token === generation.current && context.current.domainTool.owner === draft.owner;
    let savedId = draft.id || draft.pendingId;
    saving.current = true; setBusy(true); setFeedback(null);
    try {
      const input = { ...draft, id: savedId };
      const original = captured.domainTool.value.domains.find(domain => domain.id === draft.id);
      if (original?.name === '未分类') throw new Error('未分类领域不可改名');
      saveDomain(captured.domainTool.value, input);
      if (draft.id && original?.name !== draft.name.trim()) {
        const habits = context.current.habitTool;
        if (!habits.ready || habits.owner !== draft.owner || !isReminderState(habits.value)) throw new Error('习惯数据尚未就绪，请重新读取后改名');
        await habits.setValue(previous => {
          const latest = context.current;
          if (!isCurrent() || !latest.domainTool.ready || !isDomainState(latest.domainTool.value)
            || !latest.habitTool.ready || latest.habitTool.owner !== draft.owner || !isReminderState(latest.habitTool.value) || !isReminderState(previous)) throw new Error('账号或习惯已变化，请重新打开');
          const old = cleanState(previous);
          return { ...old, items: old.items.map(item => alignHabitDomain(item, latest.domainTool.value.domains)) };
        });
        if (!isCurrent()) return;
        if (hasVolatilePersonalTool('reminders', draft.owner)) throw new Error('本机习惯尚未保存，请重试');
      }
      await captured.domainTool.setValue(previous => {
        if (!isCurrent() || !context.current.domainTool.ready || !isDomainState(context.current.domainTool.value) || !isDomainState(previous)) throw new Error('账号或领域已变化，请重新打开');
        if (draft.id && previous.domains.some(domain => domain.id === draft.id && domain.name === '未分类')) throw new Error('未分类领域不可改名');
        const next = saveDomain(previous, input);
        savedId = next.domains.find(domain => domain.name === input.name.trim())?.id;
        return next;
      });
      if (!isCurrent()) return;
      if (hasVolatilePersonalTool('domains', draft.owner)) throw new Error('本机尚未保存，请重试');
      setEditor(null); setIconOpen(false);
      if (savedId) context.current.options.onSaved?.(savedId);
    } catch (reason) {
      if (isCurrent()) {
        setFeedback({ owner: draft.owner, text: reason instanceof Error ? reason.message : '保存失败，请重试' });
        if (!draft.id && savedId) setEditor(previous => previous?.owner === draft.owner ? { ...previous, pendingId: savedId } : previous);
      }
    } finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  async function confirmDelete() {
    const draft = currentDelete;
    if (!draft || !available()) return;
    const captured = context.current, token = generation.current;
    const isCurrent = () => mounted.current && visible.current && token === generation.current && context.current.domainTool.owner === draft.owner;
    saving.current = true; setBusy(true); setFeedback(null);
    try {
      await captured.domainTool.setValue(previous => {
        if (!isCurrent() || !context.current.domainTool.ready || !isDomainState(context.current.domainTool.value) || !isDomainState(previous)) throw new Error('账号或领域已变化，请重新打开');
        if (previous.domains.some(domain => domain.id === draft.id && domain.name === '未分类')) throw new Error('未分类领域不可删除');
        return deleteDomain(previous, draft.id);
      });
      if (!isCurrent()) return;
      if (hasVolatilePersonalTool('domains', draft.owner)) throw new Error('本机尚未保存，请重试');
      setDeleteDraft(null); context.current.options.onDeleted?.(draft.id);
    } catch (reason) { if (isCurrent()) setFeedback({ owner: draft.owner, text: reason instanceof Error ? reason.message : '保存失败，请重试' }); }
    finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  return { currentEditor, currentDelete, iconOpen, busy, blocked, error: feedback?.owner === domainTool.owner ? feedback.text : '',
    closeDialog: closeGuard.dialog, openCreate, openEdit, openDelete, save, confirmDelete, close, closeDelete, openIcons, closeIcons, setName, setIcon };
}

export type DomainDefinitionController = ReturnType<typeof useDomainDefinition>;
