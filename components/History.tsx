'use client';
import type { User, Match, Tx } from '../lib/store';

export default function History({ me, users, matches, transactions }: { me: User; users: User[]; matches: Match[]; transactions: Tx[] }) {
  const myMatches = matches.filter((m) => m.status === 'finished' && (m.a === me.id || m.b === me.id)).sort((a, b) => b.createdAt - a.createdAt);
  const myTx = transactions.filter((t) => t.userId === me.id).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <div className="section-title"><h1>Historique</h1></div>
      <div className="grid-two">
        <div className="card">
          <h3>Mes matchs</h3>
          {myMatches.length === 0 ? <p className="muted">Aucun match terminé pour l'instant.</p> : myMatches.map((m) => {
            const isA = m.a === me.id;
            const opp = users.find((u) => u.id === (isA ? m.b : m.a));
            const isDraw = m.winner === undefined;
            const won = m.winner === me.id;
            return (
              <div className="history-row" key={m.id}>
                <div><b>vs {opp?.pseudo ?? 'Adversaire'}</b><small>{new Date(m.createdAt).toLocaleString('fr-FR')} · mise {m.stake.toLocaleString()} F</small></div>
                <span className={isDraw ? 'result draw' : won ? 'result win' : 'result loss'}>{isDraw ? 'Nul' : won ? 'Victoire' : 'Défaite'}</span>
              </div>
            );
          })}
        </div>
        <div className="card">
          <h3>Mes transactions</h3>
          {myTx.length === 0 ? <p className="muted">Aucune transaction.</p> : myTx.map((t) => (
            <div className="tx" key={t.id}>
              <span>{t.label}<small>{new Date(t.createdAt).toLocaleString('fr-FR')}</small></span>
              <b className={t.type === 'withdrawal' || t.type === 'match_stake' ? 'negative' : 'positive'}>{t.type === 'withdrawal' || t.type === 'match_stake' ? '-' : '+'}{t.amount.toLocaleString()} F</b>
            </div>
          ))}
        </div>
      </div>
    </>
  );
              }
