import { supabase } from './supabase';

// ---------- Types ----------
export type User = {
  id: string;
  name: string;
  pseudo: string;
  phone: string;
  team: string;
  balance: number;
  online: boolean;
  friends: string[];
  requests: string[]; // demandes reçues, en attente de ma décision
};

export type MatchStatus = 'playing' | 'review' | 'finished';

export type Match = {
  id: string;
  code: string;
  a: string;
  b: string;
  stake: number;
  pot: number;
  status: MatchStatus;
  winner?: string;
  commission?: number;
  createdAt: number;
  aScore?: number;
  bScore?: number;
  aCapture?: string;
  bCapture?: string;
  aSettled: boolean;
  bSettled: boolean;
};

export type TxType = 'deposit' | 'withdrawal' | 'match_win' | 'match_stake' | 'refund';

export type Tx = {
  id: string;
  userId: string;
  type: TxType;
  amount: number;
  label: string;
  createdAt: number;
};

// ---------- Validation ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PSEUDO_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}
export function isValidPseudo(pseudo: string): boolean {
  return PSEUDO_RE.test(pseudo.trim());
}
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}
export function isValidPhone(phone: string): boolean {
  if (!phone.trim()) return true;
  return /^[0-9+\s-]{8,15}$/.test(phone.trim());
}

export function roomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ---------- Adaptateurs lignes Supabase -> objets de l'app ----------
function mapProfile(row: any): User {
  return {
    id: row.id,
    name: row.name,
    pseudo: row.pseudo,
    phone: row.phone || '',
    team: row.team,
    balance: Number(row.balance),
    online: row.online,
    friends: [],
    requests: [],
  };
}

function mapMatch(row: any): Match {
  return {
    id: row.id,
    code: row.code,
    a: row.user_a,
    b: row.user_b,
    stake: Number(row.stake),
    pot: Number(row.pot),
    status: row.status,
    winner: row.winner ?? undefined,
    commission: row.commission != null ? Number(row.commission) : undefined,
    aScore: row.a_score ?? undefined,
    bScore: row.b_score ?? undefined,
    aCapture: row.a_capture ?? undefined,
    bCapture: row.b_capture ?? undefined,
    aSettled: !!row.a_settled,
    bSettled: !!row.b_settled,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function mapTx(row: any): Tx {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: Number(row.amount),
    label: row.label,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function applyFriendships(profiles: User[], friendshipRows: any[]): User[] {
  const byId: Record<string, User> = Object.fromEntries(profiles.map((p) => [p.id, { ...p, friends: [], requests: [] }]));
  for (const f of friendshipRows) {
    if (f.status === 'accepted') {
      byId[f.user_a]?.friends.push(f.user_b);
      byId[f.user_b]?.friends.push(f.user_a);
    } else if (f.status === 'pending') {
      byId[f.user_b]?.requests.push(f.user_a);
    }
  }
  return Object.values(byId);
}

function friendlyError(message: string): string {
  if (message.includes('duplicate key') && message.includes('pseudo')) return 'Ce pseudo est déjà utilisé.';
  if (message === 'Invalid login credentials') return 'Identifiants incorrects.';
  if (message === 'User already registered') return 'Un compte existe déjà avec cet email.';
  return message;
}

// ---------- Chargement global ----------
export type AppData = { users: User[]; matches: Match[]; transactions: Tx[] };

export async function loadAll(): Promise<AppData> {
  const [{ data: profileRows, error: e1 }, { data: friendshipRows, error: e2 }, { data: matchRows, error: e3 }, { data: txRows, error: e4 }] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('friendships').select('*'),
    supabase.from('matches').select('*').order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').order('created_at', { ascending: false }),
  ]);
  const err = e1 || e2 || e3 || e4;
  if (err) throw new Error(friendlyError(err.message));
  return {
    users: applyFriendships((profileRows ?? []).map(mapProfile), friendshipRows ?? []),
    matches: (matchRows ?? []).map(mapMatch),
    transactions: (txRows ?? []).map(mapTx),
  };
}

// ---------- Authentification ----------
export async function registerUser(f: { name: string; pseudo: string; email: string; phone: string; password: string; team: string }) {
  const { data, error } = await supabase.auth.signUp({ email: f.email, password: f.password });
  if (error) throw new Error(friendlyError(error.message));
  if (!data.user) throw new Error('Inscription échouée.');
  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    pseudo: f.pseudo,
    name: f.name,
    phone: f.phone,
    team: f.team,
    balance: 10000,
    online: true,
  });
  if (profileError) throw new Error(friendlyError(profileError.message));
  return data.user.id;
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyError(error.message));
  if (!data.user) throw new Error('Connexion échouée.');
  await supabase.from('profiles').update({ online: true }).eq('id', data.user.id);
  return data.user.id;
}

export async function logoutUser(userId: string) {
  await supabase.from('profiles').update({ online: false }).eq('id', userId);
  await supabase.auth.signOut();
}

export async function getSessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ---------- Profil ----------
export async function updateProfile(userId: string, fields: { name: string; pseudo: string; phone: string; team: string }) {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) throw new Error(friendlyError(error.message));
}

// ---------- Portefeuille ----------
export async function addTransaction(userId: string, type: TxType, amount: number, label: string) {
  const { error } = await supabase.from('transactions').insert({ user_id: userId, type, amount, label });
  if (error) throw new Error(friendlyError(error.message));
}

export async function setBalance(userId: string, newBalance: number) {
  const { error } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
  if (error) throw new Error(friendlyError(error.message));
}

// ---------- Amis ----------
export async function sendFriendRequest(meId: string, targetId: string) {
  const { error } = await supabase.from('friendships').insert({ user_a: meId, user_b: targetId, requested_by: meId, status: 'pending' });
  if (error) throw new Error(friendlyError(error.message));
}

export async function acceptFriendRequest(meId: string, fromId: string) {
  const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('user_a', fromId).eq('user_b', meId).eq('status', 'pending');
  if (error) throw new Error(friendlyError(error.message));
}

// ---------- Matchmaking / salle de match ----------
export async function createMatch(meId: string, oppId: string, stake: number) {
  const { error } = await supabase.from('matches').insert({ code: roomCode(), user_a: meId, user_b: oppId, stake, pot: stake * 2, status: 'playing' });
  if (error) throw new Error(friendlyError(error.message));
}

export async function submitMatchResult(matchId: string, isA: boolean, score: number, captureName: string, bothIn: boolean) {
  const patch: any = isA ? { a_score: score, a_capture: captureName } : { b_score: score, b_capture: captureName };
  if (bothIn) patch.status = 'review';
  const { error } = await supabase.from('matches').update(patch).eq('id', matchId);
  if (error) throw new Error(friendlyError(error.message));
}

export async function settleMySide(matchId: string, isA: boolean, winner: string | undefined, commission: number, otherAlreadySettled: boolean) {
  const patch: any = isA ? { a_settled: true } : { b_settled: true };
  if (otherAlreadySettled) {
    patch.status = 'finished';
    patch.winner = winner ?? null;
    patch.commission = commission;
  }
  const { error } = await supabase.from('matches').update(patch).eq('id', matchId);
  if (error) throw new Error(friendlyError(error.message));
    }
