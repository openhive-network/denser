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

    // Also create auth_proof cookie for first-time visitors
    // This ensures every user gets tracked from first visit
    const authProofCookieData = {
      uuid: loginChallenge,
      username: null,
      loginType: null,
      authProof: '', // Empty for first-time visitors
      timestamp: Date.now()
    };

    const authProofCookieValue = Buffer.from(JSON.stringify(authProofCookieData)).toString('base64');

    res.cookies.set({
      name: 'auth_proof',
      value: authProofCookieValue,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    });
  }
};
