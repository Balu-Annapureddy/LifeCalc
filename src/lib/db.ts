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
  history: HistoryRecord[];
  savedScenarios: SavedScenarioRecord[];
  sharedCalculations: SharedCalculationRecord[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'lifecalc.json');

// Memory cache synced to disk
let memoryDb: DatabaseSchema = {
  users: [],
  sessions: [],
  guestQuotas: [],
  history: [],
  savedScenarios: [],
  sharedCalculations: [],
};

let initialized = false;

function ensureInitialized() {
  if (initialized) return;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryDb = {
        users: parsed.users || [],
        sessions: parsed.sessions || [],
        guestQuotas: parsed.guestQuotas || [],
        history: parsed.history || [],
        savedScenarios: parsed.savedScenarios || [],
        sharedCalculations: parsed.sharedCalculations || [],
      };
    } else {
      persistSync();
    }
  } catch (err) {
    console.error('Failed to initialize database from file, using in-memory state:', err);
  }

  initialized = true;
}

function persistSync() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(memoryDb, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

// User Operations
export function findUserByEmail(email: string): UserRecord | null {
  ensureInitialized();
  const normalized = email.toLowerCase().trim();
  return memoryDb.users.find(u => u.email === normalized) || null;
}

export function findUserById(id: string): UserRecord | null {
  ensureInitialized();
  return memoryDb.users.find(u => u.id === id) || null;
}

export function insertUser(user: UserRecord): UserRecord {
  ensureInitialized();
  const normalized = user.email.toLowerCase().trim();
  const existing = memoryDb.users.findIndex(u => u.email === normalized);
  if (existing >= 0) {
    memoryDb.users[existing] = { ...user, email: normalized };
  } else {
    memoryDb.users.push({ ...user, email: normalized });
  }
  persistSync();
  return user;
}

// Session Operations
export function insertSession(session: SessionRecord): void {
  ensureInitialized();
  // Remove any expired sessions during write
  const now = Date.now();
  memoryDb.sessions = memoryDb.sessions.filter(s => s.expiresAt > now);
  memoryDb.sessions.push(session);
  persistSync();
}

export function findSession(tokenHash: string): SessionRecord | null {
  ensureInitialized();
  const now = Date.now();
  const session = memoryDb.sessions.find(s => s.tokenHash === tokenHash && s.expiresAt > now);
  return session || null;
}

export function deleteSessionByHash(tokenHash: string): void {
  ensureInitialized();
  memoryDb.sessions = memoryDb.sessions.filter(s => s.tokenHash !== tokenHash);
  persistSync();
}

export function deleteSessionsByUserId(userId: string): void {
  ensureInitialized();
  memoryDb.sessions = memoryDb.sessions.filter(s => s.userId !== userId);
  persistSync();
}

// Guest Quota Operations
export function getGuestQuota(guestId: string): number {
  ensureInitialized();
  const record = memoryDb.guestQuotas.find(g => g.guestId === guestId);
  return record ? record.count : 0;
}

export function incrementGuestQuota(guestId: string): { count: number; lastUsed: number } {
  ensureInitialized();
  const now = Date.now();
  const idx = memoryDb.guestQuotas.findIndex(g => g.guestId === guestId);
  let count = 1;

  if (idx >= 0) {
    memoryDb.guestQuotas[idx].count += 1;
    memoryDb.guestQuotas[idx].lastUsed = now;
    count = memoryDb.guestQuotas[idx].count;
  } else {
    memoryDb.guestQuotas.push({
      guestId,
      count: 1,
      lastUsed: now,
      createdAt: now,
    });
  }

  persistSync();
  return { count, lastUsed: now };
}

// History Operations (Owner isolated)
export function getHistoryByUserId(userId: string): HistoryRecord[] {
  ensureInitialized();
  return memoryDb.history
    .filter(h => h.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
}

export function insertHistory(item: Omit<HistoryRecord, 'id' | 'createdAt'>): HistoryRecord {
  ensureInitialized();
  const record: HistoryRecord = {
    ...item,
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
  };
  memoryDb.history.unshift(record);
  // Cap history per user to 50
  const userItems = memoryDb.history.filter(h => h.userId === item.userId);
  if (userItems.length > 50) {
    const keepIds = new Set(userItems.slice(0, 50).map(h => h.id));
    memoryDb.history = memoryDb.history.filter(h => h.userId !== item.userId || keepIds.has(h.id));
  }
  persistSync();
  return record;
}

export function deleteHistoryById(id: string, userId: string): boolean {
  ensureInitialized();
  const initialLen = memoryDb.history.length;
  // Strict IDOR protection: only delete if userId matches
  memoryDb.history = memoryDb.history.filter(h => !(h.id === id && h.userId === userId));
  const removed = memoryDb.history.length < initialLen;
  if (removed) persistSync();
  return removed;
}

export function clearHistoryByUserId(userId: string): void {
  ensureInitialized();
  memoryDb.history = memoryDb.history.filter(h => h.userId !== userId);
  persistSync();
}

// Saved Scenario Operations (Owner isolated)
export function getSavedScenariosByUserId(userId: string): SavedScenarioRecord[] {
  ensureInitialized();
  return memoryDb.savedScenarios
    .filter(s => s.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function insertSavedScenario(item: Omit<SavedScenarioRecord, 'id' | 'createdAt' | 'updatedAt'>): SavedScenarioRecord {
  ensureInitialized();
  const now = Date.now();
  const record: SavedScenarioRecord = {
    ...item,
    id: `save_${now}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
    updatedAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  memoryDb.savedScenarios.unshift(record);
  persistSync();
  return record;
}

export function deleteSavedScenarioById(id: string, userId: string): boolean {
  ensureInitialized();
  const initialLen = memoryDb.savedScenarios.length;
  // Strict IDOR protection: only delete if userId matches
  memoryDb.savedScenarios = memoryDb.savedScenarios.filter(s => !(s.id === id && s.userId === userId));
  const removed = memoryDb.savedScenarios.length < initialLen;
  if (removed) persistSync();
  return removed;
}

// Shared Calculations Operations (Public Read by cryptographically random ID)
export function getSharedCalculationById(id: string): SharedCalculationRecord | null {
  ensureInitialized();
  return memoryDb.sharedCalculations.find(s => s.id === id) || null;
}

export function insertSharedCalculation(id: string, calculatorId: string, inputs: Record<string, any>): SharedCalculationRecord {
  ensureInitialized();
  const record: SharedCalculationRecord = {
    id,
    calculatorId,
    inputs,
    createdAt: Date.now(),
  };
  memoryDb.sharedCalculations.push(record);
  persistSync();
  return record;
}

// Helper to reset DB for automated tests
export function _resetDatabaseForTesting(): void {
  memoryDb = {
    users: [],
    sessions: [],
    guestQuotas: [],
    history: [],
    savedScenarios: [],
    sharedCalculations: [],
  };
  persistSync();
}
