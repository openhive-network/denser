import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  console.log('MIDDLEWARE');
  const tempArr = request.nextUrl.pathname.split('/');
  let entry: any = null;
  if (tempArr.length === 3 && tempArr[1].startsWith('@')) {
    let author = tempArr[1].slice(1);
    let permlink = tempArr[2];
    try {
      const resp = await fetch('https://api.hive.blog', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'bridge.get_post',
          params: { author: author, permlink: permlink, observer: '' },
          id: 1
        })
      });
      entry = await resp.json();
      return NextResponse.redirect(new URL(`/${entry.result.community}/@${entry.result.author}/${entry.result.permlink}`, request.url));
    } catch (e: any) {
      console.log(e.message);
    }
  }

  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/trending', request.url));
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api/|_next/|_static/|_vercel|[\\w-]+.\\w+).*)'
  ]
};
