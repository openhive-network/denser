import { createMiddleware } from '@hive/middleware/lib/common';

// NOTE: Nonce-based CSP is disabled because Next.js 14 doesn't fully support it.
// Next.js internal scripts (__NEXT_DATA__, hydration) don't receive nonces automatically,
// and inline style attributes (style-src-attr) don't support nonces at all.
// See GitLab issue #796 for tracking nonce CSP support in future Next.js versions.

// Blog-specific middleware: redirects root to /trending, applies CSP at runtime
export const middleware = createMiddleware({
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
      'https://openhive.chat'
    ],
    reportUri: '/api/csp-report'
  }
});
