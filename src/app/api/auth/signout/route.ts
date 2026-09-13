import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('lifecalc_auth_session')?.value;
  if (token) {
    invalidateSession(token);
  }

  const res = NextResponse.json({ success: true, message: 'Signed out successfully' });
  res.cookies.set('lifecalc_auth_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });

  return res;
}
