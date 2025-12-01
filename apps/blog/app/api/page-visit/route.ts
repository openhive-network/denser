import { NextRequest, NextResponse } from 'next/server';
import { logPageVisit } from '@hive/middleware/lib/auth-proof-cookie';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => null)) as { pathname?: string } | null;

    const pathname = body?.pathname;
    if (!pathname || typeof pathname !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid pathname' }, { status: 400 });
    }

    // Reuse existing server-side logger (IP + cookie + skip rules)
    logPageVisit(req, pathname);

    return NextResponse.json({ ok: true });
  } catch {
    // Never break the app because of logging
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
