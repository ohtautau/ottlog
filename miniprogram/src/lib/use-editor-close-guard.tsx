import { useEffect, useRef, useState } from 'react';
import { Text } from '@tarojs/components';
import AppDialog from '../components/app-dialog';
import ActionButton from '../components/ui-button';
import { showAppMessage } from './app-dialog';

/** Guard only uncommitted edits; hosts retain their existing account and save queues. */
export default function useEditorCloseGuard(options: {
  scope: string; hasChanges: boolean; blocked?: boolean;
  onSave: () => boolean | void | Promise<boolean | void>; onClose: () => void;
}) {
  const [prompt, setPrompt] = useState<{ scope: string; revision: number } | null>(null), [saving, setSaving] = useState(false);
  const current = useRef(options), mounted = useRef(true), savingRef = useRef(false);
  const context = useRef({ scope: options.scope, revision: 0 });
  if (context.current.scope !== options.scope) context.current = { scope: options.scope, revision: context.current.revision + 1 };
  current.current = options;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setPrompt(null); setSaving(false); savingRef.current = false; }, [options.scope]);
  function requestClose() {
    const latest = current.current;
    if (!latest.scope || latest.blocked || savingRef.current) return;
    if (latest.hasChanges) setPrompt({ scope: latest.scope, revision: context.current.revision });
    else latest.onClose();
  }
  function dismissPrompt() { if (!savingRef.current) setPrompt(null); }
  function discard() {
    if (savingRef.current || current.current.blocked || prompt?.scope !== current.current.scope || prompt?.revision !== context.current.revision) return;
    setPrompt(null); current.current.onClose();
  }
  async function save() {
    const scope = prompt?.scope, revision = prompt?.revision, latest = current.current;
    if (!scope || latest.scope !== scope || revision !== context.current.revision || latest.blocked || savingRef.current) return;
    savingRef.current = true; setSaving(true);
    try {
      const saved = await latest.onSave();
      if (mounted.current && current.current.scope === scope && context.current.revision === revision) { setPrompt(null); if (saved === true) current.current.onClose(); }
    } catch (error) {
      if (mounted.current && current.current.scope === scope && context.current.revision === revision) { setPrompt(null); void showAppMessage({ title: error instanceof Error ? error.message : '保存失败，请重试', icon: 'none' }); }
    } finally {
      if (mounted.current && current.current.scope === scope && context.current.revision === revision) { savingRef.current = false; setSaving(false); }
    }
  }
  return { requestClose, dialog: <AppDialog open={!!prompt && prompt.scope === options.scope && prompt.revision === context.current.revision} title='保存修改？' closeLabel='继续编辑' onClose={dismissPrompt} busy={saving || !!options.blocked} actions={<>
    <ActionButton size='large' width='fill' disabled={saving || options.blocked} onClick={discard}>不保存</ActionButton>
    <ActionButton appearance='primary' size='large' width='fill' loading={saving} disabled={saving || options.blocked} onClick={() => { void save(); }}>保存</ActionButton>
  </>}><Text>有尚未保存的修改，是否保存？</Text></AppDialog> };
}
