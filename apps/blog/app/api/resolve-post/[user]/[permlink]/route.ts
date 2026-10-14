import { NextResponse } from 'next/server';
import { getPost } from '@transaction/lib/bridge-api';
import { getEffectiveObserverFromCookies } from '@/blog/lib/auth-utils';
import { isPermlinkValid, isUsernameValid, isValidUserParam } from '@/blog/utils/validate-links';
import { getLogger } from '@ui/lib/logging';
import { getBasePath } from '@ui/lib/path-utils';
import { inAppRedirectUrl } from '@/blog/lib/in-app-redirect-url';

const logger = getLogger('app');

function redirectInApp(request: Request, path: string): NextResponse {
  const url = inAppRedirectUrl(
    path,
    {
      siteDomain: process.env.REACT_APP_SITE_DOMAIN,
      basePath: getBasePath(),
      production: process.env.NODE_ENV === 'production'
    },
    request.headers
  );
  return NextResponse.redirect(url, { status: 302 });
}

function notFoundRedirect(request: Request): NextResponse {
  return redirectInApp(request, '/404');
}

// REACT_APP_WALLET_ENDPOINT is an absolute URL, or a path when the wallet shares the blog's
// origin (`/wallet`); a path is resolved on the origin in-app redirects use.
function walletTransfersRedirect(request: Request, username: string): NextResponse | undefined {
  const walletEndpoint = process.env.REACT_APP_WALLET_ENDPOINT;
  if (!walletEndpoint) return undefined;
  const walletPath = `${walletEndpoint.replace(/\/+$/, '')}/@${username}/transfers`;
  const blogOrigin = inAppRedirectUrl(
    '/',
    {
      siteDomain: process.env.REACT_APP_SITE_DOMAIN,
      production: process.env.NODE_ENV === 'production'
    },
    request.headers
  );
  return NextResponse.redirect(new URL(walletPath, blogOrigin), { status: 302 });
}

export async function GET(request: Request, props: { params: Promise<{ user: string; permlink: string }> }) {
  const params = await props.params;
  try {
    if (!isValidUserParam(params?.user)) {
      return notFoundRedirect(request);
    }

    const rawParam = params?.user ?? '';
    const decoded = decodeURIComponent(rawParam);
    const username = decoded.replace(/^@/, '').trim();
    const observer = await getEffectiveObserverFromCookies();
    const validUser = await isUsernameValid(username);

    if (!validUser) return notFoundRedirect(request);
    if (!isPermlinkValid(params?.permlink)) return notFoundRedirect(request);

    let post;
    try {
      post = await getPost(username, String(params?.permlink), observer);
    } catch (fetchErr) {
      logger.error(fetchErr, 'Failed to fetch post');

      // Special case: if permlink is "transfers" and post doesn't exist, redirect to wallet
      if (params?.permlink === 'transfers') {
        const walletRedirect = walletTransfersRedirect(request, username);
        if (walletRedirect) return walletRedirect;
      }

      return notFoundRedirect(request);
    }

    if (!post) {
      // Special case: if permlink is "transfers" and post doesn't exist, redirect to wallet
      if (params?.permlink === 'transfers') {
        const walletRedirect = walletTransfersRedirect(request, username);
        if (walletRedirect) return walletRedirect;
      }

      return notFoundRedirect(request);
    }

    const cat = post.category ?? post.community ?? '';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(cat)) {
      return notFoundRedirect(request);
    }

    return redirectInApp(request, `/${cat}/@${post.author}/${post.permlink}`);
  } catch (err) {
    logger.error(err, 'Error in GET');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
