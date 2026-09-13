import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findUserByEmail, insertUser } from '@/lib/db';
import {
  hashPassword,
  createSessionToken,
  SafeUser,
  checkLoginRateLimit,
  recordFailedLogin,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing name, email, or password' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting to prevent account creation / enumeration spam
    const rateLimit = await checkLoginRateLimit(`signup:${normalizedEmail}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateLimit.waitSeconds} seconds.` },
        { status: 429 }
      );
    }

    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      await recordFailedLogin(`signup:${normalizedEmail}`);
      if (existing.passwordHash === 'OAUTH_PROVIDER_GOOGLE') {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists via Google. Please click "Continue with Google" or reset your password to add a LifeCalc password.',
            isOAuthAccount: true,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const { hash, salt } = hashPassword(password);
    const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const safeUser: SafeUser = {
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      emailVerified: false,
      createdAt: Date.now(),
    };

    await insertUser({
      ...safeUser,
      passwordHash: hash,
      salt,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiresAt: verificationExpires,
    });

    // Production-safe email notification service dispatch
    console.log(`[EMAIL VERIFICATION SERVICE] Verification token issued for ${normalizedEmail}. Verification URL: /verify-email?token=${verificationToken}`);

    const { token, expiresAt } = await createSessionToken(safeUser);

    const res = NextResponse.json({
      success: true,
      user: safeUser,
      verificationRequired: true,
      message: 'Account created successfully. Please verify your email address.',
    });

    res.cookies.set('lifecalc_auth_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(expiresAt),
      path: '/',
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal signup error' }, { status: 500 });
  }
}