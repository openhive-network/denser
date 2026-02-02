import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddleware } from '@hive/middleware/lib/common';

// NOTE: Nonce-based CSP is disabled because Next.js 14 doesn't fully support it.
// Next.js internal scripts (__NEXT_DATA__, hydration) don't receive nonces automatically,
// and inline style attributes (style-src-attr) don't support nonces at all.
// See GitLab issue #796 for tracking nonce CSP support in future Next.js versions.

// Blog-specific middleware: redirects root to /trending, applies CSP at runtime
const baseMiddleware = createMiddleware({
  rootRedirect: '/trending',
  csp: {
    // Embedded content whitelist for blog posts
    // Note: 3speak.online/co removed (compromised/spam), code normalizes to 3speak.tv
    // Note: emb.d.tube removed (subdomain down, no renderer support)
    frameSrc: [
      'https://platform.twitter.com',
      'https://www.instagram.com',
      'https://player.vimeo.com',
      'https://www.youtube.com',
      'https://w.soundcloud.com',
      'https://player.twitch.tv',
      'https://open.spotify.com',
      'https://3speak.tv',
      'https://odysee.com',
      'https://openhive.chat',
      // Allow denser OAuth flow inside RC iframe
      'https://blog.openhive.network'
    ],
    reportUri: '/api/csp-report'
  }
});

// Matches /@username/permlink - two path segments where first starts with @
// Used by notification links which don't include the post category
const AUTHOR_PERMLINK_PATTERN = /^\/(@[a-z0-9.-]+)\/([a-z0-9-]+)$/;

async function fetchPostCategory(author: string, permlink: string): Promise<string | null> {
  const apiEndpoint = process.env.REACT_APP_API_ENDPOINT || 'https://api.hive.blog';
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'bridge.get_post_header',
        params: { author, permlink },
        id: 1
      })
    });
    const data = await response.json();
    return data?.result?.category || null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const cleanPath = basePath ? pathname.replace(basePath, '') : pathname;

  const match = cleanPath.match(AUTHOR_PERMLINK_PATTERN);
  if (match) {
    const username = match[1].replace('@', '');
    const permlink = match[2];

    // Special case: "transfers" permlink redirects to wallet (handled by route.ts)
    if (permlink === 'transfers') {
      return baseMiddleware(request);
    }

    const category = await fetchPostCategory(username, permlink);
    if (category) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `${basePath}/${category}/@${username}/${permlink}`;
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return baseMiddleware(request);
}
