import { commonMiddleware } from '@hive/middleware/lib/common';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const result = await commonMiddleware(request);

  /// In blog, let's redirect root path to /trending
  if (pathname === '/') return NextResponse.redirect(new URL('/trending', request.url));

  return result;
}
