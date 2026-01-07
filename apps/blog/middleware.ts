import { type NextRequest, NextResponse } from 'next/server';
import { setLoginChallengeCookies } from '@hive/smart-signer/lib/middleware-challenge-cookies';

// NOTE: Nonce-based CSP is disabled because Next.js 14 doesn't fully support it.
// Next.js internal scripts (__NEXT_DATA__, hydration) don't receive nonces automatically,
// and inline style attributes (style-src-attr) don't support nonces at all.
// The static CSP in next.config.js provides protection without causing violations.
// See GitLab issue #796 for tracking nonce CSP support in future Next.js versions.

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const res = NextResponse.next();

  // Set login challenge cookies (needed for console logging process)
  setLoginChallengeCookies(request, res);

  // CSP is now set via next.config.js headers() - no middleware override needed
  // The static CSP uses 'unsafe-inline' which is compatible with Next.js

  // In blog, redirect root path to /trending
  if (pathname === '/' || pathname === `${basePath}` || pathname === `${basePath}/`) {
    return NextResponse.redirect(new URL(`${basePath}/trending`, request.url), { status: 302 });
  }

  return res;
}
