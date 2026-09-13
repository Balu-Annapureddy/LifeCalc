import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/db';
import {
  verifyPassword,
  createSessionToken,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
  SafeUser,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limit for brute-force protection
    const rateLimit = await checkLoginRateLimit(normalizedEmail);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many failed attempts. Please try again in ${rateLimit.waitSeconds} seconds.` },
        { status: 429 }
      );
    }

    const user = await findUserByEmail(normalizedEmail);
    // Strict security: Unknown users must return 401, NEVER auto-provision!
    if (!user) {
      // Execute dummy verifyPassword against random hash to prevent timing-based user enumeration
      verifyPassword(password, '0'.repeat(128), '0'.repeat(32));
      await recordFailedLogin(normalizedEmail);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // If account was created via Google and has not set a LifeCalc password
    if (user.passwordHash === 'OAUTH_PROVIDER_GOOGLE') {
      verifyPassword(password, '0'.repeat(128), '0'.repeat(32));
      await recordFailedLogin(normalizedEmail);
      return NextResponse.json(
        {
          error:
            'This account was created with Google. Please use "Continue with Google" or use "Forgot password" to set a LifeCalc password.',
          isOAuthAccount: true,
        },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      await recordFailedLogin(normalizedEmail);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Reset failed attempts on success
    await resetLoginAttempts(normalizedEmail);

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: Boolean(user.emailVerified),
      createdAt: user.createdAt,
    };

    const { token, expiresAt } = await createSessionToken(safeUser);

    const res = NextResponse.json({
      success: true,
      user: safeUser,
      message: 'Signed in successfully',
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
    return NextResponse.json({ error: 'Internal signin error' }, { status: 500 });
  }
}