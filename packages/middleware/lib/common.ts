import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setLoginChallengeCookies } from '@hive/smart-signer/lib/middleware-challenge-cookies';
import { configuredApiEndpoint } from '@hive/ui/config/public-vars';
import { getLogger } from '@hive/ui/lib/logging';
import { createWaxFoundation, custom_json } from '@hiveio/wax';

const logger = getLogger('middleware');

// Initialize WAX foundation once
let waxFoundation: Awaited<ReturnType<typeof createWaxFoundation>> | null = null;

async function initWax() {
  if (!waxFoundation) {
    waxFoundation = await createWaxFoundation();
  }
  return waxFoundation;
}

function parseAuthInfo(operationValue: custom_json) {
  const authType = operationValue.id.startsWith('denser_')
    ? operationValue.id.split('_')[1]
    : operationValue.id;
  const username = operationValue.required_auths[0] || operationValue.required_posting_auths[0];

  return {
    authType,
    username,
    challenge: operationValue.json.replace(/^"|"$/g, '') // Remove surrounding quotes
  };
}

function isPageRoute(pathname: string): boolean {
  // Skip system routes, static files, API routes, and other non-page routes
  return !pathname.match(/^\/(_next|api|favicon\.ico|.*\.(json|js|css|png|jpg|jpeg|gif|ico|xml|txt|map))/);
}

async function logAuthProof(authProofCookie: string | undefined, pathname: string) {
  if (!authProofCookie || !isPageRoute(pathname)) {
    return;
  }

  try {
    const decodedValue = Buffer.from(authProofCookie, 'base64');

    // Get WAX foundation instance and parse the binary transaction
    const wax = await initWax();
    const transaction = wax.convertTransactionFromBinaryForm(decodedValue.toString());

    // Extract auth info from the first operation (if it's a custom_json_operation)
    const authInfo = transaction.operations[0]
      ? parseAuthInfo(transaction.operations[0].value as custom_json)
      : null;

    if (authInfo) {
      logger.info(
        `client_auth_proof: ${authInfo.username} using ${authInfo.authType} at ${pathname}, expires ${transaction.expiration}`
      );
    }
  } catch (error) {
    logger.error('Failed to decode auth_proof cookie:', error);
  }
}

export async function commonMiddleware(request: NextRequest) {
  const authProofCookie = request.cookies.get('auth_proof')?.value;
  const { pathname } = request.nextUrl;
  await logAuthProof(authProofCookie, pathname);

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
      logger.error('Error fetching post:', e.message);
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
