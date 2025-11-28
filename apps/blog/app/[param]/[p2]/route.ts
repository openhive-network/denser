import { NextResponse } from 'next/server';
import { getPost } from '@transaction/lib/bridge-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getQueryClient } from '@/blog/lib/react-query';
import { isPermlinkValid, isUsernameValid } from '@/blog/utils/validate-links';

export async function GET(request: Request, { params }: { params: { param: string; p2: string } }) {
  try {
    const rawParam = params?.param ?? '';
    const decoded = decodeURIComponent(rawParam);
    const username = decoded.replace(/^@/, '').trim();
    const observer = getObserverFromCookies();
    const queryClient = getQueryClient();
    const validUser = await isUsernameValid(username);

    if (!validUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!isPermlinkValid(params?.p2)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const post = await queryClient.fetchQuery({
      queryKey: ['post', username, String(params?.p2)],
      queryFn: () => getPost(username, String(params?.p2), observer)
    });
    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const configuredBase = process.env.NEXT_PUBLIC_BASE_PATH;
    let origin: string;

    if (configuredBase) {
      // ensure it's a full origin (scheme + host)
      try {
        const tmp = new URL(configuredBase);
        origin = tmp.origin;
      } catch (e) {
        // if someone provided e.g. "example.com", normalize to https by default
        origin = `https://${configuredBase.replace(/\/+$/, '')}`;
      }
    } else {
      // fallback: derive from request headers in a safer way
      const host = request.headers.get('host') ?? 'localhost:3000';
      // prefer forwarded proto from proxies (use http for local/test by default)
      const forwardedProto = request.headers.get('x-forwarded-proto');
      const scheme = forwardedProto ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      origin = `${scheme}://${host}`;
    }

    const path = `${post.category ?? post.community}/@${post.author}/${post.permlink}`;
    const finalUrl = new URL(path, origin);

    return NextResponse.redirect(finalUrl.toString(), { status: 302 });
    
    return NextResponse.redirect(finalUrl, { status: 302 });
  } catch (err) {
    console.error('Redirect route error', {
      params,
      err
    });
  }
}
