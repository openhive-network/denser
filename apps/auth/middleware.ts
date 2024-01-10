import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { setLoginChallengeCookies } from '@angala/lib/middleware-challenge-cookies'
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const res = NextResponse.next();

    /*
    Set cookies with loginChallenge value set to random string (UID).
    * Match all request paths except for the ones starting with:
    * - api (API routes)
    * - _next/static (static files)
    * - _next/image (image optimization files)
    * - favicon.ico (favicon file)
    */
    if (pathname.match('/((?!api|_next/static|_next/image|favicon.ico).*)')) {
        setLoginChallengeCookies(req, res);
    }

    return res;

}
