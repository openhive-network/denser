import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logPageVisit } from './page-visit-logger';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_S } from '@hive/ui/lib/locale-cookie.ts';
import { buildCsp, generateNonce, NONCE_HEADER, SECURITY_HEADERS, type CspConfig } from './csp';
import { detectFirstVisitLocale, withRequestCookie } from './locale-detection';
import {
  isPageRoute,
  isPublicCacheableRequest,
  NO_STORE_CACHE_CONTROL,
  publicCacheControl,
  type PublicCacheConfig,
  type RequestCookie
} from './public-cache';

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

  /**
   * If provided, pages requested without personalizing cookies are sent with a public
   * `Cache-Control` (see `isPublicCacheableRequest`), and a request with `Authorization` is sent
   * `NO_STORE_CACHE_CONTROL` unless its route sets its own. The app must also install
   * `installPublicCacheGuard`, which takes it back for a response other than a cookie-less 200.
   */
  publicCache?: PublicCacheConfig;

  /**
   * The app's UI languages. If provided, a page requested without a language cookie is rendered in
   * the first of them its `Accept-Language` names, and the response stores that language in the
   * cookie, so the browser renders what the server did and the other apps of the origin follow.
   */
  locales?: readonly string[];
}

/** The path of a request the middleware sees, without the base path. */
function pathInApp(request: NextRequest, basePath: string): string {
  const { pathname } = request.nextUrl;
  return basePath && pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;
}

/** The language a first visit to a page is rendered in, when it is not the default one; see `detectFirstVisitLocale`. */
function firstVisitLocale(request: NextRequest, basePath: string, locales: readonly string[]): string | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (!isPageRoute(pathInApp(request, basePath))) return null;
  return detectFirstVisitLocale(request.cookies.getAll(), request.headers.get('accept-language'), locales);
}

/** `isPublicCacheableRequest` for a request the middleware sees, rendered with `cookies`. */
function isPublicCacheable(request: NextRequest, basePath: string, cookies: readonly RequestCookie[]): boolean {
  return isPublicCacheableRequest({
    method: request.method,
    pathname: pathInApp(request, basePath),
    searchParams: request.nextUrl.searchParams,
    headers: request.headers,
    cookies
  });
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
    // request still flows through the header/logging logic below, so / is
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
    // The page renders as if the request carried the language cookie the response sets
    const detectedLocale = config.locales ? firstVisitLocale(request, basePath, config.locales) : null;
    const renderCookies: RequestCookie[] = request.cookies.getAll();
    if (detectedLocale) {
      requestHeaders.set('cookie', withRequestCookie(request.headers.get('cookie'), LOCALE_COOKIE, detectedLocale));
      renderCookies.push({ name: LOCALE_COOKIE, value: detectedLocale });
    }
    const forward = { request: { headers: requestHeaders } };
    const res =
      config.rootRewrite && isRootPath
        ? NextResponse.rewrite(new URL(`${basePath}${config.rootRewrite}`, request.url), forward)
        : NextResponse.next(forward);

    if (detectedLocale) {
      res.cookies.set(LOCALE_COOKIE, detectedLocale, {
        path: '/',
        maxAge: LOCALE_COOKIE_MAX_AGE_S,
        sameSite: 'lax'
      });
    }

    // Apply CSP and security headers
    if (cspHeader) {
      res.headers.set('Content-Security-Policy', cspHeader);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        res.headers.set(key, value);
      }
    }

    if (config.publicCache && config.publicCache.sMaxAgeS > 0 && isPublicCacheable(request, basePath, renderCookies)) {
      res.headers.set('Cache-Control', publicCacheControl(config.publicCache));
    } else if (config.publicCache && request.headers.has('authorization')) {
      // API routes send no Cache-Control of their own unless they set one
      res.headers.set('Cache-Control', NO_STORE_CACHE_CONTROL);
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
