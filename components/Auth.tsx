'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { isValidEmail, isValidPseudo, isValidPassword, isValidPhone, loginUser, registerUser } from '../lib/store';

type Mode = 'login' | 'register';

type FormState = {
  name: string;
  pseudo: string;
  email: string;
  phone: string;
  password: string;
  team: string;
};

const EMPTY_FORM: FormState = { name: '', pseudo: '', email: '', phone: '', password: '', team: 'Real Madrid' };

export default function Auth({ onAuthenticated }: { onAuthenticated: (userId: string) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [f, setF] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function set<K extends keyof FormState>(key: K, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setFormError('');
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setErrors({});
    setFormError('');
  }

  function validateLogin(): boolean {
    const next: Record<string, string> = {};
    if (!f.email.trim()) next.email = 'Entre ton email.';
    if (!f.password) next.password = 'Entre ton mot de passe.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateRegister(): boolean {
    const next: Record<string, string> = {};
    if (!f.name.trim()) next.name = 'Le nom est obligatoire.';
    if (!f.pseudo.trim()) next.pseudo = 'Le pseudo est obligatoire.';
    else if (!isValidPseudo(f.pseudo)) next.pseudo = '3 à 20 caractères : lettres, chiffres, underscore.';
    if (!f.email.trim()) next.email = "L'email est obligatoire.";
    else if (!isValidEmail(f.email)) next.email = "Format d'email invalide.";
    if (f.phone && !isValidPhone(f.phone)) next.phone = 'Numéro de téléphone invalide.';
    if (!f.team.trim()) next.team = "Le nom d'équipe eFootball est obligatoire.";
    if (!f.password) next.password = 'Le mot de passe est obligatoire.';
    else if (!isValidPassword(f.password)) next.password = 'Minimum 6 caractères.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    setFormError('');
    if (mode === 'login') {
      if (!validateLogin()) return;
      setLoading(true);
      try {
        const userId = await loginUser(f.email.trim().toLowerCase(), f.password);
        onAuthenticated(userId);
      } catch (e: any) {
        setFormError(e.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!validateRegister()) return;
    setLoading(true);
    try {
      const userId = await registerUser({
        name: f.name.trim(),
        pseudo: f.pseudo.trim(),
        email: f.email.trim().toLowerCase(),
        phone: f.phone.trim(),
        password: f.password,
        team: f.team.trim(),
      });
      onAuthenticated(userId);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submit();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo-big">⚽</div>
        <h1>EFO Challenge</h1>
        <p className="muted">Duels eFootball entre joueurs.</p>

        {mode === 'register' ? (
          <>
            <AuthField label="Nom" value={f.name} onChange={(v) => set('name', v)} error={errors.name} onKeyDown={handleKeyDown} />
            <AuthField label="Pseudo" value={f.pseudo} onChange={(v) => set('pseudo', v)} error={errors.pseudo} onKeyDown={handleKeyDown} />
            <AuthField label="Email" type="email" value={f.email} onChange={(v) => set('email', v)} error={errors.email} onKeyDown={handleKeyDown} />
            <AuthField label="Téléphone (optionnel)" value={f.phone} onChange={(v) => set('phone', v)} error={errors.phone} onKeyDown={handleKeyDown} />
            <AuthField label="Nom de ton équipe eFootball" value={f.team} onChange={(v) => set('team', v)} error={errors.team} onKeyDown={handleKeyDown} />
            <PasswordField value={f.password} onChange={(v) => set('password', v)} error={errors.password} show={showPassword} toggle={() => setShowPassword((s) => !s)} onKeyDown={handleKeyDown} />
          </>
        ) : (
          <>
            <AuthField label="Email" type="email" value={f.email} onChange={(v) => set('email', v)} error={errors.email} onKeyDown={handleKeyDown} />
            <PasswordField value={f.password} onChange={(v) => set('password', v)} error={errors.password} show={showPassword} toggle={() => setShowPassword((s) => !s)} onKeyDown={handleKeyDown} />
          </>
        )}

        {formError && <p className="error">{formError}</p>}

        <button className="primary full" onClick={submit} disabled={loading}>
          {loading ? 'Un instant…' : mode === 'register' ? 'Créer mon compte' : 'Se connecter'}
        </button>
        <button className="link-btn" onClick={switchMode} type="button" disabled={loading}>
          {mode === 'register' ? "J'ai déjà un compte" : 'Créer un compte'}
        </button>
      </div>
    </div>
  );
}

function AuthField({ label, value, onChange, type = 'text', error, onKeyDown }: { label: string; value: string; onChange: (v: string) => void; type?: string; error?: string; onKeyDown?: (e: React.KeyboardEvent) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} className={error ? 'input-error' : ''} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function PasswordField({ value, onChange, error, show, toggle, onKeyDown }: { value: string; onChange: (v: string) => void; error?: string; show: boolean; toggle: () => void; onKeyDown?: (e: React.KeyboardEvent) => void }) {
  return (
    <label className="field">
      <span>Mot de passe</span>
      <div className="password-wrap">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} className={error ? 'input-error' : ''} />
        <button type="button" className="password-toggle" onClick={toggle} tabIndex={-1}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
  }
