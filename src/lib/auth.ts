import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { config } from './config';
import {
  findUserByEmail,
  findUserById,
  insertUser,
  insertSession,
  findSession,
  deleteSessionByHash,
  checkLoginRateLimit as dbCheckRateLimit,
  recordFailedLogin as dbRecordFailedLogin,
  resetLoginAttempts as dbResetLoginAttempts,
  UserRecord,
} from './db';

const SESSION_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

// Password Hashing via Node.js crypto.scrypt
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const storedBuffer = Buffer.from(hash, 'hex');
    if (derivedKey.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, storedBuffer);
  } catch {
    return false;
  }
}

// Cryptographic token hashing for DB lookup
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Token Creation: <sessionId>.<payloadBase64url>.<signature>
export async function createSessionToken(user: SafeUser): Promise<{ token: string; expiresAt: number }> {
  const sessionId = crypto.randomBytes(24).toString('base64url');
  const expiresAt = Date.now() + SESSION_EXPIRY_MS;
  const payload = JSON.stringify({
    sid: sessionId,
    uid: user.id,
    exp: expiresAt,
  });
  const payloadB64 = Buffer.from(payload).toString('base64url');

  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(`${sessionId}.${payloadB64}`)
    .digest('base64url');

  const token = `${sessionId}.${payloadB64}.${signature}`;

  // Persist session to database
  await insertSession({
    id: sessionId,
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
    createdAt: Date.now(),
  });

  return { token, expiresAt };
}

// Token Verification: Cryptographic HMAC check + Database active session check
export async function verifySessionToken(token: string): Promise<SafeUser | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [sessionId, payloadB64, providedSig] = parts;

  // 1. Verify HMAC Signature
  const expectedSig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(`${sessionId}.${payloadB64}`)
    .digest('base64url');

  try {
    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  // 2. Parse payload and verify expiry
  let payload: { sid: string; uid: string; exp: number };
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    payload = JSON.parse(json);
  } catch {
    return null;
  }

  if (Date.now() > payload.exp) {
    return null;
  }

  // 3. Verify session exists in persistent DB
  const session = await findSession(hashToken(token));
  if (!session || session.userId !== payload.uid) {
    return null;
  }

  // 4. Retrieve user record
  const user = await findUserById(payload.uid);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

// Destroy session (Logout)
export async function invalidateSession(token: string): Promise<void> {
  if (!token) return;
  await deleteSessionByHash(hashToken(token));
}

// Helper to extract authenticated user strictly from server cookie
export async function getUserFromRequest(req: NextRequest): Promise<SafeUser | null> {
  const cookie = req.cookies.get('lifecalc_auth_session')?.value;
  if (!cookie) return null;
  return verifySessionToken(cookie);
}

// Persistent shared rate limiter for multi-process brute force defense
export async function checkLoginRateLimit(key: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  return dbCheckRateLimit(key);
}

export async function recordFailedLogin(key: string): Promise<void> {
  return dbRecordFailedLogin(key);
}

export async function resetLoginAttempts(key: string): Promise<void> {
  return dbResetLoginAttempts(key);
}