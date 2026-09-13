import { NextRequest, NextResponse } from 'next/server';
import { saveSharedCalculation, getSharedCalculation } from '@/lib/share';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { calculatorId, inputs } = body;

    if (!calculatorId || !inputs) {
      return NextResponse.json({ error: 'Missing calculatorId or inputs' }, { status: 400 });
    }

    const shareId = await saveSharedCalculation(calculatorId, inputs);

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

  if (!id) {
    return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 });
  }

  const data = await getSharedCalculation(id);
  if (!data) {
    return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
  }

  return NextResponse.json(data);
}