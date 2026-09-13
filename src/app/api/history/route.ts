import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export interface HistoryItem {
  id: string;
  userId?: string;
  calculatorId: string;
  summary: string;
  primaryValue: string;
  timestamp: string;
  inputs: Record<string, any>;
}

// In-memory store (keyed by userId or guest session id)
const historyStore = new Map<string, HistoryItem[]>();

function getSessionKey(req: NextRequest): string {
  const user = getUserFromRequest(req);
  if (user) return user.id;
  const guestSession = req.cookies.get('lifecalc_guest_session')?.value || 'guest_default';
  return guestSession;
}

export async function GET(req: NextRequest) {
  const key = getSessionKey(req);
  const items = historyStore.get(key) || [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const key = getSessionKey(req);
    const body = await req.json();
    const { calculatorId, summary, primaryValue, inputs } = body;

    if (!calculatorId || !inputs) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newItem: HistoryItem = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      calculatorId,
      summary: summary || 'Calculation execution',
      primaryValue: primaryValue || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      inputs,
    };

    const current = historyStore.get(key) || [];
    // Keep most recent 50
    historyStore.set(key, [newItem, ...current].slice(0, 50));

    return NextResponse.json({ success: true, item: newItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save history' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const key = getSessionKey(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const current = historyStore.get(key) || [];
    historyStore.set(key, current.filter(item => item.id !== id));
  } else {
    historyStore.delete(key);
  }

  return NextResponse.json({ success: true });
}
