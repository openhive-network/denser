import { createMiddleware } from '@hive/middleware/lib/common';

// NOTE: Nonce-based CSP is disabled because Next.js 14 doesn't fully support it.
// Next.js internal scripts (__NEXT_DATA__, hydration) don't receive nonces automatically,
// and inline style attributes (style-src-attr) don't support nonces at all.
// The static CSP in next.config.js provides protection without causing violations.
// See GitLab issue #796 for tracking nonce CSP support in future Next.js versions.

// Blog-specific middleware: redirects root to /trending
export const middleware = createMiddleware({
  rootRedirect: '/trending'
});
