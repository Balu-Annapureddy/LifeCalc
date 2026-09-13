import { NextRequest, NextResponse } from 'next/server';
import { userDatabase, createSessionToken, UserSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = userDatabase.get(normalizedEmail);

    // If user exists, check password; if demo/local testing, register them automatically if not found
    let user: UserSession;
    if (existing) {
      if (existing.passwordHash !== password) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      user = { id: existing.id, email: existing.email, name: existing.name, createdAt: existing.createdAt };
    } else {
      // Auto-provision demo account for smooth testability
      const userId = `usr_${Math.random().toString(36).substring(2, 10)}`;
      user = {
        id: userId,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        createdAt: Date.now(),
      };
      userDatabase.set(normalizedEmail, { ...user, passwordHash: password });
    }

    const token = createSessionToken(user);
    const res = NextResponse.json({
      success: true,
      user,
      message: 'Signed in successfully',
    });

    res.cookies.set('lifecalc_auth_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Signin failed' }, { status: 500 });
  }
}
