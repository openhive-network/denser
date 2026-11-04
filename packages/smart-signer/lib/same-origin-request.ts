import type { IncomingHttpHeaders } from 'http';

function headerValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function hostOf(origin: string): string | undefined {
  try {
    return new URL(origin).host;
  } catch {
    return undefined;
  }
}

/**
 * A request the browser made from a page of this site: `Sec-Fetch-Site: same-origin`, or, from a
 * browser that does not send it, an `Origin` on the host the request was made to (the first
 * `X-Forwarded-Host` behind the reverse proxy, else `Host`).
 */
export function isSameOriginRequest(headers: IncomingHttpHeaders): boolean {
  const fetchSite = headerValue(headers, 'sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';
  const origin = headerValue(headers, 'origin');
  const host = headerValue(headers, 'x-forwarded-host')?.split(',')[0]?.trim() || headerValue(headers, 'host');
  return !!origin && !!host && hostOf(origin) === host;
}
