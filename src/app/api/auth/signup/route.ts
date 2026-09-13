import { NextRequest, NextResponse } from 'next/server';
import { userDatabase, createSessionToken, UserSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing name, email, or password' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (userDatabase.has(normalizedEmail)) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const userId = `usr_${Math.random().toString(36).substring(2, 10)}`;
    const user: UserSession = {
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      createdAt: Date.now(),
    };

    userDatabase.set(normalizedEmail, {
      ...user,
      passwordHash: password, // In production: bcrypt.hash
    });

    const token = createSessionToken(user);

    const res = NextResponse.json({
      success: true,
      user,
      message: 'Account created successfully',
    });

    res.cookies.set('lifecalc_auth_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 });
  }
}
