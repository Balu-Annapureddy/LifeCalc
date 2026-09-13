import { NextRequest, NextResponse } from 'next/server';
import { registry } from '@/engine/registry';
import { getUserFromRequest } from '@/lib/auth';
import { getOrCreateGuestId, attachGuestCookie } from '@/lib/guest';

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
    const authenticatedUser = await getUserFromRequest(req);

    if (authenticatedUser) {
      return NextResponse.json({
        result,
        isGuest: false,
      });
    }

    // 4. Guest Calculation — Freely allowed without quota blocking
    const { guestId, signedCookie, isNew } = getOrCreateGuestId(req);

    const response = NextResponse.json({
      result,
      isGuest: true,
      guestId,
    });

    attachGuestCookie(response, signedCookie, isNew);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal calculation error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const authenticatedUser = await getUserFromRequest(req);

  if (authenticatedUser) {
    return NextResponse.json({
      isGuest: false,
    });
  }

  const { guestId } = getOrCreateGuestId(req);
  return NextResponse.json({
    isGuest: true,
    guestId,
  });
}
