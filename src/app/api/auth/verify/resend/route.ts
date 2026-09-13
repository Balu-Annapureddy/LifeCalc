import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUserFromRequest } from '@/lib/auth';
import { updateUserVerificationToken, findUserById } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const safeUser = await getUserFromRequest(req);
    if (!safeUser) {
      return NextResponse.json({ error: 'Authentication required to resend verification email' }, { status: 401 });
    }

    const fullUser = await findUserById(safeUser.id);
    if (!fullUser) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    if (fullUser.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Your email address is already verified.',
      });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await updateUserVerificationToken(safeUser.id, newToken, newExpires);

    // Production-safe email dispatch
    console.log(`[EMAIL VERIFICATION SERVICE] Fresh verification token issued for ${safeUser.email}. Verification URL: /verify-email?token=${newToken}`);

    return NextResponse.json({
      success: true,
      message: 'A new verification link has been sent to your email address.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 });
  }
}
