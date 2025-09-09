import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookieNamePrefix } from '@smart-signer/lib/session';

export const setLoginChallengeCookies = (req: NextRequest, res: NextResponse) => {
  let cookieLoginChallengeServer = req.cookies.has(`${cookieNamePrefix}login_challenge_server`);

  if (!cookieLoginChallengeServer) {
    const loginChallenge = crypto.randomUUID();

    // Set login challenge cookies
    res.cookies.set({
      name: `${cookieNamePrefix}login_challenge_server`,
      value: loginChallenge,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    });
    res.cookies.set({
      name: `${cookieNamePrefix}login_challenge`,
      value: loginChallenge,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false
    });

    // Note: auth_proof cookie is only created when users actually log in
    // First-time visitors don't get auth_proof cookies
  }
};
