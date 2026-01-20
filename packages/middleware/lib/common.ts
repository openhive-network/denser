import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setLoginChallengeCookies } from '@hive/smart-signer/lib/middleware-challenge-cookies';
import { logPageVisit } from './auth-proof-cookie';
import { buildCsp, SECURITY_HEADERS, type CspConfig } from './csp';

/**
 * Configuration options for the common middleware
 */
export interface MiddlewareConfig {
  /**
   * If provided, redirect root path (/) to this path
   * Example: '/trending' will redirect / to /trending
   */
  rootRedirect?: string;

  /**
   * CSP configuration for runtime evaluation
   * If provided, CSP header will be set on all responses
   */
  csp?: CspConfig;
}

/**
 * Creates a configured middleware function
 * @param config - Optional configuration for app-specific behavior
 */
export function createMiddleware(config: MiddlewareConfig = {}) {
  // Build CSP once at startup (when middleware is created), not on every request
  const cspHeader = config.csp ? buildCsp(config.csp) : null;

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

    // Handle root redirect if configured (before creating response)
    if (config.rootRedirect) {
      if (pathname === '/' || pathname === `${basePath}` || pathname === `${basePath}/`) {
        const redirectResponse = NextResponse.redirect(
          new URL(`${basePath}${config.rootRedirect}`, request.url),
          { status: 302 }
        );
        // Apply security headers to redirect responses too
        if (cspHeader) {
          redirectResponse.headers.set('Content-Security-Policy', cspHeader);
          for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
            redirectResponse.headers.set(key, value);
          }
        }
        return redirectResponse;
      }
    }

    const res = NextResponse.next();

    // Apply CSP and security headers
    if (cspHeader) {
      res.headers.set('Content-Security-Policy', cspHeader);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        res.headers.set(key, value);
      }
    }

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

    return res;
  };
}
