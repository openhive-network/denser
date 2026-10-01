const path = require('path');

// Get basePath from environment variable at build time
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Note: Security headers (CSP, X-Content-Type-Options, etc.) are now applied
// via middleware for runtime environment variable evaluation.
// See packages/middleware/lib/csp.ts and apps/wallet/proxy.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Don't expose X-Powered-By: Next.js
  output: 'standalone',
  // basePath is set at build time from NEXT_PUBLIC_BASE_PATH env variable
  // This allows building separate images for root (/) and subdirectory (/wallet) deployments
  basePath: basePath,
  // assetPrefix must match basePath for proper asset serving
  assetPrefix: basePath,
  outputFileTracingRoot: path.join(__dirname, '../..'),
  turbopack: {
    root: path.join(__dirname, '../..'),
    // wax, beekeeper and hb-auth import their emscripten .wasm dynamically
    rules: { '*.wasm': { type: 'asset' } },
    resolveAlias: { fs: { browser: './empty.js' }, module: { browser: './empty.js' } }
  },
  transpilePackages: [
    '@hive/common-hiveio-packages',
    '@hive/smart-signer',
    '@hive/ui',
    '@hive/transaction',
    '@hive/middleware',
  ],
  async rewrites() {
    return [
      // Rewrite requests that incorrectly include /public in the path
      // This handles cases where something is adding /public to static file paths
      {
        source: '/public/:path*',
        destination: '/:path*',
      },
    ];
  },
  // Worker files need specific headers (security headers are applied via middleware)
  async headers() {
    return [
      {
        source: '/auth/worker.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          }
        ]
      }
    ];
  }
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

// Sentry configuration - always included so builds are identical regardless of env vars.
// Sentry is enabled/disabled at runtime based on REACT_APP_SENTRY_DSN in instrumentation.ts
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(withBundleAnalyzer(nextConfig), {
  // Disable source map upload - env vars not available at build time
  // Sentry is enabled/disabled at runtime based on REACT_APP_SENTRY_DSN in instrumentation.ts
  sourcemaps: {
    disable: true,
  },

  silent: true,

  webpack: {
    // Tree-shaking options for reducing bundle size
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
