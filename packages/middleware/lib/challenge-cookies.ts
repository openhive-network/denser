import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookieNamePrefix } from '@hive/smart-signer/lib/session';
import { generateUUID } from '@hive/ui/lib/uuid-generator';

export const setLoginChallengeCookies = (req: NextRequest, res: NextResponse) => {
  let cookieLoginChallengeServer = req.cookies.has(`${cookieNamePrefix}login_challenge_server`);
  if (!cookieLoginChallengeServer) {
    const loginChallenge = generateUUID();
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
  }
};
