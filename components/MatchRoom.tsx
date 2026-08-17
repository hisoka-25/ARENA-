'use client';
import { useState } from 'react';
import { Copy, Clock, ShieldCheck, Upload, Check } from 'lucide-react';
import type { User, Match } from '../lib/store';

type FinishedResult = { outcome: 'draw' | 'decided'; won: boolean; stake: number; pot: number; commission: number; payout: number; oppName: string; waitingOnOpponent: boolean };

export default function MatchRoom({
  me, users, matches, onSubmitResult, onFinalize, onBack,
}: {
  me: User;
  users: User[];
  matches: Match[];
  onSubmitResult: (matchId: string, isA: boolean, score: number, captureName: string) => Promise<void>;
  onFinalize: (matchId: string) => Promise<FinishedResult | null>;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [score, setScore] = useState('');
  const [capture, setCapture] = useState<{ name: string } | null>(null);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState<FinishedResult | null>(null);
  const [busy, setBusy] = useState(false);

  const match = matches.find((m) => (m.status === 'playing' || m.status === 'review') && (m.a === me.id || m.b === me.id));

  if (finished) {
    return (
      <div className="card coming-soon">
        <ShieldCheck size={40} color="#68e79c" />
        <h2>{finished.outcome === 'draw' ? 'Match nul' : finished.won ? 'Victoire !' : 'Défaite'}</h2>
        {finished.outcome === 'draw' ? (
          <p className="muted">Mise remboursée : {finished.stake.toLocaleString()} FCFA.</p>
        ) : finished.won ? (
          <p className="muted">Gain crédité : {finished.payout.toLocaleString()} FCFA (commission de {finished.commission.toLocaleString()} FCFA déduite).</p>
        ) : (
          <p className="muted">Rien à recevoir de ce duel — {finished.oppName} remporte le pot.</p>
        )}
        {finished.waitingOnOpponent && (
          <p className="muted small">En attente que {finished.oppName} valide aussi de son côté pour clôturer définitivement le duel.</p>
        )}
        <button className="primary" onClick={onBack}>Retour à l'accueil</button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="card coming-soon">
        <h2>Aucun duel actif</h2>
        <p className="muted">Lance une recherche d'adversaire depuis l'onglet "Jouer".</p>
        <button className="primary" onClick={onBack}>Retour à l'accueil</button>
      </div>
    );
  }

  const isA = match.a === me.id;
  const opp = users.find((u) => u.id === (isA ? match.b : match.a));
  const myScore = isA ? match.aScore : match.bScore;
  const oppScore = isA ? match.bScore : match.aScore;
  const mySubmitted = myScore !== undefined;
  const oppSubmitted = oppScore !== undefined;
  const mySettled = isA ? match.aSettled : match.bSettled;

  function copyCode() {
    navigator.clipboard?.writeText(match!.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function submit() {
    setError('');
    const n = Number(score);
    if (!Number.isInteger(n) || n < 0) { setError('Entre un score valide (entier positif).'); return; }
    if (!capture) { setError('Ajoute la capture du résultat.'); return; }
    setBusy(true);
    try {
      await onSubmitResult(match!.id, isA, n, capture.name);
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    setBusy(true);
    try {
      const result = await onFinalize(match!.id);
      if (result) setFinished(result);
    } finally {
      setBusy(false);
    }
  }

  const outcome = mySubmitted && oppSubmitted ? (myScore! > oppScore! ? 'win' : myScore! < oppScore! ? 'loss' : 'draw') : null;

  return (
    <>
      <div className="section-title"><h1>Salle de match</h1></div>
      <div className="room card">
        <div className="room-code">
          <span>Code de la salle</span>
          <div className="row"><b>{match.code}</b><button className="secondary small-btn" onClick={copyCode}><Copy size={14} /> {copied ? 'Copié !' : 'Copier'}</button></div>
        </div>

        <div className="room-players">
          <div className="room-player">
            <div className="mini-avatar">{me.pseudo.slice(0, 1)}</div>
            <b>{me.pseudo}</b><span className="team-tag">{me.team}</span>
            {mySubmitted && <span className="status online">Score envoyé : {myScore}</span>}
          </div>
          <div className="vs">VS</div>
          <div className="room-player">
            <div className="mini-avatar">{opp?.pseudo.slice(0, 1) ?? '?'}</div>
            <b>{opp?.pseudo ?? 'Adversaire'}</b><span className="team-tag">{opp?.team ?? '—'}</span>
            {oppSubmitted && <span className="status online">Score envoyé : {oppScore}</span>}
          </div>
        </div>

        <div className="pot"><span>Pot en jeu</span><b>{match.pot.toLocaleString()} FCFA</b></div>

        {!mySubmitted ? (
          <div className="score-form">
            <label className="field"><span>Ton score final</span><input type="number" value={score} onChange={(e) => setScore(e.target.value)} /></label>
            <label className="field">
              <span>Capture du résultat</span>
              <button type="button" className={capture ? 'upload-btn attached' : 'upload-btn'} onClick={() => setCapture(capture ? null : { name: `capture_resultat_${Date.now()}.png` })}>
                <Upload size={16} /><span>{capture ? capture.name : 'Ajouter une capture (démo)'}</span>{capture && <Check size={16} />}
              </button>
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary full" onClick={submit} disabled={busy}>{busy ? 'Envoi…' : 'Envoyer mon score'}</button>
          </div>
        ) : !oppSubmitted ? (
          <div className="notice"><Clock size={17} /><span>Score envoyé, en attente du score de {opp?.pseudo ?? "l'adversaire"}. (Connecte-toi avec le compte adverse sur un autre appareil/navigateur pour envoyer son score.)</span></div>
        ) : mySettled ? (
          <div className="notice"><Clock size={17} /><span>Tu as déjà validé ce duel. En attente que {opp?.pseudo ?? "l'adversaire"} valide aussi de son côté pour clôturer et débloquer les gains.</span></div>
        ) : (
          <div className="verdict-box">
            <h3>Vérification du verdict</h3>
            <div className="verdict-scores">
              <div className={outcome === 'win' ? 'verdict-side lead' : 'verdict-side'}><span>{me.pseudo}</span><b>{myScore}</b></div>
              <div className="verdict-sep">—</div>
              <div className={outcome === 'loss' ? 'verdict-side lead' : 'verdict-side'}><span>{opp?.pseudo ?? 'Adversaire'}</span><b>{oppScore}</b></div>
            </div>
            <button className="primary full" onClick={finalize} disabled={busy}>
              {busy ? 'Validation…' : outcome === 'draw' ? 'Valider et rembourser les mises' : 'Valider et clôturer le duel'}
            </button>
          </div>
        )}

        <button className="secondary full" onClick={onBack}>Retour à l'accueil</button>
      </div>
    </>
  );
  }
