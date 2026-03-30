import { NextResponse } from 'next/server';
import { getPost } from '@transaction/lib/bridge-api';
import { getObserver } from '@/blog/lib/auth-utils';
import { isPermlinkValid, isUsernameValid, isValidUserParam } from '@/blog/utils/validate-links';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

function getOrigin(request: Request): string {
  const configuredBase = process.env.NEXT_PUBLIC_BASE_PATH;

  if (configuredBase) {
    try {
      const tmp = new URL(configuredBase);
      return tmp.origin;
    } catch {
      return `https://${configuredBase.replace(/\/+$/, '')}`;
    }
  }

  const host = request.headers.get('host') ?? 'localhost:3000';
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const scheme = forwardedProto ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${scheme}://${host}`;
}

function notFoundRedirect(request: Request): NextResponse {
  const origin = getOrigin(request);
  return NextResponse.redirect(new URL('/404', origin), { status: 302 });
}

export async function GET(request: Request, { params }: { params: { user: string; permlink: string } }) {
  try {
    if (!isValidUserParam(params?.user)) {
      return notFoundRedirect(request);
    }

    const rawParam = params?.user ?? '';
    const decoded = decodeURIComponent(rawParam);
    const username = decoded.replace(/^@/, '').trim();
    const observer = await getObserver();
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
        const walletEndpoint = process.env.REACT_APP_WALLET_ENDPOINT;
        if (walletEndpoint) {
          const walletUrl = `${walletEndpoint.replace(/\/+$/, '')}/@${username}/transfers`;
          return NextResponse.redirect(walletUrl, { status: 302 });
        }
      }

      return notFoundRedirect(request);
    }

    if (!post) {
      // Special case: if permlink is "transfers" and post doesn't exist, redirect to wallet
      if (params?.permlink === 'transfers') {
        const walletEndpoint = process.env.REACT_APP_WALLET_ENDPOINT;
        if (walletEndpoint) {
          const walletUrl = `${walletEndpoint.replace(/\/+$/, '')}/@${username}/transfers`;
          return NextResponse.redirect(walletUrl, { status: 302 });
        }
      }

      return notFoundRedirect(request);
    }

    const origin = getOrigin(request);
    const cat = post.category ?? post.community ?? '';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(cat)) {
      return notFoundRedirect(request);
    }

    const path = `${cat}/@${post.author}/${post.permlink}`;
    const finalUrl = new URL(path, origin);

    return NextResponse.redirect(finalUrl.toString(), { status: 302 });
  } catch (err) {
    logger.error(err, 'Error in GET');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
