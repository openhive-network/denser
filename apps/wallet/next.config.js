const path = require('path');
const withTM = require('next-transpile-modules')(['@hive/smart-signer', '@hive/ui', '@hive/transaction', '@hive/middleware']);
const CopyPlugin = require('copy-webpack-plugin');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production'
});

// Get basePath from environment variable at build time
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
