const path = require('path');
const withTM = require('next-transpile-modules')(['@hive/smart-signer', '@hive/ui', '@hive/transaction', '@hive/middleware']);
const CopyPlugin = require('copy-webpack-plugin');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production'
});

// Get basePath from environment variable at build time
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

// Content Security Policy - enforced.
// See docs/security-headers.md for details.
const csp = [
  // Default fallback for unspecified resource types
  "default-src 'self'",
  // Scripts: self + inline (required for Next.js) + eval (required for HBAuth/Beekeeper WASM) + Google Sign
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://accounts.google.com/gsi/",
  // Styles: self + inline (required for React/Next.js styling)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + any HTTPS + data URIs + blob (for image processing)
  "img-src 'self' https: data: blob:",
  // Fonts: self + data URIs (for inline fonts)
  "font-src 'self' data:",
  // API connections: whitelist of trusted Hive API nodes and services
  // Only nodes running proper haf_api_node software are allowed
  // Note: images.hive.blog not needed - wallet only uses it server-side (API routes)
  // Google APIs for Drive wallet backup and Sign-In (OAuth)
  "connect-src 'self' https://api.hive.blog https://api.syncad.com https://api.openhive.network https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com",
  // Embedded content: allow Google accounts for OAuth popup/iframe
  "frame-src 'self' https://accounts.google.com",
  // Web Workers: self + blob (for HBAuth and service worker)
  "worker-src 'self' blob:",
  // Prevent site from being embedded in iframes (clickjacking protection)
  "frame-ancestors 'self'",
  // Restrict base URI to prevent base tag injection
  "base-uri 'self'",
  // Restrict form submissions to same origin
  "form-action 'self'",
  // Report violations to blog's endpoint for monitoring (wallet doesn't have its own)
  // Note: This will only work if both apps share the same origin
  "report-uri /api/csp-report"
].join('; ');

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
        source: '/__ENV.js',
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
module.exports = withPWA(withTM(withBundleAnalyzer(nextConfig)));
