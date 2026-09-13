import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findUserByEmail, insertUser } from '@/lib/db';
import { createSessionToken, SafeUser, invalidateAllUserSessions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const savedState = req.cookies.get('lifecalc_oauth_state')?.value;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${req.nextUrl.origin}/signin?error=oauth_unconfigured`);
  }

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${req.nextUrl.origin}/signin?error=invalid_oauth_state`);
  }

  try {
    const origin = req.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/oauth/google/callback`;

    // 1. Exchange code for Google access token & ID token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${origin}/signin?error=oauth_token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated user profile from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${origin}/signin?error=oauth_userinfo_failed`);
    }

    const googleUser = await userRes.json();
    const email = (googleUser.email || '').toLowerCase().trim();
    const name = (googleUser.name || googleUser.given_name || email.split('@')[0]).trim();

    if (!email) {
      return NextResponse.redirect(`${origin}/signin?error=oauth_email_missing`);
    }

    // 3. Find or create unified user in LifeCalc database
    let user = await findUserByEmail(email);

    if (!user) {
      const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
      user = await insertUser({
        id: userId,
        email,
        name,
        passwordHash: 'OAUTH_PROVIDER_GOOGLE',
        salt: 'OAUTH_AUTHENTICATED',
        emailVerified: true, // Google pre-verifies email addresses
        verificationToken: null,
        verificationTokenExpiresAt: null,
        createdAt: Date.now(),
      });
    } else if (!user.emailVerified) {
      // SECURITY FIX (Anti-Pre-Hijack):
      // If an unverified account exists with a password set, an attacker may have registered
      // the victim's email. Google OAuth proves the current user genuinely owns this email.
      // We must strip the unverified password so the attacker cannot retain access,
      // invalidate any active sessions the attacker had, and verify the legitimate owner.
      await invalidateAllUserSessions(user.id);
      user = await insertUser({
        ...user,
        name: user.name || name,
        passwordHash: 'OAUTH_PROVIDER_GOOGLE',
        salt: 'OAUTH_AUTHENTICATED',
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      });
    }

    // 4. Issue standard authoritative HMAC session
    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: true,
      createdAt: user.createdAt,
    };

    const { token, expiresAt } = await createSessionToken(safeUser);

    const redirectResponse = NextResponse.redirect(`${origin}/`);
    redirectResponse.cookies.set('lifecalc_auth_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(expiresAt),
      path: '/',
    });

    // Clear one-time oauth state cookie
    redirectResponse.cookies.delete('lifecalc_oauth_state');

    return redirectResponse;
  } catch (err: any) {
    return NextResponse.redirect(`${req.nextUrl.origin}/signin?error=oauth_internal_error`);
  }
}
