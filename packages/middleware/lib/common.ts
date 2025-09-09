import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setLoginChallengeCookies } from '@hive/smart-signer/lib/middleware-challenge-cookies';
import { getLogger } from '@hive/ui/lib/logging';
import { logPageVisit } from './auth-proof-cookie';

const logger = getLogger('middleware');

export async function commonMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const res = NextResponse.next();

  setLoginChallengeCookies(request, res);

  if (pathname.match('/((?!api|_next/static|_next/image|favicon.ico).*)')) {
    const isPrefetch =
      request.headers.get('x-middleware-prefetch') === '1' ||
      request.headers.get('purpose') === 'prefetch' ||
      request.headers.get('sec-purpose')?.includes('prefetch');

    if (!isPrefetch) {
      // Log page visits for authenticated users (if they have auth proof cookie)
      logPageVisit(request, pathname);
    }
  }

  return res;
}

// export const config = {
//   matcher: [
//       /*
//       * Match all paths except for:
//       * 1. /api routes
//       * 2. /_next (Next.js internals)
//       * 3. /_static (inside /public)
//       * 4. all root files inside /public (e.g. /favicon.ico)
//       */
//       '/((?!api/|_next/|_static/|_vercel|[\\w-]+.\\w+).*)'
//   ]
// };
