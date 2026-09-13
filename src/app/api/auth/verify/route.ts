import { NextRequest, NextResponse } from 'next/server';
import { findUserByVerificationToken, verifyUserEmail } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid verification token' }, { status: 400 });
    }

    const user = await findUserByVerificationToken(token.trim());
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    if (user.verificationTokenExpiresAt && Date.now() > user.verificationTokenExpiresAt) {
      return NextResponse.json(
        { error: 'Verification link has expired. Please request a new verification email.' },
        { status: 400 }
      );
    }

    await verifyUserEmail(user.id);

    return NextResponse.json({
      success: true,
      message: 'Email address verified successfully. Your account is now fully verified.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal verification error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing verification token parameter' }, { status: 400 });
  }

  const user = await findUserByVerificationToken(token.trim());
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
  }

  if (user.verificationTokenExpiresAt && Date.now() > user.verificationTokenExpiresAt) {
    return NextResponse.json(
      { error: 'Verification link has expired. Please request a new verification email.' },
      { status: 400 }
    );
  }

  await verifyUserEmail(user.id);

  return NextResponse.json({
    success: true,
    message: 'Email address verified successfully. Your account is now fully verified.',
  });
}
