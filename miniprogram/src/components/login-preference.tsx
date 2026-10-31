import { Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import './login-preference.css';

/** Persist the server's login ticket; never store a password for automatic login. */
export default function LoginPreference({checked, onChange, disabled = false}: {checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean}) {
  return <ActionButton appearance='quiet' width='fill' className='login-preference' aria-pressed={checked} ariaLabel='记住登录状态（30 天）' disabled={disabled} onClick={() => onChange(!checked)}><View className={`login-preference-check${checked ? ' is-checked' : ''}`} aria-hidden /><Text>记住登录状态（30 天）</Text></ActionButton>;
}
