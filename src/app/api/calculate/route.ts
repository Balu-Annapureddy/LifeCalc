import { NextRequest, NextResponse } from 'next/server';
import { registry } from '@/engine/registry';

// In-memory server-side session quota store (backed by session ID cookie)
// In production, this can also query the database `guest_usage` table.
const GUEST_MAX_CALCULATIONS = 15;
const sessionQuotaStore = new Map<string, { count: number; lastUsed: number }>();

function cleanupExpiredSessions() {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  for (const [id, session] of sessionQuotaStore.entries()) {
    if (now - session.lastUsed > 7 * ONE_DAY_MS) {
      sessionQuotaStore.delete(id);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { calculatorId, inputs, authToken } = body;

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

    // 3. Check Authentication vs Guest Quota
    // If user has auth token/session, they get unlimited calculations
    const isAuthed = Boolean(authToken || req.cookies.get('sb-access-token')?.value);

    if (isAuthed) {
      return NextResponse.json({
        result,
        isGuest: false,
        calculationsUsed: 0,
        calculationsRemaining: -1,
        quotaReached: false,
      });
    }

    // 4. Guest Session Quota Tracking (Tamper-proof server session)
    let sessionId = req.cookies.get('lifecalc_guest_sid')?.value;
    let isNewSession = false;

    if (!sessionId) {
      sessionId = `guest_${Math.random().toString(36).substring(2)}_${Date.now()}`;
      isNewSession = true;
    }

    cleanupExpiredSessions();

    const currentSession = sessionQuotaStore.get(sessionId) || { count: 0, lastUsed: Date.now() };
    const newCount = currentSession.count + 1;
    currentSession.count = newCount;
    currentSession.lastUsed = Date.now();
    sessionQuotaStore.set(sessionId, currentSession);

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

    if (isNewSession) {
      response.cookies.set('lifecalc_guest_sid', sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
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
  const sessionId = req.cookies.get('lifecalc_guest_sid')?.value;
  const isAuthed = Boolean(req.cookies.get('sb-access-token')?.value);

  if (isAuthed) {
    return NextResponse.json({
      isGuest: false,
      calculationsUsed: 0,
      calculationsRemaining: -1,
      quotaReached: false,
    });
  }

  const currentSession = sessionId ? sessionQuotaStore.get(sessionId) : undefined;
  const count = currentSession ? currentSession.count : 0;
  const remaining = Math.max(0, GUEST_MAX_CALCULATIONS - count);

  return NextResponse.json({
    isGuest: true,
    calculationsUsed: count,
    calculationsRemaining: remaining,
    quotaReached: count >= GUEST_MAX_CALCULATIONS,
  });
}
