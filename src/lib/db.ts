import fs from 'fs';
import path from 'path';

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
      // wx flag: fail if file already exists (atomic create)
      const fd = fs.openSync(LOCK_FILE, 'wx');
      fs.writeSync(fd, `${process.pid}`);
      fs.closeSync(fd);
      break;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        // Check if stale lock (> 5000ms old)
        try {
          const stat = fs.statSync(LOCK_FILE);
          if (Date.now() - stat.mtimeMs > 5000) {
            fs.unlinkSync(LOCK_FILE);
            continue;
          }
        } catch {}

        if (Date.now() - start > 3000) {
          // Timeout, break through stale lock
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

function readDataFromDisk(): DatabaseSchema {
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
    writeDataToDisk(empty);
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

function writeDataToDisk(data: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

function withLock<T>(fn: (db: DatabaseSchema) => { result: T; modified?: boolean }): T {
  const release = acquireLock();
  try {
    const db = readDataFromDisk();
    const { result, modified } = fn(db);
    if (modified) {
      writeDataToDisk(db);
    }
    return result;
  } finally {
    release();
  }
}

// User Operations
export function findUserByEmail(email: string): UserRecord | null {
  const normalized = email.toLowerCase().trim();
  return withLock(db => {
    const user = db.users.find(u => u.email === normalized) || null;
    return { result: user, modified: false };
  });
}

export function findUserById(id: string): UserRecord | null {
  return withLock(db => {
    const user = db.users.find(u => u.id === id) || null;
    return { result: user, modified: false };
  });
}

export function insertUser(user: UserRecord): UserRecord {
  const normalized = user.email.toLowerCase().trim();
  return withLock(db => {
    const idx = db.users.findIndex(u => u.email === normalized);
    if (idx >= 0) {
      db.users[idx] = { ...user, email: normalized };
    } else {
      db.users.push({ ...user, email: normalized });
    }
    return { result: user, modified: true };
  });
}

// Session Operations
export function insertSession(session: SessionRecord): void {
  withLock(db => {
    const now = Date.now();
    db.sessions = db.sessions.filter(s => s.expiresAt > now);
    db.sessions.push(session);
    return { result: undefined, modified: true };
  });
}

export function findSession(tokenHash: string): SessionRecord | null {
  return withLock(db => {
    const now = Date.now();
    const session = db.sessions.find(s => s.tokenHash === tokenHash && s.expiresAt > now) || null;
    return { result: session, modified: false };
  });
}

export function deleteSessionByHash(tokenHash: string): void {
  withLock(db => {
    const prevLen = db.sessions.length;
    db.sessions = db.sessions.filter(s => s.tokenHash !== tokenHash);
    return { result: undefined, modified: db.sessions.length !== prevLen };
  });
}

export function deleteSessionsByUserId(userId: string): void {
  withLock(db => {
    const prevLen = db.sessions.length;
    db.sessions = db.sessions.filter(s => s.userId !== userId);
    return { result: undefined, modified: db.sessions.length !== prevLen };
  });
}

// Guest Quota Operations (Atomic across processes & concurrent requests)
export function getGuestQuota(guestId: string): number {
  return withLock(db => {
    const record = db.guestQuotas.find(g => g.guestId === guestId);
    return { result: record ? record.count : 0, modified: false };
  });
}

export function incrementGuestQuota(guestId: string): { count: number; lastUsed: number } {
  return withLock(db => {
    const now = Date.now();
    const idx = db.guestQuotas.findIndex(g => g.guestId === guestId);
    let count = 1;

    if (idx >= 0) {
      db.guestQuotas[idx].count += 1;
      db.guestQuotas[idx].lastUsed = now;
      count = db.guestQuotas[idx].count;
    } else {
      db.guestQuotas.push({
        guestId,
        count: 1,
        lastUsed: now,
        createdAt: now,
      });
    }

    return { result: { count, lastUsed: now }, modified: true };
  });
}

// Persistent Shared Rate Limiting Operations
export function getRateLimitRecord(key: string): RateLimitRecord | null {
  return withLock(db => {
    const record = db.rateLimits.find(r => r.key === key) || null;
    return { result: record, modified: false };
  });
}

export function updateRateLimitRecord(key: string, attempts: number, lockUntil: number): void {
  withLock(db => {
    const idx = db.rateLimits.findIndex(r => r.key === key);
    if (idx >= 0) {
      db.rateLimits[idx].attempts = attempts;
      db.rateLimits[idx].lockUntil = lockUntil;
    } else {
      db.rateLimits.push({ key, attempts, lockUntil });
    }
    return { result: undefined, modified: true };
  });
}

export function clearRateLimitRecord(key: string): void {
  withLock(db => {
    const prevLen = db.rateLimits.length;
    db.rateLimits = db.rateLimits.filter(r => r.key !== key);
    return { result: undefined, modified: db.rateLimits.length !== prevLen };
  });
}

// History Operations (Owner isolated)
export function getHistoryByUserId(userId: string): HistoryRecord[] {
  return withLock(db => {
    const list = db.history
      .filter(h => h.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    return { result: list, modified: false };
  });
}

export function insertHistory(item: Omit<HistoryRecord, 'id' | 'createdAt'>): HistoryRecord {
  return withLock(db => {
    const record: HistoryRecord = {
      ...item,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    db.history.unshift(record);
    const userItems = db.history.filter(h => h.userId === item.userId);
    if (userItems.length > 50) {
      const keepIds = new Set(userItems.slice(0, 50).map(h => h.id));
      db.history = db.history.filter(h => h.userId !== item.userId || keepIds.has(h.id));
    }
    return { result: record, modified: true };
  });
}

export function deleteHistoryById(id: string, userId: string): boolean {
  return withLock(db => {
    const initialLen = db.history.length;
    db.history = db.history.filter(h => !(h.id === id && h.userId === userId));
    const removed = db.history.length < initialLen;
    return { result: removed, modified: removed };
  });
}

export function clearHistoryByUserId(userId: string): void {
  withLock(db => {
    const prevLen = db.history.length;
    db.history = db.history.filter(h => h.userId !== userId);
    return { result: undefined, modified: db.history.length !== prevLen };
  });
}

// Saved Scenario Operations (Owner isolated)
export function getSavedScenariosByUserId(userId: string): SavedScenarioRecord[] {
  return withLock(db => {
    const list = db.savedScenarios
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
    return { result: list, modified: false };
  });
}

export function insertSavedScenario(item: Omit<SavedScenarioRecord, 'id' | 'createdAt' | 'updatedAt'>): SavedScenarioRecord {
  return withLock(db => {
    const now = Date.now();
    const record: SavedScenarioRecord = {
      ...item,
      id: `save_${now}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    db.savedScenarios.unshift(record);
    return { result: record, modified: true };
  });
}

export function deleteSavedScenarioById(id: string, userId: string): boolean {
  return withLock(db => {
    const initialLen = db.savedScenarios.length;
    db.savedScenarios = db.savedScenarios.filter(s => !(s.id === id && s.userId === userId));
    const removed = db.savedScenarios.length < initialLen;
    return { result: removed, modified: removed };
  });
}

// Shared Calculations Operations (Public Read by cryptographically random ID)
export function getSharedCalculationById(id: string): SharedCalculationRecord | null {
  return withLock(db => {
    const record = db.sharedCalculations.find(s => s.id === id) || null;
    return { result: record, modified: false };
  });
}

export function insertSharedCalculation(id: string, calculatorId: string, inputs: Record<string, any>): SharedCalculationRecord {
  return withLock(db => {
    const record: SharedCalculationRecord = {
      id,
      calculatorId,
      inputs,
      createdAt: Date.now(),
    };
    db.sharedCalculations.push(record);
    return { result: record, modified: true };
  });
}

// Helper to reset DB for automated tests
export function _resetDatabaseForTesting(): void {
  withLock(db => {
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