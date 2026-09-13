import fs from 'fs';
import path from 'path';
import { config } from './config';
import { getSupabaseServerClient } from './supabase';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
}

export interface GuestQuotaRecord {
  guestId: string;
  count: number;
  lastUsed: number;
  createdAt: number;
}

export interface RateLimitRecord {
  key: string;
  attempts: number;
  lockUntil: number;
}

export interface HistoryRecord {
  id: string;
  userId: string;
  calculatorId: string;
  summary: string;
  primaryValue: string;
  timestamp: string;
  inputs: Record<string, any>;
  createdAt: number;
}

export interface SavedScenarioRecord {
  id: string;
  userId: string;
  calculatorId: string;
  name: string;
  primaryResult: string;
  notes?: string;
  updatedAt: string;
  inputs: Record<string, any>;
  createdAt: number;
}

export interface SharedCalculationRecord {
  id: string;
  calculatorId: string;
  inputs: Record<string, any>;
  createdAt: number;
}

interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  guestQuotas: GuestQuotaRecord[];
  rateLimits: RateLimitRecord[];
  history: HistoryRecord[];
  savedScenarios: SavedScenarioRecord[];
  sharedCalculations: SharedCalculationRecord[];
}

// -------------------------------------------------------------
// LOCAL / TEST PERSISTENCE IMPLEMENTATION
// -------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'lifecalc.json');
const LOCK_FILE = path.join(DATA_DIR, 'lifecalc.lock');

function acquireLock(): () => void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const start = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(LOCK_FILE, 'wx');
      fs.writeSync(fd, `${process.pid}`);
      fs.closeSync(fd);
      break;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        try {
          const stat = fs.statSync(LOCK_FILE);
          if (Date.now() - stat.mtimeMs > 5000) {
            fs.unlinkSync(LOCK_FILE);
            continue;
          }
        } catch {}

        if (Date.now() - start > 3000) {
          try { fs.unlinkSync(LOCK_FILE); } catch {}
          break;
        }
      } else {
        break;
      }
    }
  }

  return () => {
    try {
      if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
      }
    } catch {}
  };
}

function readLocalDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const empty: DatabaseSchema = {
      users: [],
      sessions: [],
      guestQuotas: [],
      rateLimits: [],
      history: [],
      savedScenarios: [],
      sharedCalculations: [],
    };
    writeLocalDb(empty);
    return empty;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users || [],
      sessions: parsed.sessions || [],
      guestQuotas: parsed.guestQuotas || [],
      rateLimits: parsed.rateLimits || [],
      history: parsed.history || [],
      savedScenarios: parsed.savedScenarios || [],
      sharedCalculations: parsed.sharedCalculations || [],
    };
  } catch {
    return {
      users: [],
      sessions: [],
      guestQuotas: [],
      rateLimits: [],
      history: [],
      savedScenarios: [],
      sharedCalculations: [],
    };
  }
}

function writeLocalDb(data: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

function withLocalLock<T>(fn: (db: DatabaseSchema) => { result: T; modified?: boolean }): T {
  const release = acquireLock();
  try {
    const db = readLocalDb();
    const { result, modified } = fn(db);
    if (modified) {
      writeLocalDb(db);
    }
    return result;
  } finally {
    release();
  }
}

// -------------------------------------------------------------
// UNIFIED DATABASE ADAPTER WITH FAIL-CLOSED PROTECTION
// -------------------------------------------------------------

function getActiveSupabase() {
  if (config.databaseMode === 'supabase') {
    const client = getSupabaseServerClient();
    if (!client) {
      if (config.isProduction) {
        throw new Error('[CRITICAL DATABASE ERROR] Supabase database client unavailable in production. Refusing to fallback.');
      }
      return null;
    }
    return client;
  }
  return null;
}

// 1. User Operations
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = email.toLowerCase().trim();
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('users').select('*').eq('email', normalized).maybeSingle();
    if (error) throw new Error(`[DB ERROR] findUserByEmail: ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      passwordHash: data.password_hash,
      salt: data.salt,
      createdAt: Number(data.created_at),
    };
  }

  return withLocalLock(db => {
    const user = db.users.find(u => u.email === normalized) || null;
    return { result: user, modified: false };
  });
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`[DB ERROR] findUserById: ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      passwordHash: data.password_hash,
      salt: data.salt,
      createdAt: Number(data.created_at),
    };
  }

  return withLocalLock(db => {
    const user = db.users.find(u => u.id === id) || null;
    return { result: user, modified: false };
  });
}

