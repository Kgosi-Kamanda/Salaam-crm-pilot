// src/features/auth/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BRAND, FONT, BANK_INFO } from '../../utils/constants';
import { Input } from '../../components/Form/Input.jsx';
import Button from '../../components/Form/Button.jsx';
import { authAPI } from '../../api/auth';
import { tokenHelpers } from '../../utils/auth';

export default function LoginPage() {
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [email,        setEmail]    = useState('');
  const [password,     setPassword] = useState('');
  const [error,        setError]    = useState('');
  const [loading,      setLoading]  = useState(false);
  // Change password screen
  const [mustChange,   setMustChange]  = useState(false);
  const [curPass,      setCurPass]     = useState('');
  const [newPass,      setNewPass]     = useState('');
  const [confirmPass,  setConfirmPass] = useState('');
  const [cpErr,        setCpErr]       = useState('');
  const [cpLoading,    setCpLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password are required'); return; }
    setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      if (user.must_change_password) {
        setCurPass(password); // pre-fill current password
        setMustChange(true);
      } else {
        navigate(user.role === 'admin' ? '/admin' : '/inbox');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!newPass || !confirmPass) { setCpErr('Both fields are required'); return; }
    if (newPass !== confirmPass)  { setCpErr('Passwords do not match');  return; }
    if (newPass.length < 10)      { setCpErr('Password must be at least 10 characters'); return; }
    if (!/[A-Z]/.test(newPass))   { setCpErr('Must include an uppercase letter');       return; }
    if (!/[0-9]/.test(newPass))   { setCpErr('Must include a number');                  return; }
    if (!/[^A-Za-z0-9]/.test(newPass)) { setCpErr('Must include a special character');  return; }
    setCpErr(''); setCpLoading(true);
    try {
      await authAPI.changePassword({ current_password: curPass, new_password: newPass });
      const user = await refreshUser();
      navigate(user.role === 'admin' ? '/admin' : '/inbox');
    } catch (e) {
      setCpErr(e.response?.data?.error || 'Failed to change password');
    } finally { setCpLoading(false); }
  };

  const card = (content) => (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg,${BRAND.NAVY_DARK} 0%,${BRAND.NAVY} 60%,${BRAND.NAVY_MID} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '46px 44px', width: '100%', maxWidth: 420, boxShadow: '0 24px 80px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: BRAND.NAVY }}>{BANK_INFO.name.split(' ')[0]}</div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, color: '#888', textTransform: 'uppercase', marginTop: 3 }}>{BANK_INFO.name.split(' ').slice(1).join(' ')}</div>
          <div style={{ marginTop: 8, display: 'inline-block', background: `${BRAND.PEACH}30`, color: BRAND.PEACH_DARK, fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20 }}>Social CRM</div>
          <div style={{ fontSize: 10, color: '#bbb', marginTop: 6, fontStyle: 'italic' }}>{BANK_INFO.slogan}</div>
        </div>
        {content}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#bbb', marginTop: 22 }}>
          {BANK_INFO.website} &bull; {BANK_INFO.phones[0]}
        </div>
      </div>
    </div>
  );

  if (mustChange) return card(
    <>
      <div style={{ fontSize: 18, fontWeight: 800, color: BRAND.TEXT, marginBottom: 4 }}>Set a new password</div>
      <div style={{ fontSize: 12, color: '#f59e0b', background: '#fffbeb', borderRadius: 8, padding: '8px 12px', marginBottom: 20, lineHeight: 1.5 }}>
        Your account requires a password change before you can continue. Please set a strong password.
      </div>
      {cpErr && <div style={{ background: '#FFF0F0', borderRadius: 9, padding: '11px 14px', color: '#C62828', fontSize: 12, marginBottom: 16 }}>{cpErr}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        <Input label="New password" type="password" value={newPass}     onChange={e => setNewPass(e.target.value)}     placeholder="Min 10 chars, uppercase, number, special" />
        <Input label="Confirm new password" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat new password" />
      </div>
      <div style={{ fontSize: 11, color: BRAND.MUTED, marginBottom: 16, lineHeight: 1.6 }}>
        Requirements: at least 10 characters, one uppercase letter, one number, one special character (!@#$%...).
      </div>
      <Button onClick={handleChangePassword} loading={cpLoading} disabled={!newPass||!confirmPass} fullWidth style={{ padding: 13, fontSize: 14 }}>Set New Password</Button>
    </>
  );

  return card(
    <>
      <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.TEXT, marginBottom: 4 }}>Welcome back</div>
      <div style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>Sign in to your team account</div>
      {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', color: '#C62828', fontSize: 13, marginBottom: 18 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 22 }}>
        <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleLogin()} placeholder="you@salaam.com" required />
        <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleLogin()} placeholder="••••••••" required />
      </div>
      <Button onClick={handleLogin} loading={loading} disabled={!email||!password} fullWidth style={{ padding: 13, fontSize: 15 }}>Sign In</Button>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#ccc', marginTop: 24 }}>
        Access is restricted to authorised Salaam Microfinance Bank team members. Contact your administrator if you need an account.
      </div>
    </>
  );
}
