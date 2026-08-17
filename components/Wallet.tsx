'use client';
import { useState } from 'react';
import type { User, Tx } from '../lib/store';

export default function WalletPage({ me, transactions, onDeposit, onWithdraw }: { me: User; transactions: Tx[]; onDeposit: (n: number) => Promise<void>; onWithdraw: (n: number) => Promise<void> }) {
  const [amount, setAmount] = useState('1000');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(type: 'deposit' | 'withdrawal') {
    setError('');
    setSuccess('');
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n < 100) { setError('Montant minimum : 100 FCFA.'); return; }
    if (type === 'withdrawal' && me.balance < n) { setError('Solde insuffisant.'); return; }
    setBusy(true);
    try {
      if (type === 'deposit') await onDeposit(n); else await onWithdraw(n);
      setSuccess(type === 'deposit' ? `Dépôt de ${n.toLocaleString()} FCFA effectué.` : `Retrait de ${n.toLocaleString()} FCFA effectué.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const myTx = transactions.filter((t) => t.userId === me.id).slice(0, 8);

  return (
    <>
      <div className="section-title"><h1>Portefeuille</h1></div>
      <div className="wallet-hero">
        <div><span>Solde virtuel</span><strong>{me.balance.toLocaleString()} FCFA</strong></div>
        <div className="demo-badge">MODE DÉMO</div>
      </div>
      <div className="grid-two">
        <div className="card">
          <h3>Ajouter / retirer</h3>
          <p className="muted small">Ces boutons simulent les opérations. Aucun argent réel n'est transféré (bloc 2, plus tard).</p>
          <label className="field"><span>Montant FCFA</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <div className="row">
            <button className="primary" onClick={() => run('deposit')} disabled={busy}>Dépôt</button>
            <button className="secondary" onClick={() => run('withdrawal')} disabled={busy}>Retrait</button>
          </div>
        </div>
        <div className="card">
          <h3>Transactions</h3>
          {myTx.length === 0 ? <p className="muted">Aucune transaction.</p> : myTx.map((t) => (
            <div className="tx" key={t.id}>
              <span>{t.label}<small>{new Date(t.createdAt).toLocaleString('fr-FR')}</small></span>
              <b className={t.type === 'withdrawal' || t.type === 'match_stake' ? 'negative' : 'positive'}>
                {t.type === 'withdrawal' || t.type === 'match_stake' ? '-' : '+'}{t.amount.toLocaleString()} F
              </b>
            </div>
          ))}
        </div>
      </div>
    </>
  );
                                                                                             }
