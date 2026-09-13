import { NextRequest, NextResponse } from 'next/server';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

// In-memory user store for credentials & profiles (in production backed by Postgres `users` / `profiles`)
const userDatabase = new Map<string, { id: string; email: string; name: string; passwordHash: string; createdAt: number }>();

// Simple signature/token encoding for session cookies
export function createSessionToken(user: UserSession): string {
  const payload = JSON.stringify(user);
  return Buffer.from(payload).toString('base64url');
}

export function parseSessionToken(token: string): UserSession | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    const user = JSON.parse(json);
    if (user && user.id && user.email) {
      return user as UserSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): UserSession | null {
  const cookie = req.cookies.get('lifecalc_auth_session')?.value;
  if (!cookie) return null;
  return parseSessionToken(cookie);
}

export { userDatabase };
