import './remember-login.css';

/** Shared by the account page, administrator form and browser account window. */
export default function RememberLogin({checked, onChange, disabled = false}: {checked?: boolean; onChange?: (checked: boolean) => void; disabled?: boolean}) {
  return <label className='remember-login-field'><input type='checkbox' name='rememberMe' checked={checked} disabled={disabled} onChange={onChange ? event => onChange(event.currentTarget.checked) : undefined}/><span>记住登录状态（30 天）</span></label>;
}
