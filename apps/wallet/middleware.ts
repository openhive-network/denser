import { createMiddleware } from '@hive/middleware/lib/common';

// Wallet middleware: no root redirect (stays at /), applies CSP at runtime
export const middleware = createMiddleware({
  csp: {
    // Allow Google accounts for OAuth popup/iframe
    frameSrc: ["'self'", 'https://accounts.google.com'],
    // Report violations to blog's endpoint (wallet doesn't have its own)
    // Note: This will only work if both apps share the same origin
    reportUri: '/api/csp-report'
  }
});
