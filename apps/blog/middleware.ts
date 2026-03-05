import { createMiddleware } from '@hive/middleware/lib/common';
import { NextRequest, NextResponse } from 'next/server';

// NOTE: Nonce-based CSP is disabled because Next.js 14 doesn't fully support it.
// Next.js internal scripts (__NEXT_DATA__, hydration) don't receive nonces automatically,
// and inline style attributes (style-src-attr) don't support nonces at all.
// See GitLab issue #796 for tracking nonce CSP support in future Next.js versions.

const BOOLEAN_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const INVALID_TOKEN_VALUES = new Set(['NULL', 'UNDEFINED', 'NONE', 'N/A', 'NA', 'FALSE', '0']);
const FEED_TAG_REGEX = /^[a-z0-9.-]{1,64}$/;

const getHeRewardsConfigFromEnv = (): { token: string; feedTag: string } => {
  const enabled = BOOLEAN_TRUE_VALUES.has((process.env.REACT_APP_HE_REWARDS_ENABLED ?? '').trim().toLowerCase());
  if (!enabled) {
    return { token: '', feedTag: '' };
  }

  const token = (process.env.REACT_APP_HE_REWARDS_TOKEN ?? '').trim().toUpperCase();
  if (token.length === 0 || INVALID_TOKEN_VALUES.has(token)) {
    return { token: '', feedTag: '' };
  }

  if (!/^[A-Z0-9.-]{1,32}$/.test(token)) {
    return { token: '', feedTag: '' };
  }

  const configuredFeedTag = (process.env.REACT_APP_HE_REWARDS_FEED_TAG ?? process.env.REACT_APP_HE_REWARDS_COMMUNITY_TAG ?? '')
    .trim()
    .toLowerCase();
  const feedTag = FEED_TAG_REGEX.test(configuredFeedTag) ? configuredFeedTag : token.toLowerCase();

  return { token, feedTag };
};

const heRewardsConfig = getHeRewardsConfigFromEnv();
const rootRedirect = heRewardsConfig.token ? `/he-payout/${heRewardsConfig.feedTag}` : '/trending';

const baseMiddleware = createMiddleware({
  rootRedirect,
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

// Blog-specific middleware: redirects root to default posts feed and applies CSP at runtime
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const configured = getHeRewardsConfigFromEnv();

  // Enforce full fallback when HE token config is absent/invalid:
  // any direct /he-payout* URL should resolve to /trending*.
  if (!configured.token && request.nextUrl.pathname.startsWith('/he-payout')) {
    const targetPath = request.nextUrl.pathname.replace(/^\/he-payout/, '/trending') || '/trending';
    const redirectUrl = new URL(`${targetPath}${request.nextUrl.search}`, request.url);
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  // When HE token config is valid, opening bare /he-payout should resolve to the token community path.
  if (configured.token && request.nextUrl.pathname === '/he-payout') {
    const targetPath = `/he-payout/${configured.feedTag}`;
    const redirectUrl = new URL(`${targetPath}${request.nextUrl.search}`, request.url);
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  return baseMiddleware(request);
}
