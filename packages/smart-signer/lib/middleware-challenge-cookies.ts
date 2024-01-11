import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const setLoginChallengeCookies = (req: NextRequest, res: NextResponse) => {
    let cookieLoginChallengeServer = req.cookies.has('loginChallengeServer');
    if (!cookieLoginChallengeServer) {
        const loginChallenge = crypto.randomUUID();
        res.cookies.set({
            name: 'loginChallengeServer',
            value: loginChallenge,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
        });
        res.cookies.set({
            name: 'loginChallenge',
            value: loginChallenge,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: false,
        });
    }
}