export async function insertUser(user: UserRecord): Promise<UserRecord> {
  const normalized = user.email.toLowerCase().trim();
  const supabase = getActiveSupabase();
  if (supabase) {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: normalized,
      name: user.name,
      password_hash: user.passwordHash,
      salt: user.salt,
      created_at: user.createdAt,
    });
    if (error) throw new Error(`[DB ERROR] insertUser: ${error.message}`);
    return user;
  }

  return withLocalLock(db => {
    const idx = db.users.findIndex(u => u.email === normalized);
    if (idx >= 0) {
      db.users[idx] = { ...user, email: normalized };
    } else {
      db.users.push({ ...user, email: normalized });
    }
    return { result: user, modified: true };
  });
}

// 2. Session Operations
export async function insertSession(session: SessionRecord): Promise<void> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { error } = await supabase.from('sessions').insert({
      id: session.id,
      user_id: session.userId,
      token_hash: session.tokenHash,
      expires_at: session.expiresAt,
      created_at: session.createdAt,
    });
    if (error) throw new Error(`[DB ERROR] insertSession: ${error.message}`);
    return;
  }

  withLocalLock(db => {
    const now = Date.now();
    db.sessions = db.sessions.filter(s => s.expiresAt > now);
    db.sessions.push(session);
    return { result: undefined, modified: true };
  });
}

export async function findSession(tokenHash: string): Promise<SessionRecord | null> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('sessions').select('*').eq('token_hash', tokenHash).maybeSingle();
    if (error) throw new Error(`[DB ERROR] findSession: ${error.message}`);
    if (!data) return null;
    if (Date.now() > Number(data.expires_at)) return null;
    return {
      id: data.id,
      userId: data.user_id,
      tokenHash: data.token_hash,
      expiresAt: Number(data.expires_at),
      createdAt: Number(data.created_at),
    };
  }

  return withLocalLock(db => {
    const now = Date.now();
    const session = db.sessions.find(s => s.tokenHash === tokenHash && s.expiresAt > now) || null;
    return { result: session, modified: false };
  });
}

export async function deleteSessionByHash(tokenHash: string): Promise<void> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { error } = await supabase.from('sessions').delete().eq('token_hash', tokenHash);
    if (error) throw new Error(`[DB ERROR] deleteSessionByHash: ${error.message}`);
    return;
  }

  withLocalLock(db => {
    const prevLen = db.sessions.length;
    db.sessions = db.sessions.filter(s => s.tokenHash !== tokenHash);
    return { result: undefined, modified: db.sessions.length !== prevLen };
  });
}

// 3. Guest Quota Operations (Atomic across processes & concurrent requests)
export async function getGuestQuota(guestId: string): Promise<number> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('guest_quotas').select('count').eq('guest_id', guestId).maybeSingle();
    if (error) throw new Error(`[DB ERROR] getGuestQuota: ${error.message}`);
    return data ? data.count : 0;
  }

  return withLocalLock(db => {
    const record = db.guestQuotas.find(g => g.guestId === guestId);
    return { result: record ? record.count : 0, modified: false };
  });
}

export async function incrementGuestQuotaAtomic(guestId: string, maxAllowed = 15): Promise<{ allowed: boolean; count: number }> {
  const supabase = getActiveSupabase();
  if (supabase) {
    // Invoke stored Postgres atomic function: fail-closed if RPC fails
    const { data, error } = await supabase.rpc('increment_guest_quota', {
      p_guest_id: guestId,
      p_max_allowed: maxAllowed,
    });
    if (error) {
      throw new Error(`[CRITICAL DATABASE ERROR] increment_guest_quota RPC failed: ${error.message}. Failing closed.`);
    }
    if (!data || data.length === 0) {
      throw new Error('[CRITICAL DATABASE ERROR] increment_guest_quota returned empty result. Failing closed.');
    }
    return { allowed: Boolean(data[0].allowed), count: Number(data[0].new_count) };
  }

  // Local atomic lock implementation
  return withLocalLock<{ allowed: boolean; count: number }>(db => {
    const now = Date.now();
    const idx = db.guestQuotas.findIndex(g => g.guestId === guestId);

    if (idx >= 0) {
      if (db.guestQuotas[idx].count >= maxAllowed) {
        return { result: { allowed: false, count: db.guestQuotas[idx].count }, modified: false };
      }
      db.guestQuotas[idx].count += 1;
      db.guestQuotas[idx].lastUsed = now;
      return { result: { allowed: true, count: db.guestQuotas[idx].count }, modified: true };
    } else {
      db.guestQuotas.push({
        guestId,
        count: 1,
        lastUsed: now,
        createdAt: now,
      });
      return { result: { allowed: true, count: 1 }, modified: true };
    }
  });
}

