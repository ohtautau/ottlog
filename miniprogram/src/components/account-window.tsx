import { useMessageNotice } from './message-notice';
import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import { api, type Session } from '../api';
import ActionButton, { ChoiceButton } from './ui-button';
import EditorHeading from './editor-heading';
import EditorFieldsLayout from './editor-fields-layout';
import SingleLineInput from './single-line-input';
import SheetActions from './sheet-actions';
import SheetBackdrop from './sheet-backdrop';
import LoginPreference from './login-preference';
import './account-window.css';

/** The home account entry owns authentication; no tool records are read here. */
export default function AccountWindow({ onClose }: { onClose: () => void }) {
  const [session, setSession] = useState<Session>();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0), active = useRef(true), lock = useRef(false);
  const message = (reason: unknown) => reason instanceof Error ? reason.message : '连接失败，请稍后重试';
  async function load() {
    const current = ++generation.current;
    setLoading(true); setError(''); setSession(undefined);
    try {
      const value = await api<Session>('/account/session');
      if (active.current && current === generation.current) setSession(value);
    } catch (reason) { if (active.current && current === generation.current) setError(message(reason)); }
    finally { if (active.current && current === generation.current) setLoading(false); }
  }
  useEffect(() => {
    active.current = true; void load();
    return () => { active.current = false; generation.current++; };
  }, []);
  function close() { if (!lock.current) onClose(); }
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault(); event.stopImmediatePropagation(); close();
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [onClose]);
  async function submit() {
    if (lock.current || loading || !session) return;
    const signedIn = session.authenticated;
    if (!signedIn && (!userName.trim() || (register ? password.length < 12 : !password))) return;
    lock.current = true; setBusy(true); setError('');
    const owner = signedIn ? `${session.isAdmin ? 'admin' : 'reader'}:${session.userName}` : 'guest';
    try {
      await api(`/account/${signedIn ? 'logout' : register ? 'register' : 'login'}`, 'POST', signedIn ? undefined : { userName: userName.trim(), password, ...(rememberMe ? { rememberMe: true } : {}) }, owner);
      Taro.eventCenter.trigger('ottlog-session');
      if (active.current) { setPassword(''); setRememberMe(false); await load(); }
    } catch (reason) { if (active.current) setError(message(reason)); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  const canSubmit = !!session && !loading && (session.authenticated || !!userName.trim() && (register ? password.length >= 12 : !!password));
  useMessageNotice(error, !busy);
  return <View className='account-window-overlay'>
    <SheetBackdrop onClose={close} disabled={busy} />
    <View className='account-window floating-window' role='dialog' ariaLabel='账号'>
      <EditorHeading title='账号' actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭账号窗口' disabled={busy} onClick={close}>×</ActionButton>} />
      <ScrollView className='account-window-scroll' scrollY enhanced bounces={false} showScrollbar={false}>
        <EditorFieldsLayout className='account-window-fields'>
          {loading ? <Text className='account-window-status'>正在确认账号…</Text> : session?.authenticated ? <View className='account-window-profile'>
            <View className='account-window-avatar' aria-hidden>{session.userName?.slice(0, 1).toUpperCase() || 'O'}</View>
            <View><Text className='account-window-name'>{session.userName}</Text><Text className='account-window-status'>{session.isAdmin ? '管理员账号' : '读者账号'}</Text></View>
          </View> : session ? <>
            <View className='account-window-tabs'><ChoiceButton selected={!register} disabled={busy} onClick={() => { setRegister(false); setError(''); }}>登录</ChoiceButton><ChoiceButton selected={register} disabled={busy} onClick={() => { setRegister(true); setError(''); }}>创建账号</ChoiceButton></View>
            <Text className='account-window-status'>使用同一账号同步网页与小程序的数据。</Text>
            <View><Text className='account-window-label'>账号</Text><SingleLineInput align='left' ariaLabel='账号名称' placeholder='输入博客账号' maxlength={50} value={userName} disabled={busy} onInput={event => setUserName(event.detail.value)} /></View>
            <View><Text className='account-window-label'>密码</Text><SingleLineInput align='left' ariaLabel='账号密码' placeholder={register ? '至少 12 位密码' : '输入密码'} password maxlength={128} value={password} disabled={busy} confirmType='done' onInput={event => setPassword(event.detail.value)} onConfirm={() => { void submit(); }} /></View>
            <LoginPreference checked={rememberMe} onChange={setRememberMe} disabled={busy} />
          </> : <ActionButton appearance='secondary' disabled={busy} onClick={() => { void load(); }}>重新连接</ActionButton>}

        </EditorFieldsLayout>
      </ScrollView>
      <SheetActions><ActionButton appearance={session?.authenticated ? 'secondary' : 'primary'} size='large' width='fill' loading={busy} disabled={busy || !canSubmit} onClick={() => { void submit(); }}>{session?.authenticated ? '退出登录' : register ? '注册并登录' : '登录并同步'}</ActionButton></SheetActions>
    </View>
  </View>;
}
