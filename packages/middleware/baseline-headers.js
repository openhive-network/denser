/**
 * Security headers for every response, for next.config.js headers(): they reach the paths
 * the apps' proxy.ts matcher skips (public files, and file-like 404s such as /trending/x.js),
 * which get no headers from the middleware. Next applies headers() before the middleware, so
 * on the paths the middleware runs on its values (SECURITY_HEADERS and the nonce CSP in
 * lib/csp.ts) replace these. The CSP carries only frame-ancestors: browsers enforce every CSP
 * a response has, so a default-src or script-src here would block what the nonce CSP allows.
 */
const BASELINE_SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }
];

module.exports = { BASELINE_SECURITY_HEADERS };
