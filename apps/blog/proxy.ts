import { createMiddleware } from '@hive/middleware/lib/common';

// Blog-specific middleware: serves /trending at the root path (rewrite, no redirect),
// applies a per-request nonce CSP at runtime
export const proxy = createMiddleware({
  rootRewrite: '/trending',
  csp: {
    // Embedded content whitelist for blog posts
    // Note: 3speak.online/co removed (compromised/spam). Embeds render via play.3speak.tv,
    // but plain 3speak.tv is also allowed so links starting with either host work.
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
      'https://play.3speak.tv',
      'https://odysee.com',
      'https://openhive.chat'
      // The site's own origin (for the denser OAuth flow inside the openhive.chat iframe) is added
      // automatically by buildCsp from REACT_APP_SITE_DOMAIN — see packages/middleware/lib/csp.ts.
    ],
    reportUri: '/api/csp-report'
  }
});

// No middleware for build assets and public files: it would put Set-Cookie on them,
// which keeps shared caches from storing them. Paths with an @ (or %40) are account
// pages, whose names may end in what looks like a file extension. Next reads this
// statically, so it is a literal here and in the other app's proxy.ts.
export const config = {
  matcher: [
    // The root on its own: under a base path Next does not match `/blog` (no trailing
    // slash) with the pattern below, and the blog serves its home page from here.
    '/',
    '/((?!_next/static/|_next/image|[^@%]*\\.(?:ico|png|jpe?g|gif|webp|avif|svg|woff2?|ttf|wasm|json|txt|map|js)$).*)'
  ]
};
