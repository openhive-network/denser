import type { IncomingMessage, OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from 'node:http';

const DEFAULT_S_MAXAGE_S = 30;
const DEFAULT_STALE_WHILE_REVALIDATE_S = 60;
const DEFAULT_STALE_IF_ERROR_S = 300;

/** What Next.js sends for a dynamic page, and what every response not marked public keeps. */
export const NO_STORE_CACHE_CONTROL = 'private, no-cache, no-store, max-age=0, must-revalidate';

/**
 * Cookies that change what a page renders: the iron-session cookie (`<app>_session`) and OIDC's
 * `_session` cookies, the observer cookies the server reads (`observer`, and `observer-no-own-lists`
 * from @transaction/lib/observer-lists), the signed-in account's `account_info`, and the language
 * (`NEXT_LOCALE`). Named here, not imported: the apps' middleware must not load those modules.
 */
const PERSONALIZING_COOKIES = new Set(['observer', 'observer-no-own-lists', 'account_info', 'NEXT_LOCALE']);
const SESSION_COOKIE_PATTERN = /_session(?:\.|$)/;

// Requests of the client router: RSC payloads and prefetches, which Next answers differently.
const RSC_HEADER = 'rsc';
const ROUTER_HEADER_PREFIX = 'next-router-';
const RSC_QUERY_PARAM = '_rsc';

export interface PublicCacheConfig {
  /** Seconds a shared cache may serve the page fresh; 0 marks no response public. */
  sMaxAgeS: number;
  staleWhileRevalidateS: number;
  staleIfErrorS: number;
}

const parseSeconds = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

/**
 * Reads the shared-cache lifetimes of anonymous pages: `DENSER_PUBLIC_CACHE_S_MAXAGE_S` (default 30,
 * 0 = never public), `DENSER_PUBLIC_CACHE_STALE_WHILE_REVALIDATE_S` (default 60) and
 * `DENSER_PUBLIC_CACHE_STALE_IF_ERROR_S` (default 300). Invalid values fall back to the default.
 */
export function readPublicCacheConfig(env: Record<string, string | undefined>): PublicCacheConfig {
  return {
    sMaxAgeS: parseSeconds(env.DENSER_PUBLIC_CACHE_S_MAXAGE_S, DEFAULT_S_MAXAGE_S),
    staleWhileRevalidateS: parseSeconds(
      env.DENSER_PUBLIC_CACHE_STALE_WHILE_REVALIDATE_S,
      DEFAULT_STALE_WHILE_REVALIDATE_S
    ),
    staleIfErrorS: parseSeconds(env.DENSER_PUBLIC_CACHE_STALE_IF_ERROR_S, DEFAULT_STALE_IF_ERROR_S)
  };
}

/** The `Cache-Control` of a page any visitor without personalizing cookies may be served from a shared cache. */
export function publicCacheControl(config: PublicCacheConfig): string {
  return `public, s-maxage=${config.sMaxAgeS}, stale-while-revalidate=${config.staleWhileRevalidateS}, stale-if-error=${config.staleIfErrorS}`;
}

export interface PageRequest {
  method: string;
  /** Path without the app's base path. */
  pathname: string;
  searchParams: URLSearchParams;
  headers: Headers;
  cookieNames: readonly string[];
}

/**
 * Whether the response to a request may be marked public: a GET or HEAD for a page document (not
 * an API route or a client router request), sent without any cookie that changes the render, so
 * the page renders for the default observer. The status, the response's cookies and the raw
 * URL's `_rsc` are checked once rendered, by `installPublicCacheGuard`.
 */
export function isPublicCacheableRequest(request: PageRequest): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  if (request.pathname === '/api' || request.pathname.startsWith('/api/')) return false;
  if (request.pathname.startsWith('/_next/')) return false;
  // Next removes `_rsc` from the URL the middleware gets, unless __NEXT_NO_MIDDLEWARE_URL_NORMALIZE
  // is set; `installPublicCacheGuard` checks the raw request.
  if (request.searchParams.has(RSC_QUERY_PARAM)) return false;
  for (const name of request.headers.keys()) {
    if (name === RSC_HEADER || name.startsWith(ROUTER_HEADER_PREFIX)) return false;
  }
  return !request.cookieNames.some((name) => PERSONALIZING_COOKIES.has(name) || SESSION_COOKIE_PATTERN.test(name));
}

// What `publicCacheControl` writes. Static files are sent `public` too (with `max-age`), and their
// 304s must keep it.
const PUBLIC_PAGE_CACHE_CONTROL = /^public, s-maxage=\d+, /;

const isPublicPage = (cacheControl: OutgoingHttpHeader | undefined): boolean =>
  cacheControl !== undefined && PUBLIC_PAGE_CACHE_CONTROL.test(String(cacheControl));

const headerIn = (headers: OutgoingHttpHeaders | undefined, name: string): OutgoingHttpHeader | undefined =>
  headers && Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];

// The middleware sees the URL without `_rsc` (Next strips it), so it is checked here too.
const isClientRouterRequest = (req: IncomingMessage | undefined): boolean => {
  if (!req) return false;
  if (req.headers[RSC_HEADER] !== undefined) return true;
  const query = req.url?.split('?')[1]?.split('#')[0] ?? '';
  return new URLSearchParams(query).has(RSC_QUERY_PARAM);
};

type WriteHead = (
  this: ServerResponse,
  statusCode: number,
  statusMessageOrHeaders?: string | OutgoingHttpHeaders,
  headers?: OutgoingHttpHeaders
) => ServerResponse;

/**
 * Makes `ServerResponse` send `NO_STORE_CACHE_CONTROL` instead of `publicCacheControl` unless
 * the status is 200, the response sets no cookie and the request is not a client router request:
 * the middleware marks a request public before the page renders, when the status and cookies are
 * not known, and from a URL without `_rsc`. Call once, from the Node.js `register()`.
 */
export function installPublicCacheGuard(responseClass: typeof ServerResponse): void {
  const writeHead = responseClass.prototype.writeHead as WriteHead;
  const patched: WriteHead = function (statusCode, ...rest) {
    const headers = typeof rest[0] === 'string' ? rest[1] : rest[0];
    const cacheControl = headerIn(headers, 'cache-control') ?? this.getHeader('cache-control');
    const setsCookie = headerIn(headers, 'set-cookie') !== undefined || this.hasHeader('set-cookie');
    if (isPublicPage(cacheControl) && (statusCode !== 200 || setsCookie || isClientRouterRequest(this.req))) {
      this.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL);
      if (headers) {
        const kept = Object.fromEntries(Object.entries(headers).filter(([key]) => key.toLowerCase() !== 'cache-control'));
        return typeof rest[0] === 'string'
          ? writeHead.call(this, statusCode, rest[0], kept)
          : writeHead.call(this, statusCode, kept);
      }
    }
    return writeHead.call(this, statusCode, ...rest);
  };
  Object.defineProperty(responseClass.prototype, 'writeHead', {
    value: patched,
    writable: true,
    configurable: true
  });
}
