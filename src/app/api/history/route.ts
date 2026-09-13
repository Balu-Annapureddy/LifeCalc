import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getOrCreateGuestId } from '@/lib/guest';
import {
  getHistoryByUserId,
  insertHistory,
  deleteHistoryById,
  clearHistoryByUserId,
} from '@/lib/db';

async function getEffectiveUserId(req: NextRequest): Promise<string> {
  const user = await getUserFromRequest(req);
  if (user) return user.id;
  const { guestId } = getOrCreateGuestId(req);
  return guestId;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    const items = await getHistoryByUserId(userId);
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    const body = await req.json();
    const { calculatorId, summary, primaryValue, inputs } = body;

    if (!calculatorId || !inputs) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newItem = await insertHistory({
      userId,
      calculatorId,
      summary: summary || 'Calculation execution',
      primaryValue: primaryValue || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      inputs,
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to record history' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      // Strict IDOR protection: only deletes if the record belongs to this userId
      const deleted = await deleteHistoryById(id, userId);
      return NextResponse.json({ success: true, deleted });
    } else {
      await clearHistoryByUserId(userId);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}