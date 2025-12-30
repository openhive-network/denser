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
// Note: CSP is intentionally not included here - it will be added separately
// after proper testing with Report-Only mode. HSTS should be set at nginx level.
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
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
      // Security headers for all routes
      {
        source: '/:path*',
        headers: securityHeaders
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
