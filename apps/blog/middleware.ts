import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setLoginChallengeCookies } from '@smart-signer/lib/middleware-challenge-cookies';
import { createWaxFoundation } from '@hiveio/wax';

export const config = {
  runtime: 'nodejs'
};

// Initialize WAX lazily only when needed
let waxInstance: any = null;
const getWax = async () => {
  if (!waxInstance) {
    try {
      waxInstance = await createWaxFoundation();
    } catch (error) {
      console.error('Failed to initialize WAX:', error);
      return null;
    }
  }
  return waxInstance;
};

const parseAuthCookie = async (cookie: string) => {
  if (!cookie) return null;
  
  const wax = await getWax();
  if (!wax) return null;

  try {
    const binary = Buffer.from(cookie, 'base64').toString('utf-8');
    return wax.convertTransactionFromBinaryForm(binary);
  } catch (error) {
    console.error('Failed to parse auth cookie:', error);
    return null;
  }
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Early return for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Handle root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/trending', request.url));
  }

  const res = NextResponse.next();

  // Handle auth cookie parsing
  try {
    const authCookie = request.cookies.get('data')?.value;
    if (authCookie) {
      const tx = await parseAuthCookie(authCookie);
      console.log('tx:', tx);
    }
  } catch (error) {
    console.error('Auth cookie parsing error:', error);
  }

  // Handle @username/permlink redirects
  const tempArr = pathname.split('/');
  if (tempArr.length === 3 && tempArr[1].startsWith('@')) {
    const author = tempArr[1].slice(1);
    const permlink = tempArr[2];
    
    try {
      const resp = await fetch('https://api.hive.blog', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'bridge.get_post',
          params: { author, permlink, observer: '' },
          id: 1
        })
      });
      
      const entry = await resp.json();
      if (entry?.result?.community) {
        const newUrl = new URL(`/${entry.result.community}/@${entry.result.author}/${entry.result.permlink}`, request.url);
        // Check if we're not already at the target URL to prevent loops
        if (newUrl.pathname !== pathname) {
          return NextResponse.redirect(newUrl);
        }
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
    }
  }

  // Set login challenge cookies for non-excluded paths
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
