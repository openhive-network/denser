import type { NextApiResponse } from 'next';
import { appendSetCookie, httpOnlyCookieAttributes } from './set-cookie';

/**
 * Set the `account_info` cookie the Edge middleware reads for page visit logging. It mirrors the
 * identity in iron-session in a form readable without decryption, so set it only after the
 * session holds a verified user. Session cookie (no Max-Age) to match iron-session.
 */
export function setAccountInfoCookie(res: NextApiResponse, username: string, loginType: string): void {
  appendSetCookie(res, `account_info=${username}:${loginType}; ${httpOnlyCookieAttributes()}`);
}

export function clearAccountInfoCookie(res: NextApiResponse): void {
  appendSetCookie(res, `account_info=; ${httpOnlyCookieAttributes()}; Max-Age=0`);
}
