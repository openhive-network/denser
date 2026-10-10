/**
 * Content Security Policy builder for runtime evaluation
 *
 * This module builds CSP headers at runtime so environment variables
 * can be evaluated when the server starts, not at build time.
 */

/**
 * App-specific CSP configuration
 */
export interface CspConfig {
  /**
   * Additional frame-src sources beyond 'self'
   * Blog needs: twitter, instagram, vimeo, youtube, soundcloud, twitch, spotify, 3speak, odysee, openhive.chat
   * Wallet needs: accounts.google.com (for OAuth)
   */
  frameSrc?: string[];

  /**
   * CSP report URI endpoint
   */
  reportUri?: string;
}

/**
 * Build connect-src allowed hosts from environment variables
 */
function buildConnectSrcHosts(): Set<string> {
  const hosts = new Set([
    'https://api.hive.blog',
    'https://api.syncad.com',
    'https://api.openhive.network',
    'https://images.hive.blog'
  ]);

  // Allow custom API nodes from environment
  const allowedNodes = process.env.REACT_APP_ALLOWED_HIVE_API_NODES;
  if (allowedNodes) {
    const nodes = allowedNodes.split(/[ ,]+/).filter(Boolean);
    if (nodes.length > 0) {
      hosts.clear();
      nodes.forEach((node) => hosts.add(node));
    }
  }

  // Ensure the configured images endpoint is in connect-src for proxy-auth token fetch
  const imagesEndpoint = process.env.REACT_APP_IMAGES_ENDPOINT;
  if (imagesEndpoint) {
    try {
      hosts.add(new URL(imagesEndpoint).origin);
    } catch { /* invalid URL, skip */ }
  }

  // Ensure the configured REST API endpoint is in connect-src (it may differ
  // from the JSON-RPC endpoint and from the allowed-nodes list)
  const restApiEndpoint = process.env.REACT_APP_REST_API_ENDPOINT;
  if (restApiEndpoint) {
    try {
      hosts.add(new URL(restApiEndpoint).origin);
    } catch { /* invalid URL, skip */ }
  }

  // Hivesense (AI search) endpoint - not deployed on every API node; mirror
  // the client-side default from public-vars (configuredAIDomain)
  try {
    hosts.add(new URL(process.env.REACT_APP_AI_DOMAIN || 'https://api.hive.blog').origin);
  } catch { /* invalid URL, skip */ }

  // Google APIs for Drive wallet backup and Sign-In
  if (process.env.REACT_APP_GOOGLE_DRIVE_CLIENT_ID) {
    hosts.add('https://www.googleapis.com');
    hosts.add('https://accounts.google.com');
  }

  // Sentry error reporting
  if (process.env.REACT_APP_SENTRY_DSN) {
    // Support both Sentry SaaS and self-hosted instances
    // DSN format: https://<key>@<host>/<project_id>
    try {
      const dsnUrl = new URL(process.env.REACT_APP_SENTRY_DSN);
      const sentryHost = dsnUrl.hostname;
      if (sentryHost.endsWith('.sentry.io')) {
        // Sentry SaaS - use ingest subdomains
        hosts.add('https://*.ingest.sentry.io');
        hosts.add('https://*.ingest.us.sentry.io');
      } else {
        // Self-hosted Sentry
        hosts.add(`https://${sentryHost}`);
      }
    } catch {
      // Fallback to SaaS domains if DSN parsing fails
      hosts.add('https://*.ingest.sentry.io');
      hosts.add('https://*.ingest.us.sentry.io');
    }
  }

  // Cloudflare Web Analytics beacon posts its measurements here when the
  // zone auto-injects it; harmless for deployments not behind Cloudflare
  hosts.add('https://cloudflareinsights.com');

  return hosts;
}

/**
 * Request header that carries the per-request CSP nonce from the proxy to server components
 * and route handlers (Next itself reads the nonce from the request's CSP header).
 */
export const NONCE_HEADER = 'x-nonce';

const NONCE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Generate a fresh, base64-encoded nonce for one response
 */
export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}

/**
 * Return the nonce from a NONCE_HEADER value, or undefined when it is missing or not base64.
 * The value ends up in an HTML attribute, so anything else (e.g. a client-sent header on a
 * path the proxy does not cover) is refused rather than echoed.
 */
export function parseNonce(value: string | null | undefined): string | undefined {
  return value && NONCE_PATTERN.test(value) ? value : undefined;
}

/**
 * Build script-src directive
 */
