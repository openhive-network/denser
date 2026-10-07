import { createMiddleware } from '@hive/middleware/lib/common';

// Wallet middleware: no root redirect (stays at /), applies CSP at runtime
export const proxy = createMiddleware({
  csp: {
    // Allow Google accounts for OAuth popup/iframe
    frameSrc: ["'self'", 'https://accounts.google.com'],
    // Report violations to the wallet's own endpoint (report-uri is same-origin)
    reportUri: '/api/csp-report'
  }
});

// No middleware for build assets and public files: it would put Set-Cookie on them,
// which keeps shared caches from storing them. Paths with an @ (or %40) are account
// pages, whose names may end in what looks like a file extension. Next reads this
// statically, so it is a literal here and in the other app's proxy.ts.
export const config = {
  matcher: [
    // The root on its own: under a base path Next does not match `/wallet` (no trailing
    // slash) with the pattern below, and the root page needs the middleware's CSP too.
    '/',
    '/((?!_next/static/|_next/image|[^@%]*\\.(?:ico|png|jpe?g|gif|webp|avif|svg|woff2?|ttf|wasm|json|txt|map|js)$).*)'
  ]
};