// 4. Rate Limiting Operations (Atomic distributed store)
export async function checkLoginRateLimit(key: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const now = Date.now();
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('auth_rate_limits').select('*').eq('key', key).maybeSingle();
    if (error) {
      throw new Error(`[CRITICAL DATABASE ERROR] checkLoginRateLimit query failed: ${error.message}. Failing closed.`);
    }
    if (data && Number(data.lock_until) > now) {
      const waitSeconds = Math.ceil((Number(data.lock_until) - now) / 1000);
      return { allowed: false, waitSeconds };
    }
    return { allowed: true };
  }

  return withLocalLock<{ allowed: boolean; waitSeconds?: number }>(db => {
    const record = db.rateLimits.find(r => r.key === key) || null;
    if (record && record.lockUntil > now) {
      const waitSeconds = Math.ceil((record.lockUntil - now) / 1000);
      return { result: { allowed: false, waitSeconds }, modified: false };
    }
    return { result: { allowed: true }, modified: false };
  });
}

export async function recordFailedLogin(key: string): Promise<void> {
  const now = Date.now();
  const supabase = getActiveSupabase();
  if (supabase) {
    // Authoritative atomic Postgres function: prevents concurrent race conditions
    const { error } = await supabase.rpc('record_failed_login_atomic', {
      p_key: key,
      p_max_attempts: 5,
      p_lock_ms: 15 * 60 * 1000,
    });
    if (error) {
      throw new Error(`[CRITICAL DATABASE ERROR] record_failed_login_atomic failed: ${error.message}. Failing closed.`);
    }
    return;
  }

  withLocalLock(db => {
    const idx = db.rateLimits.findIndex(r => r.key === key);
    if (idx >= 0) {
      db.rateLimits[idx].attempts += 1;
      if (db.rateLimits[idx].attempts >= 5) {
        db.rateLimits[idx].lockUntil = now + 15 * 60 * 1000;
      }
    } else {
      db.rateLimits.push({ key, attempts: 1, lockUntil: 0 });
    }
    return { result: undefined, modified: true };
  });
}

export async function resetLoginAttempts(key: string): Promise<void> {
  const supabase = getActiveSupabase();
  if (supabase) {
    await supabase.from('auth_rate_limits').delete().eq('key', key);
    return;
  }

  withLocalLock(db => {
    const prevLen = db.rateLimits.length;
    db.rateLimits = db.rateLimits.filter(r => r.key !== key);
    return { result: undefined, modified: db.rateLimits.length !== prevLen };
  });
}

export async function getRateLimitRecord(key: string): Promise<RateLimitRecord | null> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data } = await supabase.from('auth_rate_limits').select('*').eq('key', key).maybeSingle();
    if (!data) return null;
    return {
      key: data.key,
      attempts: data.attempts,
      lockUntil: Number(data.lock_until),
    };
  }

  return withLocalLock<RateLimitRecord | null>(db => {
    const record = db.rateLimits.find(r => r.key === key) || null;
    return { result: record, modified: false };
  });
}

// 5. History Operations (Owner isolated)
export async function getHistoryByUserId(userId: string): Promise<HistoryRecord[]> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(`[DB ERROR] getHistoryByUserId: ${error.message}`);
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      calculatorId: row.calculator_id,
      summary: row.summary,
      primaryValue: row.primary_value,
      timestamp: row.timestamp,
      inputs: row.inputs,
      createdAt: Number(row.created_at),
    }));
  }

  return withLocalLock(db => {
    const list = db.history
      .filter(h => h.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    return { result: list, modified: false };
  });
}

export async function insertHistory(item: Omit<HistoryRecord, 'id' | 'createdAt'>): Promise<HistoryRecord> {
  const record: HistoryRecord = {
    ...item,
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
  };

  const supabase = getActiveSupabase();
  if (supabase) {
    const { error } = await supabase.from('history').insert({
      id: record.id,
      user_id: record.userId,
      calculator_id: record.calculatorId,
      summary: record.summary,
      primary_value: record.primaryValue,
      timestamp: record.timestamp,
      inputs: record.inputs,
      created_at: record.createdAt,
    });
    if (error) throw new Error(`[DB ERROR] insertHistory: ${error.message}`);
    return record;
  }

  return withLocalLock(db => {
    db.history.unshift(record);
    const userItems = db.history.filter(h => h.userId === item.userId);
    if (userItems.length > 50) {
      const keepIds = new Set(userItems.slice(0, 50).map(h => h.id));
      db.history = db.history.filter(h => h.userId !== item.userId || keepIds.has(h.id));
    }
    return { result: record, modified: true };
  });
}

