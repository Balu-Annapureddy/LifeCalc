import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { config } from './config';

export function signGuestId(guestId: string): string {
  const signature = crypto.createHmac('sha256', config.guestQuotaSecret).update(guestId).digest('base64url');
  return `${guestId}.${signature}`;
}

export function verifyGuestId(rawToken: string | undefined): string | null {
  if (!rawToken || typeof rawToken !== 'string') return null;

  // Support clean transition or existing test IDs if formatted simply
  const parts = rawToken.split('.');
  if (parts.length === 1) {
    // For legacy/test sessions that don't have dot, allow if non-empty and well-formed
    if (/^[a-zA-Z0-9_-]{8,64}$/.test(rawToken)) {
      return rawToken;
    }
    return null;
  }

  if (parts.length !== 2) return null;

  const [guestId, providedSig] = parts;
  const expectedSig = crypto.createHmac('sha256', config.guestQuotaSecret).update(guestId).digest('base64url');

  try {
    const provBuf = Buffer.from(providedSig);
    const expBuf = Buffer.from(expectedSig);
    if (provBuf.length !== expBuf.length || !crypto.timingSafeEqual(provBuf, expBuf)) {
      return null;
    }
    return guestId;
  } catch {
    return null;
  }
}

export function getOrCreateGuestId(req: NextRequest): { guestId: string; signedCookie: string; isNew: boolean } {
  const rawCookie = req.cookies.get('lifecalc_guest_sid')?.value;
  const validatedId = verifyGuestId(rawCookie);

  if (validatedId) {
    return {
      guestId: validatedId,
      signedCookie: rawCookie!.includes('.') ? rawCookie! : signGuestId(validatedId),
      isNew: !rawCookie!.includes('.'),
    };
  }

  const newGuestId = `guest_${crypto.randomBytes(16).toString('hex')}`;
  const signedCookie = signGuestId(newGuestId);
  return {
    guestId: newGuestId,
    signedCookie,
    isNew: true,
  };
}

export function attachGuestCookie(
  response: { cookies: { set: (name: string, value: string, options: any) => void } },
  signedCookie: string,
  isNew: boolean
): void {
  if (!isNew) return;
  response.cookies.set('lifecalc_guest_sid', signedCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
}
