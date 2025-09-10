import { commonMiddleware } from '@hive/middleware/lib/common';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const result = await commonMiddleware(request);

  /// In blog, let's redirect root path to /trending
  if (pathname === '/' || pathname === `${basePath}` || pathname === `${basePath}/`) {
    return NextResponse.redirect(new URL(`${basePath}/trending`, request.url), { status: 302 });
  }

  return result;
}
