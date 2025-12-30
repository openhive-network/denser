import { type NextRequest, NextResponse } from 'next/server';
import { setLoginChallengeCookies } from '@hive/smart-signer/lib/middleware-challenge-cookies';

/**
 * Generate a cryptographically secure nonce for CSP.
 * In production, crypto.randomUUID() is available in Edge runtime.
 */
function generateNonce(): string {
  // Use crypto.randomUUID() which is available in modern Edge runtime
  // Convert to base64 for CSP compatibility
  const uuid = crypto.randomUUID();
  // Use btoa-safe encoding (remove hyphens, then encode)
  return Buffer.from(uuid.replace(/-/g, ''), 'hex').toString('base64');
}

/**
 * Build CSP header value with nonce for script and style execution.
 * This provides strong XSS protection while allowing legitimate inline scripts.
 */
function buildCspHeader(nonce: string): string {
  return [
    // Default fallback for unspecified resource types
    "default-src 'self'",
    // Scripts: only allow same-origin and nonced scripts
    // 'strict-dynamic' allows scripts loaded by nonced scripts
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://platform.twitter.com`,
    // Styles: nonce-based (fallback to unsafe-inline for older browsers)
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    // Images: self + any HTTPS + data URIs + blob
    "img-src 'self' https: data: blob:",
    // Fonts: self + data URIs
    "font-src 'self' data:",
    // API connections: permissive for user-defined endpoints
    "connect-src 'self' https:",
    // Embedded content whitelist
    "frame-src https://platform.twitter.com https://www.instagram.com https://player.vimeo.com https://www.youtube.com https://w.soundcloud.com https://player.twitch.tv https://open.spotify.com https://3speak.tv https://3speak.online https://3speak.co https://emb.d.tube https://odysee.com https://openhive.chat",
    // Web Workers
    "worker-src 'self' blob:",
    // Clickjacking protection
    "frame-ancestors 'self'",
    // Restrict base URI
    "base-uri 'self'",
    // Restrict form submissions
    "form-action 'self'",
    // Report violations
    "report-uri /api/csp-report"
  ].join('; ');
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  // Generate nonce for this request
  const nonce = generateNonce();

  const res = NextResponse.next();

  // Set login challenge cookies (needed for console logging process)
  setLoginChallengeCookies(request, res);

  // Set CSP header with nonce
  // Using Report-Only initially for safety - switch to Content-Security-Policy when ready
  res.headers.set('Content-Security-Policy-Report-Only', buildCspHeader(nonce));

  // Pass nonce to app via header (to be read in layout.tsx)
  res.headers.set('x-nonce', nonce);

  // In blog, redirect root path to /trending
  if (pathname === '/' || pathname === `${basePath}` || pathname === `${basePath}/`) {
    return NextResponse.redirect(new URL(`${basePath}/trending`, request.url), { status: 302 });
  }

  return res;
}
