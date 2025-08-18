const path = require('path');
const withTM = require('next-transpile-modules')(['@hive/smart-signer', '@hive/ui', '@hive/transaction', '@hive/middleware']);
const CopyPlugin = require('copy-webpack-plugin');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  swcMinify: false,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..')
  },
  /// According to notes: https://nextjs.org/docs/app/guides/progressive-web-apps#8-securing-your-application
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
