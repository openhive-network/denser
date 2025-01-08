const path = require('path');
const version = require('./version.json');
const withTM = require('next-transpile-modules')(['@hive/smart-signer', '@hive/ui', '@hive/transaction']);
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
  images: {
    domains: ['avatars.githubusercontent.com']
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..')
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/openid-configuration',
        destination: '/api/oidc/.well-known/openid-configuration'
      },
      {
        source: '/oidc/:path*',
        destination: '/api/oidc/:path*'
      }
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false };
    }
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.DefinePlugin({
        GIT_BRANCH: JSON.stringify(version.branch),
        GIT_COMMITHASH: JSON.stringify(version.commithash),
        GIT_VERSION: JSON.stringify(version.version)
      })
    );

    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.join(__dirname, '../../node_modules/@hiveio/hb-auth/dist/worker.js'),
            to: path.join(__dirname, 'public/auth/')
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
