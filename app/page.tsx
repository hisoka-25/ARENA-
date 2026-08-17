'use client';
import { useEffect, useState } from 'react';
import { Swords, Wallet, Users, UserRound, LogOut, Home as HomeIcon, Clock, AlertTriangle } from 'lucide-react';
import Auth from '../components/Auth';
import Profile from '../components/Profile';
import WalletPage from '../components/Wallet';
import Friends from '../components/Friends';
import Play from '../components/Play';
import MatchRoom from '../components/MatchRoom';
import History from '../components/History';
import {
  User, Match, Tx, AppData,
  loadAll, logoutUser, getSessionUserId, updateProfile,
  addTransaction, setBalance, sendFriendRequest, acceptFriendRequest,
  createMatch, submitMatchResult, settleMySide,
} from '../lib/store';

type View = 'home' | 'profile' | 'wallet' | 'friends' | 'play' | 'match' | 'history';

export default function Page() {
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [view, setView] = useState<View>('home');
  const [loadingData, setLoadingData] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const me = users.find((u) => u.id === userId);

  useEffect(() => {
    getSessionUserId().then((id) => {
      setUserId(id);
      setCheckingSession(false);
      if (id) refreshData();
    });
  }, []);

  async function refreshData() {
    setLoadingData(true);
    setGlobalError('');
    try {
      const data: AppData = await loadAll();
      setUsers(data.users);
      setMatches(data.matches);
      setTransactions(data.transactions);
    } catch (e: any) {
      setGlobalError(e.message);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleAuthenticated(id: string) {
    setUserId(id);
    setView('home');
    await refreshData();
  }

  async function logout() {
    if (userId) await logoutUser(userId);
    setUserId(null);
    setUsers([]);
    setMatches([]);
    setTransactions([]);
  }

  async function saveUser(fields: { name: string; pseudo: string; phone: string; team: string }) {
    await updateProfile(me!.id, fields);
    await refreshData();
  }

  async function deposit(amount: number) {
    await setBalance(me!.id, me!.balance + amount);
    await addTransaction(me!.id, 'deposit', amount, 'Dépôt démo');
    await refreshData();
  }

  async function withdraw(amount: number) {
    await setBalance(me!.id, me!.balance - amount);
    await addTransaction(me!.id, 'withdrawal', amount, 'Retrait démo');
    await refreshData();
  }

  async function sendRequest(targetId: string) {
    await sendFriendRequest(me!.id, targetId);
    await refreshData();
  }

  async function acceptRequest(fromId: string) {
    await acceptFriendRequest(me!.id, fromId);
    await refreshData();
  }

  async function findOpponent(opp: User | null, stake: number | null, alreadyActive?: boolean) {
    if (alreadyActive) { setView('match'); return; }
    await createMatch(me!.id, opp!.id, stake!);
    await setBalance(me!.id, me!.balance - stake!);
    await addTransaction(me!.id, 'match_stake', stake!, 'Mise du duel');
    setView('match');
    await refreshData();
  }

  async function submitResult(matchId: string, isA: boolean, score: number, captureName: string) {
    const m = matches.find((x) => x.id === matchId)!;
    const bothIn = isA ? m.bScore !== undefined : m.aScore !== undefined;
    await submitMatchResult(matchId, isA, score, captureName, bothIn);
    await refreshData();
  }

  async function finalizeMatch(matchId: string) {
    const m = matches.find((x) => x.id === matchId);
    if (!m || m.aScore === undefined || m.bScore === undefined) return null;

    const isA = m.a === me!.id;
    const isDraw = m.aScore === m.bScore;
    const winnerId = isDraw ? undefined : m.aScore > m.bScore ? m.a : m.b;
    const commission = isDraw ? 0 : Math.round(m.pot * 0.10);
    const payout = isDraw ? 0 : m.pot - commission;
    const oppUser = users.find((u) => u.id === (isA ? m.b : m.a));
    const otherAlreadySettled = isA ? m.bSettled : m.aSettled;

    // Chacun ne peut créditer QUE son propre solde (sécurité RLS) : on ne
    // règle jamais le côté de l'adversaire, il devra valider lui-même de
    // son côté (le match reste "en révision" tant que les deux n'ont pas validé).
    if (isDraw) {
      await setBalance(me!.id, me!.balance + m.stake);
      await addTransaction(me!.id, 'refund', m.stake, 'Remboursement — match nul');
    } else if (winnerId === me!.id) {
      await setBalance(me!.id, me!.balance + payout);
      await addTransaction(me!.id, 'match_win', payout, `Gain du duel (commission ${commission.toLocaleString()} F déduite)`);
    }
    // Si je suis le perdant : rien à créditer de mon côté, c'est normal.

    await settleMySide(matchId, isA, winnerId, commission, otherAlreadySettled);
    await refreshData();

    return {
      outcome: isDraw ? ('draw' as const) : ('decided' as const),
      won: winnerId === me!.id,
      stake: m.stake,
      pot: m.pot,
      commission,
      payout,
      oppName: oppUser?.pseudo ?? 'Adversaire',
      waitingOnOpponent: !otherAlreadySettled,
    };
  }

  if (checkingSession) {
    return (
      <div className="efo-root">
        <div className="auth-page"><p className="muted">Chargement…</p></div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="efo-root">
        <Auth onAuthenticated={handleAuthenticated} />
        {globalError && <p className="global-error"><AlertTriangle size={15} /> {globalError}</p>}
      </div>
    );
  }

  return (
    <div className="efo-root">
      <div className="app">
        <header className="topbar">
          <button className="brand" onClick={() => setView('home')}>⚽ <span>EFO Challenge</span></button>
          <div className="top-actions">
            {loadingData && <span className="online-dot syncing">↻ Synchronisation…</span>}
            <span className="online-dot">● En ligne</span>
            <button className="avatar" onClick={() => setView('profile')}>{me.pseudo.slice(0, 1).toUpperCase()}</button>
            <button className="icon-btn" onClick={logout} title="Déconnexion"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="container">
          {globalError && <p className="global-error"><AlertTriangle size={15} /> {globalError}</p>}
          {view === 'home' && (
            <>
              <div className="hero">
                <div>
                  <p className="eyebrow">BIENVENUE</p>
                  <h1>{me.pseudo} 👋</h1>
                  <p className="muted">Prêt pour ton prochain duel ?</p>
                </div>
                <div className="balance-card"><span>Solde virtuel</span><strong>{me.balance.toLocaleString()} FCFA</strong></div>
              </div>
              <div className="hero-actions">
                <button className="secondary" onClick={() => setView('history')}><Clock size={16} /> Voir l'historique</button>
                <button className="primary" onClick={() => setView('play')}><Swords size={16} /> Trouver un adversaire</button>
              </div>
            </>
          )}
          {view === 'profile' && <Profile me={me} users={users} onSave={saveUser} />}
          {view === 'wallet' && <WalletPage me={me} transactions={transactions} onDeposit={deposit} onWithdraw={withdraw} />}
          {view === 'friends' && <Friends me={me} users={users} onRequest={sendRequest} onAccept={acceptRequest} />}
          {view === 'play' && <Play me={me} users={users} matches={matches} onFind={findOpponent} />}
          {view === 'match' && <MatchRoom me={me} users={users} matches={matches} onSubmitResult={submitResult} onFinalize={finalizeMatch} onBack={() => setView('home')} />}
          {view === 'history' && <History me={me} users={users} matches={matches} transactions={transactions} />}
        </main>
        <nav className="bottom-nav">
          <button onClick={() => setView('home')} className={view === 'home' ? 'active' : ''}><HomeIcon size={20} />Accueil</button>
          <button onClick={() => setView('play')} className={view === 'play' ? 'active' : ''}><Swords size={20} />Jouer</button>
          <button onClick={() => setView('friends')} className={view === 'friends' ? 'active' : ''}><Users size={20} />Amis</button>
          <button onClick={() => setView('wallet')} className={view === 'wallet' ? 'active' : ''}><Wallet size={20} />Portefeuille</button>
          <button onClick={() => setView('history')} className={view === 'history' ? 'active' : ''}><Clock size={20} />Historique</button>
          <button onClick={() => setView('profile')} className={view === 'profile' ? 'active' : ''}><UserRound size={20} />Profil</button>
        </nav>
      </div>
    </div>
  );
  }
