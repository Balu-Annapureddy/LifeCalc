import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
};

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }
    return NextResponse.json(
      { authenticated: true, user },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Auth check failed' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}