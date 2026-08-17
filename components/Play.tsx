'use client';
import { useState } from 'react';
import { Swords, ShieldCheck } from 'lucide-react';
import type { User, Match } from '../lib/store';

const STAKES = [500, 1000, 2000, 5000];

export default function Play({ me, users, matches, onFind }: { me: User; users: User[]; matches: Match[]; onFind: (opp: User | null, stake: number | null, alreadyActive?: boolean) => Promise<void> }) {
  const [stake, setStake] = useState(500);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const myActive = matches.find((m) => (m.status === 'playing' || m.status === 'review') && (m.a === me.id || m.b === me.id));

  async function find() {
    setMsg('');
    if (me.balance < stake) { setMsg('Solde virtuel insuffisant.'); return; }
    const busyIds = new Set(matches.filter((m) => m.status === 'playing' || m.status === 'review').flatMap((m) => [m.a, m.b]));
    const opp = users.find((u) => u.id !== me.id && u.online && u.balance >= stake && !busyIds.has(u.id));
    if (!opp) { setSearching(true); setMsg('Aucun joueur disponible avec cette mise pour le moment.'); return; }
    setBusy(true);
    try {
      await onFind(opp, stake);
    } finally {
      setBusy(false);
    }
  }

  if (myActive) {
    return (
      <div className="match-search card">
        <div className="search-icon"><ShieldCheck size={38} /></div>
        <h2>Un duel est déjà en cours</h2>
        <p className="muted">Rejoins ta salle de match pour continuer.</p>
        <button className="primary big full" onClick={() => onFind(null, null, true)}>Aller à la salle de match</button>
      </div>
    );
  }

  return (
    <>
      <div className="section-title"><h1>Trouver un adversaire</h1></div>
      <div className="match-search card">
        <div className="search-icon"><Swords size={38} /></div>
        <h2>Choisis ta mise</h2>
        <p className="muted">Le matchmaking cherche un joueur en ligne avec exactement la même mise.</p>
        <div className="stake-grid">
          {STAKES.map((x) => (
            <button key={x} className={stake === x ? 'stake selected' : 'stake'} onClick={() => setStake(x)} disabled={busy}>{x.toLocaleString()} F</button>
          ))}
        </div>
        <div className="pot"><span>Pot du duel</span><b>{(stake * 2).toLocaleString()} FCFA</b></div>
        {msg && <p className={searching ? 'muted' : 'error'}>{msg}</p>}
        <button className="primary big full" onClick={find} disabled={busy}>{busy ? 'Recherche…' : searching ? 'Relancer la recherche' : 'Trouver un adversaire'}</button>
      </div>
    </>
  );
                      }
