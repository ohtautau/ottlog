import { trimTextEnd } from '../lib/text-whitespace';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import EditorHeading from './editor-heading';
import SheetActions from './sheet-actions';
import SheetBackdrop from './sheet-backdrop';
import { registerAppDialogHost, type AppDialogSnapshot } from '../lib/app-dialog';
import './app-dialog.css';

let nextDialog = 0;
const openDialogs: number[] = [];
export default function AppDialog({ open = true, title, ariaLabel, closeLabel = '关闭提示', onClose, busy = false, error = '', panelClassName = '', actions, children }: {
  open?: boolean; title: string; ariaLabel?: string; closeLabel?: string; onClose: () => void; busy?: boolean; error?: string; panelClassName?: string; actions: ReactNode; children?: ReactNode;
}) {
  const [id] = useState(() => ++nextDialog), current = useRef({ onClose, busy });
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);
  current.current = { onClose, busy };
  useEffect(() => {
    if (!open) return;
    openDialogs.push(id); void Taro.hideKeyboard?.().catch(() => {});
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || openDialogs[openDialogs.length - 1] !== id) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!current.current.busy) current.current.onClose();
    };
    // Window capture runs before older popover listeners on document.
    if (typeof window !== 'undefined') window.addEventListener('keydown', close, true);
    return () => { const index = openDialogs.indexOf(id); if (index >= 0) openDialogs.splice(index, 1); if (typeof window !== 'undefined') window.removeEventListener('keydown', close, true); };
  }, [open, id]);
  useEffect(() => {
    if (!open) { setBodyHeight(null); return; }
    let active = true;
    const measure = () => {
      const query = Taro.createSelectorQuery();
      query.select(`#app-dialog-${id}`).boundingClientRect();
      query.select(`#app-dialog-${id} .app-dialog-body`).boundingClientRect();
      query.select(`#app-dialog-${id} .editor-heading`).boundingClientRect();
      query.select(`#app-dialog-${id} .sheet-actions`).boundingClientRect();
      query.exec(results => {
        if (!active) return;
        const [layer, body, heading, footer] = results as ({ height: number } | null)[];
        if (!layer || !body || !heading || !footer) return;
        // Explicit height keeps the native ScrollView bounded on short screens.
        setBodyHeight(Math.max(0, Math.min(body.height, layer.height - 24 - 2 - heading.height - footer.height)));
      });
    };
    const timer = setTimeout(measure, 0);
    Taro.onWindowResize?.(measure);
    return () => { active = false; clearTimeout(timer); Taro.offWindowResize?.(measure); };
  }, [open, id, title, children, error, actions]);
  if (!open) return null;
  return <View id={`app-dialog-${id}`} className='app-dialog-layer' catchMove>
    <SheetBackdrop disabled={busy} onClose={onClose} />
    <View className={`app-dialog-panel ${panelClassName}`} role='dialog' aria-modal='true' ariaLabel={ariaLabel || title} onClick={event => event.stopPropagation()}>
      <EditorHeading variant='prompt' title={title} actions={<ActionButton appearance='icon' size='compact' ariaLabel={closeLabel} disabled={busy} onClick={onClose}>×</ActionButton>} />
      {(children != null || error) && <ScrollView scrollY enhanced bounces={false} showScrollbar={false} className='app-dialog-scroll' style={bodyHeight == null ? undefined : { height: `${bodyHeight}px` }}><View className='app-dialog-body'>{children}{!!error && <View className='app-dialog-error' role='alert'>{trimTextEnd(error)}</View>}</View></ScrollView>}
      <SheetActions>{actions}</SheetActions>
    </View>
  </View>;
}

export function AppDialogHost() {
  const [state, setState] = useState<AppDialogSnapshot>({ confirmation: null, message: null });
  const registration = useRef<ReturnType<typeof registerAppDialogHost> | null>(null);
  useEffect(() => {
    const host = registerAppDialogHost(Taro.getCurrentInstance().router?.path || '', setState);
    registration.current = host;
    return () => { registration.current = null; host.dispose(); };
  }, []);
  useDidShow(() => registration.current?.activate());
  useDidHide(() => registration.current?.hide());
  const request = state.confirmation;
  const answer = (confirm: boolean) => { if (request) registration.current?.answer(request.id, confirm); };
  return <>
    {request && <AppDialog title={request.options.title || '提示'} onClose={() => answer(false)} actions={<>
      {request.options.cancelText === '不保存' && <ActionButton size='large' width='fill' onClick={() => answer(false)}>不保存</ActionButton>}
      <ActionButton appearance={request.options.intent === 'danger' ? 'danger' : 'primary'} size='large' width='fill' onClick={() => answer(true)}>{request.options.confirmText || '确认'}</ActionButton>
    </>}>{request.options.content && <Text>{trimTextEnd(request.options.content)}</Text>}</AppDialog>}
    {state.message && <View className='app-message' role='status' aria-live='polite'><Text>{trimTextEnd(state.message.options.title)}</Text></View>}
  </>;
}
