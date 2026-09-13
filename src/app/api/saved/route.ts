import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export interface SavedItem {
  id: string;
  name: string;
  calculatorId: string;
  primaryResult: string;
  notes?: string;
  updatedAt: string;
  inputs: Record<string, any>;
}

const savedStore = new Map<string, SavedItem[]>();

function getSessionKey(req: NextRequest): string {
  const user = getUserFromRequest(req);
  if (user) return user.id;
  const guestSession = req.cookies.get('lifecalc_guest_session')?.value || 'guest_default';
  return guestSession;
}

export async function GET(req: NextRequest) {
  const key = getSessionKey(req);
  const items = savedStore.get(key) || [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const key = getSessionKey(req);
    const body = await req.json();
    const { name, calculatorId, primaryResult, notes, inputs } = body;

    if (!name || !calculatorId || !inputs) {
      return NextResponse.json({ error: 'Missing name, calculatorId, or inputs' }, { status: 400 });
    }

    const newItem: SavedItem = {
      id: `save_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      calculatorId,
      primaryResult: primaryResult || '',
      notes: notes || '',
      updatedAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      inputs,
    };

    const current = savedStore.get(key) || [];
    savedStore.set(key, [newItem, ...current]);

    return NextResponse.json({ success: true, item: newItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to bookmark scenario' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const key = getSessionKey(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const current = savedStore.get(key) || [];
    savedStore.set(key, current.filter(item => item.id !== id));
  } else {
    savedStore.delete(key);
  }

  return NextResponse.json({ success: true });
}
