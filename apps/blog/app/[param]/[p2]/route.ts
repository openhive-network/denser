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

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || 'localhost:3000';
    const url = `${post.category ?? post.community}/@${post.author}/${post.permlink}`;

    return NextResponse.redirect(new URL(`${basePath}/${url}`, request.url), { status: 302 });
  } catch (err) {
    console.error('Redirect route error', {
      params,
      err
    });
  }
}