export async function deleteHistoryById(id: string, userId: string): Promise<boolean> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');
    if (error) throw new Error(`[DB ERROR] deleteHistoryById: ${error.message}`);
    return (data && data.length > 0) || false;
  }

  return withLocalLock(db => {
    const initialLen = db.history.length;
    db.history = db.history.filter(h => !(h.id === id && h.userId === userId));
    const removed = db.history.length < initialLen;
    return { result: removed, modified: removed };
  });
}

export async function clearHistoryByUserId(userId: string): Promise<void> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { error } = await supabase.from('history').delete().eq('user_id', userId);
    if (error) throw new Error(`[DB ERROR] clearHistoryByUserId: ${error.message}`);
    return;
  }

  withLocalLock(db => {
    const prevLen = db.history.length;
    db.history = db.history.filter(h => h.userId !== userId);
    return { result: undefined, modified: db.history.length !== prevLen };
  });
}

// 6. Saved Scenario Operations (Owner isolated)
export async function getSavedScenariosByUserId(userId: string): Promise<SavedScenarioRecord[]> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('saved_scenarios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`[DB ERROR] getSavedScenariosByUserId: ${error.message}`);
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      calculatorId: row.calculator_id,
      name: row.name,
      primaryResult: row.primary_result,
      notes: row.notes,
      updatedAt: row.updated_at,
      inputs: row.inputs,
      createdAt: Number(row.created_at),
    }));
  }

  return withLocalLock(db => {
    const list = db.savedScenarios
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
    return { result: list, modified: false };
  });
}

export async function insertSavedScenario(item: Omit<SavedScenarioRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedScenarioRecord> {
  const now = Date.now();
  const record: SavedScenarioRecord = {
    ...item,
    id: `save_${now}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
    updatedAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
  };

  const supabase = getActiveSupabase();
  if (supabase) {
    const { error } = await supabase.from('saved_scenarios').insert({
      id: record.id,
      user_id: record.userId,
      calculator_id: record.calculatorId,
      name: record.name,
      primary_result: record.primaryResult,
      notes: record.notes,
      updated_at: record.updatedAt,
      inputs: record.inputs,
      created_at: record.createdAt,
    });
    if (error) throw new Error(`[DB ERROR] insertSavedScenario: ${error.message}`);
    return record;
  }

  return withLocalLock(db => {
    db.savedScenarios.unshift(record);
    return { result: record, modified: true };
  });
}

export async function deleteSavedScenarioById(id: string, userId: string): Promise<boolean> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('saved_scenarios')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');
    if (error) throw new Error(`[DB ERROR] deleteSavedScenarioById: ${error.message}`);
    return (data && data.length > 0) || false;
  }

  return withLocalLock(db => {
    const initialLen = db.savedScenarios.length;
    db.savedScenarios = db.savedScenarios.filter(s => !(s.id === id && s.userId === userId));
    const removed = db.savedScenarios.length < initialLen;
    return { result: removed, modified: removed };
  });
}

// 7. Shared Calculations Operations (Public Read by cryptographically random ID)
export async function getSharedCalculationById(id: string): Promise<SharedCalculationRecord | null> {
  const supabase = getActiveSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('shared_calculations').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`[DB ERROR] getSharedCalculationById: ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      calculatorId: data.calculator_id,
      inputs: data.inputs,
      createdAt: Number(data.created_at),
    };
  }

  return withLocalLock(db => {
    const record = db.sharedCalculations.find(s => s.id === id) || null;
    return { result: record, modified: false };
  });
}

export async function insertSharedCalculation(id: string, calculatorId: string, inputs: Record<string, any>): Promise<SharedCalculationRecord> {
  const record: SharedCalculationRecord = {
    id,
    calculatorId,
    inputs,
    createdAt: Date.now(),
  };

  const supabase = getActiveSupabase();
  if (supabase) {
    const { error } = await supabase.from('shared_calculations').insert({
      id: record.id,
      calculator_id: record.calculatorId,
      inputs: record.inputs,
      created_at: record.createdAt,
    });
    if (error) throw new Error(`[DB ERROR] insertSharedCalculation: ${error.message}`);
    return record;
  }

  return withLocalLock(db => {
    db.sharedCalculations.push(record);
    return { result: record, modified: true };
  });
}

// Helper to reset DB for automated tests
export function _resetDatabaseForTesting(): void {
  withLocalLock(db => {
    db.users = [];
    db.sessions = [];
    db.guestQuotas = [];
    db.rateLimits = [];
    db.history = [];
    db.savedScenarios = [];
    db.sharedCalculations = [];
    return { result: undefined, modified: true };
  });
}