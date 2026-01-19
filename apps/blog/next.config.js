const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const removeImports = require('next-remove-imports')();
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production'
});

// Support serving from subdirectory like /blog
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Security headers applied to all responses
// Note: CSP is handled separately below. HSTS should be set at nginx level.
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off'
  },
  {
    key: 'X-Download-Options',
    value: 'noopen'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

const connectSrcAllowedHosts = new Set([
  "https://api.hive.blog",
  "https://api.syncad.com",
  "https://api.openhive.network",
  "https://images.hive.blog"
]);

if (!!process.env.REACT_APP_ALLOWED_HIVE_API_NODES) {
  const nodes = process.env.REACT_APP_ALLOWED_HIVE_API_NODES.split(/[ ,]+/);
  if (nodes.length > 0) {
    connectSrcAllowedHosts.clear();
  }
  nodes.forEach(node => {
    connectSrcAllowedHosts.add(node);
  });
}

if (!!process.env.REACT_APP_GOOGLE_DRIVE_CLIENT_ID) {
  connectSrcAllowedHosts.add("https://www.googleapis.com");
  connectSrcAllowedHosts.add("https://accounts.google.com");
}

if (!!process.env.NEXT_PUBLIC_SENTRY_DSN) {
  connectSrcAllowedHosts.add("https://*.ingest.sentry.io");
  connectSrcAllowedHosts.add("https://*.ingest.us.sentry.io");
}

let scriptSrc = "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'";

if (!!process.env.REACT_APP_GOOGLE_DRIVE_CLIENT_ID) {
  scriptSrc += " https://accounts.google.com/gsi/";
}


// Content Security Policy - enforced.
// See docs/security-headers.md for details.
const csp = [
  // Default fallback for unspecified resource types
  "default-src 'self'",
  // Scripts: self + inline (required for Next.js) + eval (required for HBAuth/Beekeeper WASM) + Google Sign-In
  scriptSrc,
  // Styles: self + inline (required for React/Next.js styling)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + any HTTPS + data URIs + blob (for image processing)
  "img-src 'self' https: data: blob:",
  // Fonts: self + data URIs (for inline fonts)
  "font-src 'self' data:",
  // API connections: whitelist of trusted Hive API nodes and services
  // Only nodes running proper haf_api_node software are allowed
  // Google APIs for Drive wallet backup and Sign-In
  `connect-src 'self' ${[...connectSrcAllowedHosts].join(' ')}`,
  // Embedded content: whitelist of allowed iframe sources
  // Note: 3speak.online/co removed (compromised/spam), code normalizes to 3speak.tv
  // Note: emb.d.tube removed (subdomain down, no renderer support)
  "frame-src https://platform.twitter.com https://www.instagram.com https://player.vimeo.com https://www.youtube.com https://w.soundcloud.com https://player.twitch.tv https://open.spotify.com https://3speak.tv https://odysee.com https://openhive.chat",
  // Web Workers: self + blob (for HBAuth and service worker)
  "worker-src 'self' blob:",
  // Prevent site from being embedded in iframes (clickjacking protection)
  "frame-ancestors 'self'",
  // Restrict base URI to prevent base tag injection
  "base-uri 'self'",
  // Restrict form submissions to same origin
  "form-action 'self'",
  // Report violations to our endpoint for monitoring
  "report-uri /api/csp-report"
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Don't expose X-Powered-By: Next.js
  output: 'standalone',
  swcMinify: false,
  basePath: basePath,
  assetPrefix: basePath,
  publicRuntimeConfig: {
    basePath: basePath
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..'),
    instrumentationHook: true
  },
  /// According to notes: https://nextjs.org/docs/app/guides/progressive-web-apps#8-securing-your-application
  async headers() {
    return [
      // Security headers and CSP for all routes
      {
        source: '/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Content-Security-Policy',
            value: csp
          }
        ]
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8'
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          }
        ]
      },
      {
        source: '/auth/worker.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8'
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          }
        ]
      }
    ];
  },
  transpilePackages: [
    '@hive/common-hiveio-packages',
    '@hive/smart-signer',
    '@hive/ui',
    '@hive/transaction',
    '@hive/renderer',
    '@hive/middleware'
  ],

  async rewrites() {
    return [
      {
        source: '/.well-known/openid-configuration',
        destination: '/api/oidc/.well-known/openid-configuration'
      },
      {
        source: '/oidc/:path*',
        destination: '/api/oidc/:path*'
      },
      // Strip /public from paths to handle auth worker and other assets
      {
        source: '/public/:path*',
        destination: '/:path*',
      }
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false };
    }

    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.join(__dirname, '../../node_modules/@hiveio/hb-auth/dist/worker.js'),
            to: path.join(__dirname, 'public/auth/')
          },
          {
            from: path.join(__dirname, '../../node_modules/@hiveio/hb-auth/dist/assets'),
            to: path.join(__dirname, 'public/auth/assets')
          },
          {
            from: path.join(__dirname, './locales'),
            to: path.join(__dirname, 'public/locales/')
          },
          {
            from: path.join(__dirname, '../../packages/smart-signer/locales'),
            to: path.join(__dirname, 'public/locales/')
          },
          {
            from: path.join(__dirname, '../../packages/smart-signer/public/smart-signer'),
            to: path.join(__dirname, 'public/smart-signer/')
          }
        ]
      })
    );

    return config;
  }
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});
module.exports = withPWA(withBundleAnalyzer(removeImports(nextConfig)));

if (!!process.env.NEXT_PUBLIC_SENTRY_DSN) {

// Injected content via Sentry wizard below
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: process.env.NEXT_PUBLIC_SENTRY_GROUP,
  project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

}
