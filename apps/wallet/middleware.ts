import { createMiddleware } from '@hive/middleware/lib/common';

// Wallet middleware: no root redirect (stays at /), applies CSP at runtime
export const middleware = createMiddleware({
  csp: {
    // Allow Google accounts for OAuth popup/iframe
    frameSrc: ["'self'", 'https://accounts.google.com'],
    // Report violations to the wallet's own endpoint (report-uri is same-origin)
    reportUri: '/api/csp-report'
  }
});
