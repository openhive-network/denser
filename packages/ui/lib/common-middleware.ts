import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setLoginChallengeCookies } from '@smart-signer/lib/middleware-challenge-cookies';
import { configuredApiEndpoint } from '@hive/ui/config/public-vars';

export async function commonMiddleware(request: NextRequest) {

  const { pathname } = request.nextUrl;
  const res = NextResponse.next();

  const tempArr = pathname.split('/');
  let entry: any = null;
  if (tempArr.length === 3 && tempArr[1].startsWith('@')) {
    let author = tempArr[1].slice(1);
    let permlink = tempArr[2];
    try {
      const resp = await fetch(configuredApiEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'bridge.get_post',
          params: { author: author, permlink: permlink, observer: '' },
          id: 1
        })
      });
      entry = await resp.json();
      return NextResponse.redirect(
        new URL(`/${entry.result.community}/@${entry.result.author}/${entry.result.permlink}`, request.url)
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  /*
  Set cookies with loginChallenge value set to random string (UID).
  * Match all request paths except for the ones starting with:
  * - api (API routes)
  * - _next/static (static files)
  * - _next/image (image optimization files)
  * - favicon.ico (favicon file)
  */
  if (pathname.match('/((?!api|_next/static|_next/image|favicon.ico).*)')) {
    setLoginChallengeCookies(request, res);
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
