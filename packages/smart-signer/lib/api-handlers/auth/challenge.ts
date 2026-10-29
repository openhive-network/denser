import type { NextApiHandler } from 'next';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { appendSetCookie, httpOnlyCookieAttributes } from '@smart-signer/lib/set-cookie';
import type { LoginChallengeResponse } from '@smart-signer/lib/auth/login-challenge';

/** The HttpOnly cookie holding the challenge a login transaction must sign; `loginUser` compares them. */
export const LOGIN_CHALLENGE_COOKIE = `${cookieNamePrefix}login_challenge_server`;

// The JS-readable copy pages used to be served with; cleared where a browser still has it.
const LEGACY_READABLE_CHALLENGE_COOKIE = `${cookieNamePrefix}login_challenge`;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `GET /api/auth/challenge`: the login challenge for this browser, set as the HttpOnly
 * `LOGIN_CHALLENGE_COOKIE` and returned in the body. A browser that already holds one gets the same
 * value back, so a sign-in started in another tab still matches the cookie. Never cached.
 */
export const issueLoginChallenge: NextApiHandler<LoginChallengeResponse> = async (req, res) => {
  const current = req.cookies[LOGIN_CHALLENGE_COOKIE];
  const loginChallenge = current && UUID_PATTERN.test(current) ? current : crypto.randomUUID();
  if (loginChallenge !== current) {
    appendSetCookie(res, `${LOGIN_CHALLENGE_COOKIE}=${loginChallenge}; ${httpOnlyCookieAttributes()}`);
  }
  if (req.cookies[LEGACY_READABLE_CHALLENGE_COOKIE] !== undefined) {
    appendSetCookie(res, `${LEGACY_READABLE_CHALLENGE_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`);
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ loginChallenge });
};
