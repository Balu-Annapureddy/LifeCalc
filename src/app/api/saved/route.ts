import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getOrCreateGuestId, attachGuestCookie } from '@/lib/guest';
import {
  getSavedScenariosByUserId,
  insertSavedScenario,
  deleteSavedScenarioById,
} from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { guestId, signedCookie, isNew } = getOrCreateGuestId(req);
    const userId = user ? user.id : guestId;

    const items = await getSavedScenariosByUserId(userId);
    const response = NextResponse.json({ items });

    attachGuestCookie(response, signedCookie, isNew);
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve saved scenarios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { guestId, signedCookie, isNew } = getOrCreateGuestId(req);
    const userId = user ? user.id : guestId;

    const body = await req.json();
    const { name, calculatorId, primaryResult, notes, inputs } = body;

    if (!name || !calculatorId || !inputs) {
      return NextResponse.json({ error: 'Missing name, calculatorId, or inputs' }, { status: 400 });
    }

    if (typeof inputs !== 'object' || JSON.stringify(inputs).length > 8192) {
      return NextResponse.json({ error: 'Calculation inputs payload too large' }, { status: 400 });
    }

    const cappedName = typeof name === 'string' ? name.trim().slice(0, 100) : 'Scenario';
    const cappedResult = typeof primaryResult === 'string' ? primaryResult.slice(0, 50) : '';
    const cappedNotes = typeof notes === 'string' ? notes.trim().slice(0, 500) : '';

    const newItem = await insertSavedScenario({
      userId,
      name: cappedName,
      calculatorId,
      primaryResult: cappedResult,
      notes: cappedNotes,
      inputs,
    });

    const response = NextResponse.json({ success: true, item: newItem });
    attachGuestCookie(response, signedCookie, isNew);
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save scenario' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { guestId } = getOrCreateGuestId(req);
    const userId = user ? user.id : guestId;

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
