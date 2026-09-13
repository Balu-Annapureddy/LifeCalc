import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getOrCreateGuestId } from '@/lib/guest';
import {
  getSavedScenariosByUserId,
  insertSavedScenario,
  deleteSavedScenarioById,
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
    const items = await getSavedScenariosByUserId(userId);
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve saved scenarios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    const body = await req.json();
    const { name, calculatorId, primaryResult, notes, inputs } = body;

    if (!name || !calculatorId || !inputs) {
      return NextResponse.json({ error: 'Missing name, calculatorId, or inputs' }, { status: 400 });
    }

    const newItem = await insertSavedScenario({
      userId,
      name: name.trim(),
      calculatorId,
      primaryResult: primaryResult || '',
      notes: notes ? notes.trim() : '',
      inputs,
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save scenario' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing scenario id' }, { status: 400 });
    }

    // Strict IDOR protection: only deletes if the record belongs to this userId
    const deleted = await deleteSavedScenarioById(id, userId);
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 });
  }
}