'use client';
import { useState } from 'react';
import type { User } from '../lib/store';
import { isValidPseudo, isValidPhone } from '../lib/store';

export default function Profile({ me, users, onSave }: { me: User; users: User[]; onSave: (fields: { name: string; pseudo: string; phone: string; team: string }) => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(me.name);
  const [pseudo, setPseudo] = useState(me.pseudo);
  const [team, setTeam] = useState(me.team);
  const [phone, setPhone] = useState(me.phone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setName(me.name);
    setPseudo(me.pseudo);
    setTeam(me.team);
    setPhone(me.phone);
    setErrors({});
    setSuccess('');
    setEdit(true);
  }

  async function save() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Le nom est obligatoire.';
    if (!pseudo.trim()) next.pseudo = 'Le pseudo est obligatoire.';
    else if (!isValidPseudo(pseudo)) next.pseudo = '3 à 20 caractères : lettres, chiffres, underscore.';
    else if (users.some((u) => u.id !== me.id && u.pseudo.toLowerCase() === pseudo.trim().toLowerCase())) next.pseudo = 'Ce pseudo est déjà utilisé.';
    if (!team.trim()) next.team = "Le nom d'équipe eFootball est obligatoire.";
    if (phone && !isValidPhone(phone)) next.phone = 'Numéro de téléphone invalide.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await onSave({ name: name.trim(), pseudo: pseudo.trim(), team: team.trim(), phone: phone.trim() });
      setEdit(false);
      setSuccess('Profil mis à jour.');
    } catch (e: any) {
      setErrors({ pseudo: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="section-title"><h1>Mon profil</h1></div>
      <div className="profile-grid">
        <div className="card profile-card">
          <div className="profile-avatar">{me.pseudo.slice(0, 1).toUpperCase()}</div>
          {edit ? (
            <>
              <label className="field"><span>Nom</span><input value={name} onChange={(e) => setName(e.target.value)} className={errors.name ? 'input-error' : ''} />{errors.name && <small className="field-error">{errors.name}</small>}</label>
              <label className="field"><span>Pseudo</span><input value={pseudo} onChange={(e) => setPseudo(e.target.value)} className={errors.pseudo ? 'input-error' : ''} />{errors.pseudo && <small className="field-error">{errors.pseudo}</small>}</label>
              <label className="field"><span>Téléphone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} className={errors.phone ? 'input-error' : ''} />{errors.phone && <small className="field-error">{errors.phone}</small>}</label>
              <label className="field"><span>Nom de l'équipe eFootball</span><input value={team} onChange={(e) => setTeam(e.target.value)} className={errors.team ? 'input-error' : ''} />{errors.team && <small className="field-error">{errors.team}</small>}</label>
              <div className="row">
                <button className="primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
                <button className="secondary" onClick={() => setEdit(false)} disabled={saving}>Annuler</button>
              </div>
            </>
          ) : (
            <>
              <h2>{me.pseudo}</h2>
              <div className="info-list">
                <p><b>Nom</b><span>{me.name}</span></p>
                <p><b>Téléphone</b><span>{me.phone || '—'}</span></p>
                <p><b>Équipe eFootball</b><span className="team-tag">{me.team}</span></p>
              </div>
              <button className="primary full" onClick={startEdit}>Modifier le profil</button>
            </>
          )}
          {success && <p className="success">{success}</p>}
        </div>
        <div className="card">
          <h3>À propos</h3>
          <p className="muted small">Le pseudo doit être unique. Le nom d'équipe eFootball est celui qui identifiera ton équipe pendant les duels.</p>
        </div>
      </div>
    </>
  );
      }
