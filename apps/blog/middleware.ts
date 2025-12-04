import { type NextRequest, NextResponse } from 'next/server';
import { setLoginChallengeCookies } from '@hive/smart-signer/lib/middleware-challenge-cookies';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const res = NextResponse.next();

  // Set login challenge cookies (needed for console logging process)
  setLoginChallengeCookies(request, res);

  // In blog, redirect root path to /trending
  if (pathname === '/' || pathname === `${basePath}` || pathname === `${basePath}/`) {
    return NextResponse.redirect(new URL(`${basePath}/trending`, request.url), { status: 302 });
  }

  return res;
}
