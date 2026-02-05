const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { cryptoPolyfill } = require('../../scripts/crypto-polyfill');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production',
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  runtimeCaching: [
    // Auth worker - never cache (no content hash in filename; stale copies
    // reference old WASM hashes that no longer exist after deployments)
    // Must come first as Workbox uses first-match-wins
    {
      urlPattern: /\/auth\/worker\.js$/i,
      handler: 'NetworkOnly',
    },
    // Auth WASM - cache aggressively (content hash in filename makes this safe;
    // worker.js always fetches fresh so it references the correct hash)
    {
      urlPattern: /\/auth\/assets\/.+\.wasm$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'auth-wasm',
        expiration: {
          maxEntries: 3,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // User-specific pages - never cache (notifications, settings, feed)
    // These rules must come BEFORE the defaults to take precedence
    {
      urlPattern: /\/@[^/]+\/(notifications|settings|feed)/i,
      handler: 'NetworkOnly',
    },
    // Next.js data (RSC) for these pages - never cache
    {
      urlPattern: /\/_next\/data\/.+\/%40[^/]+\/(notifications|settings|feed)\.json$/i,
      handler: 'NetworkOnly',
    },
    // Include all default caching rules for static assets (JS, CSS, images, fonts, etc.)
    ...require('next-pwa/cache'),
  ],
});

// Get basePath from environment variable at build time
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Note: Security headers (CSP, X-Content-Type-Options, etc.) are now applied
// via middleware for runtime environment variable evaluation.
// See packages/middleware/lib/csp.ts and apps/wallet/middleware.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Don't expose X-Powered-By: Next.js
  output: 'standalone',
  swcMinify: false,
  // basePath is set at build time from NEXT_PUBLIC_BASE_PATH env variable
  // This allows building separate images for root (/) and subdirectory (/wallet) deployments
  basePath: basePath,
  // assetPrefix must match basePath for proper asset serving
  assetPrefix: basePath,
  publicRuntimeConfig: {
    basePath: basePath,
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..')
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
        source: '/sw.js',
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
      },
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
            to: path.join(__dirname, 'public/auth/'),
            transform(content) {
              // Prepend crypto.randomUUID polyfill
              return Buffer.from(cryptoPolyfill + content.toString());
            }
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

// Sentry configuration - always included so builds are identical regardless of env vars.
// Sentry is enabled/disabled at runtime based on REACT_APP_SENTRY_DSN in instrumentation.ts
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(withPWA(withBundleAnalyzer(nextConfig)), {
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
