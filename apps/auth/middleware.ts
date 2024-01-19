import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setLoginChallengeCookies } from '@smart-signer/lib/middleware-challenge-cookies';
import { getLogger } from '@hive/ui/lib/logging';

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
    // @ts-ignore
    setLoginChallengeCookies(req, res);
  }

  return res;
}

// export const config = {
//     matcher: [
//         /*
//         * Match all paths except for:
//         * 1. /api routes
//         * 2. /_next (Next.js internals)
//         * 3. /_static (inside /public)
//         * 4. all root files inside /public (e.g. /favicon.ico)
//         */
//         '/((?!api/|_next/|_static/|_vercel|[\\w-]+.\\w+).*)'
//     ]
// };
