import type { NextRequest } from 'next/server';
import { getLogger } from '@ui/lib/logging';
import { getClientIp } from './common-utils';

const logger = getLogger('page-visit-logger');

/**
 * Valid LoginType values from @smart-signer/types/common.ts.
 * Duplicated here to avoid importing Node.js-heavy smart-signer
 * modules into Edge Runtime middleware. Keep in sync manually.
 */
const VALID_LOGIN_TYPES = new Set([
  'hbauth', 'keychain', 'peakvault', 'metamask',
  'google', 'hiveauth', 'wif', 'hivesigner'
]);

/** Hive account name: lowercase alphanumeric + dots/dashes, 1-16 chars */
const ACCOUNT_NAME_PATTERN = /^[a-z0-9.-]{1,16}$/;

/**
 * Parse and validate the account_info cookie value ("username:loginType").
 * Returns sanitized values, or 'n/a' for both if invalid/missing.
 */
function parseAccountInfo(raw: string | undefined): { account: string; loginType: string } {
  const fallback = { account: 'n/a', loginType: 'n/a' };
  if (!raw) return fallback;

  const colonIndex = raw.indexOf(':');
  if (colonIndex === -1) return fallback;

  const account = raw.slice(0, colonIndex);
  const loginType = raw.slice(colonIndex + 1);

  if (!ACCOUNT_NAME_PATTERN.test(account)) return fallback;
  if (!VALID_LOGIN_TYPES.has(loginType)) return fallback;

  return { account, loginType };
}

/**
 * Log a page visit event using cookies set by auth handlers and middleware.
 * Called from middleware on non-API, non-static page requests.
 */
export function logPageVisit(req: NextRequest, pathname: string): void {
  try {
    if (!pathname || typeof pathname !== 'string') return;
    if (shouldSkipPageVisitLogging(pathname)) return;

    const ip = getClientIp(req);
    const uid = req.cookies.get('session_uid')?.value || 'n/a';
    const { account, loginType } = parseAccountInfo(
      req.cookies.get('account_info')?.value
    );

    console.log(
      `ip=${ip} account=${account} login_type=${loginType} uuid=${uid} ${pathname}`
    );
  } catch (error) {
    logger.debug('Failed to log page visit: %o', error);
  }
}

/**
 * Check if page visit logging should be skipped
 */
function shouldSkipPageVisitLogging(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/_next/') || pathname.startsWith('/__nextjs_')) return true;

  const staticFileExtensions = [
    '.js', '.css', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.txt', '.xml', '.json', '.woff', '.woff2', '.ttf', '.eot', '.map',
    '.pdf', '.zip', '.mp4', '.mp3', '.wav', '.wasm'
  ];
  if (staticFileExtensions.some((ext) => pathname.toLowerCase().endsWith(ext))) return true;
  if (pathname.startsWith('/static/') || pathname.startsWith('/assets/') || pathname.startsWith('/public/')) return true;

  return false;
}