function buildScriptSrc(nonce: string): string {
  // 'strict-dynamic' lets scripts loaded by nonced scripts (Next chunks, next/script) run, and makes
  // CSP3 browsers ignore the host list below; the hosts remain for browsers without it.
  // 'wasm-unsafe-eval' is needed for wax's WebAssembly; hb-auth's beekeeper (which uses new Function)
  // runs in /auth/worker.js, served without this policy.
  let scriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`;

  // React's dev build reconstructs server stacks with eval; never sent by a production build
  if (process.env.NODE_ENV === 'development') {
    scriptSrc += " 'unsafe-eval'";
  }

  // platform.twitter.com widgets.js is no longer loaded (issue #934) - tweets render
  // inside their own platform.twitter.com iframe (frame-src), which needs no script-src

  // Cloudflare Web Analytics beacon, auto-injected by zones with RUM enabled. Under 'strict-dynamic'
  // CSP3 browsers run the injected tag only if it carries the page's nonce; the host covers the rest.
  scriptSrc += ' https://static.cloudflareinsights.com';

  if (process.env.REACT_APP_GOOGLE_DRIVE_CLIENT_ID) {
    scriptSrc += ' https://accounts.google.com/gsi/';
  }

  return scriptSrc;
}

/**
 * Build the full CSP header value at runtime
 * @param nonce - this response's nonce (from generateNonce), allowed in script-src
 */
export function buildCsp(config: CspConfig, nonce: string): string {
  const connectSrcHosts = buildConnectSrcHosts();
  const scriptSrc = buildScriptSrc(nonce);

  // Image proxy host — all external images are proxied through this
  let imagesHost = 'https://images.hive.blog';
  const imagesEndpoint = process.env.REACT_APP_IMAGES_ENDPOINT;
  if (imagesEndpoint) {
    try {
      imagesHost = new URL(imagesEndpoint).origin;
    } catch { /* invalid URL, use default */ }
  }

  // Start from the app-configured frame-src sources. Apps that pass an explicit host list lose the
  // implicit 'self', so ensure the document can still frame its own origin (required for the denser
  // OAuth flow that loads inside the openhive.chat iframe). Resolve that origin from REACT_APP_SITE_DOMAIN
  // at runtime so it is correct per deployment (blog.openhive.network, new.hive.blog, hive.blog) instead
  // of a hardcoded host; skip when 'self' is already listed, and fall back to 'self' if the var is unset.
  const frameSrcHosts = new Set(config.frameSrc ?? []);
  if (frameSrcHosts.size > 0 && !frameSrcHosts.has("'self'")) {
    const siteDomain = process.env.REACT_APP_SITE_DOMAIN;
    let siteOrigin = "'self'";
    if (siteDomain) {
      try {
        siteOrigin = new URL(siteDomain).origin;
      } catch {
        /* invalid URL, fall back to 'self' */
      }
    }
    frameSrcHosts.add(siteOrigin);
  }
  const frameSrcValue =
    frameSrcHosts.size > 0 ? `frame-src ${[...frameSrcHosts].join(' ')}` : "frame-src 'self'";

  const directives = [
    // Default fallback for unspecified resource types
    "default-src 'self'",
    // Scripts: only those carrying this response's nonce, and what they load
    scriptSrc,
    // Styles: self + inline (required for React/Next.js styling)
    "style-src 'self' 'unsafe-inline'",
    // Images: self + image proxy + data URIs + blob (for image processing/previews)
    `img-src 'self' ${imagesHost} data: blob:`,
    // Fonts: self + data URIs (for inline fonts)
    "font-src 'self' data:",
    // API connections: whitelist of trusted Hive API nodes and services
    `connect-src 'self' ${[...connectSrcHosts].join(' ')}`,
    // Embedded content: app-specific whitelist
    frameSrcValue,
    // Web Workers: self + blob (for HBAuth worker)
    "worker-src 'self' blob:",
    // Prevent site from being embedded in iframes (clickjacking protection)
    "frame-ancestors 'self'",
    // Restrict base URI to prevent base tag injection
    "base-uri 'self'",
    // Restrict form submissions to same origin
    "form-action 'self'"
  ];

  // Add report URI if configured
  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`);
  }

  return directives.join('; ');
}

/**
 * Security headers that don't depend on environment variables
 * These can stay in next.config.js or be applied via middleware
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'X-DNS-Prefetch-Control': 'off',
  'X-Download-Options': 'noopen',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
