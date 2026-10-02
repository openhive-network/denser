const path = require('path');

// Support serving from subdirectory like /blog
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Note: Security headers (CSP, X-Content-Type-Options, etc.) are now applied
// via middleware for runtime environment variable evaluation.
// See packages/middleware/lib/csp.ts and apps/blog/proxy.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Don't expose X-Powered-By: Next.js
  compress: false, // Nginx handles compression; disabling avoids zlib memory retention (denser#886)
  output: 'standalone',
  basePath: basePath,
  assetPrefix: basePath,
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // next dev serves its dev resources (/_next/hmr) only to localhost and these
  // hosts; AIDEV's dev stack hands out http://127.0.0.1:<port>. No effect on builds.
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: path.join(__dirname, '../..'),
    // wax, beekeeper and hb-auth import their emscripten .wasm dynamically
    rules: { '*.wasm': { type: 'asset' } },
    resolveAlias: { fs: { browser: './empty.js' }, module: { browser: './empty.js' } }
  },
  // Worker files need specific headers (security headers are applied via middleware)
  async headers() {
    return [
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
    return {
      beforeFiles: [],
      afterFiles: [
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
      ],
      // Fallback rewrites run after all pages and dynamic routes.
      // This routes /@user/permlink to the resolve-post API (which redirects
      // to the canonical /category/@author/permlink URL) without a catch-all
      // [param]/[p2]/route.ts that would intercept _next/* internal paths.
      fallback: [
        {
          source: '/:user((?:@|%40)[^/]+)/:permlink([^/]+)',
          destination: '/api/resolve-post/:user/:permlink',
        }
      ],
    };
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
