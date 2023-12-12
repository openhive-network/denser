import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const res = NextResponse.next();

    /*
    Set cookie with loginChallenge value set to random string (UID).
    * Match all request paths except for the ones starting with:
    * - api (API routes)
    * - _next/static (static files)
    * - _next/image (image optimization files)
    * - favicon.ico (favicon file)
    */
    if (pathname.match('/((?!api|_next/static|_next/image|favicon.ico).*)')) {
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

    return res;

}
