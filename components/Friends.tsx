'use client';
import type { User } from '../lib/store';

function UserMini({ u }: { u: User }) {
  return (
    <div className="user-mini">
      <div className="mini-avatar">{u.pseudo.slice(0, 1)}</div>
      <div><b>{u.pseudo}</b><small>{u.team}</small></div>
    </div>
  );
}

export default function Friends({ me, users, onRequest, onAccept }: { me: User; users: User[]; onRequest: (id: string) => Promise<void>; onAccept: (id: string) => Promise<void> }) {
  const incoming = me.requests.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[];
  const friends = me.friends.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[];
  const others = users.filter((u) => u.id !== me.id && !me.friends.includes(u.id));

  return (
    <>
      <div className="section-title"><h1>Amis</h1></div>
      <div className="grid-two">
        <div className="card">
          <h3>Demandes reçues {incoming.length > 0 && <span className="count">{incoming.length}</span>}</h3>
          {incoming.length === 0 ? <p className="muted">Aucune demande.</p> : incoming.map((u) => (
            <div className="user-row" key={u.id}>
              <UserMini u={u} />
              <button className="primary small-btn" onClick={() => onAccept(u.id)}>Accepter</button>
            </div>
          ))}
          <h3 className="subhead">Mes amis</h3>
          {friends.length === 0 ? <p className="muted">Pas encore d'amis.</p> : friends.map((u) => (
            <div className="user-row" key={u.id}>
              <UserMini u={u} />
              <span className={u.online ? 'status online' : 'status'}>● {u.online ? 'En ligne' : 'Hors ligne'}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Joueurs</h3>
          {others.length === 0 ? <p className="muted">Aucun autre joueur pour l'instant.</p> : others.map((u) => {
            const requested = u.requests.includes(me.id);
            return (
              <div className="user-row" key={u.id}>
                <UserMini u={u} />
                {requested ? <span className="muted">Demande envoyée</span> : <button className="secondary small-btn" onClick={() => onRequest(u.id)}>Ajouter</button>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
          }
