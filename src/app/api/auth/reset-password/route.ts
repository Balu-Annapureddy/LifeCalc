import { NextRequest, NextResponse } from 'next/server';
import { findUserByResetToken, updateUserPassword } from '@/lib/db';
import { hashPassword, invalidateAllUserSessions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid reset token' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Lookup user by active reset token
    const user = await findUserByResetToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (!user.resetTokenExpiresAt || Date.now() > user.resetTokenExpiresAt) {
      return NextResponse.json(
        { error: 'This password reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash new password using production scrypt
    const { hash, salt } = hashPassword(password);

    // Update password and clear reset token
    await updateUserPassword(user.id, hash, salt);

    // Invalidate all active sessions for this user across all browsers/devices
    await invalidateAllUserSessions(user.id);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You may now sign in with your new password.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
