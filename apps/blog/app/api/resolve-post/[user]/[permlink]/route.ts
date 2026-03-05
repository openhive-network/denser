import { NextResponse } from 'next/server';
import { getPost } from '@transaction/lib/bridge-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getQueryClient } from '@/blog/lib/react-query';
import { isPermlinkValid, isUsernameValid, isValidUserParam } from '@/blog/utils/validate-links';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export async function GET(request: Request, { params }: { params: { user: string; permlink: string } }) {
  try {
    if (!isValidUserParam(params?.user)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rawParam = params?.user ?? '';
    const decoded = decodeURIComponent(rawParam);
    const username = decoded.replace(/^@/, '').trim();
    const observer = await getObserverFromCookies();
    const queryClient = getQueryClient();
    const validUser = await isUsernameValid(username);

    if (!validUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!isPermlinkValid(params?.permlink)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let post;
    try {
      post = await queryClient.fetchQuery({
        queryKey: ['post', username, String(params?.permlink)],
        queryFn: () => getPost(username, String(params?.permlink), observer)
      });
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

      return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const configuredBase = process.env.NEXT_PUBLIC_BASE_PATH;
    let origin: string;

    if (configuredBase) {
      try {
        const tmp = new URL(configuredBase);
        origin = tmp.origin;
      } catch (e) {
        origin = `https://${configuredBase.replace(/\/+$/, '')}`;
      }
    } else {
      const host = request.headers.get('host') ?? 'localhost:3000';
      const forwardedProto = request.headers.get('x-forwarded-proto');
      const scheme = forwardedProto ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      origin = `${scheme}://${host}`;
    }

    const path = `${post.category ?? post.community}/@${post.author}/${post.permlink}`;
    const finalUrl = new URL(path, origin);

    return NextResponse.redirect(finalUrl.toString(), { status: 302 });
  } catch (err) {
    logger.error(err, 'Error in GET');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
