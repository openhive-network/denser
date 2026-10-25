import type { NextApiRequest, NextApiResponse } from 'next';
import { appendSetCookie, httpOnlyCookieAttributes } from './set-cookie';

const SESSION_UID_COOKIE = 'session_uid';
// The longest lifetime browsers accept
const SESSION_UID_MAX_AGE_S = 400 * 24 * 60 * 60;

/**
 * The browser's log-correlation id: the one its `session_uid` cookie holds, else a new one, set
 * as that cookie on the response. Kept across logins and logouts.
 */
export function ensureSessionUid(req: NextApiRequest, res: NextApiResponse): string {
  const current = req.cookies[SESSION_UID_COOKIE];
  if (current) return current;
  const uid = crypto.randomUUID();
  appendSetCookie(res, `${SESSION_UID_COOKIE}=${uid}; ${httpOnlyCookieAttributes()}; Max-Age=${SESSION_UID_MAX_AGE_S}`);
  return uid;
}
