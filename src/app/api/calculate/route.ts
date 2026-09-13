import { NextRequest, NextResponse } from 'next/server';
import { registry } from '@/engine/registry';
import { getUserFromRequest } from '@/lib/auth';
import { getOrCreateGuestId } from '@/lib/guest';
import { getGuestQuota, incrementGuestQuota } from '@/lib/db';

const GUEST_MAX_CALCULATIONS = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { calculatorId, inputs } = body;

    // Security: Do NOT accept authToken from body. Authenticated status must come ONLY from server-verified session cookie.
    if (!calculatorId || !inputs) {
      return NextResponse.json({ error: 'Missing calculatorId or inputs' }, { status: 400 });
    }

    const calc = registry.getById(calculatorId);
    if (!calc) {
      return NextResponse.json({ error: `Unknown calculator: ${calculatorId}` }, { status: 404 });
    }

    // 1. Validate inputs with calculator's Zod schema
    const validation = calc.inputSchema.safeParse(inputs);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 422 }
      );
    }

    // 2. Perform authoritative calculation
    const result = calc.calculate(validation.data);

    // 3. Server-side Authentication Verification
    const authenticatedUser = getUserFromRequest(req);

    if (authenticatedUser) {
      return NextResponse.json({
        result,
        isGuest: false,
        calculationsUsed: 0,
        calculationsRemaining: -1,
        quotaReached: false,
      });
    }

    // 4. Authoritative Persistent Guest Quota Tracking
    const { guestId, signedCookie, isNew } = getOrCreateGuestId(req);
    const currentCount = getGuestQuota(guestId);

    // 15th calculation works and is displayed; 16th calculation attempt is blocked with 429
    if (currentCount >= GUEST_MAX_CALCULATIONS) {
      const blockedResponse = NextResponse.json(
        {
          error: 'Guest calculation limit reached',
          message: "You've used your 15 free calculations. Sign in for unlimited free calculations and save your progress.",
          isGuest: true,
          calculationsUsed: currentCount,
          calculationsRemaining: 0,
          quotaReached: true,
        },
        { status: 429 }
      );
      if (isNew) {
        blockedResponse.cookies.set('lifecalc_guest_sid', signedCookie, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }
      return blockedResponse;
    }

    // Increment persistent quota
    const { count: newCount } = incrementGuestQuota(guestId);
    const calculationsRemaining = Math.max(0, GUEST_MAX_CALCULATIONS - newCount);
    const quotaReached = newCount >= GUEST_MAX_CALCULATIONS;

    // Response includes the result (even for the 15th calculation) + quota status
    const response = NextResponse.json({
      result,
      isGuest: true,
      calculationsUsed: newCount,
      calculationsRemaining,
      quotaReached,
    });

    if (isNew) {
      response.cookies.set('lifecalc_guest_sid', signedCookie, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal calculation error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Query current guest quota status without incrementing count
  const authenticatedUser = getUserFromRequest(req);

  if (authenticatedUser) {
    return NextResponse.json({
      isGuest: false,
      calculationsUsed: 0,
      calculationsRemaining: -1,
      quotaReached: false,
    });
  }

  const { guestId, signedCookie, isNew } = getOrCreateGuestId(req);
  const count = getGuestQuota(guestId);
  const remaining = Math.max(0, GUEST_MAX_CALCULATIONS - count);

  const res = NextResponse.json({
    isGuest: true,
    calculationsUsed: count,
    calculationsRemaining: remaining,
    quotaReached: count >= GUEST_MAX_CALCULATIONS,
  });

  if (isNew) {
    res.cookies.set('lifecalc_guest_sid', signedCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
  }

  return res;
}
