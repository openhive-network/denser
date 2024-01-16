const path = require('path');
const withTM = require('next-transpile-modules')(['@hive/smart-signer', '@hive/ui']);
const CopyPlugin = require('copy-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..')
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false };
    }
    // copy auth worker
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.join(__dirname, '../../node_modules/@hive/hb-auth/dist/worker.js'),
            to: path.join(__dirname, 'public/auth/')
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
module.exports = withTM(withBundleAnalyzer(nextConfig));
