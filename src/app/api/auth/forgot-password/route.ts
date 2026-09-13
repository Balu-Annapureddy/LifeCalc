import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findUserByEmail, setUserResetToken } from '@/lib/db';
import { checkLoginRateLimit, recordFailedLogin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting keyed by reset:email to protect against flooding
    const rateKey = `reset:${normalizedEmail}`;
    const rateLimit = await checkLoginRateLimit(rateKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many password reset requests. Please try again in ${rateLimit.waitSeconds} seconds.` },
        { status: 429 }
      );
    }

    const user = await findUserByEmail(normalizedEmail);

    if (user) {
      // Generate secure 32-byte cryptographic token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity

      await setUserResetToken(user.id, resetToken, expiresAt);

      // In production, this dispatches through email service provider (SendGrid / Postmark / Supabase Auth).
      console.log(`[PASSWORD RESET SERVICE] Reset token generated for ${normalizedEmail}. Reset URL: /reset-password?token=${resetToken}`);
    } else {
      // Record attempt to prevent brute force enumeration
      await recordFailedLogin(rateKey);
    }

    // Always return generic success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to process password reset request' }, { status: 500 });
  }
}
