import { NextRequest, NextResponse } from 'next/server';
import { saveSharedCalculation, getSharedCalculation } from '@/lib/share';
import { checkLoginRateLimit, recordFailedLogin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown_ip';
    const rateLimit = await checkLoginRateLimit(`share:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many shared calculations generated. Please try again in ${rateLimit.waitSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { calculatorId, inputs } = body;

    if (!calculatorId || !inputs) {
      return NextResponse.json({ error: 'Missing calculatorId or inputs' }, { status: 400 });
    }

    // Limit payload size to avoid database bloat
    if (typeof inputs !== 'object' || JSON.stringify(inputs).length > 8192) {
      return NextResponse.json({ error: 'Calculation inputs payload too large' }, { status: 400 });
    }

    const shareId = await saveSharedCalculation(calculatorId, inputs);

    return NextResponse.json({
      shareId,
      shareUrl: `/share/${shareId}`,
    });
  } catch (err: any) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown_ip';
    await recordFailedLogin(`share:${ip}`);
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