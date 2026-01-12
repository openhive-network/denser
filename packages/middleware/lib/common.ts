import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setLoginChallengeCookies } from '@hive/smart-signer/lib/middleware-challenge-cookies';
import { logPageVisit } from './auth-proof-cookie';

/**
 * Configuration options for the common middleware
 */
export interface MiddlewareConfig {
  /**
   * If provided, redirect root path (/) to this path
   * Example: '/trending' will redirect / to /trending
   */
  rootRedirect?: string;
}

/**
 * Creates a configured middleware function
 * @param config - Optional configuration for app-specific behavior
 */
export function createMiddleware(config: MiddlewareConfig = {}) {
  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

    const res = NextResponse.next();

    setLoginChallengeCookies(request, res);

    if (pathname.match('/((?!api|_next/static|_next/image|favicon.ico).*)')) {
      const isPrefetch =
        request.headers.get('x-middleware-prefetch') === '1' ||
        request.headers.get('purpose') === 'prefetch' ||
        request.headers.get('sec-purpose')?.includes('prefetch');

      if (!isPrefetch) {
        // Log page visits for authenticated users (if they have auth proof cookie)
        logPageVisit(request, pathname);
      }
    }

    // Handle root redirect if configured
    if (config.rootRedirect) {
      if (pathname === '/' || pathname === `${basePath}` || pathname === `${basePath}/`) {
        return NextResponse.redirect(
          new URL(`${basePath}${config.rootRedirect}`, request.url),
          { status: 302 }
        );
      }
    }

    return res;
  };
}
