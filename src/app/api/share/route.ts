import { NextRequest, NextResponse } from 'next/server';

// Server-side safe share storage (in production, backed by postgres `shared_calculations` table)
const shareStore = new Map<string, { calculatorId: string; inputs: Record<string, any>; createdAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { calculatorId, inputs } = body;

    if (!calculatorId || !inputs) {
      return NextResponse.json({ error: 'Missing calculatorId or inputs' }, { status: 400 });
    }

    // Generate a short URL-safe ID
    const shareId = Math.random().toString(36).substring(2, 10);
    shareStore.set(shareId, {
      calculatorId,
      inputs,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      shareId,
      shareUrl: `/share/${shareId}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id || !shareStore.has(id)) {
    return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
  }

  const data = shareStore.get(id);
  return NextResponse.json(data);
}
