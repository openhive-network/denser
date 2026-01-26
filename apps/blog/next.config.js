const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const removeImports = require('next-remove-imports')();
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production',
  runtimeCaching: [
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

// Support serving from subdirectory like /blog
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Note: Security headers (CSP, X-Content-Type-Options, etc.) are now applied
// via middleware for runtime environment variable evaluation.
// See packages/middleware/lib/csp.ts and apps/blog/middleware.ts

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
  // Worker files need specific headers (security headers are applied via middleware)
  async headers() {
    return [
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

// Sentry configuration - always included so builds are identical regardless of env vars.
// Sentry is enabled/disabled at runtime based on REACT_APP_SENTRY_DSN in instrumentation.ts
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(withPWA(withBundleAnalyzer(removeImports(nextConfig))), {
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
