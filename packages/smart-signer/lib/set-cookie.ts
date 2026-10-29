import type { NextApiResponse } from 'next';

/** Adds a `Set-Cookie` header to the response, keeping the ones already set (e.g. iron-session's). */
export function appendSetCookie(res: NextApiResponse, cookie: string): void {
  const existing = res.getHeader('Set-Cookie') || [];
  const cookies = Array.isArray(existing) ? existing : [String(existing)];
  cookies.push(cookie);
  res.setHeader('Set-Cookie', cookies);
}

/** The attributes of the HttpOnly, site-wide cookies the API routes set. */
export function httpOnlyCookieAttributes(): string {
  const securePart = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${securePart}`;
}
