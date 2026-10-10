import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setLoginChallengeCookies } from '@hive/smart-signer/lib/middleware-challenge-cookies';
import { logPageVisit } from './page-visit-logger';
import { buildCsp, generateNonce, NONCE_HEADER, SECURITY_HEADERS, type CspConfig } from './csp';

/**
 * Configuration options for the common middleware
 */
export interface MiddlewareConfig {
  /**
   * If provided, internally rewrite the root path (/) to this path.
   * The target route's content is served at / with no client-visible redirect:
   * the URL stays / and the browser receives the SSR response directly, avoiding
   * the extra round-trip a 302 would cost.
   * Example: '/trending' serves the trending feed at /.
   */
  rootRewrite?: string;

  /**
   * CSP configuration for runtime evaluation
   * If provided, a CSP header with a fresh script nonce will be set on all responses
   */
  csp?: CspConfig;
}

/**
 * Creates a configured middleware function
 * @param config - Optional configuration for app-specific behavior
 */
export function createMiddleware(config: MiddlewareConfig = {}) {
  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

    // Serve a configured route at the root path without a client-visible redirect.
    // A rewrite (vs a 302) keeps the URL at / and returns the target route's SSR
    // response directly, saving the extra client→origin round-trip. The rewritten
    // request still flows through the header/cookie/logging logic below, so / is
    // treated like any other content page.
    const isRootPath =
      pathname === '/' || pathname === `${basePath}` || pathname === `${basePath}/`;

    // Next applies the nonce it finds in the request's CSP header to its own scripts;
    // server code reads it from NONCE_HEADER. Both replace whatever the client sent.
    const nonce = generateNonce();
    const cspHeader = config.csp ? buildCsp(config.csp, nonce) : null;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(NONCE_HEADER);
    if (cspHeader) {
      requestHeaders.set(NONCE_HEADER, nonce);
      requestHeaders.set('Content-Security-Policy', cspHeader);
    }
    const forward = { request: { headers: requestHeaders } };
    const res =
      config.rootRewrite && isRootPath
        ? NextResponse.rewrite(new URL(`${basePath}${config.rootRewrite}`, request.url), forward)
        : NextResponse.next(forward);

    // Apply CSP and security headers
    if (cspHeader) {
      res.headers.set('Content-Security-Policy', cspHeader);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        res.headers.set(key, value);
      }
    }

    setLoginChallengeCookies(request, res);

    // Generate session_uid for browser tracking (persists across login/logout)
    if (!request.cookies.has('session_uid')) {
      try {
        res.cookies.set({
          name: 'session_uid',
          value: crypto.randomUUID(),
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 400 * 24 * 60 * 60 // 400 days (browser maximum)
        });
      } catch (error) {
        // Don't break middleware if UUID generation fails
      }
    }

    if (pathname.match('/((?!api|_next/static|_next/image|favicon.ico).*)')) {
      const isPrefetch =
        request.headers.get('x-middleware-prefetch') === '1' ||
        request.headers.get('purpose') === 'prefetch' ||
        request.headers.get('sec-purpose')?.includes('prefetch');

      if (!isPrefetch) {
        logPageVisit(request, pathname);
      }
    }

    return res;
  };
}
