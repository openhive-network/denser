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

  return hosts;
}

/**
 * Build script-src directive
 */
function buildScriptSrc(): string {
  let scriptSrc = "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'";

  // Twitter/X widgets.js for native tweet rendering (used by TwitterResizePlugin)
  scriptSrc += ' https://platform.twitter.com';

  if (process.env.REACT_APP_GOOGLE_DRIVE_CLIENT_ID) {
    scriptSrc += ' https://accounts.google.com/gsi/';
  }

  return scriptSrc;
}

/**
 * Build the full CSP header value at runtime
 */
export function buildCsp(config: CspConfig = {}): string {
  const connectSrcHosts = buildConnectSrcHosts();
  const scriptSrc = buildScriptSrc();

  // Image proxy host — all external images are proxied through this
  let imagesHost = 'https://images.hive.blog';
  const imagesEndpoint = process.env.REACT_APP_IMAGES_ENDPOINT;
  if (imagesEndpoint) {
    try {
      imagesHost = new URL(imagesEndpoint).origin;
    } catch { /* invalid URL, use default */ }
  }

  const frameSrcValue =
    config.frameSrc && config.frameSrc.length > 0 ? `frame-src ${config.frameSrc.join(' ')}` : "frame-src 'self'";

  const directives = [
    // Default fallback for unspecified resource types
    "default-src 'self'",
    // Scripts: self + inline (required for Next.js) + eval (required for HBAuth/Beekeeper WASM) + Google Sign-In
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
